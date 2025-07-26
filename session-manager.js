// Session Management System for SPVi Toolkit
// Implements automatic session timeout, activity monitoring, and security features

(function() {
    'use strict';

    // Session configuration - will be loaded from SPViConfig
    let SESSION_CONFIG = {
        INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
        MAX_SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
        WARNING_TIME: 5 * 60 * 1000, // Show warning 5 minutes before timeout
        CHECK_INTERVAL: 10 * 1000, // Check session every 10 seconds (faster for admin monitoring)
        UPDATE_INTERVAL: 15 * 1000, // Update session in database every 15 seconds
        STORAGE_KEY: 'spvi_session_data'
    };

    // Load configuration from SPViConfig if available
    function loadSessionConfig() {
        if (window.SPViConfig) {
            try {
                const config = window.SPViConfig.getSessionConfig();
                SESSION_CONFIG.INACTIVITY_TIMEOUT = config.inactivityTimeout * 60 * 1000;
                SESSION_CONFIG.MAX_SESSION_DURATION = config.maxDuration * 60 * 1000;
                SESSION_CONFIG.WARNING_TIME = config.warningTime * 60 * 1000;
                console.log('Session configuration loaded:', config);
            } catch (error) {
                console.warn('Failed to load session config, using defaults:', error);
            }
        }
    }

    // Session state
    let sessionTimer = null;
    let warningTimer = null;
    let sessionCheckInterval = null;
    let sessionUpdateInterval = null;
    let warningModal = null;
    let isWarningShown = false;
    let sessionData = null;
    let lastDatabaseUpdate = 0;

    // Activity tracking
    const ACTIVITY_EVENTS = [
        'mousedown', 'mousemove', 'keypress', 'scroll', 
        'touchstart', 'click', 'focus', 'blur'
    ];

    // Initialize session management
    function initializeSessionManager() {
        // Skip if on login page
        if (isLoginPage()) {
            return;
        }

        // Load session configuration first
        loadSessionConfig();

        // Load existing session or create new one
        loadSession();
        
        // Start activity monitoring
        startActivityMonitoring();
        
        // Start session validation checks
        startSessionValidation();
        
        // Create warning modal
        createWarningModal();
        
        // Start session timers
        resetSessionTimer();
        
        console.log('Session Manager initialized');
    }

    // Check if current page is login page
    function isLoginPage() {
        const currentPage = window.location.pathname;
        return currentPage.includes('index.html') || 
               currentPage.endsWith('/') || 
               currentPage === '/';
    }

    // Load session data from localStorage
    function loadSession() {
        try {
            const stored = localStorage.getItem(SESSION_CONFIG.STORAGE_KEY);
            if (stored) {
                sessionData = JSON.parse(stored);
                
                // Validate session data
                if (!isValidSession(sessionData)) {
                    createNewSession();
                }
            } else {
                createNewSession();
            }
        } catch (error) {
            console.error('Error loading session data:', error);
            createNewSession();
        }
    }

    // Create new session
    function createNewSession() {
        const now = Date.now();
        sessionData = {
            sessionId: generateSessionId(),
            startTime: now,
            lastActivity: now,
            warningShown: false,
            loginTime: now
        };
        saveSession();
    }

    // Validate session data structure
    function isValidSession(data) {
        return data && 
               data.sessionId && 
               data.startTime && 
               data.lastActivity && 
               typeof data.loginTime === 'number';
    }

    // Save session data to localStorage
    function saveSession() {
        try {
            localStorage.setItem(SESSION_CONFIG.STORAGE_KEY, JSON.stringify(sessionData));
        } catch (error) {
            console.error('Error saving session data:', error);
        }
    }

    // Generate unique session ID
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Start activity monitoring
    function startActivityMonitoring() {
        ACTIVITY_EVENTS.forEach(event => {
            document.addEventListener(event, handleUserActivity, { passive: true });
        });
    }

    // Handle user activity
    function handleUserActivity() {
        if (!sessionData) return;

        const now = Date.now();
        sessionData.lastActivity = now;
        saveSession();

        // Reset session timer if user is active
        resetSessionTimer();
        
        // Hide warning if shown
        if (isWarningShown) {
            hideSessionWarning();
        }
    }

    // Reset session timer
    function resetSessionTimer() {
        clearSessionTimers();
        
        if (!sessionData) return;

        const now = Date.now();
        const sessionAge = now - sessionData.startTime;
        const timeSinceActivity = now - sessionData.lastActivity;

        // Check if maximum session duration exceeded
        if (sessionAge >= SESSION_CONFIG.MAX_SESSION_DURATION) {
            logoutUser('Maximum session duration exceeded');
            return;
        }

        // Calculate remaining time until inactivity timeout
        const remainingTime = SESSION_CONFIG.INACTIVITY_TIMEOUT - timeSinceActivity;
        
        if (remainingTime <= 0) {
            logoutUser('Session expired due to inactivity');
            return;
        }

        // Set warning timer
        const warningTime = Math.max(remainingTime - SESSION_CONFIG.WARNING_TIME, 0);
        if (warningTime > 0) {
            warningTimer = setTimeout(() => {
                showSessionWarning();
            }, warningTime);
        }

        // Set logout timer
        sessionTimer = setTimeout(() => {
            logoutUser('Session expired due to inactivity');
        }, remainingTime);
    }

    // Clear all session timers
    function clearSessionTimers() {
        if (sessionTimer) {
            clearTimeout(sessionTimer);
            sessionTimer = null;
        }
        if (warningTimer) {
            clearTimeout(warningTimer);
            warningTimer = null;
        }
    }

    // Start session validation checks
    function startSessionValidation() {
        sessionCheckInterval = setInterval(() => {
            validateSession();
        }, SESSION_CONFIG.CHECK_INTERVAL);
        
        // Start separate interval for database updates
        sessionUpdateInterval = setInterval(() => {
            updateSessionInDatabase();
        }, SESSION_CONFIG.UPDATE_INTERVAL);
    }

    // Validate current session
    async function validateSession() {
        if (!sessionData) {
            logoutUser('Session data not found');
            return;
        }

        const now = Date.now();
        const sessionAge = now - sessionData.startTime;
        const timeSinceActivity = now - sessionData.lastActivity;

        // Check maximum session duration
        if (sessionAge >= SESSION_CONFIG.MAX_SESSION_DURATION) {
            logoutUser('Maximum session duration exceeded');
            return;
        }

        // Check inactivity timeout
        if (timeSinceActivity >= SESSION_CONFIG.INACTIVITY_TIMEOUT) {
            logoutUser('Session expired due to inactivity');
            return;
        }

        // Check if user is still authenticated
        const currentUser = window.SPViAuth?.getCurrentUser();
        if (!currentUser || currentUser.status !== 'approved') {
            logoutUser('User authentication invalid');
            return;
        }

        // Check for force logout from admin
        try {
            if (window.SPViAuth?.initializeFirebase) {
                const firebaseInstances = await window.SPViAuth.initializeFirebase();
                const db = firebaseInstances.db || window.firebase.app().firestore();
                const userDoc = await db.collection('users').doc(currentUser.id).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.restrictions?.forceLogout) {
                        // Clear the force logout flag
                        await window.SPViAuth.clearForceLogout(currentUser.id);
                        logoutUser('Session terminated by administrator');
                        return;
                    }
                    
                    // Check if account is locked
                    if (userData.restrictions?.accountLocked) {
                        logoutUser(`Account locked: ${userData.restrictions.lockReason || 'No reason provided'}`);
                        return;
                    }
                }
            }
        } catch (error) {
            console.warn('Could not check force logout status:', error);
        }

        // Update session info in database if available - but only occasionally to reduce load
        const currentTime = Date.now();
        if (currentTime - lastDatabaseUpdate >= SESSION_CONFIG.UPDATE_INTERVAL) {
            try {
                if (window.SPViAuth?.updateUserSession && sessionData.sessionId) {
                    await window.SPViAuth.updateUserSession(currentUser.id, {
                        isOnline: true,
                        sessionId: sessionData.sessionId,
                        lastActivity: new Date().toISOString(),
                        loginTime: new Date(sessionData.startTime).toISOString(),
                        ipAddress: await getCurrentIP(),
                        userAgent: navigator.userAgent
                    });
                    lastDatabaseUpdate = currentTime;
                }
            } catch (error) {
                console.warn('Could not update session info:', error);
            }
        }
    }

    // Separate function for database updates
    async function updateSessionInDatabase() {
        if (!sessionData) return;
        
        const currentUser = window.SPViAuth?.getCurrentUser();
        if (!currentUser) return;

        try {
            if (window.SPViAuth?.updateUserSession && sessionData.sessionId) {
                await window.SPViAuth.updateUserSession(currentUser.id, {
                    isOnline: true,
                    sessionId: sessionData.sessionId,
                    lastActivity: new Date().toISOString(),
                    loginTime: new Date(sessionData.startTime).toISOString(),
                    ipAddress: await getCurrentIP(),
                    userAgent: navigator.userAgent
                });
                lastDatabaseUpdate = Date.now();
            }
        } catch (error) {
            console.warn('Could not update session info in database:', error);
        }
    }

    // Create session warning modal
    function createWarningModal() {
        warningModal = document.createElement('div');
        warningModal.id = 'session-warning-modal';
        warningModal.className = 'session-modal';
        warningModal.innerHTML = `
            <div class="session-modal-overlay">
                <div class="session-modal-content">
                    <div class="session-modal-header">
                        <svg class="session-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                        <h3>Session Timeout Warning</h3>
                    </div>
                    <div class="session-modal-body">
                        <p>Your session will expire in <span id="session-countdown">5:00</span> due to inactivity.</p>
                        <p>Please click "Continue Session" to stay logged in, or your session will automatically end.</p>
                    </div>
                    <div class="session-modal-actions">
                        <button id="extend-session-btn" class="btn-primary">
                            Continue Session
                        </button>
                        <button id="logout-now-btn" class="btn-secondary">
                            Logout Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .session-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: none;
            }
            
            .session-modal.show {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .session-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .session-modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                max-width: 400px;
                width: 90%;
                margin: 1rem;
                animation: modalSlideIn 0.3s ease-out;
            }
            
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .session-modal-header {
                padding: 1.5rem 1.5rem 1rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .session-warning-icon {
                width: 2rem;
                height: 2rem;
                color: #f59e0b;
                flex-shrink: 0;
            }
            
            .session-modal-header h3 {
                margin: 0;
                font-size: 1.125rem;
                font-weight: 600;
                color: #1f2937;
            }
            
            .session-modal-body {
                padding: 1rem 1.5rem;
                color: #4b5563;
                line-height: 1.5;
            }
            
            .session-modal-body p {
                margin: 0 0 0.75rem;
            }
            
            .session-modal-body p:last-child {
                margin-bottom: 0;
            }
            
            #session-countdown {
                font-weight: 600;
                color: #dc2626;
                font-family: monospace;
                font-size: 1.1em;
            }
            
            .session-modal-actions {
                padding: 1rem 1.5rem 1.5rem;
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
            }
            
            .session-modal-actions button {
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                font-weight: 500;
                border: none;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.875rem;
            }
            
            .btn-primary {
                background: #3b82f6;
                color: white;
            }
            
            .btn-primary:hover {
                background: #2563eb;
            }
            
            .btn-secondary {
                background: #6b7280;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #4b5563;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(warningModal);

        // Add event listeners
        document.getElementById('extend-session-btn').addEventListener('click', extendSession);
        document.getElementById('logout-now-btn').addEventListener('click', () => {
            logoutUser('User chose to logout');
        });
    }

    // Show session warning
    function showSessionWarning() {
        if (isWarningShown || !warningModal) return;

        isWarningShown = true;
        sessionData.warningShown = true;
        saveSession();

        warningModal.classList.add('show');
        
        // Start countdown
        startWarningCountdown();
        
        // Play warning sound (optional)
        playWarningSound();
    }

    // Hide session warning
    function hideSessionWarning() {
        if (!isWarningShown || !warningModal) return;

        isWarningShown = false;
        sessionData.warningShown = false;
        saveSession();

        warningModal.classList.remove('show');
        
        // Clear countdown
        if (window.warningCountdownInterval) {
            clearInterval(window.warningCountdownInterval);
            window.warningCountdownInterval = null;
        }
    }

    // Start warning countdown
    function startWarningCountdown() {
        const countdownElement = document.getElementById('session-countdown');
        if (!countdownElement) return;

        let remainingSeconds = Math.floor(SESSION_CONFIG.WARNING_TIME / 1000);
        
        const updateCountdown = () => {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (remainingSeconds <= 0) {
                clearInterval(window.warningCountdownInterval);
                window.warningCountdownInterval = null;
                return;
            }
            
            remainingSeconds--;
        };

        updateCountdown();
        window.warningCountdownInterval = setInterval(updateCountdown, 1000);
    }

    // Play warning sound
    function playWarningSound() {
        try {
            // Create a simple beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            // Ignore audio errors
        }
    }

    // Extend session
    function extendSession() {
        if (!sessionData) return;

        const now = Date.now();
        sessionData.lastActivity = now;
        saveSession();

        hideSessionWarning();
        resetSessionTimer();
        
        // Show success notification
        showSessionToast('Session extended successfully', 'success');
    }

    // Logout user with reason
    function logoutUser(reason) {
        console.log('Session timeout logout:', reason);
        
        // Clear session data
        clearSessionData();
        
        // Show logout notification
        showSessionToast(`Session ended: ${reason}`, 'warning');
        
        // Logout using SPViAuth
        if (window.SPViAuth) {
            window.SPViAuth.logout();
        } else {
            // Fallback logout
            localStorage.removeItem('spvi_current_user');
            window.location.href = isInTools() ? '../index.html' : 'index.html';
        }
    }

    // Clear all session data
    function clearSessionData() {
        // Clear timers
        clearSessionTimers();
        
        if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval);
            sessionCheckInterval = null;
        }
        
        if (sessionUpdateInterval) {
            clearInterval(sessionUpdateInterval);
            sessionUpdateInterval = null;
        }
        
        if (window.warningCountdownInterval) {
            clearInterval(window.warningCountdownInterval);
            window.warningCountdownInterval = null;
        }
        
        // Remove session data
        localStorage.removeItem(SESSION_CONFIG.STORAGE_KEY);
        sessionData = null;
        lastDatabaseUpdate = 0;
        
        // Hide warning modal
        if (warningModal) {
            warningModal.classList.remove('show');
        }
        
        isWarningShown = false;
    }

    // Check if in tools directory
    function isInTools() {
        return window.location.pathname.includes('/tools/');
    }

    // Show session toast notification
    function showSessionToast(message, type = 'info') {
        // Try to use existing toast system
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }

        // Fallback toast implementation
        const toast = document.createElement('div');
        toast.className = `session-toast session-toast-${type}`;
        toast.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            .session-toast {
                position: fixed;
                top: 1rem;
                right: 1rem;
                padding: 0.75rem 1rem;
                border-radius: 0.375rem;
                color: white;
                font-weight: 500;
                z-index: 9999;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                animation: toastSlideIn 0.3s ease-out;
            }
            
            .session-toast-success { background: #10b981; }
            .session-toast-warning { background: #f59e0b; }
            .session-toast-error { background: #ef4444; }
            .session-toast-info { background: #3b82f6; }
            
            @keyframes toastSlideIn {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        
        if (!document.head.querySelector('style[data-session-toast]')) {
            style.setAttribute('data-session-toast', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Get current IP address
    async function getCurrentIP() {
        try {
            // Try to get IP from a public API
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('Could not get IP address:', error);
            return 'unknown';
        }
    }

    // Tool access permission check
    function checkToolAccess(toolName) {
        if (!window.SPViAuth) {
            console.warn('SPViAuth not available');
            return false;
        }

        const hasPermission = window.SPViAuth.hasToolPermission(toolName);
        if (!hasPermission) {
            showAccessDeniedModal(toolName);
            return false;
        }
        return true;
    }

    // Show access denied modal
    function showAccessDeniedModal(toolName) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <h3 class="text-lg font-semibold text-gray-900">Access Denied</h3>
                </div>
                <p class="text-gray-600 mb-4">
                    You don't have permission to access <strong>${toolName}</strong>. 
                    Please contact your administrator for access.
                </p>
                <div class="flex gap-3">
                    <button class="access-denied-close bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex-1">
                        OK
                    </button>
                    <button class="access-denied-dashboard bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex-1">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('.access-denied-close').onclick = () => modal.remove();
        modal.querySelector('.access-denied-dashboard').onclick = () => {
            modal.remove();
            window.location.href = '../dashboard.html';
        };

        document.body.appendChild(modal);
    }

    // Get session info for debugging
    function getSessionInfo() {
        if (!sessionData) return null;
        
        const now = Date.now();
        return {
            sessionId: sessionData.sessionId,
            sessionAge: now - sessionData.startTime,
            timeSinceActivity: now - sessionData.lastActivity,
            maxSessionDuration: SESSION_CONFIG.MAX_SESSION_DURATION,
            inactivityTimeout: SESSION_CONFIG.INACTIVITY_TIMEOUT,
            remainingTime: SESSION_CONFIG.INACTIVITY_TIMEOUT - (now - sessionData.lastActivity),
            warningShown: sessionData.warningShown
        };
    }

    // Public API
    window.SPViSessionManager = {
        initialize: initializeSessionManager,
        extendSession: extendSession,
        logoutUser: logoutUser,
        getSessionInfo: getSessionInfo,
        clearSessionData: clearSessionData,
        
        // Permission checking
        checkToolAccess: checkToolAccess,
        
        // Configuration getters
        getConfig: () => ({ ...SESSION_CONFIG })
    };

    // Auto-initialize when DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSessionManager);
    } else {
        // DOM already loaded
        setTimeout(initializeSessionManager, 100);
    }

})();
