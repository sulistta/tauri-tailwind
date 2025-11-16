# Baileys Authentication and Session Persistence Test Plan

## Overview

This document provides comprehensive testing procedures for verifying the Baileys authentication flow and session persistence functionality. These tests validate Requirements 2.1-2.5 and 3.1-3.5 from the Baileys migration specification.

## Prerequisites

- Application built with Baileys integration
- WhatsApp mobile app with active account
- Terminal access for file system operations
- Ability to scan QR codes
- Clean test environment (recommended)

---

## Test 1: Fresh Installation QR Code Flow

### Purpose

Verify that a fresh installation (no existing session) correctly generates and displays a QR code for authentication.

### Requirements Tested

- 2.1: Generate QR code when no session exists
- 2.2: Display QR code in frontend interface
- 10.1: Store auth state in application data directory

### Pre-Test Setup

1. **Ensure No Existing Session**

    ```powershell
    # Navigate to project root
    cd D:\Projects\whats-ext

    # Remove auth_info directory if it exists
    Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info -ErrorAction SilentlyContinue

    # Verify deletion
    Test-Path src-tauri\whatsapp-node\auth_info
    # Should return: False
    ```

2. **Start Application**
    ```powershell
    bun tauri dev
    ```

### Test Steps

1. **Monitor Backend Logs**
   Watch for these log entries in sequence:

    ```
    [DEBUG] [WhatsApp] Checking for existing session
    [DEBUG] [WhatsApp] No existing session
    [DEBUG] [WhatsApp] Initializing connection
    [DEBUG] [WhatsApp] QR code generated
    ```

2. **Verify Frontend UI**
    - [ ] QR code is displayed clearly on the Connect page
    - [ ] QR code is properly formatted (base64 image)
    - [ ] Loading indicator shows "Awaiting scan..." or similar
    - [ ] No error messages are displayed
    - [ ] UI is responsive and not frozen

3. **Verify Backend State**

    ```powershell
    # Check that auth_info directory was created
    Test-Path src-tauri\whatsapp-node\auth_info
    # Should return: True (directory created but empty until scan)
    ```

4. **Verify Event Emission**
   Check browser console for events:
    - [ ] `whatsapp_initializing` event received
    - [ ] `whatsapp_loading` event received
    - [ ] `whatsapp_qr` event received with QR code data

### Expected Results

✅ **Pass Criteria:**

- Session check returns false (no existing session)
- QR code generated within 5 seconds
- QR code displayed correctly in UI
- auth_info directory created
- No errors in logs or console
- Only ONE QR code generation attempt

❌ **Fail Criteria:**

- QR code not generated
- QR code not displayed in UI
- Multiple QR code generation attempts
- Error messages in logs
- auth_info directory not created

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Notes:** **********\_\_\_**********

---

## Test 2: Successful Authentication After QR Scan

### Purpose

Verify that scanning the QR code successfully authenticates the user and establishes a connection.

### Requirements Tested

- 2.3: Establish connection after QR scan
- 2.4: Save authentication credentials securely
- 3.1: Store Baileys auth state in secure location

### Pre-Test Setup

Continue from Test 1 (QR code should be displayed)

### Test Steps

1. **Scan QR Code**
    - Open WhatsApp on your mobile device
    - Go to Settings → Linked Devices
    - Tap "Link a Device"
    - Scan the QR code displayed in the application

2. **Monitor Connection Process**
   Watch for these log entries:

    ```
    [DEBUG] [WhatsApp] Connection state: connecting
    [DEBUG] [WhatsApp] Connection state: open
    [INFO] [WhatsApp] WhatsApp connected and ready
    ```

3. **Verify Frontend State Change**
    - [ ] QR code disappears from UI
    - [ ] Connected status is displayed
    - [ ] Phone number is shown (if available)
    - [ ] Success indicator appears (checkmark, green status, etc.)
    - [ ] Navigation to main app occurs (if configured)

4. **Verify Credentials Saved**

    ```powershell
    # Check auth_info directory contents
    Get-ChildItem src-tauri\whatsapp-node\auth_info

    # Should see files like:
    # - creds.json
    # - app-state-sync-key-*.json (multiple files)
    ```

