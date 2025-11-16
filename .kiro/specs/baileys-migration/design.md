# Baileys Migration Design Document

## Overview

This design document outlines the migration from whatsapp-web.js (Puppeteer-based) to @whiskeysockets/baileys for the WhatsApp Automation application. Baileys provides a direct WebSocket connection to WhatsApp's protocol, eliminating the need for a headless browser and significantly reducing resource usage while improving reliability.

## Architecture

### Current Architecture (whatsapp-web.js)

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Backend (Rust)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ConnectionManager                                      │ │
│  │  - Spawns Node.js subprocess                           │ │
│  │  - Reads stdout for events                             │ │
│  │  - Writes stdin for commands                           │ │
│  └────────────────────────┬───────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────┘
                             │ stdin/stdout
┌────────────────────────────┼─────────────────────────────────┐
│                    Node.js Process                           │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │  whatsapp-web.js Client                                 │ │
│  │  - LocalAuth strategy                                   │ │
│  │  - Session stored in ./session                          │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │  Puppeteer (Chrome Headless)                            │ │
│  │  - ~300-500MB memory usage                              │ │
│  │  - Requires Chrome/Chromium                             │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### New Architecture (Baileys)

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Backend (Rust)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ConnectionManager                                      │ │
│  │  - Spawns Node.js subprocess                           │ │
│  │  - Reads stdout for events                             │ │
│  │  - Writes stdin for commands                           │ │
│  └────────────────────────┬───────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────┘
                             │ stdin/stdout
┌────────────────────────────┼─────────────────────────────────┐
│                    Node.js Process                           │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │  Baileys Client                                         │ │
│  │  - Direct WebSocket connection                          │ │
│  │  - Multi-device support                                 │ │
│  │  - Auth state stored in ./auth_info                     │ │
│  │  - ~50-100MB memory usage                               │ │
│  │  - No browser dependencies                              │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│                           │ WebSocket                        │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │  WhatsApp Web Protocol                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Improvements

1. **No Browser Dependency**: Eliminates Puppeteer and Chrome/Chromium
2. **Lower Memory Usage**: ~50-100MB vs ~300-500MB
3. **Faster Startup**: Direct connection vs browser initialization
4. **Better Reliability**: Fewer moving parts, less prone to crashes
5. **Multi-Device Support**: Native support for WhatsApp's multi-device protocol

## Components and Interfaces

### 1. Baileys Client Module (Node.js)

**File**: `src-tauri/whatsapp-node/index.js` (refactored)

**Dependencies**:

- `@whiskeysockets/baileys` - WhatsApp client
- `@hapi/boom` - Error handling
- `pino` - Logging
- `qrcode-terminal` - QR code generation (optional, for debugging)

**Core Structure**:

```javascript
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const qrcode = require('qrcode')
const path = require('path')
const fs = require('fs')

// Auth state directory
const AUTH_DIR = path.join(__dirname, 'auth_info')

// Pino logger configuration
const logger = pino({
    level: 'silent' // Suppress Baileys internal logs
})

// Global socket reference
let sock = null
let qrRetries = 0
const MAX_QR_RETRIES = 3

/**
 * Communication protocol with Tauri backend
 */
function sendToTauri(event, data) {
    const message = JSON.stringify({ event, data })
    console.log(message)
}
```

**Authentication State Management**:

```javascript
/**
 * Initialize auth state using multi-file strategy
 * Stores credentials across multiple files for better performance
 */
async function initAuthState() {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    return { state, saveCreds }
}
```

**Connection Management**:

```javascript
/**
 * Start WhatsApp connection with Baileys
 */
async function startConnection() {
    try {
        const { state, saveCreds } = await initAuthState()
        const { version } = await fetchLatestBaileysVersion()

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
        })

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds)

        // Handle connection updates
        sock.ev.on('connection.update', handleConnectionUpdate)

        // Handle messages (if needed)
        sock.ev.on('messages.upsert', handleMessages)

        // Handle group updates
        sock.ev.on('groups.update', handleGroupsUpdate)

        sendToTauri('client_initializing', {
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        sendToTauri('whatsapp_error', {
            message: 'Failed to start connection',
            error: error.message
        })
    }
}
```

**Event Handlers**:

