# 🎯 SPVi Operations Audit Toolkit

> A comprehensive web-based application for operational auditing and branch management with Firebase authentication, user management, and professional print-optimized reporting.

[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google### 7. 📊 Report Comparison Tool
- Side-by-side report analysis
- Change detection and highlighting
- Trend analysis
- Variance reporting

### 8. ⚠️ Risk Analyzer Tool[![Authentication](https://img.shields.io/badge/Auth-Firebase%20Auth-blue)](https://firebase.google.com/products/auth)
[![Language](https://img.shields.io/badge/Language-Thai%20%2F%20English-green)](https://fonts.google.com/specimen/Sarabun)
[![Mobile](https://img.shields.io/badge/Mobile-Responsive-brightgreen)](https://tailwindcss.com/)
[![Print](https://img.shields.io/badge/Print-Optimized-purple)](https://github.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Recent Updates](#recent-updates)
- [Getting Started](#getting-started)
- [Firebase Setup](#firebase-setup)
- [Deployment](#deployment)
- [Available Tools](#available-tools)
- [Print System](#print-system)
- [User Management](#user-management)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🚀 Overview

The SPVi Operations Audit Toolkit is a modern, responsive web application for operational teams to streamline audit processes, inventory management, and branch oversight. Built with Firebase for secure authentication and real-time data management, featuring professional print-optimized reporting for official documentation.

### ✨ Key Features

- 🔐 **Firebase Authentication** - Secure user registration and login
- 👥 **User Management** - Admin approval workflow and role-based access  
- ⏱️ **Session Timeout Management** - Automatic session expiration and activity monitoring
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🇹🇭 **Thai Language Support** - Optimized for Thai users with Sarabun font
- 🛡️ **Security First** - Role-based permissions and secure data handling
- 🎨 **Modern UI** - Clean, professional interface
- 📊 **7 Specialized Tools** - Comprehensive audit and management tools
- 🖨️ **Professional Print System** - Optimized print layouts for official reports
- ⚡ **Production Ready** - Optimized and deployment-ready

## 🆕 Recent Updates

### Session Timeout Implementation (July 2025)
**🔒 Enhanced Security Features**

- **⏱️ Automatic Session Management**: 30-minute inactivity timeout with 8-hour maximum duration
- **⚠️ Warning System**: 5-minute warning with countdown timer and audio alert
- **🎯 Activity Monitoring**: Tracks user interactions to prevent unexpected logouts
- **👨‍💼 Admin Panel**: Real-time session monitoring and management tools
- **🔧 Configurable Settings**: Environment-based timeout configuration
- **🔐 Security Validation**: Session tampering detection and prevention
- **📱 Multi-tab Support**: Synchronized session state across browser tabs

### Stock Count Tool Major Bug Fix (July 2025)
**✅ Critical Input Update Fix**

- **🔧 Fixed Final Count Input Bug**: Resolved issue where final count input fields were not updating underlying data
- **📊 Sales Column Removal**: Eliminated problematic Sales column that was causing column index shifting
- **🧮 Simplified Sales Integration**: Sales data now adds directly to final count with clear audit trail
- **📝 Enhanced Audit Trail**: Bill numbers and sales reasons now appear in remarks and reason fields
- **⚡ Improved Performance**: Streamlined table structure for better performance and maintainability

### Print System Enhancements (July 2025)
**✅ Complete Print CSS Overhaul**

- **🎯 Professional Print Layouts**: Optimized spacing, margins, and typography for official documentation
- **📋 Enhanced Table Formatting**: Consistent borders, proper page breaks, and header repetition across pages  
- **📝 Input Value Display**: Final Count and Remark fields now display correctly in printed reports
- **🏢 Global Print Headers**: Standardized company headers with division branding across all tools
- **📄 Cross-Browser Compatibility**: Consistent print output in Chrome, Safari, and Firefox
- **⚡ Zero Performance Impact**: Print optimizations only affect print output, not screen performance

### Key Improvements:
- ✅ **Stock Count Fix**: Final count inputs now properly update data model and calculations
- ✅ **Sales Data Integration**: Simplified approach with direct final count adjustment
- ✅ **Column Structure**: Stable 9-column layout without problematic Sales column
- ✅ **Event Delegation**: Proper input event handling for table updates
- ✅ **Print System**: Eliminated excessive blank space and enhanced professional formatting
- ✅ **Table Headers**: Fixed repetition on multi-page reports with consistent borders
- ✅ **Professional Spacing**: Optimized margins and page break handling

## 📁 Project Structure

```
SPViOperationAudit/
├── 📄 index.html                       # 🔑 Login page (ENTRY POINT)
├── 📄 dashboard.html                   # 🏠 Main dashboard
├── 📄 user-management.html             # 👥 Admin user management
├── 📄 firebase-auth.js                 # 🔐 Core authentication system
│
├── 📁 styles/
│   ├── 📄 spvi-main.css               # 🎨 Centralized stylesheet
│   ├── 📄 print-header.css            # 🖨️ Global print header system
│   └── 📄 print-legal.css             # 📄 Legal section print formatting
│
├── 📁 tools/                          # 🛠️ Audit Tools (7 total)
│   ├── 📄 stock-count.html            # 📦 Inventory counting
│   ├── 📄 cash-control.html           # 💰 Cash management
│   ├── 📄 checklist.html              # ✅ Audit checklist
│   ├── 📄 audit-calendar.html         # 📅 Calendar & scheduling
│   ├── 📄 issue-tracker.html          # 🐛 Issue management
│   ├── 📄 report-comparison.html      # 📊 Report comparison
│   └── 📄 risk-analyzer.html          # ⚠️ Risk analysis
│
└── 📄 README.md                       # 📚 This guide
```

> 🧹 **Clean Project Structure**: All test files, debug scripts, and temporary documentation have been removed for a clean, production-ready codebase.

## 🚀 Getting Started

### Prerequisites

- Web browser (Chrome, Firefox, Safari, Edge)
- Firebase account (for authentication)
- Internet connection (for Firebase services)

### Quick Start

1. **Clone or Download** this repository
2. **Set up Firebase** (see Firebase Setup section below)
3. **Open `index.html`** in your web browser
4. **Login with admin account** (configured during setup)

> 📌 **Entry Point**: The application opens directly to the login page (`index.html`). After successful login, users are automatically redirected to the dashboard where they can access all audit tools.

## 🔥 Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: `spvi-operations-audit` (or your choice)
4. Enable/disable Google Analytics as needed
5. Click "Create project"

### Step 2: Enable Firestore Database

1. In Firebase console → "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (development) or "Start in production mode"
4. Select location closest to your users
5. Click "Enable"

### Step 3: Get Firebase Configuration

1. In Firebase console → Settings ⚙️ → "Project settings"
2. Scroll to "Your apps" → Click Web icon (</>)
3. App nickname: `SPVi Toolkit`
4. Register app and copy the config object

### Step 4: Update Configuration

Edit `firebase-auth.js` and replace the config object:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

### Step 5: Set Firestore Security Rules

In Firebase Console → Firestore Database → Rules, apply these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create: if true;
      allow read: if request.auth != null && 
        (request.auth.uid == userId || isAdmin(request.auth.uid));
      allow update: if request.auth != null && 
        (request.auth.uid == userId && 
         !("role" in request.resource.data.diff(resource.data)) &&
         !("status" in request.resource.data.diff(resource.data))) ||
        isAdmin(request.auth.uid);
      allow delete: if request.auth != null && isAdmin(request.auth.uid);
    }
    
    match /users/{document=**} {
      allow read: if request.auth != null && isAdmin(request.auth.uid);
    }
    
    function isAdmin(uid) {
      return exists(/databases/$(database)/documents/users/$(uid)) &&
             get(/databases/$(database)/documents/users/$(uid)).data.role == 'admin' &&
             get(/databases/$(database)/documents/users/$(uid)).data.status == 'approved';
    }
  }
}
```

## 🚀 Deployment

### Web Hosting Setup

1. **Upload Files**: Upload entire project folder to your hosting service (GitHub Pages, Netlify, Vercel, etc.)
2. **Set Index Page**: Ensure `index.html` is set as the default page (most hosts do this automatically)
3. **Configure Firebase**: Update Firebase config in `firebase-auth.js` with your production values
4. **Test**: Visit your website → Should show login page → Login → Access dashboard

### Firebase Production Configuration

Update these values in `firebase-auth.js`:
```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com", 
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### Security Checklist

- [ ] Firebase config updated with production values
- [ ] Firestore security rules applied
- [ ] Default admin password changed
- [ ] User permissions configured
- [ ] HTTPS enabled on hosting platform

## 🔐 User Management & Authentication

### Default Admin Account

- **Email**: `admin@spvi.co.th`
- **Role**: Admin
- **Status**: Approved

⚠️ **Important**: Set a secure password during initial setup!

### User Registration Flow

1. **New User Registration** → Status: "Pending"
2. **Admin Review** → Approve/Reject
3. **Approved User** → Can access tools
4. **Role Assignment** → User or Admin privileges

### Admin Features

- **📊 User Statistics** - Overview of user counts and status
- **✅ User Approval** - Approve, reject, or delete pending users
- **🔑 Password Management** - Reset passwords for any user
- **👑 Role Assignment** - Promote users to admin or change roles
- **🛡️ Permission Management** - Configure tool access per user

## 🛠️ Available Tools

### 1. 📦 Stock Count Tool
- **Physical inventory counting** with barcode/OCR scanning support
- **System data reconciliation** with automatic variance detection
- **Sales data integration** during count periods with bill number tracking
- **Excel import/export** for SOH data and count results
- **Fixed input functionality** - Final count fields now properly update calculations
- **Professional reporting** with print-optimized layouts
- **Multi-format support** - Logfile or Master.csv input methods
- **🔬 Enhanced SPP Detection** - Advanced GLUE, ADHESIVE, and TOOLS classification using SOH data:
  - **SOH-based Detection**: Uses CLASS_CODE (`SP-GLUE`) and SUBCLASS_CODE (`ADHS-DP`, `ADHS`, `OTH`)
  - **Smart Fallback**: Description-based detection when SOH data unavailable
  - **Branch Coverage**: Works for both iCenter and iStudio branches
  - **Detailed Logging**: Console logs show detection criteria and results

### 2. 💰 Cash Control Tool
- End-of-day cash reconciliation
- Voucher and document tracking
- Sales report verification
- Attachment support for receipts

### 3. ✅ Audit Checklist Tool
- Standardized audit procedures
- Pass/Fail/N.A. scoring system
- Multi-auditor support
- Progress tracking and reporting

### 4. 📊 SMCO Check Tool
- **Stock Movement Control Operations** analysis and verification
- **Multi-group processing** (AIS, U-Store, iStudio/iBeat, iCenter, Head Office)
- **Detail file upload** with automatic Doc No matching and validation
- **Manual editing** of detail differences with real-time calculation updates
- **Enhanced PDF export** with detailed branch discrepancy tables
- **🔬 Advanced iCenter Filtering** - SOH-based GLUE/ADHESIVE/TOOLS detection:
  - **SOH Integration**: Uses CLASS_CODE (`SP-GLUE`) and SUBCLASS_CODE (`ADHS-DP`, `ADHS`, `OTH`)
  - **Smart Fallback**: Description-based detection when SOH data unavailable
  - **Enhanced Validation**: SOH file validation for required columns
  - **Detailed Logging**: Console logs show which criteria triggered exclusion

### 5. 📅 Audit Calendar Tool
- Schedule management
- Audit planning and tracking
- Calendar view of activities
- Event management

### 6. 🔍 Issue Tracker Tool
- Issue identification and logging
- Assignment and follow-up
- Status tracking
- Resolution management

### 7. 📊 Report Comparison Tool
- Side-by-side report analysis
- Change detection and highlighting
- Trend analysis
- Variance reporting

### 7. ⚠️ Risk Analyzer Tool
- Risk assessment and scoring
- Priority ranking
- Mitigation tracking
- Risk reporting dashboard

## 🖨️ Print System

### Professional Print Features

The SPVi toolkit includes a comprehensive print system designed for official audit documentation:

**🏢 Global Print Headers**
- Standardized company information on all printed reports
- Division branding (Operation Audit Division)
- Consistent header positioning across all tools
- Only visible in print output (hidden on screen)

**📋 Enhanced Table Formatting**
- Professional table borders with consistent 1px styling
- Table headers automatically repeat on subsequent pages
- Intelligent page break handling to keep table rows intact
- Optimized column spacing and alignment

**📝 Input Value Display**
- Final Count and Remark input fields display correctly in print
- Data attributes preserve values during print process
- Clean formatting with proper alignment and styling
- Automatic cleanup after print completion

**📄 Layout Optimization**
- Minimal top spacing (50px) for efficient page usage
- Proper margin settings for A4 paper format
- Eliminated header collision issues with content
- Professional typography using Sarabun font

### Print System Architecture

**Files:**
- `styles/print-header.css` - Global print header system
- `styles/print-legal.css` - Legal section formatting
- Individual tool CSS - Tool-specific print enhancements

**JavaScript Integration:**
- `handlePrintReport()` function in stock-count tool
- Data attribute management for input values
- Clean separation between screen and print styles

**Browser Compatibility:**
- ✅ Chrome/Edge: Full functionality with header repetition
- ✅ Safari: Compatible with table headers repeating properly  
- ✅ Firefox: Page breaks function correctly

### Usage Instructions

1. **Load data** in any tool (e.g., Stock Count)
2. **Enter values** in input fields as needed
3. **Click "Print Report"** button
4. **Verify in print preview:**
   - Professional header with company information
   - Complete table borders and proper spacing
   - Input values visible and properly formatted
   - Headers repeat on multiple pages
   - No content collisions or excessive spacing

**Result**: Professional, audit-ready documentation suitable for official reporting.

## 👥 User Management

### Admin Features

Admins have access to a comprehensive user management dashboard:

- **📊 User Statistics** - Overview of user counts and status
- **✅ User Approval** - Approve, reject, or delete pending users
- **🔑 Password Management** - Reset passwords for any user
- **👑 Role Assignment** - Promote users to admin or change roles
- **🛡️ Permission Management** - Configure tool access per user
- **🔄 Admin Password Change** - Secure admin password updates

### User Permissions

Each user can be granted access to specific tools:

- Stock Count Tool
- Cash Control Tool  
- Audit Checklist Tool
- Risk Analyzer Tool
- Audit Calendar Tool
- Report Comparison Tool
- Issue Tracker Tool
- User Management (Admin only)

## 🛡️ Security

### Security Features

- **🔐 Secure Credential Management** - Environment variable based configuration
- **🔒 Password Hashing** - Secure password storage with salt
- **🛡️ Role-Based Access** - User/Admin permissions with granular controls
- **✅ Status Verification** - Only approved users can access system
- **🔒 Session Management** - Secure login/logout with timeout and validation
- **⏱️ Session Timeout** - Automatic logout after inactivity
- **🚨 Activity Monitoring** - Real-time user activity tracking
- **⚠️ Session Warnings** - Proactive timeout notifications
- **🔐 Session Validation** - Continuous session integrity checks
- **📱 Cross-Device Security** - Consistent security across devices
- **🔍 Security Audit** - Regular vulnerability assessments

### Security Documentation

- 📋 [Security Audit Report](SECURITY_AUDIT_REPORT.md) - Comprehensive security analysis
- 🚀 [Secure Deployment Guide](SECURE_DEPLOYMENT_GUIDE.md) - Production deployment best practices
- 🔒 [Commit Security Guide](COMMIT_SECURITY_GUIDE.md) - Safe repository management

### Session Timeout Security

The application includes comprehensive session timeout management:

#### Configuration
```bash
# .env file settings
SESSION_INACTIVITY_TIMEOUT=30    # Minutes of inactivity before logout
SESSION_MAX_DURATION=480         # Maximum session duration (8 hours)
SESSION_WARNING_TIME=5           # Warning time before timeout (minutes)
```

#### Features
- **Automatic Logout**: After 30 minutes of inactivity
- **Maximum Duration**: 8-hour maximum session regardless of activity
- **Warning System**: 5-minute warning with countdown and audio alert
- **Activity Detection**: Mouse, keyboard, scroll, and touch events
- **Session Extension**: Users can extend sessions when warned
- **Security Validation**: Detects and prevents session tampering
- **Multi-tab Sync**: Session state synchronized across browser tabs

#### Testing Session Timeout
```bash
# Run the automated test script
./test-session-timeout.sh

# Or test manually in browser console
SPViSessionManager.getSessionInfo()
SPViSessionManager.extendSession()
```

### Production Security Checklist

- [ ] Change default admin password
- [ ] Apply production Firestore rules
- [ ] Review user permissions
- [ ] Enable Firebase authentication
- [ ] Set up backup procedures

## 🔧 Troubleshooting

### Common Issues

**Authentication Problems**
- ✅ Check Firebase config values are not placeholders
- ✅ Verify Firestore is enabled
- ✅ Check browser console for detailed errors

**Permission denied errors**
- ✅ Verify Firestore security rules are applied
- ✅ Check user role and status
- ✅ Ensure user is approved

**User can't access tools**
- ✅ Verify user status is "approved"
- ✅ Check user permissions for specific tools
- ✅ Ensure user is properly logged in

### Getting Help

For technical support:
1. Check this README first
2. Review browser console errors
3. Verify Firebase configuration
4. Contact your system administrator

---

## 📄 License & Support

© 2025 SPVi Operations Audit. All Rights Reserved.

**System Status**: ✅ Production Ready  
**Version**: 2.2 (Stock Count Bug Fix + Print System Enhanced)  
**Last Updated**: July 2025

### Recent Enhancements
- 🔧 **Stock Count Input Fix** - Resolved critical bug where final count inputs weren't updating data
- 📊 **Sales Integration Improvement** - Simplified sales data handling with better audit trail
- 🖨️ **Complete Print System Overhaul** - Professional print layouts for all tools
- 📋 **Enhanced Table Formatting** - Headers repeat, consistent borders, intelligent page breaks
- 🏢 **Global Print Headers** - Standardized company branding across all printed reports
- 📱 **Cross-Browser Print Compatibility** - Consistent output in all modern browsers

Built with ❤️ for operational excellence.
