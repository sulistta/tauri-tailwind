# Manual Testing Guide

This guide provides step-by-step instructions for manual testing of the WhatsApp Automation application.

## Testing Guides

### Baileys Migration Testing

For comprehensive authentication and session persistence testing with Baileys, see:

- **[Baileys Authentication & Session Test Plan](BAILEYS_AUTH_SESSION_TEST_PLAN.md)** - Complete test suite for Requirements 2.1-2.5 and 3.1-3.5
- **[Baileys Multi-Device Support Test Plan](BAILEYS_MULTI_DEVICE_TEST_PLAN.md)** - Complete test suite for Requirements 11.1-11.5

### Architecture Refactor Testing

The following tests verify the refactored WhatsApp connection architecture:

## Prerequisites

- Application built and ready to run
- WhatsApp mobile app with active account
- Terminal access for process management
- Ability to scan QR codes

## Test 6: Cold Start (No Session) Flow

### Purpose

Verify that the application correctly handles first-time initialization when no WhatsApp session exists.

### Steps

1. **Stop the Application**

    ```powershell
    # If running in dev mode, press Ctrl+C in the terminal
    # Or close the application window
    ```

2. **Delete Existing Session**

    ```powershell
    # Navigate to project root
    cd D:\Projects\whats-ext

    # Remove auth_info directory (Baileys session storage)
    Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info

    # Verify deletion
    Test-Path src-tauri\whatsapp-node\auth_info
    # Should return: False
    ```

3. **Start Application**

    ```powershell
    bun tauri dev
    ```

4. **Monitor Logs**
   Watch for these log entries:

    ```
    [DEBUG] [WhatsApp] Checking for existing session
    [DEBUG] [WhatsApp] No existing session
    [DEBUG] [WhatsApp] QR code generated
    ```

5. **Verify UI Behavior**
    - Application should show QR code screen
    - QR code should be clearly visible
    - Instructions should be displayed

6. **Scan QR Code**
    - Open WhatsApp on your mobile device
    - Go to Settings → Linked Devices
    - Tap "Link a Device"
    - Scan the QR code displayed in the application

7. **Verify Connection**
   Watch for these log entries:

    ```
    [INFO] [WhatsApp] WhatsApp connected - +[phone_number]
    ```

    UI should:
    - Hide QR code
    - Show connected status
    - Display phone number
    - Navigate to main application screen

8. **Verify Session Persistence**

    ```powershell
    # Check that auth_info directory was created
    Test-Path src-tauri\whatsapp-node\auth_info
    # Should return: True

    # List session files (should see creds.json and sync keys)
    Get-ChildItem src-tauri\whatsapp-node\auth_info
    ```

### Expected Results

✅ **Pass Criteria:**

- Session check returns false (no existing session)
- QR code generated and displayed
- Only ONE session check performed
- No duplicate initialization attempts
- Connection established after QR scan
- Session files created in session directory
- No errors or warnings in logs

❌ **Fail Criteria:**

- Multiple session checks
- QR code not displayed
- Connection fails after scan
- Duplicate initialization attempts
- Error messages in logs

### Record Results

Document your findings:

- [ ] Session check performed once: Yes/No
- [ ] QR code displayed correctly: Yes/No
- [ ] Connection established: Yes/No
- [ ] Session persisted: Yes/No
- [ ] Any issues encountered: **\*\***\_\_\_**\*\***

---

## Test 7: Rapid Reconnection Attempts

### Purpose

Verify that rapid, concurrent connection attempts are properly serialized and don't cause race conditions.

### Steps

1. **Ensure Application is Running**

    ```powershell
    bun tauri dev
    ```

2. **Navigate to Connect Page**
    - If already connected, you may need to disconnect first
    - Or test from the initial connection screen

3. **Prepare to Monitor Logs**
    - Keep terminal visible
    - Watch for initialization messages

4. **Rapid Click Test**
    - Click the "Connect" button rapidly 10 times
    - Click as fast as possible (within 1-2 seconds)
    - Do NOT wait between clicks

5. **Monitor Log Output**
   Look for:

    ```
    [DEBUG] [WhatsApp] Acquired initialization lock
    [DEBUG] [WhatsApp] Proceeding with initialization
    ```

    Should appear ONCE

    Then:

    ```
    [DEBUG] [WhatsApp] Initialization already in progress
    ```

    Should appear for subsequent attempts

6. **Verify UI Behavior**
    - Application should remain responsive
    - No crashes or freezes
    - Loading indicator should appear
    - Only one connection process should start

7. **Check Final State**
    - Application should connect successfully
    - No error messages
    - Normal operation resumes

### Expected Results

✅ **Pass Criteria:**

- Only ONE "Proceeding with initialization" log entry
- Multiple "Initialization already in progress" entries
- No duplicate connection processes
- No race conditions or crashes
- UI remains responsive
- Connection succeeds normally

❌ **Fail Criteria:**

- Multiple initialization processes started
- Application crashes or freezes
- Race condition errors
- Duplicate connections
- UI becomes unresponsive

### Record Results

Document your findings:

- [ ] Single initialization process: Yes/No
- [ ] Subsequent attempts handled gracefully: Yes/No
- [ ] No crashes or errors: Yes/No
- [ ] UI remained responsive: Yes/No
- [ ] Number of rapid clicks tested: \_\_\_
- [ ] Any issues encountered: **\*\***\_\_\_**\*\***

---

## Test 8: Connection Recovery After Process Crash

### Purpose

Verify that the automatic recovery mechanism works correctly when the WhatsApp Node.js subprocess crashes or is killed.

