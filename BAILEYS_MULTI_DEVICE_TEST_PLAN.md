# Baileys Multi-Device Support Test Plan

This document provides comprehensive manual testing procedures for verifying multi-device support in the WhatsApp Automation application using Baileys.

**Requirements Coverage:** 11.1, 11.2, 11.3, 11.4, 11.5

---

## Overview

WhatsApp's multi-device protocol allows multiple devices to connect to the same WhatsApp account simultaneously without requiring the phone to be online. Baileys implements this protocol by default, enabling the application to:

- Connect as a linked device alongside other devices
- Sync messages and state across all devices
- Maintain independent connections without affecting other devices
- Display a custom device name in WhatsApp's linked devices list

---

## Prerequisites

- Application built and ready to run
- WhatsApp mobile app with active account
- At least one other device already linked to WhatsApp (optional but recommended)
- Access to WhatsApp mobile app settings
- Terminal access for monitoring logs

---

## Test 1: Multi-Device Protocol Enabled by Default

### Purpose

Verify that Baileys uses multi-device support by default (Requirement 11.1)

### Background

Baileys automatically uses WhatsApp's multi-device protocol. This is evident in the socket configuration where no special flags are needed - multi-device is the default mode.

### Steps

1. **Review Implementation**

    Open `src-tauri/whatsapp-node/index.js` and verify the socket configuration:

    ```javascript
    sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        browser: ['WhatsApp Automation', 'Desktop', '1.0.0'],
        markOnlineOnConnect: true
        // ... other config
    })
    ```

2. **Check Auth State Structure**

    After connecting, verify the auth_info directory contains multi-device sync keys:

    ```powershell
    # List files in auth_info directory
    Get-ChildItem src-tauri\whatsapp-node\auth_info
    ```

    Expected files:
    - `creds.json` - Authentication credentials
    - `app-state-sync-key-*.json` - Multi-device sync keys (multiple files)

3. **Verify Connection Type**

    Start the application and connect:

    ```powershell
    bun tauri dev
    ```

    Monitor logs for multi-device indicators:

    ```
    [DEBUG] [WhatsApp] Using multi-device protocol
    [INFO] [WhatsApp] WhatsApp connected - +[phone_number]
    ```

4. **Check WhatsApp Mobile App**
    - Open WhatsApp on your mobile device
    - Go to **Settings → Linked Devices**
    - Verify the application appears in the list
    - Note: If it appears in "Linked Devices" (not "WhatsApp Web"), multi-device is confirmed

### Expected Results

✅ **Pass Criteria:**

- Socket configuration uses default Baileys settings (no legacy mode flags)
- Auth state includes `app-state-sync-key-*.json` files
- Application appears in "Linked Devices" section on mobile
- Connection establishes successfully
- No errors related to protocol version

❌ **Fail Criteria:**

- Application appears in "WhatsApp Web" instead of "Linked Devices"
- No sync key files in auth_info directory
- Connection fails or requires phone to be online
- Errors about protocol mismatch

### Record Results

- [ ] Socket uses default multi-device config: Yes/No
- [ ] Sync key files present: Yes/No
- [ ] Appears in "Linked Devices": Yes/No
- [ ] Connection successful: Yes/No
- [ ] Number of sync key files: **\_**
- [ ] Any issues: **********\_**********

---

## Test 2: Other Devices Remain Connected

### Purpose

Verify that connecting the application doesn't disconnect other linked devices (Requirement 11.2)

### Steps

1. **Prepare Multiple Devices**

    Before starting, ensure you have at least one other device linked:
    - WhatsApp Web in a browser, OR
    - WhatsApp Desktop app, OR
    - Another mobile device with WhatsApp

    Verify all devices are connected:
    - Open WhatsApp on mobile
    - Go to **Settings → Linked Devices**
    - Note the list of currently connected devices