5. **Verify File Contents**

    ```powershell
    # Check creds.json exists and is not empty
    $credsFile = "src-tauri\whatsapp-node\auth_info\creds.json"
    Test-Path $credsFile
    # Should return: True

    (Get-Item $credsFile).Length -gt 0
    # Should return: True
    ```

6. **Verify Events**
   Check browser console:
    - [ ] `whatsapp_ready` event received
    - [ ] Event contains phone number data
    - [ ] `whatsapp_state_changed` event shows "connected" status

### Expected Results

✅ **Pass Criteria:**

- Connection established within 10 seconds of scan
- Phone number displayed correctly
- creds.json file created with content
- Multiple app-state-sync-key files created
- No errors during authentication
- UI updates to connected state
- All events emitted correctly

❌ **Fail Criteria:**

- Connection fails after scan
- Credentials not saved
- Error messages appear
- UI doesn't update
- Missing event emissions

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Phone Number Displayed:** **********\_\_\_**********
- **Number of Sync Key Files:** **********\_\_\_**********
- **Notes:** **********\_\_\_**********

---

## Test 3: Auth Info Directory Structure Verification

### Purpose

Verify that the auth_info directory is created with the correct structure and contains all necessary credential files.

### Requirements Tested

- 3.1: Store Baileys auth state in secure location
- 3.2: Attempt to restore previous session on start
- 10.2: Use appropriate file permissions

### Pre-Test Setup

Continue from Test 2 (should be connected)

### Test Steps

1. **Inspect Directory Structure**

    ```powershell
    # List all files in auth_info
    Get-ChildItem src-tauri\whatsapp-node\auth_info -Recurse | Format-Table Name, Length, LastWriteTime
    ```

2. **Verify Required Files**
    - [ ] `creds.json` exists
    - [ ] At least one `app-state-sync-key-*.json` file exists
    - [ ] All files have non-zero size
    - [ ] Files were created/modified recently (within last few minutes)

3. **Verify File Permissions (Windows)**

    ```powershell
    # Check file permissions
    Get-Acl src-tauri\whatsapp-node\auth_info | Format-List
    ```

    - [ ] Directory is accessible by current user
    - [ ] Files are not world-readable (if applicable)

4. **Verify File Contents Format**

    ```powershell
    # Check that creds.json is valid JSON
    try {
        Get-Content src-tauri\whatsapp-node\auth_info\creds.json | ConvertFrom-Json
        Write-Host "✓ creds.json is valid JSON"
    } catch {
        Write-Host "✗ creds.json is invalid JSON"
    }
    ```

5. **Document File Sizes**
    ```powershell
    # Get file sizes for reference
    Get-ChildItem src-tauri\whatsapp-node\auth_info | Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}}
    ```

### Expected Results

✅ **Pass Criteria:**

- auth_info directory exists
- creds.json file exists and is valid JSON
- Multiple app-state-sync-key files exist
- All files have reasonable sizes (creds.json > 1KB)
- Files have appropriate permissions
- Directory structure matches Baileys specification

❌ **Fail Criteria:**

- Missing required files
- Empty or corrupted files
- Invalid JSON in creds.json
- Incorrect directory structure

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Number of Files:** **********\_\_\_**********
- **creds.json Size:** **********\_\_\_**********
- **Notes:** **********\_\_\_**********

---

## Test 4: App Restart with Existing Session (No QR Required)

### Purpose

Verify that restarting the application with an existing session automatically restores the connection without requiring a new QR code.

### Requirements Tested

- 2.5: Restore session without requiring new QR code
- 3.2: Attempt to restore previous session on start
- 3.3: Connect automatically if session is valid

### Pre-Test Setup

Continue from Test 3 (should be connected with saved session)

### Test Steps

1. **Stop the Application**

    ```powershell
    # If running in dev mode, press Ctrl+C in the terminal
    # Or close the application window
    ```

2. **Verify Session Files Still Exist**

    ```powershell
    Test-Path src-tauri\whatsapp-node\auth_info\creds.json
    # Should return: True
    ```

3. **Restart Application**

    ```powershell
    bun tauri dev
    ```