```javascript
/**
 * Handle connection state updates
 */
async function handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update

    // QR code received - send to frontend
    if (qr) {
        try {
            const qrBase64 = await qrcode.toDataURL(qr)
            sendToTauri('whatsapp_qr', { qr: qrBase64 })
            qrRetries++

            if (qrRetries >= MAX_QR_RETRIES) {
                sendToTauri('whatsapp_error', {
                    message: 'QR code expired. Please restart connection.'
                })
            }
        } catch (error) {
            sendToTauri('whatsapp_error', {
                message: 'Failed to generate QR code',
                error: error.message
            })
        }
    }

    // Connection closed
    if (connection === 'close') {
        const shouldReconnect =
            lastDisconnect?.error instanceof Boom
                ? lastDisconnect.error.output.statusCode !==
                  DisconnectReason.loggedOut
                : true

        if (shouldReconnect) {
            sendToTauri('whatsapp_disconnected', {
                reason: lastDisconnect?.error?.message || 'Unknown',
                timestamp: new Date().toISOString()
            })

            // Attempt reconnection
            setTimeout(() => startConnection(), 3000)
        } else {
            sendToTauri('whatsapp_logged_out', {
                message: 'Logged out from WhatsApp',
                timestamp: new Date().toISOString()
            })
        }
    }

    // Connection opened - authenticated
    if (connection === 'open') {
        qrRetries = 0
        const phoneNumber = sock.user?.id?.split(':')[0] || 'unknown'
        sendToTauri('whatsapp_ready', {
            phoneNumber,
            timestamp: new Date().toISOString()
        })
    }

    // Connecting state
    if (connection === 'connecting') {
        sendToTauri('whatsapp_loading', {
            message: 'Connecting to WhatsApp...'
        })
    }
}

/**
 * Handle incoming messages (optional)
 */
function handleMessages(m) {
    // Can be used for automation features
    // For now, we'll keep it minimal
}

/**
 * Handle group updates
 */
function handleGroupsUpdate(updates) {
    // Notify frontend of group changes if needed
    sendToTauri('groups_updated', {
        updates: updates.length,
        timestamp: new Date().toISOString()
    })
}
```

### 2. Operation Handlers (Refactored)

**Get Groups** (`operations/getGroups.js`):

```javascript
/**
 * Get all WhatsApp groups using Baileys
 */
async function getGroups(sock, sendToTauri) {
    try {
        // Fetch all group metadata
        const groups = await sock.groupFetchAllParticipating()

        // Transform to expected format
        const groupList = Object.values(groups).map((group) => ({
            id: group.id,
            name: group.subject,
            participantCount: group.participants.length,
            isAdmin: group.participants.some(
                (p) =>
                    p.id === sock.user.id &&
                    (p.admin === 'admin' || p.admin === 'superadmin')
            )
        }))

        sendToTauri('groups_result', { groups: groupList })
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to get groups',
            error: error.message
        })
    }
}

module.exports = getGroups
```

**Extract Members** (`operations/extractMembers.js`):

```javascript
/**
 * Extract members from a specific group using Baileys
 */
async function extractMembers(sock, sendToTauri, groupId) {
    try {
        // Fetch group metadata
        const groupMetadata = await sock.groupMetadata(groupId)

        // Transform participants to expected format
        const participants = groupMetadata.participants.map((participant) => ({
            phoneNumber: participant.id.split('@')[0],
            name: participant.notify || null,
            isAdmin:
                participant.admin === 'admin' ||
                participant.admin === 'superadmin'
        }))

        sendToTauri('members_result', {
            group_id: groupId,
            members: participants
        })
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to extract members',
            group_id: groupId,
            error: error.message
        })
    }
}

module.exports = extractMembers
```

**Add to Group** (`operations/addToGroup.js`):

```javascript
/**
 * Add multiple users to a group using Baileys
 */
async function addToGroup(sock, sendToTauri, groupId, numbers, delay) {
    try {
        const results = {
            successful: [],
            failed: [],
            total_processed: 0
        }

        for (let i = 0; i < numbers.length; i++) {
            const number = numbers[i]

            try {
                // Format number for WhatsApp
                const formattedNumber = number.replace(/[^0-9]/g, '')
                const jid = `${formattedNumber}@s.whatsapp.net`

                // Add participant to group
                const response = await sock.groupParticipantsUpdate(
                    groupId,
                    [jid],
                    'add'
                )

                // Check if addition was successful
                if (response[0]?.status === '200') {
                    results.successful.push(number)
                    sendToTauri('automation_progress', {
                        current: i + 1,
                        total: numbers.length,
                        status: `Added ${number}`
                    })
                } else {
                    results.failed.push({
                        phone_number: number,
                        reason: response[0]?.status || 'Unknown error'
                    })
                    sendToTauri('automation_progress', {
                        current: i + 1,
                        total: numbers.length,
                        status: `Failed to add ${number}`
                    })
                }
            } catch (error) {
                results.failed.push({
                    phone_number: number,
                    reason: error.message
                })
                sendToTauri('automation_progress', {
                    current: i + 1,
                    total: numbers.length,
                    status: `Failed to add ${number}: ${error.message}`
                })
            }

            results.total_processed++

            // Apply delay
            if (i < numbers.length - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, delay * 1000)
                )
            }
        }

        sendToTauri('automation_finished', { report: results })
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to add users to group',
            group_id: groupId,
            error: error.message
        })
    }
}

module.exports = addToGroup
```