2. **Record Initial State**

    Document currently connected devices:
    - Device 1: **********\_********** (e.g., "Chrome on Windows")
    - Device 2: **********\_********** (e.g., "WhatsApp Desktop")
    - Device 3: **********\_********** (if applicable)

3. **Connect the Application**

    ```powershell
    # Ensure no existing session
    Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info -ErrorAction SilentlyContinue

    # Start application
    bun tauri dev
    ```

4. **Scan QR Code**
    - Wait for QR code to appear
    - Open WhatsApp on mobile
    - Go to **Settings → Linked Devices → Link a Device**
    - Scan the QR code

5. **Verify Other Devices**

    Immediately after connection:

    a. **Check Mobile App:**
    - Go to **Settings → Linked Devices**
    - Verify ALL previously connected devices are still listed
    - Verify the new device (WhatsApp Automation) is added

    b. **Check Other Devices:**
    - Open WhatsApp Web/Desktop on other devices
    - Verify they remain connected and functional
    - Send a test message from another device
    - Verify message appears on mobile

6. **Test Concurrent Usage**

    With all devices connected:
    - Send a message from Device 1
    - Verify it appears on mobile and other devices
    - Send a message from the application
    - Verify it appears on all devices
    - Send a message from mobile
    - Verify it appears on all linked devices

7. **Monitor for Disconnections**

    Watch for 5 minutes:
    - Check mobile app periodically
    - Verify no devices show "Disconnected" status
    - Verify no devices are automatically removed

### Expected Results

✅ **Pass Criteria:**

- All previously connected devices remain in the list
- No devices show "Disconnected" status
- All devices can send and receive messages
- New device (WhatsApp Automation) is added to the list
- No automatic disconnections occur
- All devices function independently

❌ **Fail Criteria:**

- Any previously connected device is disconnected
- Any device is removed from the list
- Other devices show "Disconnected" status
- Messages don't sync across devices
- Application connection causes other devices to fail

### Record Results

- [ ] Initial device count: **\_**
- [ ] Final device count: **\_**
- [ ] All previous devices still connected: Yes/No
- [ ] New device added successfully: Yes/No
- [ ] Messages sync across all devices: Yes/No
- [ ] No disconnections observed: Yes/No
- [ ] Devices tested:
    - [ ] WhatsApp Web (Browser): Connected/Not Tested
    - [ ] WhatsApp Desktop: Connected/Not Tested
    - [ ] Other mobile device: Connected/Not Tested
- [ ] Any issues: **********\_**********

---

## Test 3: Multi-Device Sync Events Handling

### Purpose

Verify that the application properly handles multi-device sync events (Requirement 11.3)

### Background

Baileys emits various events for multi-device synchronization:

- `creds.update` - Credential updates
- `connection.update` - Connection state changes
- `messages.upsert` - New messages
- `groups.update` - Group changes

### Steps

1. **Start Application with Monitoring**

    ```powershell
    # Start with existing session
    bun tauri dev
    ```

    Keep terminal visible to monitor event logs

2. **Test Credential Sync Events**

    a. **Trigger Credential Update:**
    - Connect the application
    - Wait for successful connection
    - Monitor logs for:
        ```
        [DEBUG] [WhatsApp] Credential update received
        [DEBUG] [WhatsApp] Saving credentials
        ```

    b. **Verify Credential Persistence:**

    ```powershell
    # Check that creds.json is updated
    Get-Item src-tauri\whatsapp-node\auth_info\creds.json | Select-Object LastWriteTime
    ```

3. **Test Message Sync Events**

    a. **Send Message from Another Device:**
    - Open WhatsApp Web or Desktop
    - Send a message to any contact or group

    b. **Monitor Application Logs:**

    ```
    [DEBUG] [WhatsApp] Message sync event received
    [INFO] [WhatsApp] Messages received: 1
    ```

    c. **Verify Event Emission:**
    - Check that `messages_received` event is emitted
    - Verify event contains message metadata

