# WhatsApp Node.js Client (Baileys)

This Node.js application manages the WhatsApp Web connection using the [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) library. It communicates with the Tauri backend via JSON messages over stdio.

## About Baileys

Baileys is a lightweight TypeScript/JavaScript library that connects directly to WhatsApp's WebSocket protocol without requiring a browser. This provides significant advantages:

- **Performance**: 70-80% reduction in memory usage (~50-100MB vs ~300-500MB)
- **Speed**: 60-75% faster startup time (2-5s vs 10-15s)
- **No Browser**: No Puppeteer or Chrome/Chromium dependency
- **Multi-Device**: Native support for WhatsApp's multi-device protocol
- **Reliability**: Fewer moving parts, more stable connection

## Architecture

```
┌─────────────────────────────────────────┐
│         Tauri Backend (Rust)            │
│  - Spawns Node.js subprocess            │
│  - Reads stdout for events              │
│  - Writes stdin for commands            │
└──────────────┬──────────────────────────┘
               │ stdin/stdout (JSON)
┌──────────────▼──────────────────────────┐
│      Node.js Process (this module)      │
│  ┌────────────────────────────────────┐ │
│  │  Baileys Client (index.js)         │ │
│  │  - Direct WebSocket connection     │ │
│  │  - Multi-file auth state           │ │
│  │  - Event handlers                  │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Operations (operations/)          │ │
│  │  - getGroups.js                    │ │
│  │  - extractMembers.js               │ │
│  │  - addToGroup.js                   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
               │ WebSocket
┌──────────────▼──────────────────────────┐
│      WhatsApp Web Protocol              │
└─────────────────────────────────────────┘
```

## Installation

```bash
npm install
```

## Testing

### Quick Start
```bash
# Run automated tests (no WhatsApp connection required)
npm test

# Run interactive tests (requires WhatsApp connection)
npm run test:interactive
```

### Test Documentation
- **Quick Start Guide:** `TESTING_QUICK_START.md`
- **Full Documentation:** `TEST_GROUP_OPERATIONS.md`
- **Test Scripts:** `test-group-operations.js`, `test-group-operations-automated.js`

### Test Coverage
- ✅ Fetch all groups
- ✅ Extract members from groups
- ✅ Add single/multiple users to groups
- ✅ Delay between additions
- ✅ Progress event emission
- ✅ Permission error handling
- ✅ Phone number formatting
- ✅ Event format validation

All tests pass with 100% success rate (56/56 tests).

## Communication Protocol

### Events Sent to Tauri (via stdout)

All messages are JSON formatted:

```json
{
  "event": "event_name",
  "data": { /* event-specific data */ }
}
```

#### Event Types

- **whatsapp_qr**: QR code for authentication
  ```json
  { "event": "whatsapp_qr", "data": { "qr_base64": "data:image/png;base64,..." } }
  ```

- **whatsapp_ready**: Client is authenticated and ready
  ```json
  { "event": "whatsapp_ready", "data": { "phone_number": "1234567890", "timestamp": "..." } }
  ```

- **whatsapp_disconnected**: Client disconnected
  ```json
  { "event": "whatsapp_disconnected", "data": { "reason": "...", "timestamp": "..." } }
  ```

- **whatsapp_message**: New message received
  ```json
  { 
    "event": "whatsapp_message", 
    "data": { 
      "id": "...",
      "from": "...",
      "to": "...",
      "body": "...",
      "timestamp": 123456789,
      "isGroup": false,
      "chatName": "...",
      "hasMedia": false
    } 
  }
  ```

- **automation_progress**: Progress update during bulk operations
  ```json
  { "event": "automation_progress", "data": { "current": 5, "total": 10, "status": "..." } }
  ```

- **automation_finished**: Bulk operation completed
  ```json
  { 
    "event": "automation_finished", 
    "data": { 
      "report": {
        "successful": ["123", "456"],
        "failed": [{ "phone_number": "789", "reason": "..." }],
        "total_processed": 3
      }
    } 
  }
  ```

### Commands Received from Tauri (via stdin)

Commands are JSON formatted:

```json
{
  "type": "command_type",
  /* command-specific parameters */
}
```

#### Command Types

- **get_groups**: Retrieve all WhatsApp groups
  ```json
  { "type": "get_groups" }
  ```
  Response: `groups_result` event

- **extract_members**: Extract members from a group
  ```json
  { "type": "extract_members", "group_id": "..." }
  ```
  Response: `members_result` event

- **add_to_group**: Add users to a group
  ```json
  { 
    "type": "add_to_group", 
    "group_id": "...",
    "numbers": ["123", "456"],
    "delay": 5
  }
  ```
  Response: `automation_progress` events followed by `automation_finished`

- **send_message**: Send a message
  ```json
  { "type": "send_message", "to": "...", "message": "..." }
  ```
  Response: `message_sent` event

- **get_status**: Get current client status
  ```json
  { "type": "get_status" }
  ```
  Response: `status_result` event

## Session Persistence

Session data is stored in the `./auth_info` directory using Baileys' multi-file auth state. This allows the client to reconnect without requiring QR code scanning on subsequent runs.

### Auth Info Directory Structure

