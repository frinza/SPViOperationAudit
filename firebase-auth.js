// Firebase Authentication System for SPVi Toolkit
// Enhanced with user management and admin tools

(function() {
    'use strict';
    
    // Firebase Configuration
    const firebaseConfig = {
        apiKey: "AIzaSyBiNqHECmqDg0uk6fsR66qfldBCTK76OQE",
        authDomain: "spvi-operations-audit.firebaseapp.com",
        projectId: "spvi-operations-audit",
        storageBucket: "spvi-operations-audit.firebasestorage.app",
        messagingSenderId: "179262645525",
        appId: "1:179262645525:web:95c002a6df7552220e351c",
        measurementId: "G-XBZVKJPDZQ"
    };

    // Initialize Firebase
    let db = null;
    let auth = null;
    let isFirebaseInitialized = false;

    async function initializeFirebase() {
        if (isFirebaseInitialized) return;
        
        try {
            if (!window.firebase) {
                throw new Error('Firebase SDK not loaded. Please include Firebase scripts.');
            }
            
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            db = firebase.firestore();
            auth = firebase.auth();
            isFirebaseInitialized = true;
            
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    // User data structure
    function createUserData(userData) {
        return {
            id: userData.id || generateId(),
            name: userData.name,
            email: userData.email,
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
            }
        };
    }

    // Utility functions
    function generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function hashPassword(password) {
        // Simple hash for demo - in production, use proper server-side hashing
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
    }

    function clearCurrentUser() {
        localStorage.removeItem('spvi_current_user');
    }

    // Firebase User Operations - Online Only
    const FirebaseUserManager = {
        async registerUser(userData) {
            await initializeFirebase();
            
            try {
                // Check if user already exists
                const existingUser = await this.getUserByEmail(userData.email);
                if (existingUser) {
                    throw new Error('User with this email already exists');
                }

                const newUser = createUserData({
                    ...userData,
                    password: hashPassword(userData.password)
                });

                // Add to Firestore
                const docRef = await db.collection('users').add(newUser);
                newUser.id = docRef.id;

                // Update document with the actual ID
                await db.collection('users').doc(docRef.id).update({ id: docRef.id });

                console.log('User registered successfully in Firestore');
                return newUser;
            } catch (error) {
                console.error('Error registering user:', error);
                throw error;
            }
        },

        async loginUser(email, password) {
            await initializeFirebase();
            
            try {
                console.log('🔑 Attempting login for email:', email);
                const hashedPassword = hashPassword(password);
                console.log('🔒 Password hash:', hashedPassword);
                
                // Query Firestore for user
                console.log('🔍 Querying Firestore for user...');
                const snapshot = await db.collection('users')
                    .where('email', '==', email)
                    .where('password', '==', hashedPassword)
                    .limit(1)
                    .get();

                console.log('📊 Query result - Empty:', snapshot.empty);
                console.log('📊 Query result - Size:', snapshot.size);

                if (snapshot.empty) {
                    console.log('❌ No user found with matching email/password');
                    
                    // Let's also check if user exists with just email
                    const emailOnlySnapshot = await db.collection('users')
                        .where('email', '==', email)
                        .get();
                    
                    if (emailOnlySnapshot.empty) {
                        console.log('❌ No user found with this email at all');
                    } else {
                        console.log('⚠️ User exists but password doesn\'t match');
                        const userDoc = emailOnlySnapshot.docs[0];
                        const userData = userDoc.data();
                        console.log('Stored password hash:', userData.password);
                        console.log('Login password hash:', hashedPassword);
                    }
                    
                    return null;
                }

                const doc = snapshot.docs[0];
                const user = { id: doc.id, ...doc.data() };
                
                console.log('✅ User found:', user.email);
                console.log('User status:', user.status);
                console.log('User role:', user.role);

                // Update last login
                await this.updateUser(user.id, { lastLogin: new Date().toISOString() });
                user.lastLogin = new Date().toISOString();

                return user;
            } catch (error) {
                console.error('Error logging in user:', error);
                throw error;
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
                console.error('Error getting users:', error);
                throw error;
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
                console.error('Error getting user by email:', error);
                throw error;
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
                console.error('Error updating user:', error);
                throw error;
            }
        },

        async deleteUser(userId) {
            await initializeFirebase();
            
            try {
                await db.collection('users').doc(userId).delete();
                return true;
            } catch (error) {
                console.error('Error deleting user:', error);
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
                console.error('Error updating password:', error);
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
                console.error('Error updating user role:', error);
                throw error;
            }
        },

        async initializeDefaultAdmin() {
            await initializeFirebase();
            
            try {
                const adminEmail = 'admin@spvi.co.th';
                console.log('Checking for existing admin user...');
                const existingAdmin = await this.getUserByEmail(adminEmail);
                
                if (!existingAdmin) {
                    console.log('Creating default admin user...');
                    
                    const adminUser = {
                        name: 'System Administrator',
                        email: adminEmail,
                        password: 'admin123', // This will be hashed by registerUser
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
                    console.log('✅ Default admin user created successfully:', createdAdmin.email);
                    console.log('Admin ID:', createdAdmin.id);
                    console.log('Admin Status:', createdAdmin.status);
                    console.log('Admin Role:', createdAdmin.role);
                } else {
                    console.log('✅ Default admin user already exists');
                    console.log('Admin ID:', existingAdmin.id);
                    console.log('Admin Email:', existingAdmin.email);
                    console.log('Admin Status:', existingAdmin.status);
                    console.log('Admin Role:', existingAdmin.role);
                    console.log('Admin Password Hash:', existingAdmin.password);
                    
                    // Check if password is missing and fix it
                    if (!existingAdmin.password || existingAdmin.password === undefined) {
                        console.log('⚠️ Admin password is missing! Fixing...');
                        const correctPasswordHash = hashPassword('admin123');
                        await this.updateUser(existingAdmin.id, { 
                            password: correctPasswordHash 
                        });
                        console.log('✅ Admin password has been fixed');
                        console.log('New password hash:', correctPasswordHash);
                    }
                }
            } catch (error) {
                console.error('Error initializing default admin:', error);
                // Try to provide more specific error information
                if (error.message.includes('permission')) {
                    console.error('Firestore permission error. Please check your Firestore security rules.');
                }
            }
        },

        async changeAdminPassword(currentPassword, newPassword) {
            await initializeFirebase();
            
            try {
                const adminEmail = 'admin@spvi.co.th';
                const hashedCurrentPassword = hashPassword(currentPassword);
                
                // Verify current password first
                const admin = await this.getUserByEmail(adminEmail);
                if (!admin) {
                    throw new Error('Admin user not found');
                }
                
                if (admin.password !== hashedCurrentPassword) {
                    throw new Error('Current password is incorrect');
                }
                
                // Update with new password
                await this.updateUserPassword(admin.id, newPassword);
                console.log('Admin password updated successfully');
                return true;
            } catch (error) {
                console.error('Error changing admin password:', error);
                throw error;
            }
        },

        async getAdminUser() {
            await initializeFirebase();
            
            try {
                const adminEmail = 'admin@spvi.co.th';
                return await this.getUserByEmail(adminEmail);
            } catch (error) {
                console.error('Error getting admin user:', error);
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
        if (!window.location.pathname.includes('login.html')) {
            // Determine if we're in a tools subdirectory
            const isInTools = window.location.pathname.includes('/tools/');
            const loginPath = isInTools ? '../login.html' : 'login.html';
            window.location.href = loginPath;
        }
    }

    // Add user info bar to pages
    function addUserInfo() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const userInfoBar = document.createElement('div');
        userInfoBar.id = 'spvi-user-info';
        userInfoBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #1e40af, #3b82f6);
            color: white;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: 'Sarabun', sans-serif;
        `;

        const userManagementButton = currentUser.role === 'admin' 
            ? `<button 
                id="spvi-user-management-btn" 
                style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; margin-right: 0.5rem;"
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

        userInfoBar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="spvi-nav-links">
                    <a href="${basePath}index.html" class="spvi-nav-link">หน้าหลัก</a>
                    <a href="${toolsPath}stock-count.html" class="spvi-nav-link">ตรวจนับสต็อก</a>
                    <a href="${toolsPath}cash-control.html" class="spvi-nav-link">ควบคุมเงินสด</a>
                    <a href="${toolsPath}checklist.html" class="spvi-nav-link">รายการตรวจสอบ</a>
                    <a href="${toolsPath}audit-calendar.html" class="spvi-nav-link">ปฏิทินตรวจสอบ</a>
                    <a href="${toolsPath}issue-tracker.html" class="spvi-nav-link">ติดตามประเด็น</a>
                    <a href="${toolsPath}report-comparison.html" class="spvi-nav-link">เปรียบเทียบรายงาน</a>
                    <a href="${toolsPath}risk-analyzer.html" class="spvi-nav-link">วิเคราะห์ความเสี่ยง</a>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="user-details" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
                    <span class="font-medium">${currentUser.name}</span>
                    <span class="opacity-75">•</span>
                    <span class="opacity-90">${currentUser.department}</span>
                    <span class="opacity-75">•</span>
                    <span class="opacity-75 text-xs uppercase font-semibold">${currentUser.role}</span>
                </div>
                <div class="user-actions" style="display: flex; gap: 0.5rem;">
                    ${userManagementButton}
                    <button 
                        id="spvi-logout-btn" 
                        class="spvi-logout-btn"
                    >
                        ออกจากระบบ
                    </button>
                </div>
            </div>
        `;

        document.body.insertBefore(userInfoBar, document.body.firstChild);
        document.body.style.paddingTop = '3rem';

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
    }

    // Initialize authentication when DOM loads
    function init() {
        // Skip auth check if we're on the login page
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname.includes('user-management.html')) {
            return;
        }

        if (checkAuth()) {
            addUserInfo();
        }
    }

    // Export Firebase Auth API
    window.SPViAuth = {
        // Core functions
        getCurrentUser,
        setCurrentUser,
        clearCurrentUser,
        checkAuth,
        logout: function() {
            clearCurrentUser();
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

        // Firebase config management
        setFirebaseConfig: function(config) {
            Object.assign(firebaseConfig, config);
        },
        
        getFirebaseConfig: function() {
            return { ...firebaseConfig };
        },

        // Debug functions
        testPasswordHash: function(password) {
            const hash = hashPassword(password);
            console.log('Password:', password);
            console.log('Hash:', hash);
            return hash;
        },

        debugAdminLogin: async function() {
            console.log('=== ADMIN LOGIN DEBUG ===');
            try {
                const admin = await FirebaseUserManager.getUserByEmail('admin@spvi.co.th');
                if (admin) {
                    console.log('✅ Admin user found in Firestore');
                    console.log('Admin data:', admin);
                    
                    const testHash = hashPassword('admin123');
                    console.log('Expected hash for "admin123":', testHash);
                    console.log('Stored hash:', admin.password);
                    console.log('Hashes match:', testHash === admin.password);
                } else {
                    console.log('❌ Admin user NOT found in Firestore');
                }
            } catch (error) {
                console.error('Debug error:', error);
            }
            console.log('=== END DEBUG ===');
        },

        fixAdminPassword: async function() {
            console.log('🔧 === FIXING ADMIN PASSWORD ===');
            try {
                const admin = await FirebaseUserManager.getUserByEmail('admin@spvi.co.th');
                if (admin) {
                    const correctHash = hashPassword('admin123');
                    await FirebaseUserManager.updateUser(admin.id, { password: correctHash });
                    console.log('✅ Admin password fixed successfully');
                    console.log('New password hash:', correctHash);
                    return true;
                } else {
                    console.log('❌ Admin user not found');
                    return false;
                }
            } catch (error) {
                console.error('❌ Error fixing admin password:', error);
                return false;
            }
        }
    };

    // Auto-initialize when DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