4. **Test Group Sync Events**

    a. **Modify a Group from Another Device:**
    - Open WhatsApp on mobile or another device
    - Change a group name, description, or settings

    b. **Monitor Application Logs:**

    ```
    [DEBUG] [WhatsApp] Group update event received
    [INFO] [WhatsApp] Groups updated: 1
    ```

    c. **Verify Event Emission:**
    - Check that `groups_updated` event is emitted
    - Verify event contains update details

5. **Test Connection State Sync**

    a. **Disconnect Another Device:**
    - Open WhatsApp on mobile
    - Go to **Settings → Linked Devices**
    - Disconnect one of the other devices (not the application)

    b. **Verify Application Remains Connected:**
    - Application should not be affected
    - No disconnection events should occur
    - Application should continue functioning

6. **Test Multi-Device Mismatch Handling**

    This is handled automatically by Baileys. Verify the error handler:

    ```javascript
    case DisconnectReason.multideviceMismatch:
        // Multi-device mismatch - clear auth and don't reconnect
        sendToTauri('whatsapp_error', {
            message: 'Multi-device mismatch. Please re-authenticate.',
            error: 'Multi-device mismatch',
            timestamp: new Date().toISOString()
        });
        await clearAuthState();
        shouldReconnect = false;
        break;
    ```

### Expected Results

✅ **Pass Criteria:**

- `creds.update` events are handled and credentials are saved
- `messages.upsert` events are received and processed
- `groups.update` events are received and emitted to frontend
- Connection state changes are handled correctly
- Multi-device mismatch errors are handled gracefully
- All sync events are logged appropriately
- No unhandled event errors

❌ **Fail Criteria:**

- Sync events are not received
- Credentials are not saved on update
- Events cause errors or crashes
- Application disconnects on sync events
- Unhandled event errors in logs

### Record Results

- [ ] Credential sync events handled: Yes/No
- [ ] Message sync events received: Yes/No
- [ ] Group sync events received: Yes/No
- [ ] Connection state sync working: Yes/No
- [ ] Multi-device mismatch handler present: Yes/No
- [ ] All events logged correctly: Yes/No
- [ ] Events tested:
    - [ ] creds.update: Working/Failed/Not Tested
    - [ ] messages.upsert: Working/Failed/Not Tested
    - [ ] groups.update: Working/Failed/Not Tested
    - [ ] connection.update: Working/Failed/Not Tested
- [ ] Any issues: **********\_**********

---

## Test 4: Multi-Device Features Support

### Purpose

Verify that all multi-device features available in Baileys are supported (Requirement 11.4)

### Background

Baileys multi-device features include:

- Independent device connections
- Message history sync
- Group metadata sync
- Contact sync
- Settings sync
- Media handling

### Steps

1. **Test Independent Connection**

    a. **Connect Application:**

    ```powershell
    bun tauri dev
    ```

    b. **Verify Phone Can Be Offline:**
    - After connection, turn on airplane mode on mobile device
    - Verify application remains connected
    - Send a test message from application
    - Turn off airplane mode
    - Verify message was sent successfully

2. **Test Message History Sync**

    a. **Fresh Connection:**

    ```powershell
    # Remove existing session
    Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info

    # Start application
    bun tauri dev
    ```

    b. **Connect and Monitor:**
    - Scan QR code
    - Wait for connection
    - Monitor logs for history sync events
    - Note: Baileys syncs recent message history automatically

3. **Test Group Operations**

    a. **Fetch Groups:**
    - Navigate to "Extract Users" page
    - Click "Load Groups"
    - Verify all groups are fetched correctly

    b. **Extract Members:**
    - Select a group
    - Click "Extract Members"
    - Verify member list is complete and accurate

    c. **Add Members:**
    - Select a group where you're admin
    - Add a test member
    - Verify operation succeeds
    - Check on mobile that member was added

