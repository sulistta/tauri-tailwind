# Baileys Multi-Device Implementation Reference

This document provides technical details about the multi-device support implementation in the WhatsApp Automation application using Baileys.

**Requirements Coverage:** 11.1, 11.2, 11.3, 11.4, 11.5

---

## Overview

Baileys implements WhatsApp's multi-device protocol by default, allowing the application to connect as a linked device alongside other devices without requiring the phone to be online. This is a significant improvement over the legacy WhatsApp Web protocol.

---

## Implementation Details

### 1. Multi-Device Protocol (Requirement 11.1)

**Location:** `src-tauri/whatsapp-node/index.js`

Baileys uses multi-device support by default. No special configuration is needed:

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
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5
})
```

**Key Points:**

- No legacy mode flags needed
- Multi-device is the default protocol
- Uses `makeCacheableSignalKeyStore` for multi-device key management
- Supports independent device connections

**Verification:**

- Check for `app-state-sync-key-*.json` files in `auth_info/` directory
- These files contain multi-device synchronization keys
- Multiple sync key files indicate multi-device protocol is active

---

### 2. Independent Device Connections (Requirement 11.2)

**How It Works:**

When a new device connects via QR code:

1. WhatsApp generates a new device identity
2. The device is added to the account's linked devices list
3. Existing devices remain connected and functional
4. Each device maintains its own independent connection

**Implementation:**

The connection process doesn't interfere with other devices:

```javascript
async function handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update

    // Connection opened - authenticated successfully
    if (connection === 'open') {
        qrRetries = 0
        reconnectAttempts = 0
        isExplicitLogout = false

        const phoneNumber = sock.user?.id?.split(':')[0] || 'unknown'
        sendToTauri('whatsapp_ready', {
            phoneNumber,
            timestamp: new Date().toISOString()
        })
    }
    // ... other connection states
}
```

**Key Points:**

- Each device has its own auth state
- Connections are independent
- No device limit (WhatsApp allows multiple linked devices)
- Disconnecting one device doesn't affect others

**Testing:**

- Connect multiple devices before connecting the application
- Verify all devices remain in the linked devices list
- Test concurrent operations on multiple devices
- Verify no disconnections occur

---

### 3. Multi-Device Sync Events (Requirement 11.3)

**Event Handlers:**

The application handles all relevant multi-device sync events:

#### Credential Updates

```javascript
// Save credentials on update
sock.ev.on('creds.update', saveCreds)
```

**Purpose:** Saves updated credentials when multi-device keys change

**Triggers:**

- Initial connection
- Key rotation
- Device list changes
- Security updates

#### Connection Updates

```javascript
sock.ev.on('connection.update', async (update) => {
    try {
        await handleConnectionUpdate(update)
    } catch (error) {
        sendToTauri('whatsapp_error', {
            message: 'Error handling connection update',
            error: error.message,
            timestamp: new Date().toISOString()
        })
    }
})
```

**Purpose:** Handles connection state changes and multi-device protocol events

**States:**

- `connecting` - Establishing connection
- `open` - Connected successfully
- `close` - Disconnected (with reason analysis)

#### Message Sync

```javascript
sock.ev.on('messages.upsert', handleMessages)

