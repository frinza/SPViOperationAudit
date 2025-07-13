# 🎯 SPVi Operations Audit Toolkit

> A comprehensive suite of web-based applications for operational auditing and branch management with Firebase authentication and user management.

[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)
[![Authentication](https://img.shields.io/badge/Auth-Firebase%20Auth-blue)](https://firebase.google.com/products/auth)
[![Language](https://img.shields.io/badge/Language-Thai%20%2F%20English-green)](https://fonts.google.com/specimen/Sarabun)
[![Mobile](https://img.shields.io/badge/Mobile-Responsive-brightgreen)](https://tailwindcss.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Firebase Setup](#firebase-setup)
- [Authentication System](#authentication-system)
- [Available Tools](#available-tools)
- [User Management](#user-management)
- [Security](#security)
- [Maintenance](#maintenance)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🚀 Overview

The SPVi Operations Audit Toolkit is a modern, responsive web application designed for operational teams to streamline audit processes, inventory management, and branch oversight. Built with Firebase for secure authentication and real-time data management.

### ✨ Key Features

- 🔐 **Firebase Authentication** - Secure user registration and login
- 👥 **User Management** - Admin approval workflow and role-based access
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🇹🇭 **Thai Language Support** - Optimized for Thai users with Sarabun font
- 🛡️ **Security First** - Role-based permissions and secure data handling
- 🎨 **Modern UI** - Clean, professional interface with Tailwind CSS
- 📊 **7 Specialized Tools** - Comprehensive audit and management tools

## 📁 Project Structure

```
SPViOperationAudit/
├── 📄 index.html                       # Main dashboard
├── 📄 login.html                       # Authentication page
├── 📄 user-management.html             # Admin user management
├── 📄 firebase-auth.js                 # Core authentication system
│
├── 📁 styles/
│   └── 📄 spvi-main.css               # Centralized stylesheet
│
├── 📁 tools/                          # Audit Tools
│   ├── 📄 stock-count.html            # Inventory counting
│   ├── 📄 cash-control.html           # Cash management
│   ├── 📄 checklist.html              # Audit checklist
│   ├── 📄 audit-calendar.html         # Calendar & scheduling
│   ├── 📄 issue-tracker.html          # Issue management
│   ├── 📄 report-comparison.html      # Report comparison
│   └── 📄 risk-analyzer.html          # Risk analysis
│
└── 📄 README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites

- Web browser (Chrome, Firefox, Safari, Edge)
- Firebase account (for authentication)
- Internet connection (for Firebase services)

### Quick Start

1. **Clone or Download** this repository
2. **Set up Firebase** (see Firebase Setup section below)
3. **Open `index.html`** in your web browser
4. **Login with default admin account:**
   - Email: `admin@spvi.co.th`
   - Password: `admin123`

### First Time Setup

1. Configure Firebase (required for authentication)
2. Test admin login
3. Register test users
4. Configure user permissions
5. Change default admin password

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

#### 🔒 Production Security Rules (Recommended)

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

#### 🧪 Development Rules (Testing Only)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🔐 Authentication System

### Default Admin Account

- **Email**: `admin@spvi.co.th`
- **Password**: `admin123`
- **Role**: Admin
- **Status**: Approved

⚠️ **Important**: Change the default password after setup!

### User Registration Flow

1. **New User Registration** → Status: "Pending"
2. **Admin Review** → Approve/Reject
3. **Approved User** → Can access tools
4. **Role Assignment** → User or Admin privileges

### Authentication Features

- ✅ Secure password hashing
- ✅ Role-based access control (User/Admin)
- ✅ Status-based access (Pending/Approved/Rejected)
- ✅ Session management with automatic logout
- ✅ Password reset functionality
- ✅ Multi-device login support

## 🛠️ Available Tools

### 1. 📦 Stock Count Tool
- Physical inventory counting
- System data reconciliation
- Variance reporting
- Barcode/OCR scanning support

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

### 4. 📅 Audit Calendar Tool
- Schedule management
- Audit planning and tracking
- Calendar view of activities
- Event management

### 5. 🔍 Issue Tracker Tool
- Issue identification and logging
- Assignment and follow-up
- Status tracking
- Resolution management

### 6. 📊 Report Comparison Tool
- Side-by-side report analysis
- Change detection and highlighting
- Trend analysis
- Variance reporting

### 7. ⚠️ Risk Analyzer Tool
- Risk assessment and scoring
- Priority ranking
- Mitigation tracking
- Risk reporting dashboard

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

- **🔐 Password Hashing** - Secure password storage
- **🛡️ Role-Based Access** - User/Admin permissions
- **✅ Status Verification** - Only approved users can access
- **🔒 Session Management** - Secure login/logout
- **🚫 Developer Tools Disabled** - F12, right-click, and keyboard shortcuts blocked
- **📱 Cross-Device Security** - Consistent security across devices

### Production Security Checklist

- [ ] Change default admin password
- [ ] Apply production Firestore rules
- [ ] Review user permissions
- [ ] Enable Firebase authentication
- [ ] Set up backup procedures
- [ ] Configure monitoring and alerts

## 🔧 Maintenance

### Regular Tasks

1. **User Management**
   - Review and approve pending users
   - Remove inactive accounts
   - Update user permissions as needed

2. **Security**
   - Monitor login activities
   - Update passwords periodically
   - Review access permissions

3. **Data Management**
   - Regular Firestore backups
   - Clean up old data
   - Monitor storage usage

### Performance Optimization

- **📱 Mobile Responsive** - Optimized for all devices
- **⚡ Single CSS File** - Centralized styling for faster loading
- **🚀 Font Optimization** - Single font load across all pages
- **💾 Browser Caching** - Optimized for performance

## 🧑‍💻 Development

### Adding New Tools

1. Create `tools/new-tool.html`
2. Follow existing tool structure
3. Include `firebase-auth.js` for authentication
4. Link to `styles/spvi-main.css`
5. Add tool card to `index.html`
6. Update user permissions in `firebase-auth.js`

### CSS Component Library

The centralized `spvi-main.css` includes:

- **Base Styles** - Typography, colors, spacing
- **UI Components** - Buttons, forms, modals, cards
- **Tool-Specific** - Specialized styling for each tool
- **Responsive Design** - Mobile-first approach
- **Print Styles** - Optimized for printing
- **Animations** - Smooth transitions and effects

### Code Structure

```javascript
// firebase-auth.js structure
- Firebase Configuration
- User Data Management
- Authentication Functions
- User Interface Components
- Admin Management Features
- Security and Validation
```

## 🔧 Troubleshooting

### Common Issues

#### Authentication Problems

**"Firebase not initialized"**
- ✅ Check Firebase config values are not placeholders
- ✅ Verify Firestore is enabled
- ✅ Check browser console for detailed errors

**"Permission denied"**
- ✅ Verify Firestore security rules are applied
- ✅ Check user role and status
- ✅ Ensure user is approved

**"Default admin not created"**
- ✅ Check browser console for creation message
- ✅ Verify Firestore write permissions
- ✅ Refresh page to trigger creation

#### Tool Access Issues

**User can't access tools**
- ✅ Verify user status is "approved"
- ✅ Check user permissions for specific tools
- ✅ Ensure user is properly logged in

**Navigation not working**
- ✅ Check authentication status
- ✅ Verify navigation bar is loaded
- ✅ Check for JavaScript errors

#### UI/Display Problems

**Styling issues**
- ✅ Verify `spvi-main.css` is loading
- ✅ Check for CSS conflicts
- ✅ Clear browser cache

**Mobile display problems**
- ✅ Check viewport meta tag
- ✅ Test responsive breakpoints
- ✅ Verify touch interactions

### Debug Mode

Open browser Developer Tools (F12) and check:
- **Console** - JavaScript errors and messages
- **Network** - File loading issues
- **Application** - Local storage and session data

### Getting Help

For technical support:
1. Check this README first
2. Review browser console errors
3. Verify Firebase configuration
4. Test with development security rules
5. Contact your system administrator

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Thai Web Typography](https://fonts.google.com/specimen/Sarabun)

---

## 📄 License & Support

© 2025 SPVi/Operation Audit. All Rights Reserved.

**System Status**: ✅ Production Ready  
**Last Updated**: July 2025  
**Version**: 2.0  

Built with ❤️ for operational excellence.

---

## 📋 Appendix

### Database Structure

The Firestore database uses the following structure for user management:

```javascript
// Users Collection Structure
{
  id: "auto-generated-id",
  name: "User Name",
  email: "user@example.com", 
  password: "hashed-password",
  department: "Department Name",
  position: "Position Title",
  role: "user" | "admin",
  status: "pending" | "approved" | "rejected",
  createdAt: "ISO-date-string",
  lastLogin: "ISO-date-string",
  permissions: {
    stockCount: true,
    cashControl: true,
    checklist: true,
    riskAnalyzer: true,
    auditCalendar: true,
    reportComparison: true,
    issueTracker: true,
    userManagement: false // true for admins only
  }
}
```

### Project Cleanup Summary

This project has been optimized and cleaned up:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Files** | ~26 | 14 | **46% Reduction** |
| **HTML Pages** | 12 | 10 | Removed 2 legacy pages |
| **CSS Files** | Multiple inline | 1 centralized | **100% Consolidation** |
| **JS Auth Files** | 2 conflicting | 1 unified | **50% Reduction** |
| **Documentation** | 9 files | 1 comprehensive | **89% Consolidation** |

### Alternative Firestore Rules

For development and testing, you can use these more permissive rules:

```javascript
// Development Rules (Testing Only)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Warning**: Only use development rules for testing. Always apply production rules for live deployment.

### Technical Architecture

The SPVi Operations Audit Toolkit follows a modern architecture:

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+
- **Styling**: Centralized CSS with component-based design
- **Authentication**: Firebase Authentication with custom user management
- **Database**: Cloud Firestore for user data and permissions
- **Typography**: Sarabun font optimized for Thai language
- **Responsive**: Mobile-first design with Tailwind CSS utilities
- **Security**: Role-based access control with status verification

### Performance Optimizations

- ⚡ Single CSS file cached across all pages
- ⚡ Optimized font loading with preload hints
- ⚡ Minimized HTTP requests
- ⚡ Efficient Firebase SDK usage
- ⚡ Responsive images and layouts
- ⚡ Clean HTML structure for fast rendering