4. **Test Concurrent Operations**

    a. **Perform Operation on Application:**
    - Start extracting members from a large group

    b. **Use Another Device Simultaneously:**
    - While extraction is running, send messages from WhatsApp Web
    - Verify both operations complete successfully
    - Verify no conflicts or errors

5. **Test Media Handling**

    a. **Send Message with Media from Another Device:**
    - Send an image or document from WhatsApp Web

    b. **Verify Application Receives Event:**
    - Check logs for message event
    - Verify message type is detected correctly

6. **Test Settings and State Sync**

    a. **Change Settings on Mobile:**
    - Modify privacy settings
    - Change profile picture
    - Update status

    b. **Verify Application Continues Working:**
    - Application should not be affected
    - Connection should remain stable
    - Operations should continue normally

### Expected Results

✅ **Pass Criteria:**

- Application works independently of phone's online status
- Message history sync occurs on fresh connection
- All group operations work correctly
- Concurrent operations on multiple devices succeed
- Media messages are detected and handled
- Settings changes don't affect application
- All Baileys multi-device features are accessible

❌ **Fail Criteria:**

- Application requires phone to be online
- History sync fails or doesn't occur
- Group operations fail
- Concurrent operations cause conflicts
- Media messages cause errors
- Settings changes disconnect application

### Record Results

- [ ] Independent connection (phone offline): Yes/No
- [ ] Message history sync: Yes/No
- [ ] Group operations working: Yes/No
- [ ] Concurrent operations successful: Yes/No
- [ ] Media messages handled: Yes/No
- [ ] Settings sync doesn't affect app: Yes/No
- [ ] Features tested:
    - [ ] Fetch groups: Working/Failed
    - [ ] Extract members: Working/Failed
    - [ ] Add members: Working/Failed
    - [ ] Send messages: Working/Failed
    - [ ] Receive messages: Working/Failed
- [ ] Any issues: **********\_**********

---

## Test 5: Device Name Display

### Purpose

Verify that the device name displays correctly in WhatsApp's linked devices list (Requirement 11.5)

### Background

The device name is configured in the Baileys socket browser identifier:

```javascript
browser: ['WhatsApp Automation', 'Desktop', '1.0.0']
```

This should appear as "WhatsApp Automation Desktop" in the linked devices list.

### Steps

1. **Connect Application**

    ```powershell
    # Fresh connection for clean test
    Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info -ErrorAction SilentlyContinue

    # Start application
    bun tauri dev
    ```

2. **Scan QR Code**
    - Wait for QR code to appear
    - Open WhatsApp on mobile
    - Go to **Settings → Linked Devices → Link a Device**
    - Scan the QR code

3. **Check Device Name on Mobile**

    a. **Immediately After Connection:**
    - Go to **Settings → Linked Devices**
    - Find the newly connected device
    - Note the displayed name

    b. **Expected Display:**
    - Device name: "WhatsApp Automation"
    - Device type: "Desktop" or similar indicator
    - Version: May or may not be displayed

    c. **Take Screenshot:**
    - Capture the linked devices screen
    - Document the exact display format

4. **Verify Device Information**

    a. **Tap on the Device:**
    - In the linked devices list, tap on "WhatsApp Automation"
    - View device details

    b. **Check Details:**
    - Device name should be clear and identifiable
    - Connection time should be recent
    - Device type should be appropriate

5. **Test Device Name Persistence**

    a. **Restart Application:**

    ```powershell
    # Close application
    # Restart
    bun tauri dev
    ```

    b. **Check Device Name Again:**
    - Go to **Settings → Linked Devices** on mobile
    - Verify device name remains "WhatsApp Automation"
    - Verify no duplicate entries

6. **Compare with Other Devices**

    If you have other devices linked:
    - Compare how "WhatsApp Automation" appears vs other devices
    - Verify it's clearly distinguishable
    - Verify it follows WhatsApp's naming conventions