function handleMessages(m) {
    try {
        const { messages, type } = m

        // Only process new messages (not historical)
        if (type !== 'notify') {
            return
        }

        // Parse and emit message events
        sendToTauri('messages_received', {
            count: parsedMessages.length,
            messages: parsedMessages,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        // Silently handle errors
    }
}
```

**Purpose:** Receives messages sent from other devices or contacts

**Features:**

- Syncs messages across all devices
- Handles different message types
- Provides message metadata for automation

#### Group Updates

```javascript
sock.ev.on('groups.update', handleGroupsUpdate)

function handleGroupsUpdate(updates) {
    try {
        const updateDetails = updates.map((update) => ({
            id: update.id,
            subject: update.subject,
            subjectTime: update.subjectTime,
            desc: update.desc,
            descTime: update.descTime,
            restrict: update.restrict,
            announce: update.announce
        }))

        sendToTauri('groups_updated', {
            count: updates.length,
            updates: updateDetails,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        // Silently handle errors
    }
}
```

**Purpose:** Syncs group changes made on other devices

**Triggers:**

- Group name changes
- Group description changes
- Group settings changes
- Participant changes

#### Multi-Device Mismatch Handling

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

**Purpose:** Handles protocol version mismatches

**Recovery:**

- Clears auth state
- Prevents automatic reconnection
- Requires user to re-authenticate

---

### 4. Multi-Device Features Support (Requirement 11.4)

**Supported Features:**

#### Independent Operation

The application works independently of the phone's online status:

```javascript
// No phone-dependent checks
// Connection is direct to WhatsApp servers
// Phone can be offline after initial QR scan
```

#### Message History Sync

Baileys automatically syncs recent message history on connection:

```javascript
// Handled internally by Baileys
// No additional code needed
// History is synced during initial connection
```

#### Group Operations

All group operations work with multi-device protocol:

```javascript
// Fetch all groups
const groups = await sock.groupFetchAllParticipating()

// Get group metadata
const groupMetadata = await sock.groupMetadata(groupId)

// Update group participants
const response = await sock.groupParticipantsUpdate(groupId, [jid], 'add')
```

**Features:**

- Fetch groups
- Extract members
- Add/remove participants
- Update group settings
- Get group metadata

#### Message Operations

```javascript
// Send text message
await sock.sendMessage(to, { text: message })

// Receive messages
sock.ev.on('messages.upsert', handleMessages)
```

**Features:**

- Send text messages
- Receive messages
- Message type detection
- Media message handling (basic)

#### Concurrent Operations

The application supports concurrent operations across devices:

```javascript
// Operations are independent
// No locking or coordination needed
// WhatsApp handles synchronization
```

**Features:**

- Multiple devices can operate simultaneously
- No conflicts or race conditions
- Operations sync across devices
- Independent connection management

---

### 5. Device Name Display (Requirement 11.5)

**Configuration:**

The device name is set in the browser identifier:

```javascript
browser: ['WhatsApp Automation', 'Desktop', '1.0.0']
//        ↑ Device Name          ↑ Type    ↑ Version
```

**Display Format:**

In WhatsApp's linked devices list:

- **Device Name:** "WhatsApp Automation"
- **Device Type:** "Desktop" or similar indicator
- **Version:** May or may not be displayed (depends on WhatsApp app version)

**Customization:**

To change the device name, modify the browser array:

```javascript
browser: ['Your Custom Name', 'Desktop', '1.0.0']
```

**Best Practices:**

- Use a descriptive, identifiable name
- Keep it concise (max ~30 characters)
- Use title case for readability
- Avoid special characters
- Include device type for clarity

**Verification:**

Check the device name on mobile:

1. Open WhatsApp
2. Go to Settings → Linked Devices
3. Find "WhatsApp Automation" in the list
4. Tap to view details

---

## Auth State Structure

### Multi-Device Auth Files

```
auth_info/
├── creds.json                          # Main credentials
│   ├── me                              # User info
│   ├── signedIdentityKey               # Device identity
│   ├── signedPreKey                    # Encryption keys
│   ├── registrationId                  # Device registration
│   └── ... (other credential fields)
│
├── app-state-sync-key-AAAAA.json      # Sync key 1
├── app-state-sync-key-BBBBB.json      # Sync key 2
├── app-state-sync-key-CCCCC.json      # Sync key 3
└── ... (additional sync keys)
```

### File Purposes

**creds.json:**

- Contains device credentials
- Stores user information
- Manages encryption keys
- Updated on credential changes

**app-state-sync-key-\*.json:**

- Multi-device synchronization keys
- One file per sync key version
- Used for state synchronization across devices
- Rotated periodically by WhatsApp

### Security Considerations

**File Permissions:**

- Auth files should be readable only by the application
- Directory should have restricted permissions
- Files contain sensitive authentication data

**Backup:**

- Auth state should not be backed up to cloud storage
- Copying auth state to another machine may cause issues
- Each device should have its own auth state

**Cleanup:**

- Auth state is cleared on logout
- Files are deleted when user disconnects
- No sensitive data remains after logout

---

## Event Flow Diagrams

### Initial Connection Flow

```
User Scans QR Code
        ↓
Baileys Establishes Connection
        ↓
Multi-Device Protocol Negotiation
        ↓
Credential Exchange
        ↓
Sync Key Generation
        ↓
Auth State Saved (creds.json + sync keys)
        ↓
Connection Opened
        ↓
Device Added to Linked Devices List
        ↓
Message History Sync (automatic)
        ↓
Application Ready
```

### Reconnection Flow

```
Application Starts
        ↓
Load Auth State (creds.json + sync keys)
        ↓
Validate Credentials
        ↓
Establish Connection
        ↓
Multi-Device Protocol Negotiation
        ↓
Sync State with WhatsApp Servers
        ↓
Connection Opened
        ↓
Application Ready (no QR code needed)
```

### Multi-Device Sync Flow

```
Action on Device A (e.g., send message)
        ↓
WhatsApp Server Receives Action
        ↓
Server Broadcasts to All Devices
        ↓
Device B Receives Sync Event
        ↓
Event Handler Processes Update
        ↓
Local State Updated
        ↓
UI Updated (if applicable)
```

---

## Troubleshooting

### Multi-Device Not Working

**Symptoms:**

- Application appears in "WhatsApp Web" instead of "Linked Devices"
- Other devices disconnect when connecting
- No sync key files in auth_info

**Diagnosis:**

```powershell
# Check for sync key files
Get-ChildItem src-tauri\whatsapp-node\auth_info\app-state-sync-key-*.json

# If no files found, multi-device may not be active
```

**Solutions:**

1. Ensure using latest Baileys version
2. Clear auth state and reconnect
3. Verify no legacy mode flags in code
4. Check Baileys documentation for updates

### Sync Events Not Received

**Symptoms:**

- Messages from other devices don't appear
- Group changes not reflected
- Credential updates not saved

**Diagnosis:**

```javascript
// Add debug logging
sock.ev.on('creds.update', () => {
    console.log('[DEBUG] Credential update received')
    saveCreds()
})

sock.ev.on('messages.upsert', (m) => {
    console.log('[DEBUG] Message sync event:', m)
    handleMessages(m)
})
```

**Solutions:**

1. Verify event handlers are registered
2. Check logger level (set to 'debug' for troubleshooting)
3. Monitor network connectivity
4. Check for connection drops

### Device Name Not Displaying

**Symptoms:**

- Device shows as "Unknown Device"
- Name is truncated or garbled
- Name doesn't match configuration

**Diagnosis:**

```javascript
// Verify browser configuration
console.log('Browser config:', sock.config.browser)
```

**Solutions:**

1. Verify browser array in socket config
2. Ensure name is ASCII characters only
3. Keep name under 30 characters
4. Try reconnecting after name change

### Multi-Device Mismatch Error

**Symptoms:**

- Connection fails with "multideviceMismatch"
- Application disconnects immediately
- Auth state becomes invalid

**Diagnosis:**

```
[ERROR] Multi-device mismatch. Please re-authenticate.
```

**Solutions:**

1. Clear auth state: `Remove-Item -Recurse -Force auth_info`
2. Reconnect with QR code
3. Ensure all devices use compatible WhatsApp versions
4. Update Baileys to latest version

---

## Best Practices

### Development

1. **Test with Multiple Devices:**
    - Always test with at least 2 linked devices
    - Verify operations don't interfere
    - Check synchronization accuracy

2. **Monitor Sync Events:**
    - Log all sync events during development
    - Verify events are handled correctly
    - Check for unhandled events

3. **Handle Errors Gracefully:**
    - Implement error handlers for all events
    - Provide user-friendly error messages
    - Log errors for debugging

### Production

1. **Credential Security:**
    - Never log credential data
    - Protect auth_info directory
    - Clear auth state on logout

2. **Connection Management:**
    - Implement automatic reconnection
    - Handle multi-device mismatch errors
    - Provide clear connection status

3. **User Experience:**
    - Show clear device name
    - Provide multi-device information
    - Explain linked devices concept

---

## API Reference

### Baileys Multi-Device Functions

```javascript
// Create socket with multi-device support
const sock = makeWASocket({
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: ['Device Name', 'Type', 'Version']
})

// Fetch all groups (multi-device compatible)
const groups = await sock.groupFetchAllParticipating()

// Get group metadata (multi-device compatible)
const metadata = await sock.groupMetadata(groupId)

// Update group participants (multi-device compatible)
const result = await sock.groupParticipantsUpdate(
    groupId,
    [jid],
    'add' | 'remove' | 'promote' | 'demote'
)

// Send message (multi-device compatible)
await sock.sendMessage(jid, { text: 'message' })

// Logout (clears multi-device auth)
await sock.logout()
```

### Event Handlers

```javascript
// Credential updates (multi-device sync)
sock.ev.on('creds.update', saveCreds)

// Connection updates (multi-device protocol)
sock.ev.on('connection.update', handleConnectionUpdate)

// Message sync (multi-device)
sock.ev.on('messages.upsert', handleMessages)

// Group sync (multi-device)
sock.ev.on('groups.update', handleGroupsUpdate)
```

---

## Testing Checklist

- [ ] Multi-device protocol enabled by default
- [ ] Sync key files created in auth_info
- [ ] Device appears in "Linked Devices" (not "WhatsApp Web")
- [ ] Other devices remain connected
- [ ] Concurrent operations work correctly
- [ ] Credential updates are saved
- [ ] Message sync events received
- [ ] Group sync events received
- [ ] Device name displays correctly
- [ ] Multi-device mismatch handled gracefully
- [ ] Independent operation (phone can be offline)
- [ ] Message history syncs on connection
- [ ] All group operations work
- [ ] Reconnection works without QR code

---

## References

- **Baileys Documentation:** https://github.com/WhiskeySockets/Baileys
- **WhatsApp Multi-Device:** https://faq.whatsapp.com/1324084875126592
- **Requirements Document:** `.kiro/specs/baileys-migration/requirements.md`
- **Design Document:** `.kiro/specs/baileys-migration/design.md`
- **Test Plan:** `BAILEYS_MULTI_DEVICE_TEST_PLAN.md`

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-16  
**Requirements:** 11.1, 11.2, 11.3, 11.4, 11.5
