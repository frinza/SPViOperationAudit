#!/bin/bash

# SPVi Operations Audit - Environment Setup Script
# This script helps initialize the environment variables and dependencies

echo "🚀 SPVi Operations Audit - Environment Setup"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ Environment file (.env) exists"
else
    echo "⚠️  Environment file (.env) not found"
    echo "   Creating template .env file..."
    
    cat > .env << 'EOF'
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
FIREBASE_APP_ID=your_app_id_here
FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Admin Configuration
ADMIN_EMAIL=admin@spvi.co.th
ADMIN_DEFAULT_PASSWORD=admin123

# App Configuration
APP_NAME=SPVi Operations Audit
APP_VERSION=1.0.0
EOF
    
    echo "📝 Template .env file created. Please update with your actual credentials."
fi

# Check environment variables
echo ""
echo "🔍 Checking environment configuration..."

# Source the .env file to check variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
required_vars=("FIREBASE_API_KEY" "FIREBASE_AUTH_DOMAIN" "FIREBASE_PROJECT_ID" "ADMIN_EMAIL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "your_${var,,}_here" ] || [[ "${!var}" == *"your_"* ]]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required environment variables are configured"
else
    echo "⚠️  Missing or template values for: ${missing_vars[*]}"
    echo "   Please update your .env file with actual credentials"
fi

# Test server startup
echo ""
echo "🔧 Testing server configuration..."

# Try to start server in background for a quick test
timeout 5s npm start > /dev/null 2>&1 &
server_pid=$!

sleep 2

if kill -0 $server_pid 2>/dev/null; then
    echo "✅ Server can start successfully"
    kill $server_pid
else
    echo "⚠️  Server startup test failed - check your configuration"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Update .env file with your actual credentials"
echo "2. Start development server: npm start"
echo "3. Open browser to: http://localhost:3000"
echo ""
echo "For more information, see ENVIRONMENT_SETUP.md"
echo ""
echo "Default admin login:"
echo "  Email: admin@spvi.co.th"
echo "  Password: admin123"
echo ""