### Expected Results

✅ **Pass Criteria:**

- Device appears with name "WhatsApp Automation"
- Device type is indicated (Desktop/Computer)
- Name is clearly visible and readable
- Name persists across reconnections
- No duplicate entries
- Name is distinguishable from other devices
- Follows WhatsApp's display format

❌ **Fail Criteria:**

- Device name is generic (e.g., "Unknown Device")
- Device name is truncated or garbled
- Name changes on reconnection
- Duplicate entries appear
- Name is not displayed at all
- Name doesn't match configuration

### Record Results

- [ ] Device name displayed: **********\_**********
- [ ] Device type shown: **********\_**********
- [ ] Name matches config: Yes/No
- [ ] Name persists after restart: Yes/No
- [ ] No duplicate entries: Yes/No
- [ ] Clearly distinguishable: Yes/No
- [ ] Screenshot captured: Yes/No
- [ ] Comparison with other devices:
    - WhatsApp Web shows as: **********\_**********
    - WhatsApp Desktop shows as: **********\_**********
    - This app shows as: **********\_**********
- [ ] Any issues: **********\_**********

---

## Integration Test: Complete Multi-Device Workflow

### Purpose

Verify all multi-device features work together in a realistic usage scenario

### Steps

1. **Setup Multi-Device Environment**
    - Connect WhatsApp Web in a browser
    - Connect the application
    - Keep mobile device nearby
    - Total devices: Mobile + Web + Application = 3 devices

2. **Perform Concurrent Operations**

    a. **On Mobile:**
    - Send a message to a contact
    - Create a new group
    - Add members to the group

    b. **On WhatsApp Web:**
    - Reply to the message
    - Send a message to the new group
    - Change group settings

    c. **On Application:**
    - Fetch groups (should include new group)
    - Extract members from the new group
    - Add a member to the group

3. **Verify Synchronization**
    - All messages appear on all devices
    - Group changes are reflected everywhere
    - Member additions are visible on all devices
    - No conflicts or errors occur

4. **Test Device Independence**

    a. **Disconnect WhatsApp Web:**
    - Log out from WhatsApp Web
    - Verify application continues working
    - Verify mobile is unaffected

    b. **Reconnect WhatsApp Web:**
    - Log back in to WhatsApp Web
    - Verify application is unaffected
    - Verify all devices sync correctly

5. **Test Recovery Scenarios**

    a. **Disconnect Application:**
    - Close the application
    - Verify other devices continue working

    b. **Reconnect Application:**
    - Restart the application
    - Verify it reconnects without QR code
    - Verify it syncs with current state
    - Verify other devices are unaffected

6. **Verify Final State**
    - Check **Settings → Linked Devices** on mobile
    - Verify all devices are listed correctly
    - Verify all device names are correct
    - Verify connection times are accurate

### Expected Results

✅ **Pass Criteria:**

- All devices work independently
- Operations sync across all devices
- Disconnecting one device doesn't affect others
- Reconnection works seamlessly
- All device names are correct
- No conflicts or synchronization errors
- Complete workflow executes successfully

❌ **Fail Criteria:**

- Devices interfere with each other
- Synchronization fails
- Disconnecting one device affects others
- Reconnection requires QR code
- Device names are incorrect
- Conflicts or errors occur

### Record Results

- [ ] Multi-device setup successful: Yes/No
- [ ] Concurrent operations worked: Yes/No
- [ ] Synchronization accurate: Yes/No
- [ ] Device independence verified: Yes/No
- [ ] Recovery scenarios passed: Yes/No
- [ ] Final state correct: Yes/No
- [ ] Total devices tested: **\_**
- [ ] Operations performed: **\_**
- [ ] Any issues: **********\_**********

---

## Troubleshooting

### Device Not Appearing in Linked Devices

**Possible Causes:**

- Multi-device protocol not enabled
- Connection failed during QR scan
- Auth state corrupted

