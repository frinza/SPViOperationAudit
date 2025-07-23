# Environment Variables Setup Guide

This guide explains how to set up and manage environment variables for the SPVi Operations Audit toolkit.

## Overview

All sensitive credentials have been moved to environment variables for better security:
- Firebase configuration
- Gemini AI API key
- Admin credentials
- Application settings

## Files Created/Modified

### New Files
- `.env` - Environment variables configuration
- `config.js` - Configuration manager with fallbacks
- `server.js` - Production server with secure config endpoint
- `package.json` - Node.js dependencies and scripts

### Modified Files
- `.gitignore` - Updated to exclude credential files
- `firebase-auth.js` - Updated to use configuration manager
- `dashboard.html` - Updated to use config for Gemini API
- All HTML files - Updated to include config.js script

## Environment Variables

### Firebase Configuration
```bash
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### AI Configuration
```bash
GEMINI_API_KEY=your_gemini_api_key
```

### Admin Configuration
```bash
ADMIN_EMAIL=admin@spvi.co.th
ADMIN_DEFAULT_PASSWORD=admin123
```

### Application Configuration
```bash
APP_NAME=SPVi Operations Audit
APP_VERSION=1.0.0
```

## Setup Instructions

### Development Setup

1. **Install Dependencies**
   ```bash
   cd /Users/kankitpumcharern/Downloads/SPViOperationAudit
   npm install
   ```

2. **Environment Variables**
   - The `.env` file is already created with your current credentials
   - Never commit this file to version control
   - Copy `.env` to `.env.local` for local development if needed

3. **Start Development Server**
   ```bash
   npm run dev
   # or
   npm start
   ```

4. **Debug Configuration**
   ```bash
   npm run config:debug
   ```

### Production Setup

1. **Server Deployment**
   - Copy all files to your server
   - Set environment variables on your server (don't use .env file in production)

2. **Environment Variables on Server**
   ```bash
   export FIREBASE_API_KEY="your_api_key"
   export FIREBASE_AUTH_DOMAIN="your_domain"
   export FIREBASE_PROJECT_ID="your_project"
   export FIREBASE_STORAGE_BUCKET="your_bucket"
   export FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   export FIREBASE_APP_ID="your_app_id"
   export FIREBASE_MEASUREMENT_ID="your_measurement_id"
   export GEMINI_API_KEY="your_gemini_key"
   export ADMIN_EMAIL="admin@spvi.co.th"
   export ADMIN_DEFAULT_PASSWORD="your_secure_password"
   ```

3. **Start Production Server**
   ```bash
   NODE_ENV=production npm start
   ```

## How It Works

### Configuration Loading Priority

1. **Server Environment Variables** (Production)
   - Process.env variables set on server
   - Most secure method

2. **Server API Endpoint** (`/api/config`)
   - Serves configuration securely
   - Client requests config from server

3. **LocalStorage Cache**
   - Cached configuration from server
   - Improves performance

4. **Fallback Configuration**
   - Hardcoded fallback values in config.js
   - Used for development/testing

### Security Features

- Credentials never hardcoded in source files
- `.env` file excluded from version control
- Server endpoint validates required variables
- Client-side fallbacks for development
- Password hashing for admin credentials

## Testing

### Verify Configuration Loading
```javascript
// In browser console
window.SPViConfig.debug();
```

### Check Server Health
```bash
curl http://localhost:3000/api/health
```

### Test Configuration Endpoint
```bash
curl http://localhost:3000/api/config
```

## Troubleshooting

### Common Issues

1. **"Missing environment variable" error**
   - Check your `.env` file exists
   - Verify all required variables are set
   - Run `npm run config:debug` to check

2. **Firebase initialization failed**
   - Verify Firebase credentials are correct
   - Check network connectivity
   - Ensure Firebase project is active

3. **Gemini API not working**
   - Check `GEMINI_API_KEY` is set
   - Verify API key has proper permissions
   - Check API quotas and billing

4. **Admin login not working**
   - Check `ADMIN_EMAIL` and `ADMIN_DEFAULT_PASSWORD`
   - Clear browser localStorage
   - Try password reset functionality

### Development Mode

In development, the system will:
- Use fallback configuration if environment variables aren't available
- Show configuration debug information in console
- Provide helpful error messages

### Production Mode

In production, the system will:
- Require all environment variables
- Serve configuration through secure API endpoint
- Log warnings for missing optional variables

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong passwords in production**
3. **Rotate API keys regularly**
4. **Monitor API usage and quotas**
5. **Use HTTPS in production**
6. **Set proper CORS policies**
7. **Regular security updates**

## Environment-Specific Configuration

### Development (.env.local)
```bash
NODE_ENV=development
DEBUG=true
```

### Staging (.env.staging)
```bash
NODE_ENV=staging
FIREBASE_PROJECT_ID=spvi-staging
```

### Production (Server Environment)
```bash
NODE_ENV=production
FIREBASE_PROJECT_ID=spvi-production
```

## Migration from Hardcoded Credentials

✅ **Completed:**
- Firebase configuration moved to environment variables
- Gemini API key externalized
- Admin credentials configurable
- All HTML files updated to use config.js
- Fallback system implemented
- Security measures added

The system now uses a secure, scalable configuration management approach that works across development and production environments.