4. **Monitor Startup Logs**
   Watch for these log entries:

    ```
    [DEBUG] [WhatsApp] Checking for existing session
    [DEBUG] [WhatsApp] Existing session found
    [DEBUG] [WhatsApp] Initializing connection
    [DEBUG] [WhatsApp] Connection state: connecting
    [DEBUG] [WhatsApp] Connection state: open
    [INFO] [WhatsApp] WhatsApp connected and ready
    ```

5. **Verify UI Behavior**
    - [ ] NO QR code is displayed
    - [ ] Loading indicator shows "Connecting..." or similar
    - [ ] Connection established automatically
    - [ ] Phone number displayed (same as before)
    - [ ] No authentication required

6. **Measure Connection Time**
    - Time from app start to "WhatsApp connected" message
    - Should be faster than initial QR code flow
    - **Connection Time:** **\_\_\_** seconds

7. **Verify Events**
   Check browser console:
    - [ ] NO `whatsapp_qr` event received
    - [ ] `whatsapp_loading` event received
    - [ ] `whatsapp_ready` event received
    - [ ] Same phone number as before

### Expected Results

✅ **Pass Criteria:**

- Session detected on startup
- No QR code displayed
- Automatic connection within 10 seconds
- Same phone number as previous session
- No errors during connection
- Faster connection than initial setup

❌ **Fail Criteria:**

- QR code displayed again
- Session not detected
- Connection fails
- Different phone number
- Errors in logs

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Connection Time:** **\_\_\_** seconds
- **Phone Number Match:** Yes / No
- **Notes:** **********\_\_\_**********

---

## Test 5: Session Restoration on Cold Start

### Purpose

Verify that session restoration works correctly after a complete system restart (cold start scenario).

### Requirements Tested

- 3.2: Attempt to restore previous session on start
- 3.3: Connect automatically if session is valid
- 3.5: Handle session updates and save incrementally

### Pre-Test Setup

1. **Ensure Connected State**
    - Application should be connected from previous test
    - Session files should exist

2. **Perform Clean Shutdown**
    - Close application gracefully
    - Wait 5 seconds

3. **Simulate Cold Start**
    - Close all terminals
    - Wait 30 seconds
    - Optionally: restart IDE or terminal

### Test Steps

1. **Verify Session Persistence**

    ```powershell
    # Before starting, verify files still exist
    Test-Path src-tauri\whatsapp-node\auth_info\creds.json
    # Should return: True

    # Check file modification time
    (Get-Item src-tauri\whatsapp-node\auth_info\creds.json).LastWriteTime
    ```

2. **Start Application (Cold Start)**

    ```powershell
    bun tauri dev
    ```

3. **Monitor Full Startup Sequence**
   Watch for complete log sequence:

    ```
    [DEBUG] [WhatsApp] Checking for existing session
    [DEBUG] [WhatsApp] Existing session found
    [DEBUG] [WhatsApp] Initializing connection
    [DEBUG] [WhatsApp] Client initializing
    [DEBUG] [WhatsApp] Connection state: connecting
    [DEBUG] [WhatsApp] Connection state: open
    [INFO] [WhatsApp] WhatsApp connected and ready
    ```

4. **Verify No Session Corruption**
    - [ ] No "bad session" errors
    - [ ] No "session corrupted" messages
    - [ ] No automatic session clearing
    - [ ] Connection succeeds on first attempt

5. **Test Session Functionality**
   After connection:
    - [ ] Fetch groups successfully
    - [ ] Extract members from a group
    - [ ] Verify all operations work normally

6. **Verify Session Updates**
    ```powershell
    # Check if creds.json was updated after connection
    (Get-Item src-tauri\whatsapp-node\auth_info\creds.json).LastWriteTime
    # Should be recent (within last minute)
    ```

### Expected Results

✅ **Pass Criteria:**

- Session restored successfully after cold start
- No session corruption
- Connection established automatically
- All operations work normally
- Session files updated after connection
- No errors or warnings

❌ **Fail Criteria:**

- Session not found
- Session corruption errors
- Connection fails
- Operations don't work
- Session files not updated

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Cold Start Connection Time:** **\_\_\_** seconds
- **Operations Tested:** **********\_\_\_**********
- **Notes:** **********\_\_\_**********

