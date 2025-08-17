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
            emailLower: (userData.email || '').toLowerCase(),
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
                smcoCheck: true,
                cnCheck: true,
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

    // Secure session management - Firebase only storage
    let currentUserCache = null;
    let sessionToken = null;

    function getCurrentUser() {
        // Return cached user if available and valid
        if (currentUserCache && sessionToken) {
            return currentUserCache;
        }
        
        // Try to recover from session data if available
        if (window.SPViSessionManager && window.SPViSessionManager.getSessionInfo) {
            const sessionInfo = window.SPViSessionManager.getSessionInfo();
            if (sessionInfo && sessionInfo.sessionId && currentUserCache) {
                return currentUserCache;
            }
        }
        
        return null;
    }

    function setCurrentUser(user) {
        // Store user in memory cache only
        currentUserCache = user;
        
        // Generate secure session token
        sessionToken = generateSecureToken();
        
        // Initialize session manager when user logs in
        if (window.SPViSessionManager && !isLoginPage()) {
            setTimeout(() => {
                window.SPViSessionManager.initialize();
            }, 100);
        }
        
        // Store session info in Firebase instead of localStorage
        if (user && user.id) {
            updateUserSessionInFirebase(user.id, {
                isOnline: true,
                sessionId: sessionToken,
                lastActivity: new Date().toISOString(),
                loginTime: new Date().toISOString(),
                userAgent: navigator.userAgent
            }).catch(error => {
                console.warn('Could not update Firebase session:', error);
            });
        }
    }

    function clearCurrentUser() {
        // Clear user session from Firebase
        if (currentUserCache && currentUserCache.id && sessionToken) {
            updateUserSessionInFirebase(currentUserCache.id, {
                isOnline: false,
                sessionId: null,
                lastActivity: new Date().toISOString()
            }).catch(error => {
                console.warn('Could not clear Firebase session:', error);
            });
        }
        
        // Clear memory cache
        currentUserCache = null;
        sessionToken = null;
    }

    // Generate secure session token
    function generateSecureToken() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const userAgent = navigator.userAgent.slice(0, 20);
        return `spvi_${timestamp}_${random}_${btoa(userAgent).slice(0, 8)}`;
    }

    // Update user session in Firebase
    async function updateUserSessionInFirebase(userId, sessionData) {
        try {
            await initializeFirebase();
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                sessionInfo: {
                    ...sessionData,
                    lastUpdated: new Date().toISOString()
                },
                lastLogin: sessionData.loginTime || new Date().toISOString()
            });
        } catch (error) {
            console.warn('Firebase session update failed:', error);
            throw error;
        }
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

    // Restore session from Firebase
    async function restoreUserSession() {
        try {
            await initializeFirebase();
            
            // Get all users to find active sessions
            const usersSnapshot = await db.collection('users')
                .where('status', '==', 'approved')
                .where('sessionInfo.isOnline', '==', true)
                .get();
            
            const currentFingerprint = generateBrowserFingerprint();
            const now = new Date().getTime();
            const sessionTimeout = 30 * 60 * 1000; // 30 minutes
            
            // Find user with valid session for current browser
            for (const doc of usersSnapshot.docs) {
                const userData = doc.data();
                const sessionInfo = userData.sessionInfo;
                
                if (sessionInfo && sessionInfo.sessionId && sessionInfo.lastActivity) {
                    const lastActivity = new Date(sessionInfo.lastActivity).getTime();
                    const timeSinceActivity = now - lastActivity;
                    
                    // Check if session is still valid
                    if (timeSinceActivity < sessionTimeout) {
                        // Additional validation using browser fingerprint
                        const sessionFingerprint = extractFingerprintFromSession(sessionInfo);
                        if (sessionFingerprint === currentFingerprint) {
                            const user = { id: doc.id, ...userData };
                            currentUserCache = user;
                            sessionToken = sessionInfo.sessionId;
                            
                            // Update last activity
                            await updateUserSessionInFirebase(user.id, {
                                ...sessionInfo,
                                lastActivity: new Date().toISOString()
                            });
                            
                            return user;
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.warn('Could not restore session from Firebase:', error);
            return null;
        }
    }

    // Generate browser fingerprint for additional security
    function generateBrowserFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        return btoa(fingerprint).slice(0, 16);
    }

    // Extract fingerprint from session for validation
    function extractFingerprintFromSession(sessionInfo) {
        if (sessionInfo.userAgent) {
            const mockCanvas = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const fingerprint = [
                sessionInfo.userAgent,
                navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                mockCanvas
            ].join('|');
            
            return btoa(fingerprint).slice(0, 16);
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
                
                // Normalize email for uniqueness checks
                const emailLower = (userData.email || '').trim().toLowerCase();
                if (!emailLower) {
                    throw new Error('Invalid email');
                }
                
                // Validate password strength
                if (userData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters long');
                }
                
                // Check if user already exists (case-insensitive)
                const existingUser = await this.getUserByEmail(userData.email);
                if (existingUser) {
                    throw new Error('User with this email already exists');
                }

                // Hash the password before creating user data
                const hashedPassword = hashPassword(userData.password);
                
                const newUser = createUserData({
                    ...userData,
                    email: userData.email,
                    emailLower,
                    password: hashedPassword
                });

                // Use deterministic document ID based on emailLower when available
                let userDocRef = db.collection('users').doc(emailLower);
                const userDocSnap = await userDocRef.get();
                if (userDocSnap.exists) {
                    // Fallback to auto ID if a legacy doc with that ID exists unexpectedly
                    userDocRef = db.collection('users').doc();
                }
                newUser.id = userDocRef.id;

                // Create user document
                await userDocRef.set(newUser);

                // Maintain a mapping to enforce uniqueness by emailLower
                try {
                    const emailMapRef = db.collection('userEmails').doc(emailLower);
                    await emailMapRef.set({ userId: userDocRef.id, email: newUser.email, createdAt: new Date().toISOString() }, { merge: true });
                } catch (mapErr) {
                    console.warn('Could not update userEmails mapping:', mapErr);
                }

                // Verify the user was created with a password
                const verifyDoc = await db.collection('users').doc(userDocRef.id).get();
                const verifyData = verifyDoc.data();
                
                if (!verifyData.password || verifyData.password === null || verifyData.password === '') {
                    console.error('Verification failed. Document data:', {
                        ...verifyData,
                        password: verifyData.password ? '[PRESENT]' : '[MISSING]'
                    });
                    throw new Error('User registration failed - password not saved properly');
                }

                return { id: userDocRef.id, ...verifyData };
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
                
                // Lookup user by normalized email
                const foundUser = await this.getUserByEmail(email);
                if (!foundUser) {
                    return null;
                }
                const userDocId = foundUser.id;
                const userData = foundUser;
                
                // Check if user exists but password is missing
                if (!userData.password || userData.password === null || userData.password === undefined || userData.password === '') {
                    throw new Error('Account found but password not set. Please contact administrator.');
                }
                
                let passwordMatches = false;
                let needsMigration = false;
                
                // Check if password is in old format (numeric only without prefix)
                if (/^-?\d+$/.test(userData.password)) {
                    const oldHash = hashPasswordOldFormat(password);
                    if (userData.password === oldHash) {
                        passwordMatches = true;
                        needsMigration = true;
                    } else {
                        const oldHashTrimmed = hashPasswordOldFormat(password.trim());
                        if (userData.password === oldHashTrimmed) {
                            passwordMatches = true;
                            needsMigration = true;
                        }
                    }
                }
                
                // If old format didn't match, try new format
                if (!passwordMatches) {
                    const newHash = hashPassword(password);
                    if (userData.password === newHash) {
                        passwordMatches = true;
                    }
                }
                
                // If still no match, check plain text (fallback)
                if (!passwordMatches && userData.password === password) {
                    passwordMatches = true;
                    needsMigration = true;
                }
                
                if (!passwordMatches) {
                    return null;
                }
                
                // Password matched, proceed with login
                const user = { id: userDocId, ...userData };
                
                // Clean up any legacy localStorage data first
                cleanupLegacyStorage();
                
                // Migrate password if needed
                if (needsMigration) {
                    const newHash = hashPassword(password);
                    await this.updateUser(user.id, { password: newHash });
                }
                
                // Update last login and clear any existing sessions
                await this.updateUser(user.id, { 
                    lastLogin: new Date().toISOString(),
                    'sessionInfo.isOnline': false,
                    'sessionInfo.sessionId': null
                });
                user.lastLogin = new Date().toISOString();
                
                // Set user in memory and establish secure session
                setCurrentUser(user);
                
                return user;
                
            } catch (error) {
                console.error('Login error:', error);
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
                const emailLower = (email || '').toLowerCase();
                if (!emailLower) return null;

                // 1) Try deterministic ID lookup first (new users)
                const directRef = await db.collection('users').doc(emailLower).get();
                if (directRef.exists) {
                    return { id: directRef.id, ...directRef.data() };
                }

                // 2) Try emailLower field (migrated users)
                const lowerSnap = await db.collection('users')
                    .where('emailLower', '==', emailLower)
                    .limit(1)
                    .get();
                if (!lowerSnap.empty) {
                    const doc = lowerSnap.docs[0];
                    return { id: doc.id, ...doc.data() };
                }

                // 3) Fallback to legacy exact-case email field
                const legacySnap = await db.collection('users')
                    .where('email', '==', email)
                    .limit(1)
                    .get();
                if (!legacySnap.empty) {
                    const doc = legacySnap.docs[0];
                    return { id: doc.id, ...doc.data() };
                }

                return null;
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
                // If email is being updated, keep emailLower and userEmails mapping in sync
                if (updates && typeof updates.email === 'string') {
                    const newEmailLower = updates.email.toLowerCase();
                    updates.emailLower = newEmailLower;

                    try {
                        const userRef = db.collection('users').doc(userId);
                        const currentSnap = await userRef.get();
                        if (currentSnap.exists) {
                            const current = currentSnap.data();
                            const oldEmailLower = (current.emailLower || (current.email || '').toLowerCase());
                            if (newEmailLower && newEmailLower !== oldEmailLower) {
                                // Ensure new email is not taken
                                const existing = await db.collection('userEmails').doc(newEmailLower).get();
                                if (existing.exists) {
                                    throw new Error('Email already in use by another account');
                                }
                                // Update mapping: remove old, set new
                                try { await db.collection('userEmails').doc(oldEmailLower).delete(); } catch (e) { /* ignore */ }
                                await db.collection('userEmails').doc(newEmailLower).set({ userId, email: updates.email, updatedAt: new Date().toISOString() }, { merge: true });
                            }
                        }
                    } catch (mapErr) {
                        console.warn('Could not update userEmails mapping during email update:', mapErr);
                    }
                }

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
                    cnCheck: true,
                    userManagement: true
                } : {
                    stockCount: true,
                    cashControl: true,
                    checklist: true,
                    riskAnalyzer: true,
                    auditCalendar: true,
                    reportComparison: true,
                    issueTracker: true,
                    cnCheck: true,
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
                // Prevent multiple admin initialization attempts in-session
                if (window.adminInitialized) {
                    console.log('Admin already initialized (session flag), skipping...');
                    return;
                }
                
                const adminConfig = window.SPViConfig.getAdminConfig();
                const adminEmail = adminConfig.email;

                // Use a Firestore lock doc to avoid race conditions across multiple pages/tabs
                const systemCol = db.collection('system');
                const adminInitDocRef = systemCol.doc('adminInit');
                
                // Read current state
                const adminInitSnap = await adminInitDocRef.get();
                const adminInitData = adminInitSnap.exists ? adminInitSnap.data() : null;

                // If already initialized, just ensure admin user exists and exit
                if (adminInitData && adminInitData.initialized === true) {
                    const existing = await this.getUserByEmail(adminEmail);
                    if (!existing) {
                        console.warn('Admin init flag set but admin user not found. Recreating admin...');
                        // Fall through to creation path below
                    } else {
                        window.adminInitialized = true;
                        return;
                    }
                }

                // Acquire initialization lock transactionally
                await db.runTransaction(async (tx) => {
                    const snap = await tx.get(adminInitDocRef);
                    if (snap.exists && snap.data().initialized === true) {
                        return; // Another client already initialized
                    }
                    tx.set(adminInitDocRef, { initialized: true, initializedAt: new Date().toISOString() }, { merge: true });
                });

                // Double-check if admin exists after acquiring lock
                let existingAdmin = await this.getUserByEmail(adminEmail);
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
                            smcoCheck: true,
                            cnCheck: true,
                            userManagement: true
                        }
                    };

                    // Register admin user
                    await this.registerUser(adminUser);
                    console.log('Admin user created successfully');
                } else {
                    // Ensure critical permissions include cnCheck for existing admin
                    if (!existingAdmin.permissions || existingAdmin.permissions.cnCheck !== true) {
                        const updatedPerms = {
                            ...(existingAdmin.permissions || {}),
                            cnCheck: true,
                            userManagement: true
                        };
                        await this.updateUser(existingAdmin.id, { permissions: updatedPerms });
                        console.log('Admin permissions updated to include cnCheck');
                    }
                }
                
                // Mark admin as initialized to prevent duplicate creation (session-level flag)
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

    // Utility: find duplicate users by email (case-insensitive)
    async function findDuplicateUsers() {
        await initializeFirebase();
        const users = await FirebaseUserManager.getAllUsers();
        const groups = {};
        users.forEach(u => {
            const key = (u.emailLower || u.email || '').toLowerCase();
            if (!key) return;
            if (!groups[key]) groups[key] = [];
            groups[key].push(u);
        });
        const duplicates = Object.entries(groups)
            .filter(([, arr]) => arr.length > 1)
            .map(([email, arr]) => ({ email, users: arr }));
        return duplicates;
    }

    // Utility: deduplicate users by keeping one per email and deleting the rest
    // strategy: 'keepOldest' | 'keepNewest' (default: keepOldest)
    async function deduplicateUsers(strategy = 'keepOldest') {
        await initializeFirebase();
        const duplicates = await findDuplicateUsers();
        const results = [];
        for (const group of duplicates) {
            const { email, users } = group;
            // Choose the one to keep
            const sorted = [...users].sort((a, b) => {
                const ta = new Date(a.createdAt || 0).getTime();
                const tb = new Date(b.createdAt || 0).getTime();
                return strategy === 'keepNewest' ? tb - ta : ta - tb;
            });
            const keep = sorted[0];
            const remove = sorted.slice(1);

            // Never delete the one referenced by admin email if it's the only admin
            for (const u of remove) {
                try {
                    await FirebaseUserManager.deleteUser(u.id);
                } catch (err) {
                    console.warn('Failed to delete duplicate user', u.email, u.id, err);
                }
            }
            results.push({ email, keptId: keep.id, removedIds: remove.map(r => r.id) });
        }
        return results;
    }

    // Authentication checker
    async function checkAuth() {
        const currentUser = getCurrentUser();
        
        // If no user in memory, try to restore from Firebase
        if (!currentUser) {
            const restoredUser = await restoreUserSession();
            if (!restoredUser) {
                redirectToLogin();
                return false;
            }
            
            if (restoredUser.status !== 'approved') {
                clearCurrentUser();
                redirectToLogin();
                return false;
            }
            
            return true;
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

    // Global notification checker - can be called from any page
    window.updateGlobalNotifications = async function() {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser) return;

            // Initialize Firebase if not already done
            await initializeFirebase();
            
            // Get all issues from Firestore
            const issuesSnapshot = await db.collection('issues').get();
            const allIssues = issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Check for overdue issues for current user
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const userOverdueIssues = allIssues.filter(issue => {
                // Only check issues assigned to current user
                if (issue.assignee !== currentUser.name) return false;
                
                // Only check non-completed issues
                if (issue.status === 'เสร็จสิ้น') return false;
                
                // Check if due date exists and is in the past
                if (!issue.dueDate) return false;
                
                const dueDate = new Date(issue.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                return dueDate < today;
            });

            // Wait for notification elements to exist with retry logic
            let retries = 0;
            const maxRetries = 10;
            let notificationBell, notificationBadge;
            
            while (retries < maxRetries) {
                notificationBell = document.getElementById('spvi-notification-bell');
                notificationBadge = document.getElementById('spvi-notification-badge');
                
                if (notificationBell && notificationBadge) {
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }

            if (notificationBell && notificationBadge) {
                if (userOverdueIssues.length > 0) {
                    notificationBadge.textContent = userOverdueIssues.length;
                    notificationBadge.style.display = 'flex';
                    notificationBell.style.color = '#ef4444'; // red-500
                } else {
                    notificationBadge.style.display = 'none';
                    notificationBell.style.color = '#9ca3af'; // gray-400
                }
            }
            
            // Store notifications globally
            window.spviOverdueNotifications = userOverdueIssues;
            
            return userOverdueIssues;
        } catch (error) {
            console.error('Error updating notifications:', error);
            return [];
        }
    };

    // Global notification modal function
    window.showNotificationModal = function() {
        // Check if we have overdue notifications stored
        const overdueIssues = window.spviOverdueNotifications || [];
        
        if (overdueIssues.length === 0) {
            alert('ไม่มีประเด็นที่ค้างครบกำหนดสำหรับคุณ');
            return;
        }

        // Create modal if it doesn't exist
        let modal = document.getElementById('notification-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'notification-modal';
            modal.className = 'modal-backdrop';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 1rem;
            `;
            
            modal.innerHTML = `
                <div style="background: white; border-radius: 8px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: between-content; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
                        <h2 style="font-size: 1.25rem; font-weight: 600; color: #dc2626;">🔔 ประเด็นที่ค้างครบกำหนด</h2>
                        <button onclick="this.closest('#notification-modal').style.display='none'" style="background: #f3f4f6; border: none; border-radius: 4px; padding: 0.5rem; cursor: pointer; color: #6b7280;">✕</button>
                    </div>
                    <div id="notification-content"></div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; text-align: right;">
                        <button onclick="this.closest('#notification-modal').style.display='none'" style="background: #6b7280; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; margin-right: 0.5rem;">ปิด</button>
                        <button onclick="window.location.href='${window.location.pathname.includes('/tools/') ? '../' : './'}tools/issue-tracker.html'" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer;">ไปที่ Issue Tracker</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal when clicking backdrop
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Update modal content
        const content = document.getElementById('notification-content');
        if (overdueIssues.length > 0) {
            content.innerHTML = overdueIssues.map(issue => {
                const daysOverdue = Math.floor((new Date() - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));
                return `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 1rem; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <h3 style="font-weight: 600; color: #dc2626; margin-bottom: 0.25rem;">${issue.branch}</h3>
                                <p style="color: #7f1d1d; margin-bottom: 0.5rem;">${issue.issue}</p>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <span style="background: #dc2626; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600; white-space: nowrap;">⏰ เกิน ${daysOverdue} วัน</span>
                                    <span style="background: #fecaca; padding: 0.25rem 0.5rem; border-radius: 0.25rem; white-space: nowrap;">📊 ${issue.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        modal.style.display = 'flex';
    };

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
            },
            {
                name: 'smcoCheck',
                url: 'smco-check.html',
                title: 'SMCO Check',
                icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9m0 0V4a1 1 0 011-1h2a1 1 0 011 1v3M4 7h16'
            },
            {
                name: 'cnCheck',
                url: 'cn-check.html',
                title: 'CN Fraud Checker',
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
                        <button id="spvi-notification-bell" class="spvi-notification-btn" onclick="showNotificationModal()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #9ca3af; padding: 0.4rem; border-radius: 0.375rem; cursor: pointer; transition: all 0.2s; position: relative; display: flex; align-items: center; justify-content: center;">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                            </svg>
                            <span id="spvi-notification-badge" style="position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; font-weight: bold; display: none; align-items: center; justify-content: center; line-height: 1;"></span>
                        </button>
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
        
        // Initialize notification system with retry logic
        const initNotifications = async () => {
            let attempts = 0;
            const maxAttempts = 5;
            
            while (attempts < maxAttempts) {
                attempts++;
                
                if (window.updateGlobalNotifications) {
                    await window.updateGlobalNotifications();
                    break;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        };
        
        // Start notification initialization
        setTimeout(initNotifications, 500);
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

    // Global notification functions
    window.showNotificationModal = function() {
        // Check if we have overdue notifications stored
        const overdueIssues = window.spviOverdueNotifications || [];
        
        if (overdueIssues.length === 0) {
            alert('ไม่มีประเด็นที่ค้างครบกำหนดสำหรับคุณ');
            return;
        }

        // Create modal if it doesn't exist
        let modal = document.getElementById('notification-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'notification-modal';
            modal.className = 'modal-backdrop';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
            modal.innerHTML = `
                <div style="background-color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); width: 95%; max-width: 600px; max-height: 85vh; overflow-y: auto; margin: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                        <h2 style="font-size: 1.25rem; font-weight: bold; color: #ef4444; margin: 0; flex: 1; min-width: 200px;">🔔 ประเด็นที่ค้างครบกำหนด</h2>
                        <button id="close-notification-modal" style="color: #9ca3af; background: none; border: none; cursor: pointer; font-size: 1.5rem; padding: 0.25rem; border-radius: 0.25rem; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">&times;</button>
                    </div>
                    <div id="notification-content" style="margin-bottom: 1.5rem; max-height: 400px; overflow-y: auto;">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
                        <button id="dismiss-notifications" style="background: #e2e8f0; color: #475569; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: background 0.2s; min-width: 80px;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">ปิด</button>
                        <button id="go-to-issues" style="background: #3b82f6; color: white; font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: background 0.2s; min-width: 120px;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">ไปที่หน้าติดตามประเด็น</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listeners
            document.getElementById('close-notification-modal').addEventListener('click', function() {
                modal.remove();
            });
            document.getElementById('dismiss-notifications').addEventListener('click', function() {
                modal.remove();
            });
            document.getElementById('go-to-issues').addEventListener('click', function() {
                modal.remove();
                // Check if we're already on the issue tracker page
                const isInTools = window.location.pathname.includes('/tools/');
                const issueTrackerPath = isInTools ? 'issue-tracker.html' : 'tools/issue-tracker.html';
                
                if (!window.location.pathname.includes('issue-tracker.html')) {
                    window.location.href = issueTrackerPath;
                }
            });
        }

        // Populate modal content
        const content = document.getElementById('notification-content');
        if (content) {
            content.innerHTML = overdueIssues.map(issue => {
                const daysOverdue = Math.floor((new Date() - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));
                return `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 1rem; margin-bottom: 0.75rem; position: relative;">
                        <div>
                            <h3 style="font-weight: 600; color: #991b1b; margin: 0 0 0.5rem 0; font-size: 0.95rem; line-height: 1.3;">${issue.branch || 'ไม่ระบุสาขา'}</h3>
                            <p style="font-size: 0.85rem; color: #7f1d1d; margin: 0 0 0.75rem 0; line-height: 1.4;">${issue.issue || 'ไม่มีรายละเอียด'}</p>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; color: #dc2626;">
                                <span style="background: #fecaca; padding: 0.25rem 0.5rem; border-radius: 0.25rem; white-space: nowrap;">📅 ${new Date(issue.dueDate).toLocaleDateString('th-TH')}</span>
                                <span style="background: #dc2626; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600; white-space: nowrap;">⏰ เกิน ${daysOverdue} วัน</span>
                                <span style="background: #fecaca; padding: 0.25rem 0.5rem; border-radius: 0.25rem; white-space: nowrap;">📊 ${issue.status}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        modal.style.display = 'flex';
    };

    // Initialize authentication when DOM loads
    async function init() {
        // Clean up any legacy localStorage data
        cleanupLegacyStorage();
        
        const currentPage = window.location.pathname;
        
        // Skip auth check if we're on the login page
        const isLoginPage = currentPage.includes('index.html') || 
                           currentPage.endsWith('/') || 
                           currentPage === '/';
        
        if (isLoginPage) {
            return;
        }

        const isAuthenticated = await checkAuth();
        if (isAuthenticated) {
            // Only add user info if not explicitly skipped
            if (!window.skipUserInfoBar) {
                addUserInfo();
            }
            
            // Start periodic notification checks (every 2 minutes)
            setInterval(() => {
                if (window.updateGlobalNotifications) {
                    window.updateGlobalNotifications();
                }
            }, 2 * 60 * 1000);
        }
    }

    // Clean up legacy localStorage data
    function cleanupLegacyStorage() {
        try {
            // Remove old user data from localStorage
            if (localStorage.getItem('spvi_current_user')) {
                console.log('Migrating from localStorage to Firebase-only storage...');
                localStorage.removeItem('spvi_current_user');
            }
        } catch (error) {
            console.warn('Could not clean up legacy storage:', error);
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
        checkAuth: () => checkAuth(), // Make async compatible
        checkAuthentication: () => checkAuth(), // Alias for compatibility
        restoreUserSession, // New function for session restoration
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
        cleanupLegacyStorage, // Expose cleanup function

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
        
        // Duplicate Management
        findDuplicateUsers,
        deduplicateUsers,

        // Configuration access
        getConfig: function() {
            return window.SPViConfig;
        }
    };

    // Auto-initialize when DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init().catch(console.warn));
    } else {
        init().catch(console.warn);
    }

})();