### Steps

1. **Start Application and Connect**

    ```powershell
    bun tauri dev
    ```

    - Wait for successful connection
    - Verify you see: `[INFO] [WhatsApp] WhatsApp connected - +[phone]`

2. **Find Node.js Process**

    ```powershell
    # List all Node.js processes
    Get-Process node

    # Find the WhatsApp-specific process
    Get-Process node | Where-Object {$_.Path -like "*whatsapp-node*"}

    # Note the PID (Process ID)
    ```

3. **Prepare to Monitor**
    - Keep terminal visible
    - Watch for recovery messages
    - Note the current time

4. **Kill the Node.js Process**

    ```powershell
    # Replace <PID> with actual process ID
    Stop-Process -Id <PID> -Force
    ```

5. **Monitor Recovery Attempts**
   Watch for these log entries:

    **Attempt 1** (should start ~2 seconds after disconnect):

    ```
    [INFO] [WhatsApp] Starting recovery attempt 1/3
    ```

    **Attempt 2** (should start ~4 seconds after attempt 1):

    ```
    [INFO] [WhatsApp] Starting recovery attempt 2/3
    ```

    **Attempt 3** (should start ~8 seconds after attempt 2):

    ```
    [INFO] [WhatsApp] Starting recovery attempt 3/3
    ```

    **Max Attempts Reached**:

    ```
    [WARNING] [WhatsApp] Maximum recovery attempts reached
    ```

6. **Verify UI Notifications**
    - Toast notification: "Attempting to reconnect (1/3)..."
    - Toast notification: "Attempting to reconnect (2/3)..."
    - Toast notification: "Attempting to reconnect (3/3)..."
    - Final toast: "Max Reconnection Attempts Reached"

7. **Verify Exponential Backoff**
   Time the intervals between attempts:
    - Attempt 1 to 2: Should be ~4 seconds
    - Attempt 2 to 3: Should be ~8 seconds
    - (Backoff doubles each time)

8. **Test Manual Reconnection**
   After max attempts reached:
    - Click "Connect" button manually
    - Verify connection can be re-established
    - Check that recovery counter resets

### Expected Results

✅ **Pass Criteria:**

- Process death detected immediately
- Recovery starts automatically (~2 seconds)
- Exponential backoff applied correctly (2s, 4s, 8s)
- Maximum 3 recovery attempts
- User notified via toast messages
- After max attempts, recovery stops
- Manual reconnection still works
- No infinite retry loops

❌ **Fail Criteria:**

- Recovery doesn't start
- Incorrect backoff timing
- More than 3 attempts
- No user notifications
- Infinite retry loop
- Manual reconnection fails
- Application crashes

### Record Results

Document your findings:

- [ ] Process death detected: Yes/No
- [ ] Recovery started automatically: Yes/No
- [ ] Correct number of attempts (3): Yes/No
- [ ] Exponential backoff timing correct: Yes/No
- [ ] User notifications appeared: Yes/No
- [ ] Recovery stopped after max attempts: Yes/No
- [ ] Manual reconnection worked: Yes/No
- [ ] Timing measurements:
    - Disconnect to Attempt 1: \_\_\_ seconds
    - Attempt 1 to Attempt 2: \_\_\_ seconds
    - Attempt 2 to Attempt 3: \_\_\_ seconds
- [ ] Any issues encountered: **\*\***\_\_\_**\*\***

---

## Completing the Tests

### After Running All Tests

1. **Update Test Results Document**
    - Open `ARCHITECTURE_TEST_RESULTS.md`
    - Update each test section with your findings
    - Change status from "REQUIRES MANUAL TESTING" to "PASSED" or "FAILED"
    - Add any observations or issues

2. **Document Issues**
   If any test fails:
    - Describe the failure in detail
    - Include relevant log excerpts
    - Note steps to reproduce
    - Suggest potential fixes

3. **Mark Task Complete**
   Only mark the task as complete if:
    - All 8 tests have been run
    - Results are documented
    - Any critical issues are addressed
    - Architecture meets all requirements

### Troubleshooting

**QR Code Not Appearing:**

- Check browser console for errors
- Verify backend is emitting QR events
- Check that frontend is listening for events

**Recovery Not Starting:**

- Verify connection recovery hook is enabled
- Check that process death is detected
- Look for error messages in logs

**Timing Issues:**

- System load can affect timing
- Backoff should be approximate, not exact
- Allow ±1 second variance

**Connection Fails:**

- Check internet connection
- Verify WhatsApp Web is not blocked
- Try restarting the application

---

## Quick Reference

### Useful Commands

```powershell
# Start application
bun tauri dev

# Find Node.js processes
Get-Process node

# Kill specific process
Stop-Process -Id <PID> -Force

# Check session exists
Test-Path src-tauri\whatsapp-node\auth_info

# Delete session
Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info

# View recent logs (if logging to file)
Get-Content -Tail 50 logs\app.log
```

### Log Level Reference

- `[DEBUG]` - Routine operations, detailed flow
- `[INFO]` - Important milestones, user-relevant events
- `[WARNING]` - Recoverable issues, retry attempts
- `[ERROR]` - Failures requiring attention

### Expected Timing

- Session check: < 1 second
- Initialization: 2-3 seconds
- QR generation: 1-2 seconds
- Connection after QR scan: 2-5 seconds
- Recovery attempt 1: ~2 seconds after disconnect
- Recovery attempt 2: ~4 seconds after attempt 1
- Recovery attempt 3: ~8 seconds after attempt 2