### 3. Command Handler (Refactored)

```javascript
/**
 * Command handler using readline
 */
const readline = require('readline')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

rl.on('line', async (line) => {
    try {
        const trimmedLine = line.trim()
        if (!trimmedLine) return

        const command = JSON.parse(trimmedLine)

        // Check if socket is ready
        if (!sock && command.type !== 'get_status') {
            sendToTauri('command_error', {
                message: 'WhatsApp client not ready'
            })
            return
        }

        switch (command.type) {
            case 'get_groups':
                await getGroups(sock, sendToTauri)
                break

            case 'extract_members':
                await extractMembers(sock, sendToTauri, command.group_id)
                break

            case 'add_to_group':
                await addToGroup(
                    sock,
                    sendToTauri,
                    command.group_id,
                    command.numbers,
                    command.delay
                )
                break

            case 'send_message':
                await handleSendMessage(command.to, command.message)
                break

            case 'get_status':
                await handleGetStatus()
                break

            case 'logout':
                await handleLogout()
                break

            default:
                sendToTauri('command_error', {
                    message: `Unknown command type: ${command.type}`
                })
        }
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to parse command',
            error: error.message
        })
    }
})

/**
 * Send message handler
 */
async function handleSendMessage(to, message) {
    try {
        await sock.sendMessage(to, { text: message })
        sendToTauri('message_sent', {
            to,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to send message',
            error: error.message
        })
    }
}

/**
 * Get status handler
 */
async function handleGetStatus() {
    try {
        const isConnected = sock && sock.user
        sendToTauri('status_result', {
            is_connected: isConnected,
            phone_number: sock?.user?.id?.split(':')[0] || null
        })
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to get status',
            error: error.message
        })
    }
}

/**
 * Logout handler
 */
async function handleLogout() {
    try {
        await sock.logout()

        // Clear auth state
        if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true })
        }

        sendToTauri('whatsapp_logged_out', {
            message: 'Successfully logged out',
            timestamp: new Date().toISOString()
        })

        sock = null
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to logout',
            error: error.message
        })
    }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    if (sock) {
        await sock.end()
    }
    process.exit(0)
})

process.on('SIGTERM', async () => {
    if (sock) {
        await sock.end()
    }
    process.exit(0)
})

// Start connection on initialization
startConnection()
```

### 4. Rust Backend Changes

**Minimal Changes Required**:

The Rust backend (ConnectionManager, WhatsAppClient) requires minimal changes since the communication protocol (stdin/stdout with JSON messages) remains the same. The main changes are:

1. **Session Directory**: Change from `./session` to `./auth_info`
2. **Event Names**: All event names remain compatible
3. **Command Format**: All command formats remain the same

**Optional Enhancements**:

```rust
// In ConnectionManager or WhatsAppClient
pub fn check_session_exists(&self) -> bool {
    let auth_dir = self.get_auth_dir_path();
    auth_dir.exists() && auth_dir.read_dir()
        .map(|mut entries| entries.next().is_some())
        .unwrap_or(false)
}

fn get_auth_dir_path(&self) -> PathBuf {
    // Path to auth_info directory
    self.node_dir.join("auth_info")
}
```

## Data Models

### Baileys Auth State Structure

```
auth_info/
├── creds.json          # Authentication credentials
└── app-state-sync-key-*.json  # Sync keys for multi-device
```

### Event Payloads (Unchanged)

All event payloads remain the same as the current implementation to maintain backward compatibility with the frontend.

## Error Handling

### Connection Errors

```javascript
// Baileys provides detailed disconnect reasons
const DisconnectReason = {
    connectionClosed: 428,
    connectionLost: 408,
    connectionReplaced: 440,
    timedOut: 408,
    loggedOut: 401,
    badSession: 500,
    restartRequired: 515,
    multideviceMismatch: 411
}
```

### Error Recovery Strategy