---

## Test 6: Invalid Session Handling

### Purpose

Verify that the application correctly handles invalid or corrupted session files.

### Requirements Tested

- 3.4: Request new QR code if session is invalid/expired
- 7.3: Handle bad session errors by clearing auth state

### Pre-Test Setup

1. **Ensure Application is Stopped**

2. **Corrupt Session File**

    ```powershell
    # Backup original creds.json
    Copy-Item src-tauri\whatsapp-node\auth_info\creds.json src-tauri\whatsapp-node\auth_info\creds.json.backup

    # Corrupt the file (write invalid JSON)
    Set-Content src-tauri\whatsapp-node\auth_info\creds.json -Value '{"invalid": "json'
    ```

### Test Steps

1. **Start Application with Corrupted Session**

    ```powershell
    bun tauri dev
    ```

2. **Monitor Error Handling**
   Watch for these log entries:

    ```
    [DEBUG] [WhatsApp] Checking for existing session
    [DEBUG] [WhatsApp] Existing session found
    [DEBUG] [WhatsApp] Initializing connection
    [ERROR] [WhatsApp] Session corrupted. Please re-authenticate.
    [DEBUG] [WhatsApp] Authentication state cleared
    ```

3. **Verify Recovery Behavior**
    - [ ] Error message displayed to user
    - [ ] Session automatically cleared
    - [ ] New QR code generated
    - [ ] User can re-authenticate

4. **Verify Session Cleanup**

    ```powershell
    # Check if auth_info was cleared
    Test-Path src-tauri\whatsapp-node\auth_info\creds.json
    # Should return: False (or file should be recreated empty)
    ```

5. **Re-authenticate**
    - Scan new QR code
    - Verify connection succeeds
    - Verify new session files created

6. **Restore Original Session (Optional)**
    ```powershell
    # If you want to restore the original session
    Copy-Item src-tauri\whatsapp-node\auth_info\creds.json.backup src-tauri\whatsapp-node\auth_info\creds.json -Force
    ```

### Expected Results

✅ **Pass Criteria:**

- Invalid session detected
- Clear error message to user
- Session automatically cleared
- New QR code generated
- Re-authentication succeeds
- No application crash

❌ **Fail Criteria:**

- Application crashes
- Infinite retry loop
- No error message
- Session not cleared
- Cannot re-authenticate

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Error Message Shown:** **********\_\_\_**********
- **Re-authentication Successful:** Yes / No
- **Notes:** **********\_\_\_**********

---

## Test 7: Session Expiration Handling

### Purpose

Verify that the application correctly handles session expiration (e.g., after being logged out from another device).

### Requirements Tested

- 3.4: Request new QR code if session is invalid/expired
- 7.3: Prevent automatic reconnection after logout

### Pre-Test Setup

1. **Ensure Application is Connected**
2. **Have Access to WhatsApp Mobile App**

### Test Steps

1. **Logout from Another Device**
    - Open WhatsApp on your mobile device
    - Go to Settings → Linked Devices
    - Find the "WhatsApp Automation" device
    - Tap and select "Log Out"

2. **Monitor Application Response**
   Watch for these log entries:

    ```
    [INFO] [WhatsApp] WhatsApp disconnected
    [INFO] [WhatsApp] Logged out from WhatsApp
    [DEBUG] [WhatsApp] Authentication state cleared
    ```

3. **Verify UI Response**
    - [ ] Disconnected status displayed
    - [ ] "Logged out" message shown
    - [ ] No automatic reconnection attempts
    - [ ] User prompted to reconnect

4. **Verify Session Cleanup**

    ```powershell
    # Check if auth_info was cleared
    Test-Path src-tauri\whatsapp-node\auth_info\creds.json
    # Should return: False
    ```

5. **Verify No Reconnection Loop**
    - Wait 30 seconds
    - [ ] No automatic reconnection attempts
    - [ ] No error messages
    - [ ] Application remains stable

6. **Manual Reconnection**
    - Click "Connect" button
    - [ ] New QR code generated
    - [ ] Can re-authenticate successfully

### Expected Results

✅ **Pass Criteria:**

