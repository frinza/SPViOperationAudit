// Server-side Firebase verification system
// Enhanced with Firebase Admin SDK for secure server-side user verification

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Development mode test users (when Firebase is not available)
const TEST_USERS = {
    'admin@spvi.co.th': {
        id: 'test-admin-123',
        name: 'Test Admin',
        email: 'admin@spvi.co.th',
        password: '$2b$12$BuXI00g.cEdAJuRZ9XT04.KiWJCrF9aKGSug3IGgGTOB4MGHNGjZS', // admin123 hashed
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
        },
        createdAt: new Date().toISOString(),
        sessionInfo: { isOnline: false }
    },
    'user1@spvi.co.th': {
        id: 'test-user-456',
        name: 'Test User 1',
        email: 'user1@spvi.co.th',
        password: '$2b$12$BuXI00g.cEdAJuRZ9XT04.KiWJCrF9aKGSug3IGgGTOB4MGHNGjZS', // admin123 hashed (for testing)
        department: 'ADMIN',
        position: 'Staff',
        role: 'user',
        status: 'approved',
        permissions: {
            stockCount: true,
            cashControl: true,
            checklist: true,
            riskAnalyzer: true,
            auditCalendar: true,
            reportComparison: true,
            issueTracker: true,
            userManagement: false
        },
        createdAt: new Date().toISOString(),
        sessionInfo: { isOnline: false }
    },
    'user2@spvi.co.th': {
        id: 'test-user-789',
        name: 'Test User 2',
        email: 'user2@spvi.co.th',
        password: '$2b$12$BuXI00g.cEdAJuRZ9XT04.KiWJCrF9aKGSug3IGgGTOB4MGHNGjZS', // admin123 hashed (for testing)
        department: 'Operations',
        position: 'Auditor',
        role: 'user',
        status: 'approved',
        permissions: {
            stockCount: true,
            cashControl: true,
            checklist: true,
            riskAnalyzer: false,
            auditCalendar: true,
            reportComparison: false,
            issueTracker: true,
            userManagement: false
        },
        createdAt: new Date().toISOString(),
        sessionInfo: { isOnline: false }
    }
};

// Initialize Firebase Admin SDK
let firebaseApp = null;
try {
    // Check if Firebase Admin is already initialized
    if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
            : require('./firebase-service-account.json.backup'); // Use backup file

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    } else {
        firebaseApp = admin.app();
    }
    console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error.message);
    console.warn('Server will run in TEST MODE - using local test users only');
    console.warn('To connect to real Firebase database:');
    console.warn('1. Download service account key from Firebase Console');
    console.warn('2. Save as firebase-service-account.json.backup');
    console.warn('3. Or set FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
    console.warn('4. Restart the server');
}

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [
            process.env.FRONTEND_URL || 'https://your-domain.com',
            'https://spvi-operations-audit.web.app',
            'https://spvi-operations-audit.firebaseapp.com'
        ]
        : [
            'http://localhost:3000', 
            'http://127.0.0.1:3000', 
            'http://localhost:5500',
            'http://localhost:8080',
            'http://localhost:5000'
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Rate limiting middleware
const rateLimitMap = new Map();
const rateLimit = (maxRequests = 10, windowMs = 60000) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        const currentTime = Date.now();
        
        if (!rateLimitMap.has(clientIP)) {
            rateLimitMap.set(clientIP, { count: 1, resetTime: currentTime + windowMs });
            return next();
        }
        
        const clientData = rateLimitMap.get(clientIP);
        
        if (currentTime > clientData.resetTime) {
            clientData.count = 1;
            clientData.resetTime = currentTime + windowMs;
            return next();
        }
        
        if (clientData.count >= maxRequests) {
            return res.status(429).json({ 
                error: 'Too many requests. Please try again later.' 
            });
        }
        
        clientData.count++;
        next();
    };
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify with Firebase if available, otherwise use test users
        if (firebaseApp) {
            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(decoded.userId).get();
            
            if (!userDoc.exists) {
                return res.status(401).json({ error: 'User not found' });
            }
            
            const userData = userDoc.data();
            if (userData.status !== 'approved') {
                return res.status(403).json({ error: 'User not approved' });
            }
            
            req.user = { id: decoded.userId, ...userData };
        } else {
            // Use test mode
            const testUser = TEST_USERS[decoded.email];
            if (!testUser) {
                return res.status(401).json({ error: 'User not found' });
            }
            req.user = { id: decoded.userId, ...testUser };
        }
        
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// User Authentication Endpoints

