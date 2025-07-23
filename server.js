// Server-side configuration endpoint
// This would be used in a production environment to serve configuration securely

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configuration endpoint
app.get('/api/config', (req, res) => {
    try {
        // Only send necessary configuration to client
        const config = {
            FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
            FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
            FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
            FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
            FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY,
            ADMIN_EMAIL: process.env.ADMIN_EMAIL,
            APP_NAME: process.env.APP_NAME || 'SPVi Operations Audit',
            APP_VERSION: process.env.APP_VERSION || '1.0.0'
            // Note: Never send passwords to client
        };

        // Validate that all required variables are present
        const required = [
            'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
            'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 
            'FIREBASE_APP_ID', 'ADMIN_EMAIL'
        ];

        for (const key of required) {
            if (!config[key]) {
                return res.status(500).json({ 
                    error: `Missing environment variable: ${key}` 
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
        res.status(500).json({ error: 'Configuration load failed' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0'
    });
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