- Logout detected immediately
- Session cleared automatically
- No reconnection attempts
- Clear message to user
- Can manually reconnect
- No errors or crashes

❌ **Fail Criteria:**

- Logout not detected
- Automatic reconnection attempts
- Session not cleared
- Application crashes
- Cannot reconnect

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Logout Detection Time:** **\_\_\_** seconds
- **Reconnection Successful:** Yes / No
- **Notes:** **********\_\_\_**********

---

## Test 8: Multiple QR Code Retry Limit

### Purpose

Verify that the application correctly limits QR code generation attempts and handles expiration.

### Requirements Tested

- 2.3: Implement QR retry limit (max 3 attempts)
- 7.5: Stop and notify user when maximum retry attempts reached

### Pre-Test Setup

1. **Ensure No Existing Session**

    ```powershell
    Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info -ErrorAction SilentlyContinue
    ```

2. **Start Application**
    ```powershell
    bun tauri dev
    ```

### Test Steps

1. **Generate First QR Code**
    - [ ] QR code displayed
    - Note the time

2. **Wait for QR Code Expiration**
    - Do NOT scan the QR code
    - Wait approximately 60 seconds
    - QR code should expire and regenerate

3. **Monitor QR Code Regeneration**
   Watch for log entries:

    ```
    [DEBUG] [WhatsApp] QR code generated (attempt 1)
    [DEBUG] [WhatsApp] QR code generated (attempt 2)
    [DEBUG] [WhatsApp] QR code generated (attempt 3)
    [ERROR] [WhatsApp] QR code expired. Please restart connection.
    ```

4. **Verify Retry Limit**
    - [ ] QR code regenerates automatically (attempt 2)
    - [ ] QR code regenerates again (attempt 3)
    - [ ] After 3rd attempt, error message shown
    - [ ] No 4th QR code generated

5. **Verify UI Feedback**
    - [ ] Retry count displayed (if implemented)
    - [ ] Error message after max attempts
    - [ ] Option to restart connection

6. **Test Manual Restart**
    - Click "Connect" or "Retry" button
    - [ ] QR retry counter resets
    - [ ] New QR code generated
    - [ ] Can authenticate successfully

### Expected Results

✅ **Pass Criteria:**

- Maximum 3 QR code attempts
- Clear error message after max attempts
- No infinite QR generation
- Retry counter resets on manual connect
- Can successfully authenticate after restart

❌ **Fail Criteria:**

- More than 3 QR attempts
- No error message
- Infinite QR generation
- Cannot restart connection
- Retry counter doesn't reset

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Number of QR Attempts Observed:** **********\_\_\_**********
- **Manual Restart Successful:** Yes / No
- **Notes:** **********\_\_\_**********

---

## Test 9: Concurrent Session Check

### Purpose

Verify that multiple rapid connection attempts don't cause race conditions or duplicate sessions.

### Requirements Tested

- 3.2: Attempt to restore previous session on start
- 10.1: Store auth state in application data directory

### Pre-Test Setup

1. **Ensure Existing Session**
    - Should have valid session from previous tests

2. **Prepare for Rapid Clicks**

### Test Steps

1. **Restart Application**

    ```powershell
    bun tauri dev
    ```

2. **Rapid Connection Attempts**
    - As soon as UI loads, rapidly click "Connect" button 10 times
    - Click as fast as possible (within 1-2 seconds)

3. **Monitor Initialization**
   Watch for log entries:

    ```
    [DEBUG] [WhatsApp] Acquired initialization lock
    [DEBUG] [WhatsApp] Checking for existing session
    [DEBUG] [WhatsApp] Existing session found
    [DEBUG] [WhatsApp] Proceeding with initialization
    ```

    Should appear ONCE

    Then:

    ```
    [DEBUG] [WhatsApp] Initialization already in progress
    ```

    Should appear for subsequent attempts

4. **Verify Single Connection**
    - [ ] Only ONE initialization process started
    - [ ] Only ONE connection established
    - [ ] No duplicate processes
    - [ ] No race condition errors

5. **Verify Session Integrity**

    ```powershell
    # Check that session files weren't corrupted
    Get-ChildItem src-tauri\whatsapp-node\auth_info
    # Should show normal files, no duplicates
    ```