**Solutions:**

1. Verify Baileys version is up to date
2. Clear auth_info and reconnect
3. Check logs for protocol errors
4. Ensure internet connection is stable

### Other Devices Disconnecting

**Possible Causes:**

- Legacy protocol being used
- Session conflict
- WhatsApp account issue

**Solutions:**

1. Verify browser configuration in code
2. Check for `multideviceMismatch` errors
3. Ensure using latest Baileys version
4. Try disconnecting all devices and reconnecting

### Sync Events Not Received

**Possible Causes:**

- Event handlers not registered
- Logger level too high
- Connection issue

**Solutions:**

1. Verify event handlers in code
2. Set logger level to 'debug'
3. Check network connectivity
4. Monitor for connection drops

### Device Name Not Displaying

**Possible Causes:**

- Browser identifier not set correctly
- WhatsApp display issue
- Version mismatch

**Solutions:**

1. Verify browser array in socket config
2. Check WhatsApp mobile app version
3. Try reconnecting
4. Compare with other devices

---

## Summary Checklist

After completing all tests, verify:

- [ ] Test 1: Multi-device protocol enabled by default
- [ ] Test 2: Other devices remain connected
- [ ] Test 3: Multi-device sync events handled
- [ ] Test 4: All multi-device features supported
- [ ] Test 5: Device name displays correctly
- [ ] Integration test: Complete workflow successful

### Requirements Coverage

- [ ] 11.1: Baileys multi-device support used by default
- [ ] 11.2: Other devices not disconnected when connecting
- [ ] 11.3: Multi-device sync events handled properly
- [ ] 11.4: All multi-device features available in Baileys supported
- [ ] 11.5: Device name displays in WhatsApp's linked devices list

### Overall Assessment

**Status:** ☐ PASSED ☐ FAILED ☐ PARTIAL

**Notes:**

---

---

---

**Issues Found:**

---

---

---

**Recommendations:**

---

---

---

---

## Quick Reference

### Useful Commands

```powershell
# Start application
bun tauri dev

# Clear session for fresh test
Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info

# Check auth state files
Get-ChildItem src-tauri\whatsapp-node\auth_info

# Check file timestamps
Get-Item src-tauri\whatsapp-node\auth_info\creds.json | Select-Object LastWriteTime

# Monitor logs (if logging to file)
Get-Content -Tail 50 -Wait logs\app.log
```

### WhatsApp Mobile Navigation

1. **View Linked Devices:**
    - Settings → Linked Devices

2. **Link New Device:**
    - Settings → Linked Devices → Link a Device

3. **View Device Details:**
    - Settings → Linked Devices → Tap on device name

4. **Disconnect Device:**
    - Settings → Linked Devices → Tap on device → Log Out

### Expected File Structure

```
auth_info/
├── creds.json                          # Main credentials
├── app-state-sync-key-AAAAA.json      # Sync key 1
├── app-state-sync-key-BBBBB.json      # Sync key 2
└── app-state-sync-key-CCCCC.json      # Sync key 3
```

### Browser Configuration

```javascript
browser: ['WhatsApp Automation', 'Desktop', '1.0.0']
//        ↑ Device Name          ↑ Type    ↑ Version
```

---

## Completion

Once all tests are complete:

1. **Update Task Status:**
    - Mark task 15 as complete in tasks.md
    - Update with test results

2. **Document Results:**
    - Create summary of findings
    - Note any issues or limitations
    - Provide recommendations

3. **Report Issues:**
    - File bugs for any failures
    - Include reproduction steps
    - Attach logs and screenshots

4. **Update Documentation:**
    - Add multi-device information to README
    - Update user guide if needed
    - Document any limitations

---

**Test Plan Version:** 1.0  
**Last Updated:** 2025-11-16  
**Requirements:** 11.1, 11.2, 11.3, 11.4, 11.5
