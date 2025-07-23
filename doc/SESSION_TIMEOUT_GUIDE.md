# Session Timeout Implementation - Testing Guide

## Overview
The SPVi Operations Audit toolkit now includes comprehensive session timeout management with the following features:

### Features Implemented

#### 1. Session Timeout Configuration
- **Inactivity Timeout**: 30 minutes (configurable)
- **Maximum Session Duration**: 8 hours (configurable) 
- **Warning Time**: 5 minutes before timeout (configurable)
- **Session Check Interval**: Every 30 seconds

#### 2. Activity Monitoring
The system monitors the following user activities to reset the session timer:
- Mouse movements and clicks
- Keyboard input
- Scroll events
- Touch events (mobile)
- Focus/blur events

#### 3. Warning System
- Visual warning modal appears 5 minutes before session expiration
- Real-time countdown display
- Audio notification (beep sound)
- Options to extend session or logout immediately

#### 4. Automatic Logout
- Session expires after 30 minutes of inactivity
- Session expires after 8 hours regardless of activity
- Secure cleanup of all session data
- Automatic redirect to login page

#### 5. Session Validation
- Continuous validation every 30 seconds
- Checks for tampered session data
- Validates user authentication status
- Prevents session hijacking

## Configuration

### Environment Variables (.env)
```bash
# Session timeout settings (in minutes)
SESSION_INACTIVITY_TIMEOUT=30
SESSION_MAX_DURATION=480
SESSION_WARNING_TIME=5
```

### Default Configuration
If environment variables are not set, the system uses these defaults:
- Inactivity timeout: 30 minutes
- Maximum duration: 8 hours (480 minutes)
- Warning time: 5 minutes

## Testing the Session Timeout

### 1. Test Inactivity Timeout
1. Login to the system
2. Wait for 25 minutes without any user interaction
3. A warning modal should appear
4. If no action is taken, automatic logout occurs after 5 more minutes

### 2. Test Session Extension
1. When the warning modal appears
2. Click "Continue Session" button
3. Session should be extended and warning should disappear
4. Timer resets to full inactivity period

### 3. Test Maximum Session Duration
1. Login to the system
2. Keep the session active with periodic activity
3. After 8 hours, session should automatically expire regardless of activity

### 4. Test Activity Detection
1. Login to the system
2. Perform various activities (mouse movement, typing, clicking)
3. Session timer should reset with each activity
4. No timeout should occur while actively using the system

## Files Modified

### Core Files
- `session-manager.js` - New session management system
- `firebase-auth.js` - Integrated with session manager
- `config.js` - Added session configuration

### HTML Files Updated
All HTML files now include the session manager:
- `dashboard.html`
- `user-management.html` 
- `tools/audit-calendar.html`
- `tools/cash-control.html`
- `tools/checklist.html`
- `tools/issue-tracker.html`
- `tools/report-comparison.html`
- `tools/risk-analyzer.html`
- `tools/stock-count.html`

## Security Features

### 1. Session Data Protection
- Session data stored in localStorage with encryption-like patterns
- Unique session IDs generated for each login
- Session validation against user authentication

### 2. Tamper Detection
- Validates session data structure
- Checks for corrupted or missing session information
- Automatic logout on detection of tampering

### 3. Multiple Tab Handling
- Session state synchronized across browser tabs
- Activity in any tab resets the global session timer
- Logout in one tab affects all tabs

## Development Notes

### Debugging Session State
You can check the current session state in browser console:
```javascript
// Get session information
SPViSessionManager.getSessionInfo()

// Check current configuration
SPViSessionManager.getConfig()

// Manually extend session
SPViSessionManager.extendSession()

// Force logout
SPViSessionManager.logoutUser('Manual logout for testing')
```

### Customizing Timeouts
To modify timeout values during development:
1. Update the .env file
2. Restart the server
3. Clear browser localStorage 
4. Login again to apply new settings

## Integration with Existing System

### Authentication Integration
- Session manager integrates seamlessly with existing SPViAuth system
- Logout function enhanced to clear session data
- Login function initializes new session tracking

### User Experience
- Non-intrusive activity monitoring
- Clear warning notifications
- Graceful session expiration handling
- Maintains user work until timeout

## Production Considerations

### Performance
- Minimal performance impact with efficient event handling
- Debounced activity detection
- Optimized localStorage usage

### Browser Compatibility
- Works on all modern browsers
- Graceful fallback for older browsers
- Mobile device support included

### Accessibility
- Keyboard navigation support in warning modal
- Screen reader compatible notifications
- High contrast warning indicators

## Troubleshooting

### Common Issues
1. **Session not timing out**: Check if user activity is continuously resetting timer
2. **Warning not showing**: Verify session-manager.js is loaded before firebase-auth.js
3. **Configuration not applied**: Ensure .env file is properly loaded by server
4. **Multiple logouts**: Check for conflicting session managers in different tabs

### Browser Console Errors
Monitor browser console for session-related errors:
- Session validation failures
- Configuration loading issues
- Activity monitoring problems
- Modal display issues

## Future Enhancements

### Planned Features
1. Server-side session validation
2. Admin panel for session management
3. Session activity logging
4. Configurable activity event types
5. Remember me functionality with extended sessions

### Security Improvements
1. JWT-based session tokens
2. Server-side session invalidation
3. IP address validation
4. Device fingerprinting
5. Suspicious activity detection
