// Configuration Manager for SPVi Toolkit
// Handles environment variables and secure credential loading

(function() {
    'use strict';

    // Development mode fallback credentials (should match .env file)
    const FALLBACK_CONFIG = {
        FIREBASE_API_KEY: 'AIzaSyBiNqHECmqDg0uk6fsR66qfldBCTK76OQE',
        FIREBASE_AUTH_DOMAIN: 'spvi-operations-audit.firebaseapp.com',
        FIREBASE_PROJECT_ID: 'spvi-operations-audit',
        FIREBASE_STORAGE_BUCKET: 'spvi-operations-audit.firebasestorage.app',
        FIREBASE_MESSAGING_SENDER_ID: '179262645525',
        FIREBASE_APP_ID: '1:179262645525:web:95c002a6df7552220e351c',
        FIREBASE_MEASUREMENT_ID: 'G-XBZVKJPDZQ',
        GEMINI_API_KEY: 'AIzaSyAuWkWlmGv0AqizfxpOxDgIK4SmrJrDBHU',
        ADMIN_EMAIL: 'admin@spvi.co.th',
        ADMIN_DEFAULT_PASSWORD: 'admin123',
        APP_NAME: 'SPVi Operations Audit',
        APP_VERSION: '1.0.0',
        
        // Session timeout configuration (in minutes)
        SESSION_INACTIVITY_TIMEOUT: 30,
        SESSION_MAX_DURATION: 480, // 8 hours
        SESSION_WARNING_TIME: 5
    };

    // Function to get environment variable with fallback
    function getEnvVar(key) {
        // Try to get from environment variables (if available in Node.js context)
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
        
        // Try to get from window environment (if set by server)
        if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
            return window.ENV[key];
        }
        
        // Try to get from localStorage (if previously loaded)
        try {
            const storedConfig = localStorage.getItem('spvi_env_config');
            if (storedConfig) {
                const config = JSON.parse(storedConfig);
                if (config[key]) {
                    return config[key];
                }
            }
        } catch (e) {
            // Continue to fallback
        }
        
        // Fallback to hardcoded values for development
        return FALLBACK_CONFIG[key];
    }

    // Configuration object
    const SPViConfig = {
        // Firebase Configuration
        getFirebaseConfig() {
            return {
                apiKey: getEnvVar('FIREBASE_API_KEY'),
                authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
                projectId: getEnvVar('FIREBASE_PROJECT_ID'),
                storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
                messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
                appId: getEnvVar('FIREBASE_APP_ID'),
                measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID')
            };
        },

        // Gemini AI Configuration
        getGeminiConfig() {
            return {
                apiKey: getEnvVar('GEMINI_API_KEY')
            };
        },

        // Admin Configuration
        getAdminConfig() {
            return {
                email: getEnvVar('ADMIN_EMAIL'),
                defaultPassword: getEnvVar('ADMIN_DEFAULT_PASSWORD')
            };
        },

        // App Configuration
        getAppConfig() {
            return {
                name: getEnvVar('APP_NAME'),
                version: getEnvVar('APP_VERSION')
            };
        },

        // Get individual environment variable
        get(key) {
            return getEnvVar(key);
        },

        // Load configuration from server endpoint (for production)
        async loadFromServer() {
            try {
                // Skip server loading for file:// protocol
                if (window.location.protocol === 'file:') {
                    console.log('File protocol detected, using fallback configuration');
                    return FALLBACK_CONFIG;
                }
                
                const response = await fetch('/api/config');
                if (response.ok) {
                    const config = await response.json();
                    
                    // Store in localStorage for subsequent requests
                    localStorage.setItem('spvi_env_config', JSON.stringify(config));
                    
                    // Set on window for immediate access
                    window.ENV = config;
                    
                    return config;
                }
            } catch (error) {
                console.warn('Could not load configuration from server, using fallback:', error.message);
            }
            
            return FALLBACK_CONFIG;
        },

        // Initialize configuration
        async init() {
            try {
                await this.loadFromServer();
            } catch (error) {
                console.warn('Using fallback configuration');
            }
        },

        // Validate configuration
        validate() {
            const firebaseConfig = this.getFirebaseConfig();
            const adminConfig = this.getAdminConfig();
            const geminiConfig = this.getGeminiConfig();
            
            const required = [
                'apiKey', 'authDomain', 'projectId', 'storageBucket', 
                'messagingSenderId', 'appId'
            ];
            
            for (const key of required) {
                if (!firebaseConfig[key]) {
                    throw new Error(`Missing required Firebase configuration: ${key}`);
                }
            }
            
            if (!adminConfig.email || !adminConfig.defaultPassword) {
                throw new Error('Missing admin configuration');
            }

            if (!geminiConfig.apiKey) {
                console.warn('Gemini API key not configured - AI features may not work');
            }
            
            return true;
        },

        // Development helper to show current config (without sensitive data)
        debug() {
            const config = this.getFirebaseConfig();
            const adminConfig = this.getAdminConfig();
            const geminiConfig = this.getGeminiConfig();
            const appConfig = this.getAppConfig();
            
            console.log('Firebase Config:', {
                ...config,
                apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'missing'
            });
            
            console.log('Admin Config:', {
                email: adminConfig.email,
                hasPassword: !!adminConfig.defaultPassword
            });

            console.log('Gemini Config:', {
                hasApiKey: !!geminiConfig.apiKey,
                apiKey: geminiConfig.apiKey ? `${geminiConfig.apiKey.substring(0, 10)}...` : 'missing'
            });

            console.log('App Config:', appConfig);
            
            const sessionConfig = this.getSessionConfig();
            console.log('Session Config:', sessionConfig);
        },

        // Get session timeout configuration
        getSessionConfig() {
            return {
                inactivityTimeout: parseInt(getEnvVar('SESSION_INACTIVITY_TIMEOUT')) || 30, // minutes
                maxDuration: parseInt(getEnvVar('SESSION_MAX_DURATION')) || 480, // minutes (8 hours)
                warningTime: parseInt(getEnvVar('SESSION_WARNING_TIME')) || 5 // minutes
            };
        }
    };

    // Export configuration manager
    window.SPViConfig = SPViConfig;

    // Auto-initialize if not in Node.js environment
    if (typeof window !== 'undefined') {
        // Initialize configuration when script loads
        SPViConfig.init().catch(console.warn);
    }

})();