```
auth_info/
├── creds.json                      # Authentication credentials
├── app-state-sync-key-AAAAABCD.json  # Multi-device sync key
├── app-state-sync-key-AAAAABCE.json  # Multi-device sync key
└── app-state-sync-key-AAAAABCF.json  # Multi-device sync key
```

**Important**: 
- Never commit `auth_info/` to version control (included in `.gitignore`)
- Multiple sync key files are normal for multi-device support
- Delete `auth_info/` to force re-authentication

See [AUTH_INFO_STRUCTURE.md](../../AUTH_INFO_STRUCTURE.md) for detailed documentation.

## Dependencies

### Core Dependencies

- **@whiskeysockets/baileys** (^6.7.9): WhatsApp Web client library
- **@hapi/boom** (^10.0.1): HTTP-friendly error objects for disconnect reason analysis
- **pino** (^9.5.0): Fast JSON logger (used by Baileys internally)
- **qrcode** (^1.5.4): QR code generation for authentication

### Why These Dependencies?

- **Baileys**: Direct WhatsApp protocol implementation, no browser needed
- **Boom**: Provides structured error handling for connection issues
- **Pino**: Lightweight logging (set to 'silent' to suppress Baileys debug logs)
- **QRCode**: Generates base64 QR codes for frontend display

## Error Handling

### Error Events

Errors are sent as events:

```json
{
  "event": "whatsapp_error",
  "data": {
    "message": "Error description",
    "error": "Detailed error message",
    "errorType": "RateLimitError|TimeoutError|ConnectionError|NetworkError",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

or

```json
{
  "event": "command_error",
  "data": {
    "message": "Command failed",
    "error": "Detailed error message",
    "operation": "get_groups|extract_members|add_to_group|...",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Disconnect Reasons (Baileys)

Baileys provides detailed disconnect reasons via Boom errors:

- **loggedOut** (401): User logged out, clear auth state
- **badSession** (500): Session corrupted, clear auth state
- **timedOut** (408): Connection timeout, retry
- **connectionLost** (408): Network issue, retry
- **connectionClosed** (428): Connection closed, retry
- **restartRequired** (515): WhatsApp requires restart, reconnect immediately
- **multideviceMismatch** (411): Multi-device protocol mismatch, clear auth state

### Automatic Recovery

The client implements automatic recovery with exponential backoff:

1. **Connection Lost**: Retry with 3s, 6s, 12s, 24s, 48s delays
2. **Rate Limiting**: Exponential backoff up to 60 seconds
3. **Timeout Errors**: Retry with backoff
4. **Bad Session**: Clear auth state and request re-authentication
5. **Max Retries**: Stop after 5 attempts, require manual reconnection

## Migration from whatsapp-web.js

If you're migrating from the old whatsapp-web.js implementation:

### Key Differences

| Aspect | whatsapp-web.js | Baileys |
|--------|----------------|---------|
| Browser | Required (Puppeteer) | Not required |
| Memory | ~300-500 MB | ~50-100 MB |
| Startup | 10-15 seconds | 2-5 seconds |
| Session | `session/session/` | `auth_info/` |
| Auth Strategy | LocalAuth | Multi-file auth state |
| Connection | Browser automation | Direct WebSocket |

### Migration Steps

1. **Update dependencies**: `npm install` (new package.json)
2. **Delete old session**: Remove `session/` directory
3. **Re-authenticate**: Scan QR code to create new `auth_info/`
4. **Test operations**: Verify all group operations work

See [MIGRATION.md](../../MIGRATION.md) for detailed migration guide.

## Troubleshooting

### QR Code Not Generated

**Check**:
- Baileys is installed: `npm list @whiskeysockets/baileys`
- Node.js version: `node --version` (should be 18+)
- Console for errors

### Connection Fails Immediately

**Solutions**:
- Delete `auth_info/` and re-authenticate
- Check internet connection
- Verify WhatsApp Web is not blocked by firewall

### "Bad Session" Error

**Solution**: Delete `auth_info/` directory and re-authenticate

### High Memory Usage

**Check**: Ensure you're using Baileys (not whatsapp-web.js)
```bash
npm list @whiskeysockets/baileys
# Should show: @whiskeysockets/baileys@6.7.9
```

## Development

### Running Tests

```bash
# Automated tests (no WhatsApp connection)
npm test

# Interactive tests (requires WhatsApp connection)
npm run test:interactive

# Error handling tests
npm run test:errors
```

### Debugging

Enable Baileys debug logs by changing logger level in `index.js`:

```javascript
const logger = pino({
    level: 'debug' // Change from 'silent' to 'debug'
});
```

### Code Structure

```
src-tauri/whatsapp-node/
├── index.js                 # Main Baileys client
├── operations/              # WhatsApp operations
│   ├── getGroups.js        # Fetch all groups
│   ├── extractMembers.js   # Extract group members
│   └── addToGroup.js       # Add users to group
├── auth_info/              # Session storage (auto-generated)
├── package.json            # Dependencies
└── README.md               # This file
```

## References

- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys#readme)
- [WhatsApp Multi-Device Protocol](https://github.com/WhiskeySockets/Baileys#multi-device-support)
- [Project Migration Guide](../../MIGRATION.md)
- [Auth Info Structure](../../AUTH_INFO_STRUCTURE.md)
