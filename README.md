# 🎯 SPVi Operations Audit Toolkit

> A comprehensive web-based application for operational auditing and branch management with Firebase authentication and user management.

[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)
[![Authentication](https://img.shields.io/badge/Auth-Firebase%20Auth-blue)](https://firebase.google.com/products/auth)
[![Language](https://img.shields.io/badge/Language-Thai%20%2F%20English-green)](https://fonts.google.com/specimen/Sarabun)
[![Mobile](https://img.shields.io/badge/Mobile-Responsive-brightgreen)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Firebase Setup](#firebase-setup)
- [Deployment](#deployment)
- [Available Tools](#available-tools)
- [User Management](#user-management)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🚀 Overview

The SPVi Operations Audit Toolkit is a modern, responsive web application for operational teams to streamline audit processes, inventory management, and branch oversight. Built with Firebase for secure authentication and real-time data management.

### ✨ Key Features

- 🔐 **Firebase Authentication** - Secure user registration and login
- 👥 **User Management** - Admin approval workflow and role-based access  
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🇹🇭 **Thai Language Support** - Optimized for Thai users with Sarabun font
- 🛡️ **Security First** - Role-based permissions and secure data handling
- 🎨 **Modern UI** - Clean, professional interface
- 📊 **7 Specialized Tools** - Comprehensive audit and management tools
- ⚡ **Production Ready** - Optimized and deployment-ready

## 📁 Project Structure

```
SPViOperationAudit/
├── 📄 index.html                       # 🔑 Login page (ENTRY POINT)
├── 📄 dashboard.html                   # 🏠 Main dashboard
├── 📄 user-management.html             # 👥 Admin user management
├── 📄 firebase-auth.js                 # 🔐 Core authentication system
│
├── 📁 styles/
│   └── 📄 spvi-main.css               # 🎨 Centralized stylesheet
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
- **📱 Cross-Device Security** - Consistent security across devices

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
**Version**: 2.0  

Built with ❤️ for operational excellence.
