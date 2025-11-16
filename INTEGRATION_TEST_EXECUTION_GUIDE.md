# Integration Test Execution Guide

## Quick Start

This guide provides step-by-step instructions for executing the integration tests outlined in `INTEGRATION_TEST_PLAN.md`.

## Prerequisites

Before starting the tests, ensure you have:

1. ✅ Application built and ready to run
2. ✅ WhatsApp account with access to test groups
3. ✅ Test phone numbers for bulk add operations
4. ✅ Internet connection
5. ✅ Task Manager or Activity Monitor open (for performance monitoring)

## Running Automated Tests

First, run the automated test suite to verify the basic setup:

```powershell
# Run automated integration tests
.\scripts\integration-test.ps1
```

**Expected Output**:

- Success Rate: > 90%
- No critical failures
- Minor warnings are acceptable (e.g., no session data on fresh install)

## Manual Testing Workflow

### Step 1: Start the Application

```powershell
# Start the application in development mode
bun tauri dev
```

**What to observe**:

- Application window opens within 2-3 seconds
- No console errors in terminal
- Frontend loads correctly

### Step 2: Test Fresh Authentication (QR Code Flow)

**If you have an existing session, clear it first**:

```powershell
# Clear existing session
Remove-Item -Recurse -Force "src-tauri\whatsapp-node\auth_info" -ErrorAction SilentlyContinue
```

**Test Steps**:

1. Application should show "Connect" page
2. Click "Conectar ao WhatsApp" button
3. QR code should appear within 5 seconds
4. Open WhatsApp on your phone
5. Go to Settings → Linked Devices → Link a Device
6. Scan the QR code displayed in the application

**Expected Results**:

- ✅ QR code appears and is scannable
- ✅ After scanning, status changes to "Conectado"
- ✅ Phone number is displayed
- ✅ Dashboard becomes accessible
- ✅ `auth_info` directory is created with credentials

**Verification**:

```powershell
# Check auth_info was created
Test-Path "src-tauri\whatsapp-node\auth_info\creds.json"
# Should return: True
```

### Step 3: Test Session Persistence

**Test Steps**:

1. Close the application (Ctrl+C in terminal or close window)
2. Restart the application: `bun tauri dev`
3. Observe connection behavior

**Expected Results**:

- ✅ No QR code is shown
- ✅ Connection is restored automatically within 5 seconds
- ✅ Same phone number is displayed
- ✅ Dashboard is accessible immediately

### Step 4: Test Group Operations

#### 4.1 Fetch Groups

**Test Steps**:

1. Navigate to "Extrair Membros" page
2. Observe the group dropdown loading
3. Click the dropdown to see all groups

**Expected Results**:

- ✅ All your WhatsApp groups are listed
- ✅ Group names match your WhatsApp mobile app
- ✅ Groups where you're admin show admin indicator
- ✅ No errors in console

**Verification**:

- Compare group count with WhatsApp mobile app
- Verify group names are correct

#### 4.2 Extract Members

**Test Steps**:

1. Select a group from the dropdown
2. Click "Extrair membros" button
3. Wait for member list to load

**Expected Results**:

- ✅ Member list appears within 3-5 seconds
- ✅ All group members are listed
- ✅ Phone numbers are displayed correctly (no @ symbols)
- ✅ Member names are shown (when available)
- ✅ Admin members show "Admin" badge

**Verification**:

- Compare member count with WhatsApp mobile app
- Spot-check a few phone numbers for accuracy

#### 4.3 Export Members (JSON)

**Test Steps**:

1. After extracting members, click "Exportar JSON"
2. Choose a save location (e.g., Desktop)
3. Save the file as `test-members.json`
4. Open the file in a text editor

**Expected Results**:

- ✅ File dialog opens
- ✅ File is saved successfully
- ✅ JSON is valid and properly formatted
- ✅ All member data is included
- ✅ Success toast notification appears

**JSON Structure Check**:

```json
[
    {
        "phoneNumber": "1234567890",
        "name": "John Doe",
        "isAdmin": false
    }
]
```

