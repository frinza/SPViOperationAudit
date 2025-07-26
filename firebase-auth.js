// Firebase Authentication System for SPVi Toolkit
// Enhanced with user management and admin tools

(function() {
    'use strict';
    
    // Initialize Firebase
    let db = null;
    let auth = null;
    let isFirebaseInitialized = false;

    async function initializeFirebase() {
        if (isFirebaseInitialized) {
            // Return existing instances if already initialized
            return { db, auth };
        }
        
        try {
            if (!window.firebase) {
                throw new Error('Firebase SDK not loaded. Please include Firebase scripts.');
            }

            // Ensure configuration is loaded
            if (!window.SPViConfig) {
                throw new Error('SPViConfig not loaded. Please include config.js.');
            }

            // Get Firebase configuration from config manager
            const firebaseConfig = window.SPViConfig.getFirebaseConfig();
            
            // Validate configuration
            window.SPViConfig.validate();
            
            // Initialize Firebase app only if not already initialized
            let app;
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app(); // Use existing app
            }
            
            // Get Firestore instance
            db = firebase.firestore();
            auth = firebase.auth();
            
            // Configure Firestore settings only if not already configured
            // This must be done immediately after getting firestore instance and only once
            try {
                if (db && !window.firestoreSettingsApplied) {
                    db.settings({
                        ignoreUndefinedProperties: true,
                        merge: true
                    });
                    window.firestoreSettingsApplied = true;
                }
            } catch (settingsError) {
                // Settings already applied or Firestore already started
                console.log('Firestore settings already configured, continuing...');
            }
            
            // Test connectivity with graceful error handling
            try {
                await db.collection('_test').limit(1).get();
            } catch (firestoreError) {
                // Log Firestore connectivity issues silently for production
                console.warn('Firestore connectivity limited - some features may be unavailable');
                // Continue with initialization as local functionality still works
            }
            
            isFirebaseInitialized = true;
            return { db, auth };
        } catch (error) {
            // In production, log errors silently but continue with local functionality
            console.warn('Firebase initialization failed - operating in offline mode');
            throw error;
        }
    }

    // User data structure
    function createUserData(userData) {
        return {
            id: userData.id || generateId(),
            name: userData.name,
            email: userData.email,
            password: userData.password, // Include password field
            department: userData.department || '',
            position: userData.position || '',
            role: userData.role || 'user', // 'user' or 'admin'
            status: userData.status || 'pending', // 'pending', 'approved', 'rejected'
            createdAt: userData.createdAt || new Date().toISOString(),
            lastLogin: userData.lastLogin || null,
            permissions: userData.permissions || {
                stockCount: true,
                cashControl: true,
                checklist: true,
                riskAnalyzer: true,
                auditCalendar: true,
                reportComparison: true,
                issueTracker: true,
                userManagement: false // Only admins
            },
            sessionInfo: userData.sessionInfo || {
                isOnline: false,
                sessionId: null,
                lastActivity: null,
                loginTime: null,
                ipAddress: null,
                userAgent: null
            },
            restrictions: userData.restrictions || {
                maxConcurrentSessions: 1,
                allowedIPs: [], // Empty array means no IP restrictions
                forceLogout: false,
                accountLocked: false,
                lockReason: null
            }
        };
    }

    // Utility functions
    function generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function showDevtoolsToast(message) {
        let toast = document.getElementById('devtools-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'devtools-toast';
            toast.style.cssText = `
                position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
                background: #222; color: #fff; padding: 1rem 2rem; border-radius: 8px;
                font-size: 1rem; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.display = 'block';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }

    // Setup dev tools protection
    function setupDevToolsProtection() {
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            showDevtoolsToast("Right-click is disabled.");
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "F12" || e.keyCode === 123) {
                e.preventDefault();
                showDevtoolsToast("Inspect Element is disabled.");
            }
            if ((e.ctrlKey && e.shiftKey && (e.key.toUpperCase() === "I" || e.key.toUpperCase() === "J")) ||
                (e.ctrlKey && e.key.toUpperCase() === "U")) {
                e.preventDefault();
                showDevtoolsToast("Developer tools access is disabled.");
            }
        });
    }

    function hashPassword(password) {
        // Ensure password is a string and normalize it
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string');
        }
        
        // Normalize the password to handle encoding issues
        const normalizedPassword = password.trim();
        
        // Simple hash for demo - in production, use proper server-side hashing
        let hash = 0;
        for (let i = 0; i < normalizedPassword.length; i++) {
            const char = normalizedPassword.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Ensure we always return a consistent string representation
        const hashString = hash.toString();
        
        // Add a prefix to make it clear this is a hashed password
        return 'spvi_' + Math.abs(hash).toString();
    }

    // Old hash function for backward compatibility
    function hashPasswordOldFormat(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // Local storage management for current user session
    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('spvi_current_user') || 'null');
        } catch (e) {
            return null;
        }
    }

    function setCurrentUser(user) {
        localStorage.setItem('spvi_current_user', JSON.stringify(user));
        
        // Initialize session manager when user logs in
        if (window.SPViSessionManager && !isLoginPage()) {
            setTimeout(() => {
                window.SPViSessionManager.initialize();
            }, 100);
        }
    }

    function clearCurrentUser() {
        localStorage.removeItem('spvi_current_user');
    }

    // Check if current page is login page
    function isLoginPage() {
        const currentPage = window.location.pathname;
        return currentPage.includes('index.html') || 
               currentPage.endsWith('/') || 
               currentPage === '/';
    }

    // Update current user data and refresh UI
    async function updateCurrentUserData(userId) {
        try {
            await initializeFirebase();
            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                const updatedUser = { id: doc.id, ...doc.data() };
                setCurrentUser(updatedUser);
                refreshUserInfo();
                return updatedUser;
            }
        } catch (error) {
            // Handle Firebase errors gracefully - don't show CORS errors to user
            if (error.code === 'permission-denied' || error.message.includes('CORS')) {
                console.warn('Firebase access limited - continuing with cached user data');
            } else {
                console.error('Error updating current user data:', error);
            }
        }
        return null;
    }

    // Firebase User Operations - Online Only
    const FirebaseUserManager = {
        async registerUser(userData) {
            await initializeFirebase();
            
            try {
                // Validate required fields
                if (!userData.email || !userData.password || !userData.name) {
                    throw new Error('Email, password, and name are required');
                }
                
                // Validate password strength
                if (userData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters long');
                }
                
                // Check if user already exists
                const existingUser = await this.getUserByEmail(userData.email);
                if (existingUser) {
                    throw new Error('User with this email already exists');
                }

                // Hash the password before creating user data
                const hashedPassword = hashPassword(userData.password);
                console.log('Generated password hash:', hashedPassword);

                const newUser = createUserData({
                    ...userData,
                    password: hashedPassword
                });

                // Verify password is included in newUser object
                if (!newUser.password) {
                    throw new Error('Failed to include password in user data structure');
                }

                console.log('Creating user with data structure:', {
                    ...newUser,
                    password: '[HASH:' + newUser.password.substring(0, 10) + '...]'
                });

                // Add to Firestore
                const docRef = await db.collection('users').add(newUser);
                newUser.id = docRef.id;

                // Update document with the actual ID
                await db.collection('users').doc(docRef.id).update({ id: docRef.id });

                // Verify the user was created with a password
                const verifyDoc = await db.collection('users').doc(docRef.id).get();
                const verifyData = verifyDoc.data();
                
                if (!verifyData.password || verifyData.password === null || verifyData.password === '') {
                    // Additional error details for debugging
                    console.error('Verification failed. Document data:', {
                        ...verifyData,
                        password: verifyData.password ? '[PRESENT]' : '[MISSING]'
                    });
                    throw new Error('User registration failed - password not saved properly');
                }

                console.log('User registered successfully. Password verification passed.');
                return newUser;
            } catch (error) {
                console.error('Registration error:', error);
                throw error;
            }
        },

        async loginUser(email, password) {
            await initializeFirebase();
            
            try {
                if (!email || !password) {
                    throw new Error('Email and password are required');
                }
                
                console.log('Attempting login for email:', email);
                
                // First, get the user by email to check what password format they have
                const emailOnlySnapshot = await db.collection('users')
                    .where('email', '==', email)
                    .get();
                
                if (emailOnlySnapshot.empty) {
                    console.log('No user found with email:', email);
                    return null;
                }
                
                const userDoc = emailOnlySnapshot.docs[0];
                const userData = userDoc.data();
                console.log('User found, checking password format...');
                
                // Check if user exists but password is missing
                if (!userData.password || userData.password === null || userData.password === undefined || userData.password === '') {
                    console.log('User found but password is missing - user needs admin assistance');
                    throw new Error('Account found but password not set. Please contact administrator.');
                }
                
                let passwordMatches = false;
                let needsMigration = false;
                
                // Check if password is in old format (numeric only without prefix)
                if (/^-?\d+$/.test(userData.password)) {
                    console.log('User has old password format - checking with old hash function');
                    
                    // Try old hash function (exact match)
                    const oldHash = hashPasswordOldFormat(password);
                    console.log('Old hash check:', oldHash, 'vs stored:', userData.password);
                    
                    if (userData.password === oldHash) {
                        passwordMatches = true;
                        needsMigration = true;
                        console.log('Old password format matched - migration needed');
                    } else {
                        // Also try with trimmed password in case there were whitespace issues
                        const oldHashTrimmed = hashPasswordOldFormat(password.trim());
                        console.log('Old hash (trimmed) check:', oldHashTrimmed, 'vs stored:', userData.password);
                        
                        if (userData.password === oldHashTrimmed) {
                            passwordMatches = true;
                            needsMigration = true;
                            console.log('Old password format (trimmed) matched - migration needed');
                        }
                    }
                }
                
                // If old format didn't match, try new format
                if (!passwordMatches) {
                    const newHash = hashPassword(password);
                    console.log('New hash check:', newHash, 'vs stored:', userData.password);
                    
                    if (userData.password === newHash) {
                        passwordMatches = true;
                        console.log('New password format matched');
                    }
                }
                
                // If still no match, check if it's stored in plain text (emergency fallback)
                if (!passwordMatches && userData.password === password) {
                    passwordMatches = true;
                    needsMigration = true;
                    console.log('Plain text password matched - migration needed');
                }
                
                if (!passwordMatches) {
                    console.log('Password does not match any format');
                    return null;
                }
                
                // Password matched, proceed with login
                const user = { id: userDoc.id, ...userData };
                
                // Migrate password if needed
                if (needsMigration) {
                    console.log('Migrating password to new format...');
                    const newHash = hashPassword(password);
                    await this.updateUser(userDoc.id, { password: newHash });
                    console.log('Password migrated successfully');
                }
                
                // Update last login
                await this.updateUser(user.id, { lastLogin: new Date().toISOString() });
                user.lastLogin = new Date().toISOString();
                
                console.log('Login successful for user:', user.name);
                return user;
                
            } catch (error) {
                console.error('Login error:', error);
                // Handle Firebase-specific errors gracefully
                if (error.code === 'permission-denied') {
                    throw new Error('Access denied - insufficient permissions');
                } else if (error.message.includes('CORS') || error.message.includes('fetch')) {
                    throw new Error('Connection error - please check your network');
                } else {
                    throw error;
                }
            }
        },

        async getAllUsers() {
            await initializeFirebase();
            
            try {
                const snapshot = await db.collection('users')
                    .orderBy('createdAt', 'desc')
                    .get();
                
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                // Handle Firebase-specific errors gracefully
                if (error.code === 'permission-denied') {
                    throw new Error('Access denied - insufficient permissions to view users');
                } else if (error.message.includes('CORS') || error.message.includes('fetch')) {
                    console.warn('Firebase connectivity limited - user data may not be current');
                    return []; // Return empty array for graceful degradation
                } else {
                    throw error;
                }
            }
        },

        async getUserByEmail(email) {
            await initializeFirebase();
            
            try {
                const snapshot = await db.collection('users')
                    .where('email', '==', email)
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    return null;
                }

                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            } catch (error) {
                // Handle Firebase-specific errors gracefully
                if (error.code === 'permission-denied') {
                    console.warn('Firebase access limited - user lookup unavailable');
                    return null;
                } else if (error.message.includes('CORS') || error.message.includes('fetch')) {
                    console.warn('Firebase connectivity limited - user lookup unavailable');
                    return null;
                } else {
                    throw error;
                }
            }
        },

        async updateUser(userId, updates) {
            await initializeFirebase();
            
            try {
                await db.collection('users').doc(userId).update({
                    ...updates,
                    updatedAt: new Date().toISOString()
                });

                // Get updated user
                const doc = await db.collection('users').doc(userId).get();
                return { id: doc.id, ...doc.data() };
            } catch (error) {
                throw error;
            }
        },

        async deleteUser(userId) {
            await initializeFirebase();
            
            try {
                await db.collection('users').doc(userId).delete();
                return true;
            } catch (error) {
                throw error;
            }
        },

        async updateUserPassword(userId, newPassword) {
            await initializeFirebase();
            
            try {
                const hashedPassword = hashPassword(newPassword);
                await this.updateUser(userId, { password: hashedPassword });
                return true;
            } catch (error) {
                throw error;
            }
        },

        async updateUserRole(userId, role) {
            await initializeFirebase();
            
            try {
                const permissions = role === 'admin' ? {
                    stockCount: true,
                    cashControl: true,
                    checklist: true,
                    riskAnalyzer: true,
                    auditCalendar: true,
                    reportComparison: true,
                    issueTracker: true,
                    userManagement: true
                } : {
                    stockCount: true,
                    cashControl: true,
                    checklist: true,
                    riskAnalyzer: true,
                    auditCalendar: true,
                    reportComparison: true,
                    issueTracker: true,
                    userManagement: false
                };

                await this.updateUser(userId, { role, permissions });
                return true;
            } catch (error) {
                throw error;
            }
        },

        async initializeDefaultAdmin() {
            await initializeFirebase();
            
            try {
                // Prevent multiple admin initialization attempts
                if (window.adminInitialized) {
                    console.log('Admin already initialized, skipping...');
                    return;
                }
                
                // Get admin configuration from config manager
                const adminConfig = window.SPViConfig.getAdminConfig();
                const adminEmail = adminConfig.email;
                
                const existingAdmin = await this.getUserByEmail(adminEmail);
                
                if (!existingAdmin) {
                    const adminUser = {
                        name: 'System Administrator',
                        email: adminEmail,
                        password: adminConfig.defaultPassword, // This will be hashed by registerUser
                        department: 'IT',
                        position: 'System Administrator',
                        role: 'admin',
                        status: 'approved',
                        permissions: {
                            stockCount: true,
                            cashControl: true,
                            checklist: true,
                            riskAnalyzer: true,
                            auditCalendar: true,
                            reportComparison: true,
                            issueTracker: true,
                            userManagement: true
                        }
                    };

                    // Register admin user
                    const createdAdmin = await this.registerUser(adminUser);
                    console.log('Admin user created successfully');
                } else {
                    // Only add password if it's completely missing - DON'T reset existing passwords
                    if (!existingAdmin.hasOwnProperty('password') || !existingAdmin.password || existingAdmin.password === undefined || existingAdmin.password === null || existingAdmin.password === '') {
                        console.log('Admin user exists but password is missing. Adding default password...');
                        const newPasswordHash = hashPassword(adminConfig.defaultPassword);
                        await this.updateUser(existingAdmin.id, { 
                            password: newPasswordHash 
                        });
                        console.log('Admin password has been set to default with hash:', newPasswordHash);
                    } else {
                        console.log('Admin user exists with existing password - leaving password unchanged');
                        console.log('Password format:', existingAdmin.password.startsWith('spvi_') ? 'NEW' : 'OLD/OTHER');
                        // DO NOT automatically update passwords - let the login function handle migration
                    }
                }
                
                // Mark admin as initialized to prevent duplicate creation
                window.adminInitialized = true;
            } catch (error) {
                console.error('Admin initialization error:', error);
                // Continue silently if Firebase initialization fails
            }
        },

        async changeAdminPassword(currentPassword, newPassword) {
            await initializeFirebase();
            
            try {
                // Get admin email from config
                const adminConfig = window.SPViConfig.getAdminConfig();
                const adminEmail = adminConfig.email;
                
                // Verify current password first
                const admin = await this.getUserByEmail(adminEmail);
                if (!admin) {
                    throw new Error('Admin user not found');
                }
                
                // Check current password using the same logic as login
                let passwordMatches = false;
                
                // Check if password is in old format (numeric only without prefix)
                if (/^-?\d+$/.test(admin.password)) {
                    const oldHash = hashPasswordOldFormat(currentPassword);
                    const oldHashTrimmed = hashPasswordOldFormat(currentPassword.trim());
                    
                    if (admin.password === oldHash || admin.password === oldHashTrimmed) {
                        passwordMatches = true;
                    }
                } else {
                    // Check new format
                    const newHash = hashPassword(currentPassword);
                    if (admin.password === newHash) {
                        passwordMatches = true;
                    }
                }
                
                // Check plain text fallback
                if (!passwordMatches && admin.password === currentPassword) {
                    passwordMatches = true;
                }
                
                if (!passwordMatches) {
                    throw new Error('Current password is incorrect');
                }
                
                // Update with new password
                await this.updateUserPassword(admin.id, newPassword);
                return true;
            } catch (error) {
                throw error;
            }
        },

        async getAdminUser() {
            await initializeFirebase();
            
            try {
                // Get admin email from config
                const adminConfig = window.SPViConfig.getAdminConfig();
                const adminEmail = adminConfig.email;
                return await this.getUserByEmail(adminEmail);
            } catch (error) {
                throw error;
            }
        }
    };

    // Authentication checker
    function checkAuth() {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            redirectToLogin();
            return false;
        }

        if (currentUser.status !== 'approved') {
            clearCurrentUser();
            redirectToLogin();
            return false;
        }

        return true;
    }

    function redirectToLogin() {
        // Only redirect if we're NOT already on the login page (index.html)
        const currentPage = window.location.pathname;
        const currentUrl = window.location.href;
        
        // More accurate check for login page
        const isOnLoginPage = currentPage.includes('index.html') || 
                             currentPage.endsWith('/') || 
                             currentPage === '/' ||
                             currentUrl.includes('index.html');
        
        if (!isOnLoginPage) {
            // Determine if we're in a tools subdirectory
            const isInTools = currentPage.includes('/tools/');
            const loginPath = isInTools ? '../index.html' : 'index.html';
            
            // Prevent multiple redirects by adding a flag
            if (!window.redirectingToLogin) {
                window.redirectingToLogin = true;
                setTimeout(() => {
                    window.location.href = loginPath;
                }, 100);
            }
        }
    }

    // Add user info bar to pages
    function addUserInfo() {
        // Check if this page should skip the user info bar
        if (window.skipUserInfoBar) {
            return;
        }
        
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const userInfoBar = document.createElement('div');
        userInfoBar.id = 'spvi-user-info';

        const userManagementButton = currentUser.role === 'admin' 
            ? `<button 
                id="spvi-user-management-btn" 
                style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.4rem 0.65rem; border-radius: 0.375rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; min-width: fit-content;"
                onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                onmouseout="this.style.background='rgba(255,255,255,0.2)'"
            >
                จัดการผู้ใช้
            </button>`
            : '';

        // Determine if we're in a tools subdirectory
        const isInTools = window.location.pathname.includes('/tools/');
        const basePath = isInTools ? '../' : './';
        const toolsPath = isInTools ? './' : 'tools/';

        // Define all available tools with their details
        const allTools = [
            {
                name: 'stockCount',
                url: 'stock-count.html',
                title: 'ตรวจนับสต็อก',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
            },
            {
                name: 'cashControl',
                url: 'cash-control.html',
                title: 'ควบคุมเงินสด',
                icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
            },
            {
                name: 'checklist',
                url: 'checklist.html',
                title: 'รายการตรวจสอบ',
                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
            },
            {
                name: 'auditCalendar',
                url: 'audit-calendar.html',
                title: 'ปฏิทินตรวจสอบ',
                icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            },
            {
                name: 'issueTracker',
                url: 'issue-tracker.html',
                title: 'ติดตามประเด็น',
                icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
            },
            {
                name: 'reportComparison',
                url: 'report-comparison.html',
                title: 'เปรียบเทียบรายงาน',
                icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            },
            {
                name: 'riskAnalyzer',
                url: 'risk-analyzer.html',
                title: 'วิเคราะห์ความเสี่ยง',
                icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            }
        ];

        // Filter tools based on user permissions
        const allowedTools = allTools.filter(tool => hasToolPermission(tool.name));

        // Generate navigation links for allowed tools
        const toolNavLinks = allowedTools.map(tool => `
            <a href="${toolsPath}${tool.url}" class="spvi-nav-link">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${tool.icon}"></path>
                </svg>
                ${tool.title}
            </a>
        `).join('');

        userInfoBar.innerHTML = `
            <div class="spvi-nav-container">
                <button class="spvi-nav-toggle" id="spvi-nav-toggle">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
                <div class="spvi-nav-links" id="spvi-nav-links">
                    <a href="${basePath}dashboard.html" class="spvi-nav-link">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                        หน้าหลัก
                    </a>
                    ${toolNavLinks}
                </div>
                <div class="spvi-user-actions">
                    <div class="spvi-user-details">
                        <span class="font-medium">${currentUser.name}</span>
                        <span class="opacity-75">•</span>
                        <span class="opacity-90">${currentUser.department}</span>
                        <span class="opacity-75">•</span>
                        <span class="opacity-75 text-xs uppercase font-semibold">${currentUser.role}</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        ${userManagementButton}
                        <button id="spvi-logout-btn" class="spvi-logout-btn">
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertBefore(userInfoBar, document.body.firstChild);
        
        // Add logged-in class for proper CSS styling
        document.body.classList.add('logged-in');

        // Add event listeners
        document.getElementById('spvi-logout-btn').addEventListener('click', function() {
            if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                SPViAuth.logout();
            }
        });

        if (currentUser.role === 'admin') {
            document.getElementById('spvi-user-management-btn').addEventListener('click', function() {
                window.location.href = `${basePath}user-management.html`;
            });
        }

        // Mobile navigation toggle functionality
        const navToggle = document.getElementById('spvi-nav-toggle');
        const navLinks = document.getElementById('spvi-nav-links');
        
        if (navToggle && navLinks) {
            navToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Add smooth transition classes
                navToggle.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    navToggle.style.transform = '';
                }, 150);
                
                navLinks.classList.toggle('open');
                document.body.classList.toggle('nav-expanded');
                
                // Update toggle icon with smooth transition
                const svg = navToggle.querySelector('svg');
                const path = svg.querySelector('path');
                
                // Add transition to SVG
                path.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
                if (navLinks.classList.contains('open')) {
                    // Hamburger to X animation
                    setTimeout(() => {
                        path.setAttribute('d', 'M6 18L18 6M6 6l12 12');
                    }, 100);
                } else {
                    // X to hamburger animation
                    setTimeout(() => {
                        path.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
                    }, 100);
                }
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', function(event) {
                if (!userInfoBar.contains(event.target) && navLinks.classList.contains('open')) {
                    navLinks.classList.remove('open');
                    document.body.classList.remove('nav-expanded');
                    const svg = navToggle.querySelector('svg');
                    const path = svg.querySelector('path');
                    path.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                    setTimeout(() => {
                        path.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
                    }, 100);
                }
            });

            // Close mobile menu when window is resized to desktop
            window.addEventListener('resize', function() {
                if (window.innerWidth > 1400) {
                    navLinks.classList.remove('open');
                    document.body.classList.remove('nav-expanded');
                    const svg = navToggle.querySelector('svg');
                    const path = svg.querySelector('path');
                    path.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                    setTimeout(() => {
                        path.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
                    }, 100);
                }
            });

            // Handle navigation link clicks in mobile view
            navLinks.addEventListener('click', function(e) {
                if (e.target.closest('.spvi-nav-link')) {
                    // Add click animation
                    const clickedLink = e.target.closest('.spvi-nav-link');
                    clickedLink.style.transform = 'translateX(8px)';
                    setTimeout(() => {
                        clickedLink.style.transform = '';
                    }, 200);
                    
                    // Close mobile menu when navigating
                    if (window.innerWidth <= 1400) {
                        setTimeout(() => {
                            navLinks.classList.remove('open');
                            document.body.classList.remove('nav-expanded');
                            const svg = navToggle.querySelector('svg');
                            const path = svg.querySelector('path');
                            path.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                            setTimeout(() => {
                                path.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
                            }, 100);
                        }, 300);
                    }
                }
            });
        }
    }

    // Refresh user info display in navigation bar
    function refreshUserInfo() {
        const userInfoBar = document.getElementById('spvi-user-info');
        if (!userInfoBar) return;

        const currentUser = getCurrentUser();
        if (!currentUser) return;

        // Update user details in the navigation bar
        const userDetailsElement = userInfoBar.querySelector('.spvi-user-details');
        if (userDetailsElement) {
            userDetailsElement.innerHTML = `
                <span class="font-medium">${currentUser.name}</span>
                <span class="opacity-75">•</span>
                <span class="opacity-90">${currentUser.department}</span>
                <span class="opacity-75">•</span>
                <span class="opacity-75 text-xs uppercase font-semibold">${currentUser.role}</span>
            `;
        }

        // Update user management button visibility based on role
        const userActionsContainer = userInfoBar.querySelector('.spvi-user-actions > div');
        if (userActionsContainer) {
            const existingUserMgmtBtn = document.getElementById('spvi-user-management-btn');
            
            if (currentUser.role === 'admin' && !existingUserMgmtBtn) {
                // Add user management button if user is admin and button doesn't exist
                const userManagementButton = document.createElement('button');
                userManagementButton.id = 'spvi-user-management-btn';
                userManagementButton.style.cssText = 'background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.4rem 0.65rem; border-radius: 0.375rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; min-width: fit-content;';
                userManagementButton.textContent = 'จัดการผู้ใช้';
                userManagementButton.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.3)'; };
                userManagementButton.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.2)'; };
                userManagementButton.addEventListener('click', function() {
                    const isInTools = window.location.pathname.includes('/tools/');
                    const basePath = isInTools ? '../' : './';
                    window.location.href = `${basePath}user-management.html`;
                });
                
                const logoutBtn = userActionsContainer.querySelector('#spvi-logout-btn');
                userActionsContainer.insertBefore(userManagementButton, logoutBtn);
            } else if (currentUser.role !== 'admin' && existingUserMgmtBtn) {
                // Remove user management button if user is not admin
                existingUserMgmtBtn.remove();
            }
        }
    }

    // Initialize authentication when DOM loads
    function init() {
        const currentPage = window.location.pathname;
        
        // Skip auth check if we're on the login page
        const isLoginPage = currentPage.includes('index.html') || 
                           currentPage.endsWith('/') || 
                           currentPage === '/';
        
        if (isLoginPage) {
            return;
        }

        if (checkAuth()) {
            // Only add user info if not explicitly skipped
            if (!window.skipUserInfoBar) {
                addUserInfo();
            }
        }
    }

    // Session Management Functions
    async function updateUserSession(userId, sessionData) {
        await initializeFirebase();
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            sessionInfo: {
                ...sessionData,
                lastUpdated: new Date().toISOString()
            },
            lastLogin: new Date().toISOString()
        });
    }

    async function disconnectUserSession(userId) {
        await initializeFirebase();
        const userRef = db.collection('users').doc(userId);
        
        // Set both force logout flag and clear session info
        await userRef.update({
            'sessionInfo.isOnline': false,
            'sessionInfo.sessionId': null,
            'sessionInfo.lastActivity': new Date().toISOString(),
            'restrictions.forceLogout': true,
            'restrictions.forceLogoutTime': new Date().toISOString()
        });
        
        console.log(`User ${userId} session disconnected by admin`);
    }

    async function getOnlineUsers() {
        await initializeFirebase();
        
        // Get all approved users first, then filter by session activity
        const usersSnapshot = await db.collection('users')
            .where('status', '==', 'approved')
            .get();
        
        const now = new Date().getTime();
        const onlineThreshold = 5 * 60 * 1000; // 5 minutes
        
        const onlineUsers = [];
        
        usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            const sessionInfo = userData.sessionInfo;
            
            // Check if user has recent session activity
            if (sessionInfo && sessionInfo.lastActivity) {
                const lastActivity = new Date(sessionInfo.lastActivity).getTime();
                const timeSinceActivity = now - lastActivity;
                
                // Consider user online if:
                // 1. They have an active session ID AND
                // 2. Their last activity was within the threshold OR they're marked as online
                if (sessionInfo.sessionId && 
                    (timeSinceActivity < onlineThreshold || sessionInfo.isOnline === true)) {
                    onlineUsers.push({
                        id: doc.id,
                        ...userData
                    });
                }
            }
        });
        
        return onlineUsers;
    }

    async function clearForceLogout(userId) {
        await initializeFirebase();
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            'restrictions.forceLogout': false
        });
    }

    // Permission Management Functions
    async function updateUserPermissions(userId, permissions) {
        await initializeFirebase();
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            permissions: permissions
        });
    }

    async function checkUserPermission(userId, toolName) {
        await initializeFirebase();
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;
        
        const userData = userDoc.data();
        return userData.permissions && userData.permissions[toolName] === true;
    }

    function hasToolPermission(toolName) {
        const currentUser = getCurrentUser();
        if (!currentUser) return false;
        
        // Admins have access to everything
        if (currentUser.role === 'admin') return true;
        
        // Check specific permission
        return currentUser.permissions && currentUser.permissions[toolName] === true;
    }

    // Account Restriction Functions
    async function lockUserAccount(userId, reason) {
        await initializeFirebase();
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            'restrictions.accountLocked': true,
            'restrictions.lockReason': reason,
            'restrictions.forceLogout': true,
            'sessionInfo.isOnline': false,
            'sessionInfo.sessionId': null
        });
    }

    async function unlockUserAccount(userId) {
        await initializeFirebase();
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            'restrictions.accountLocked': false,
            'restrictions.lockReason': null,
            'restrictions.forceLogout': false
        });
    }

    // IP Address Management
    async function updateUserIPRestrictions(userId, allowedIPs) {
        await initializeFirebase();
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            'restrictions.allowedIPs': allowedIPs
        });
    }

    function checkIPRestriction(userIPs, currentIP) {
        if (!userIPs || userIPs.length === 0) return true; // No restrictions
        return userIPs.includes(currentIP);
    }

    // Export Firebase Auth API
    window.SPViAuth = {
        // Core functions
        getCurrentUser,
        setCurrentUser,
        clearCurrentUser,
        checkAuth,
        checkAuthentication: checkAuth, // Alias for compatibility
        logout: function() {
            // Clear session data from session manager
            if (window.SPViSessionManager) {
                window.SPViSessionManager.clearSessionData();
            }
            
            clearCurrentUser();
            // Remove logged-in class when logging out
            document.body.classList.remove('logged-in');
            redirectToLogin();
        },

        // Firebase operations
        registerUser: FirebaseUserManager.registerUser,
        loginUser: FirebaseUserManager.loginUser,
        getAllUsers: FirebaseUserManager.getAllUsers,
        getUserByEmail: FirebaseUserManager.getUserByEmail,
        updateUser: FirebaseUserManager.updateUser,
        deleteUser: FirebaseUserManager.deleteUser,
        updateUserPassword: FirebaseUserManager.updateUserPassword,
        updateUserRole: FirebaseUserManager.updateUserRole,
        initializeDefaultAdmin: FirebaseUserManager.initializeDefaultAdmin,
        changeAdminPassword: FirebaseUserManager.changeAdminPassword,
        getAdminUser: FirebaseUserManager.getAdminUser,

        // Initialize Firebase
        initializeFirebase,
        
        // UI functions
        addUserInfo,
        refreshUserInfo,
        updateCurrentUserData,
        
        // Utility functions
        showDevtoolsToast,
        setupDevToolsProtection,
        hashPassword, // Expose hash function for testing
        hashPasswordOldFormat, // Expose old hash function for migration

        // Session Management
        updateUserSession,
        disconnectUserSession,
        getOnlineUsers,
        clearForceLogout,
        
        // Permission Management
        updateUserPermissions,
        checkUserPermission,
        hasToolPermission,
        
        // Account Restrictions
        lockUserAccount,
        unlockUserAccount,
        updateUserIPRestrictions,
        checkIPRestriction,
        
        // Password Management
        fixUserPasswords: async function() {
            await initializeFirebase();
            
            try {
                const allUsers = await FirebaseUserManager.getAllUsers();
                let fixedCount = 0;
                let issuesFound = [];

                for (const user of allUsers) {
                    let needsFix = false;
                    let issue = '';
                    let fixAction = '';

                    // Check for missing password
                    if (!user.hasOwnProperty('password') || user.password === null || user.password === undefined) {
                        needsFix = true;
                        issue = 'Missing password';
                        fixAction = 'Cannot fix - manual intervention required';
                    }
                    // Check for empty password
                    else if (user.password === '' || user.password === '0') {
                        needsFix = true;
                        issue = 'Empty/zero password';
                        fixAction = 'Cannot fix - manual intervention required';
                    }
                    // Check for old format password (numeric only)
                    else if (/^-?\d+$/.test(user.password)) {
                        needsFix = true;
                        issue = 'Old password format';
                        fixAction = 'Migrated to new format';
                        
                        // Convert to new format but keep the same hash value logic
                        const newHash = 'spvi_' + Math.abs(parseInt(user.password)).toString();
                        await FirebaseUserManager.updateUser(user.id, { password: newHash });
                        fixedCount++;
                    }

                    if (needsFix) {
                        issuesFound.push({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            issue: issue,
                            action: fixAction,
                            oldPassword: user.password
                        });
                    }
                }

                return {
                    totalUsers: allUsers.length,
                    issuesFound: issuesFound.length,
                    fixedCount: fixedCount,
                    details: issuesFound
                };
            } catch (error) {
                throw new Error('Error fixing user passwords: ' + error.message);
            }
        },
        
        // Configuration access
        getConfig: function() {
            return window.SPViConfig;
        }
    };

    // Auto-initialize when DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