1. **Connection Lost**: Auto-reconnect with exponential backoff
2. **Logged Out**: Clear auth state, request new QR code
3. **Bad Session**: Clear auth state, restart connection
4. **Restart Required**: Gracefully restart connection
5. **Rate Limiting**: Implement backoff and retry logic

## Testing Strategy

### Unit Tests

1. **Auth State Management**:
    - Test auth state initialization
    - Test credential saving
    - Test session restoration

2. **Connection Lifecycle**:
    - Test initial connection
    - Test reconnection logic
    - Test logout and cleanup

3. **Operations**:
    - Test group fetching
    - Test member extraction
    - Test bulk add operations

### Integration Tests

1. **End-to-End Flow**:
    - Test QR code authentication
    - Test session persistence
    - Test all operations with real connection

2. **Error Scenarios**:
    - Test connection loss recovery
    - Test invalid session handling
    - Test rate limiting

### Manual Testing

1. **Fresh Installation**: Test QR code flow
2. **Session Restore**: Test app restart with existing session
3. **Logout**: Test logout and re-authentication
4. **Group Operations**: Test all group management features
5. **Performance**: Monitor memory usage and startup time

## Migration Strategy

### Phase 1: Preparation

1. Install Baileys dependencies
2. Create backup of current implementation
3. Update package.json
4. Create new branch for migration

### Phase 2: Core Implementation

1. Refactor `index.js` with Baileys
2. Update operation handlers
3. Test basic connection and QR code
4. Test session persistence

### Phase 3: Feature Parity

1. Implement all group operations
2. Test bulk add functionality
3. Verify all events are emitted correctly
4. Test error handling

### Phase 4: Testing & Validation

1. Run unit tests
2. Perform integration testing
3. Manual testing of all features
4. Performance benchmarking

### Phase 5: Deployment

1. Update documentation
2. Create migration guide for users
3. Deploy to production
4. Monitor for issues

### Phase 6: Cleanup

1. Remove whatsapp-web.js dependencies
2. Remove Puppeteer dependencies
3. Clean up old session directory
4. Update README and documentation

## Performance Considerations

### Memory Usage

- **Before (whatsapp-web.js)**: ~300-500MB
- **After (Baileys)**: ~50-100MB
- **Improvement**: 70-80% reduction

### Startup Time

- **Before**: 10-15 seconds (browser initialization)
- **After**: 2-5 seconds (direct connection)
- **Improvement**: 60-75% faster

### CPU Usage

- **Before**: High during browser rendering
- **After**: Minimal, only WebSocket communication

## Security Considerations

### Auth State Protection

1. **File Permissions**: Ensure auth_info directory has restricted permissions
2. **Encryption**: Consider encrypting auth state at rest
3. **Secure Deletion**: Properly wipe auth state on logout

### Network Security

1. **TLS**: Baileys uses TLS for all WhatsApp communication
2. **Certificate Validation**: Validate WhatsApp server certificates
3. **No Proxy**: Avoid using proxies for sensitive operations

## Rollback Plan

If critical issues arise:

1. **Immediate Rollback**: Revert to previous commit with whatsapp-web.js
2. **Session Migration**: Users will need to re-authenticate
3. **Data Preservation**: Ensure user settings and preferences are maintained
4. **Communication**: Notify users of rollback and next steps

## Migration Guide for Users

### For Existing Users

1. **Backup**: Application will automatically backup old session
2. **Re-authentication**: Users will need to scan QR code once
3. **Benefits**: Faster, lighter, more reliable application
4. **No Data Loss**: All settings and preferences preserved

### First-Time Users

1. **Installation**: No additional dependencies required
2. **Setup**: Scan QR code to authenticate
3. **Usage**: All features work as before

## Compatibility Matrix

| Feature             | whatsapp-web.js | Baileys | Status      |
| ------------------- | --------------- | ------- | ----------- |
| QR Authentication   | ✅              | ✅      | Compatible  |
| Session Persistence | ✅              | ✅      | Compatible  |
| Get Groups          | ✅              | ✅      | Compatible  |
| Extract Members     | ✅              | ✅      | Compatible  |
| Add to Group        | ✅              | ✅      | Compatible  |
| Send Messages       | ✅              | ✅      | Compatible  |
| Multi-Device        | ❌              | ✅      | New Feature |
| Memory Usage        | High            | Low     | Improved    |
| Startup Time        | Slow            | Fast    | Improved    |
| Browser Dependency  | Required        | None    | Improved    |

## Conclusion

The migration to Baileys provides significant improvements in performance, reliability, and resource usage while maintaining full feature parity with the existing implementation. The communication protocol remains unchanged, minimizing changes to the Rust backend and frontend code.