#### 4.4 Export Members (CSV)

**Test Steps**:

1. Click "Exportar CSV"
2. Choose a save location
3. Save the file as `test-members.csv`
4. Open the file in Excel or a text editor

**Expected Results**:

- ✅ File dialog opens
- ✅ File is saved successfully
- ✅ CSV has proper headers
- ✅ All member data is included
- ✅ Success toast notification appears

**CSV Structure Check**:

```csv
Phone Number,Name,Is Admin
"1234567890","John Doe","No"
```

### Step 5: Test Bulk Add Operations

**⚠️ Important**: Only test this on groups where you are an admin and have permission to add members.

#### 5.1 Add Single User

**Test Steps**:

1. Navigate to "Adicionar ao Grupo" page
2. Select a group where you're admin
3. Enter ONE test phone number (format: country code + number, e.g., 5511999999999)
4. Set delay to 3 seconds
5. Click "Iniciar Adição"
6. Monitor the progress

**Expected Results**:

- ✅ Progress bar appears and updates
- ✅ Status shows "Adding user..."
- ✅ Operation completes within 5 seconds
- ✅ Success message is displayed
- ✅ User is added to the group (verify in WhatsApp mobile app)

#### 5.2 Bulk Add Multiple Users

**Test Steps**:

1. Select a group where you're admin
2. Enter 3 test phone numbers (one per line)
3. Set delay to 3 seconds
4. Click "Iniciar Adição"
5. Monitor progress and timing

**Expected Results**:

- ✅ Progress updates for each user
- ✅ Approximately 3 seconds delay between each addition
- ✅ Total time: ~9 seconds for 3 users
- ✅ Final report shows success count
- ✅ All users are added to the group

**Timing Verification**:

- Start timer when clicking "Iniciar Adição"
- Stop timer when operation completes
- Expected: ~9 seconds (3 users × 3 seconds delay)

#### 5.3 Test Error Handling

**Test Steps**:

1. Enter a mix of valid and invalid phone numbers:
    - Valid: Your test numbers
    - Invalid: 123456 (too short)
    - Invalid: 99999999999999 (non-existent)
2. Click "Iniciar Adição"
3. Monitor results

**Expected Results**:

- ✅ Valid numbers are added successfully
- ✅ Invalid numbers show error status
- ✅ Process continues despite errors
- ✅ Final report shows correct success/failure counts
- ✅ Error messages are clear and user-friendly

### Step 6: Test Dashboard Event Monitoring

**Test Steps**:

1. Navigate to Dashboard
2. Keep Dashboard open
3. Perform various operations:
    - Fetch groups
    - Extract members
    - Add users to group
4. Observe "Eventos Recentes" section

**Expected Results**:

- ✅ Events appear in real-time
- ✅ Event timestamps are accurate
- ✅ Event descriptions are clear
- ✅ Event icons are appropriate
- ✅ Events are ordered by time (newest first)

**Events to Verify**:

- 📱 QR code generated
- ✅ WhatsApp connected
- 💬 Groups fetched
- 👥 Members extracted
- ➕ Users added to group

### Step 7: Test Error Handling and Recovery

#### 7.1 Connection Loss Recovery

**Test Steps**:

1. Ensure WhatsApp is connected
2. Disable your network connection (Wi-Fi or Ethernet)
3. Wait 5 seconds
4. Re-enable network connection
5. Observe reconnection behavior

**Expected Results**:

- ✅ Disconnection is detected within 5 seconds
- ✅ Status changes to "Desconectado"
- ✅ Automatic reconnection attempts start
- ✅ Connection is restored within 10 seconds
- ✅ Status changes back to "Conectado"
- ✅ No QR code is required

#### 7.2 Logout and Re-authentication

**Test Steps**:

1. While connected, navigate to Settings (if available) or use command:
    ```javascript
    // In browser console (if dev tools are open)
    await window.__TAURI__.invoke('logout_whatsapp')
    ```