6. **Verify Application Stability**
    - [ ] Application remains responsive
    - [ ] No crashes or freezes
    - [ ] Connection succeeds normally
    - [ ] All operations work correctly

### Expected Results

✅ **Pass Criteria:**

- Only one initialization process
- Subsequent attempts handled gracefully
- No race conditions
- No session corruption
- Application remains stable
- Connection succeeds

❌ **Fail Criteria:**

- Multiple initialization processes
- Race condition errors
- Session corruption
- Application crashes
- Duplicate connections

### Test Results

- [ ] Test Passed
- [ ] Test Failed
- **Number of Rapid Clicks:** **********\_\_\_**********
- **Initialization Attempts Logged:** **********\_\_\_**********
- **Notes:** **********\_\_\_**********

---

## Test Summary

### Overall Test Results

| Test # | Test Name                               | Status            | Notes |
| ------ | --------------------------------------- | ----------------- | ----- |
| 1      | Fresh Installation QR Code Flow         | ⬜ Pass / ⬜ Fail |       |
| 2      | Successful Authentication After QR Scan | ⬜ Pass / ⬜ Fail |       |
| 3      | Auth Info Directory Structure           | ⬜ Pass / ⬜ Fail |       |
| 4      | App Restart with Existing Session       | ⬜ Pass / ⬜ Fail |       |
| 5      | Session Restoration on Cold Start       | ⬜ Pass / ⬜ Fail |       |
| 6      | Invalid Session Handling                | ⬜ Pass / ⬜ Fail |       |
| 7      | Session Expiration Handling             | ⬜ Pass / ⬜ Fail |       |
| 8      | Multiple QR Code Retry Limit            | ⬜ Pass / ⬜ Fail |       |
| 9      | Concurrent Session Check                | ⬜ Pass / ⬜ Fail |       |

### Requirements Coverage

| Requirement                            | Tests   | Status      |
| -------------------------------------- | ------- | ----------- |
| 2.1 - Generate QR code when no session | 1, 8    | ⬜ Verified |
| 2.2 - Display QR code in frontend      | 1, 2    | ⬜ Verified |
| 2.3 - Establish connection after scan  | 2       | ⬜ Verified |
| 2.4 - Save credentials securely        | 2, 3    | ⬜ Verified |
| 2.5 - Restore session without QR       | 4, 5    | ⬜ Verified |
| 3.1 - Store auth state securely        | 2, 3    | ⬜ Verified |
| 3.2 - Restore previous session         | 4, 5, 9 | ⬜ Verified |
| 3.3 - Connect automatically if valid   | 4, 5    | ⬜ Verified |
| 3.4 - Request QR if invalid/expired    | 6, 7    | ⬜ Verified |
| 3.5 - Handle session updates           | 5       | ⬜ Verified |

### Critical Issues Found

_Document any critical issues that prevent the feature from working:_

1. ***
2. ***
3. ***

### Non-Critical Issues Found

_Document any minor issues or improvements needed:_

1. ***
2. ***
3. ***

### Recommendations

_Based on test results, provide recommendations:_

1. ***
2. ***
3. ***

---

## Completion Checklist

- [ ] All 9 tests executed
- [ ] All test results documented
- [ ] All requirements verified
- [ ] Critical issues documented
- [ ] Non-critical issues documented
- [ ] Recommendations provided
- [ ] Test artifacts saved (screenshots, logs)
- [ ] Task marked as complete in tasks.md

---

## Test Artifacts

### Screenshots

_Save screenshots of key test moments:_

- Fresh QR code display
- Connected state
- Session restoration
- Error handling

### Log Files

_Save relevant log excerpts:_

- Successful authentication flow
- Session restoration flow
- Error scenarios

### Session Files

_Document session file structure:_

```
auth_info/
├── creds.json (size: ___ KB)
├── app-state-sync-key-AAAAA.json
├── app-state-sync-key-AAAAB.json
└── ... (total: ___ files)
```

---

## Notes

_Additional observations or comments:_

---

---

---

---

**Test Conducted By:** **********\_\_\_**********  
**Date:** **********\_\_\_**********  
**Application Version:** **********\_\_\_**********  
**Environment:** Development / Production