// Server-side login with Firebase verification
app.post('/api/auth/login', rateLimit(5, 300000), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (firebaseApp) {
            // Use Firebase when available
            const db = admin.firestore();
            
            // Get user from Firestore
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('email', '==', email).limit(1).get();
            
            if (snapshot.empty) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            // Check if user is approved
            if (userData.status !== 'approved') {
                return res.status(403).json({ 
                    error: 'Account not approved', 
                    status: userData.status 
                });
            }
            
            // Verify password
            let passwordValid = false;
            
            if (userData.password) {
                // Check if password is hashed with bcrypt
                if (userData.password.startsWith('$2b$')) {
                    passwordValid = await bcrypt.compare(password, userData.password);
                } 
                // Legacy SPVi password format support
                else if (userData.password.startsWith('spvi_')) {
                    const legacyHash = hashPasswordLegacy(password);
                    passwordValid = userData.password === legacyHash;
                    
                    // Migrate to bcrypt if password matches
                    if (passwordValid) {
                        const newHash = await bcrypt.hash(password, 12);
                        await userDoc.ref.update({ 
                            password: newHash,
                            passwordMigrated: true,
                            lastPasswordUpdate: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                // Old numeric format
                else if (/^-?\d+$/.test(userData.password)) {
                    const oldHash = hashPasswordOldFormat(password);
                    passwordValid = userData.password === oldHash;
                    
                    // Migrate to bcrypt if password matches
                    if (passwordValid) {
                        const newHash = await bcrypt.hash(password, 12);
                        await userDoc.ref.update({ 
                            password: newHash,
                            passwordMigrated: true,
                            lastPasswordUpdate: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                // Direct password comparison for testing
                else {
                    passwordValid = userData.password === password;
                }
            }
            
            if (!passwordValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Update last login
            await userDoc.ref.update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                lastLoginIP: req.ip || req.connection.remoteAddress,
                lastLoginUserAgent: req.headers['user-agent'] || 'Unknown'
            });
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: userDoc.id, 
                    email: userData.email,
                    role: userData.role,
                    iat: Math.floor(Date.now() / 1000)
                },
                JWT_SECRET,
                { expiresIn: '8h' }
            );
            
            // Return user data and token
            const userResponse = {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                department: userData.department,
                position: userData.position,
                role: userData.role,
                status: userData.status,
                permissions: userData.permissions,
                lastLogin: new Date().toISOString()
            };
            
            res.json({
                success: true,
                user: userResponse,
                token,
                expiresIn: '8h'
            });
        } else {
            // Fall back to test users for development
            console.log('Using test mode - Firebase not available');
            if (!TEST_USERS[email]) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const testUser = TEST_USERS[email];
            
            // Verify password with bcrypt
            const passwordValid = await bcrypt.compare(password, testUser.password);
            if (!passwordValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: testUser.id, 
                    email: testUser.email,
                    role: testUser.role,
                    iat: Math.floor(Date.now() / 1000)
                },
                JWT_SECRET,
                { expiresIn: '8h' }
            );
            
            // Return user data and token
            const userResponse = {
                id: testUser.id,
                name: testUser.name,
                email: testUser.email,
                department: testUser.department,
                position: testUser.position,
                role: testUser.role,
                status: testUser.status,
                permissions: testUser.permissions,
                lastLogin: new Date().toISOString()
            };
            
            res.json({
                success: true,
                user: userResponse,
                token,
                expiresIn: '8h'
            });
        }
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify current session/token
app.post('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                department: req.user.department,
                position: req.user.position,
                role: req.user.role,
                status: req.user.status,
                permissions: req.user.permissions
            }
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Update session activity
app.post('/api/auth/activity', authenticateToken, async (req, res) => {
    try {
        // In test mode, just return success
        // In Firebase mode, this would update the user's session info
        res.json({ success: true });
    } catch (error) {
        console.error('Activity update error:', error);
        res.status(500).json({ error: 'Activity update failed' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    try {
        // In test mode, just return success
        // In Firebase mode, this would update the user's session info
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Password utilities for legacy support
function hashPasswordLegacy(password) {
    // SPVi legacy password hashing: spvi_ + simple hash
    let hash = 0;
    if (password.length === 0) return 'spvi_0';
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return 'spvi_' + Math.abs(hash);
}

function hashPasswordOldFormat(password) {
    // Old numeric format hashing
    let hash = 0;
    if (password.length === 0) return '0';
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

// Admin endpoints for user management
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        if (firebaseApp) {
            // Use Firebase when available
            const db = admin.firestore();
            const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
            
            const users = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    password: undefined // Never send passwords to client
                };
            });
            
            res.json({ users });
        } else {
            // Return test users
            const users = Object.values(TEST_USERS).map(user => ({
                ...user,
                password: undefined
            }));
            res.json({ users });
        }
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/admin/users/:userId/disconnect', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // In test mode, just return success
        res.json({ success: true });
        
    } catch (error) {
        console.error('Disconnect user error:', error);
        res.status(500).json({ error: 'Failed to disconnect user' });
    }
});

// Get online users
app.get('/api/admin/users/online', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // In test mode, return empty array
        res.json({ users: [] });
        
    } catch (error) {
        console.error('Get online users error:', error);
        res.status(500).json({ error: 'Failed to fetch online users' });
    }
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
    try {
        // Check if running in development mode
        const isDevelopment = process.env.NODE_ENV !== 'production';
        
        // Only send necessary configuration to client
        const config = {
            FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || (isDevelopment ? 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' : null),
            FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || (isDevelopment ? 'your-project.firebaseapp.com' : null),
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || (isDevelopment ? 'your-project-id' : null),
            FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || (isDevelopment ? 'your-project.firebasestorage.app' : null),
            FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || (isDevelopment ? '000000000000' : null),
            FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || (isDevelopment ? '1:000000000000:web:xxxxxxxxxxxxxxxx' : null),
            FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID || (isDevelopment ? 'G-XXXXXXXXXX' : null),
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || (isDevelopment ? 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' : null),
            ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@spvi.co.th',
            APP_NAME: process.env.APP_NAME || 'SPVi Operations Audit',
            APP_VERSION: process.env.APP_VERSION || '1.0.0'
            // Note: Never send passwords to client
        };

        // In production, validate that all required variables are present
        if (!isDevelopment) {
            const required = [
                'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
                'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 
                'FIREBASE_APP_ID', 'ADMIN_EMAIL'
            ];

            const missing = required.filter(key => !config[key]);
            if (missing.length > 0) {
                console.error('Missing required environment variables:', missing);
                return res.status(500).json({ 
                    error: 'Server configuration incomplete',
                    missing: missing,
                    message: 'Please configure environment variables for production deployment'
                });
            }
        }

        // Optional variables (warn but don't fail)
        if (!config.GEMINI_API_KEY) {
            console.warn('Warning: GEMINI_API_KEY not set - AI features will not work');
        }

        res.json(config);
    } catch (error) {
        console.error('Configuration endpoint error:', error);
        res.status(500).json({ 
            error: 'Configuration load failed',
            message: isDevelopment ? error.message : 'Internal server error'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        firebaseAvailable: !!firebaseApp
    });
});

// Test Firebase collections endpoint
app.get('/api/test/collections', authenticateToken, async (req, res) => {
    try {
        if (!firebaseApp) {
            return res.status(503).json({ 
                error: 'Firebase not available',
                message: 'Server running in test mode'
            });
        }

        const db = admin.firestore();
        
        // Test issues collection
        try {
            console.log('Testing issues collection...');
            const issuesSnapshot = await db.collection('issues').limit(5).get();
            console.log('Issues collection query successful, found:', issuesSnapshot.size, 'documents');
            
            const issues = issuesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            res.json({
                status: 'success',
                collections: {
                    issues: {
                        exists: true,
                        count: issuesSnapshot.size,
                        sample: issues
                    }
                }
            });
        } catch (firestoreError) {
            console.error('Firestore collection test failed:', firestoreError);
            res.status(500).json({
                error: 'Firestore access failed',
                message: firestoreError.message,
                code: firestoreError.code
            });
        }
        
    } catch (error) {
        console.error('Collection test error:', error);
        res.status(500).json({ 
            error: 'Collection test failed',
            message: error.message
        });
    }
});

// Issues API endpoints for Issue Tracker
app.get('/api/issues', authenticateToken, async (req, res) => {
    try {
        if (!firebaseApp) {
            // Return test data when Firebase is not available
            const testIssues = [
                {
                    id: 'test-issue-1',
                    branch: 'สาขาทดสอบ 001',
                    issue: 'ทดสอบระบบ Issue Tracker',
                    status: 'กำลังดำเนินการ',
                    priority: 'สูง',
                    assignee: 'Test Admin',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
                    createdAt: new Date().toISOString(),
                    createdBy: req.user.name
                },
                {
                    id: 'test-issue-2',
                    branch: 'สาขาทดสอบ 002',
                    issue: 'ทดสอบการแสดงผลข้อมูล',
                    status: 'รอดำเนินการ',
                    priority: 'ปานกลาง',
                    assignee: 'Test User 2',
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
                    createdAt: new Date().toISOString(),
                    createdBy: req.user.name
                }
            ];
            
            return res.json({
                success: true,
                issues: testIssues,
                count: testIssues.length,
                source: 'test_data'
            });
        }

        // Use Firebase when available
        const db = admin.firestore();
        const snapshot = await db.collection('issues').orderBy('createdAt', 'desc').get();
        
        const issues = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            issues: issues,
            count: issues.length,
            source: 'firebase'
        });
        
    } catch (error) {
        console.error('Get issues error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch issues',
            message: error.message
        });
    }
});

app.post('/api/issues', authenticateToken, async (req, res) => {
    try {
        const { branch, issue, priority, assignee, dueDate } = req.body;
        
        if (!branch || !issue || !priority) {
            return res.status(400).json({ error: 'Branch, issue, and priority are required' });
        }

        const newIssue = {
            branch,
            issue,
            priority,
            assignee: assignee || req.user.name,
            dueDate,
            status: 'รอดำเนินการ',
            createdAt: new Date().toISOString(),
            createdBy: req.user.name,
            updatedAt: new Date().toISOString()
        };

        if (!firebaseApp) {
            // In test mode, just return the issue with a generated ID
            newIssue.id = 'test-' + Date.now();
            return res.json({
                success: true,
                issue: newIssue,
                source: 'test_data'
            });
        }

        // Use Firebase when available
        const db = admin.firestore();
        const docRef = await db.collection('issues').add(newIssue);
        
        res.json({
            success: true,
            issue: { id: docRef.id, ...newIssue },
            source: 'firebase'
        });
        
    } catch (error) {
        console.error('Create issue error:', error);
        res.status(500).json({ 
            error: 'Failed to create issue',
            message: error.message
        });
    }
});

app.put('/api/issues/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Issue ID is required' });
        }

        updates.updatedAt = new Date().toISOString();
        updates.updatedBy = req.user.name;

        if (!firebaseApp) {
            // In test mode, just return the updated issue
            return res.json({
                success: true,
                issue: { id, ...updates },
                source: 'test_data'
            });
        }

        // Use Firebase when available
        const db = admin.firestore();
        await db.collection('issues').doc(id).update(updates);
        
        const updatedDoc = await db.collection('issues').doc(id).get();
        const updatedIssue = { id: updatedDoc.id, ...updatedDoc.data() };
        
        res.json({
            success: true,
            issue: updatedIssue,
            source: 'firebase'
        });
        
    } catch (error) {
        console.error('Update issue error:', error);
        res.status(500).json({ 
            error: 'Failed to update issue',
            message: error.message
        });
    }
});