2. Observe logout behavior
3. Attempt to reconnect

**Expected Results**:

- ✅ Logout command executes successfully
- ✅ `auth_info` directory is cleared
- ✅ Connection is terminated
- ✅ Status changes to "Desconectado"
- ✅ QR code is shown on reconnect attempt
- ✅ No automatic reconnection occurs

**Verification**:

```powershell
# Check auth_info was cleared
Test-Path "src-tauri\whatsapp-node\auth_info\creds.json"
# Should return: False
```

### Step 8: Performance Monitoring

#### 8.1 Memory Usage

**Test Steps**:

1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "WhatsApp Automation" process
3. Note memory usage at different stages:
    - Idle (just connected)
    - During group fetch
    - During member extraction
    - During bulk add operation

**Expected Results**:

- ✅ Idle memory: < 100MB
- ✅ Peak memory: < 200MB
- ✅ Memory returns to idle after operations
- ✅ No memory leaks over time

**Record Your Results**:

```
Idle Memory: _____ MB
Peak Memory: _____ MB
After 10 minutes: _____ MB
```

#### 8.2 Startup Time

**Test Steps**:

1. Close the application
2. Start a timer
3. Launch the application: `bun tauri dev`
4. Stop timer when connection is established

**Expected Results**:

- ✅ Application launches: < 2 seconds
- ✅ Connection established: < 5 seconds
- ✅ Total startup time: < 7 seconds

**Record Your Results**:

```
Application Launch: _____ seconds
Connection Established: _____ seconds
Total Startup Time: _____ seconds
```

#### 8.3 CPU Usage

**Test Steps**:

1. Monitor CPU usage in Task Manager
2. Observe during:
    - Idle state
    - Group fetch operation
    - Member extraction
    - Bulk add operation

**Expected Results**:

- ✅ Idle CPU: < 5%
- ✅ Operation CPU: < 20%
- ✅ No sustained high CPU usage
- ✅ CPU returns to idle after operations

### Step 9: Multi-Device Support

#### 9.1 Verify Linked Devices

**Test Steps**:

1. Ensure application is connected
2. Open WhatsApp on your mobile phone
3. Go to Settings → Linked Devices
4. Check the device list

**Expected Results**:

- ✅ Application appears in linked devices list
- ✅ Device name is "WhatsApp Automation"
- ✅ Other devices remain connected
- ✅ No disconnections occur

#### 9.2 Test Multi-Device Sync

**Test Steps**:

1. Keep application connected
2. On mobile app, send a message to a group
3. On mobile app, create a new group
4. Refresh groups in application

**Expected Results**:

- ✅ New group appears in group list
- ✅ No sync errors occur
- ✅ Data remains consistent

## Test Results Documentation

### Automated Test Results

```
Date: _______________
Tester: _______________

Automated Tests:
- Total Tests: 40
- Passed: _____
- Failed: _____
- Warnings: _____
- Success Rate: _____%
```

### Manual Test Results

#### Phase 1: Connection and Authentication

- [ ] Fresh Installation - QR Code Authentication: PASS / FAIL
- [ ] Session Persistence: PASS / FAIL
- [ ] Connection State Management: PASS / FAIL

#### Phase 2: Group Operations

- [ ] Fetch All Groups: PASS / FAIL
- [ ] Extract Group Members: PASS / FAIL
- [ ] Export Members (JSON): PASS / FAIL
- [ ] Export Members (CSV): PASS / FAIL

#### Phase 3: Bulk Add Operations

- [ ] Add Single User: PASS / FAIL
- [ ] Bulk Add Multiple Users: PASS / FAIL
- [ ] Error Handling: PASS / FAIL

#### Phase 4: Dashboard and Events

- [ ] Event Monitoring: PASS / FAIL
- [ ] Real-time Updates: PASS / FAIL

#### Phase 5: Error Handling

- [ ] Connection Loss Recovery: PASS / FAIL
- [ ] Logout and Re-authentication: PASS / FAIL

#### Phase 6: Performance