app.delete('/api/issues/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ error: 'Issue ID is required' });
        }

        if (!firebaseApp) {
            // In test mode, just return success
            return res.json({
                success: true,
                message: 'Issue deleted (test mode)',
                source: 'test_data'
            });
        }

        // Use Firebase when available
        const db = admin.firestore();
        await db.collection('issues').doc(id).delete();
        
        res.json({
            success: true,
            message: 'Issue deleted successfully',
            source: 'firebase'
        });
        
    } catch (error) {
        console.error('Delete issue error:', error);
        res.status(500).json({ 
            error: 'Failed to delete issue',
            message: error.message
        });
    }
});

// Client IP endpoint
app.get('/api/client-ip', (req, res) => {
    try {
        // Get client IP from various possible sources
        const forwarded = req.headers['x-forwarded-for'];
        const real = req.headers['x-real-ip'];
        const clientIP = forwarded ? forwarded.split(',')[0] : 
                        real || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                        req.ip ||
                        '127.0.0.1';

        res.json({ 
            ip: clientIP,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Client IP endpoint error:', error);
        res.status(500).json({ 
            error: 'Failed to determine client IP',
            ip: '127.0.0.1'
        });
    }
});

// Serve static files for all routes (SPA fallback)
app.get('*', (req, res) => {
    // Don't serve API routes as static files
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // For SPA routing, serve index.html for non-existent routes
    const filePath = path.join(__dirname, req.path);
    const fs = require('fs');
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`SPVi Operations Audit server running on http://localhost:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Test mode:', !firebaseApp ? 'ENABLED (Firebase not available)' : 'DISABLED');
    
    // Check for required environment variables
    const requiredEnvVars = [
        'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 
        'FIREBASE_APP_ID', 'ADMIN_EMAIL', 'ADMIN_DEFAULT_PASSWORD'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.warn('Warning: Missing environment variables:', missing);
        console.warn('Application may not function correctly without these variables');
    }
    
    if (!process.env.GEMINI_API_KEY) {
        console.warn('Warning: GEMINI_API_KEY not set - AI features will not work');
    }
});

module.exports = app;