- [ ] Memory Usage: PASS / FAIL (**\_** MB peak)
- [ ] Startup Time: PASS / FAIL (**\_** seconds)
- [ ] CPU Usage: PASS / FAIL (**\_** % peak)

#### Phase 7: Multi-Device

- [ ] Linked Devices: PASS / FAIL
- [ ] Multi-Device Sync: PASS / FAIL

### Performance Metrics

| Metric        | Target  | Actual    | Status |
| ------------- | ------- | --------- | ------ |
| Memory (Idle) | < 100MB | **\_** MB | ⏳     |
| Memory (Peak) | < 200MB | **\_** MB | ⏳     |
| Startup Time  | < 5s    | **\_** s  | ⏳     |
| CPU (Idle)    | < 5%    | **\_** %  | ⏳     |
| CPU (Peak)    | < 20%   | **\_** %  | ⏳     |

### Issues Found

| Issue # | Description | Severity | Steps to Reproduce | Status |
| ------- | ----------- | -------- | ------------------ | ------ |
| 1       |             |          |                    |        |
| 2       |             |          |                    |        |
| 3       |             |          |                    |        |

### Overall Assessment

**Total Tests**: **\_**
**Passed**: **\_**
**Failed**: **\_**
**Success Rate**: **\_**%

**Ready for Production**: YES / NO

**Tester Signature**: ******\_\_\_******
**Date**: ******\_\_\_******

## Troubleshooting Common Issues

### Issue: QR Code Not Appearing

**Possible Causes**:

- Network connection issues
- Baileys not installed correctly
- Node.js process not starting

**Solutions**:

1. Check network connection
2. Verify Baileys installation: `cd src-tauri\whatsapp-node && npm list @whiskeysockets/baileys`
3. Check console for errors
4. Restart application

### Issue: Session Not Persisting

**Possible Causes**:

- `auth_info` directory being deleted
- File permission issues
- Corrupted credentials

**Solutions**:

1. Check if `auth_info` directory exists
2. Verify file permissions
3. Clear session and re-authenticate

### Issue: Groups Not Loading

**Possible Causes**:

- Not connected to WhatsApp
- Network issues
- API rate limiting

**Solutions**:

1. Verify connection status
2. Check network connection
3. Wait a few seconds and retry
4. Check console for error messages

### Issue: Bulk Add Failing

**Possible Causes**:

- Not admin in the group
- Invalid phone numbers
- Rate limiting
- Group settings restrict adding members

**Solutions**:

1. Verify you're admin in the group
2. Check phone number format (country code + number)
3. Reduce number of users or increase delay
4. Check group settings in WhatsApp

### Issue: High Memory Usage

**Possible Causes**:

- Memory leak
- Too many operations running
- Large group member lists

**Solutions**:

1. Restart application
2. Close unused pages
3. Clear browser cache (if applicable)
4. Report issue with details

## Next Steps After Testing

### If All Tests Pass

1. ✅ Mark task 16 as complete
2. ✅ Update `INTEGRATION_TEST_PLAN.md` with results
3. ✅ Create release notes
4. ✅ Prepare for production deployment
5. ✅ Update user documentation

### If Issues Are Found

1. ⚠️ Document all issues in detail
2. ⚠️ Prioritize issues by severity:
    - **Critical**: Blocks core functionality
    - **High**: Impacts user experience significantly
    - **Medium**: Minor issues, workarounds available
    - **Low**: Cosmetic or edge cases
3. ⚠️ Create fix tasks for critical and high priority issues
4. ⚠️ Re-test after fixes are applied
5. ⚠️ Update test results

## Conclusion

This integration test execution guide ensures comprehensive testing of the Baileys migration. Follow each step carefully and document all results. The goal is to verify that:

1. ✅ All features work correctly with Baileys
2. ✅ Performance improvements are realized
3. ✅ Backward compatibility is maintained
4. ✅ Error handling is robust
5. ✅ User experience is smooth

**Good luck with your testing!** 🚀
