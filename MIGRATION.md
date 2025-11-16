# Migration Guide: whatsapp-web.js to Baileys

This guide helps you migrate from the old whatsapp-web.js (Puppeteer-based) implementation to the new Baileys implementation.

## Overview

The migration to Baileys brings significant improvements:

- **70-80% reduction in memory usage** (~50-100MB vs ~300-500MB)
- **60-75% faster startup time** (2-5s vs 10-15s)
- **No browser dependency** (Chrome/Chromium no longer required)
- **Better reliability** (fewer moving parts, direct WebSocket connection)
- **Multi-device support** (native WhatsApp multi-device protocol)

## Breaking Changes

### 1. Session Storage Location

**Old (whatsapp-web.js):**

```
src-tauri/whatsapp-node/session/session/
```

**New (Baileys):**

```
src-tauri/whatsapp-node/auth_info/
```

### 2. Session File Format

**Old:** Single directory with Puppeteer session data

**New:** Multi-file auth state:

- `creds.json` - Authentication credentials
- `app-state-sync-key-*.json` - Multi-device sync keys

### 3. Dependencies

**Removed:**

- `whatsapp-web.js`
- `puppeteer`
- `puppeteer-core`

**Added:**

- `@whiskeysockets/baileys` - WhatsApp client
- `@hapi/boom` - Error handling
- `pino` - Logging
- `qrcode` - QR code generation

## Migration Steps

### For End Users

If you're upgrading an existing installation:

1. **Backup Your Data** (optional, but recommended)

    ```bash
    # Backup old session (optional)
    cp -r src-tauri/whatsapp-node/session/session ./session-backup
    ```

2. **Update the Application**
    - Download and install the new version
    - Or pull the latest code and rebuild:
        ```bash
        git pull
        bun install
        cd src-tauri/whatsapp-node
        bun install
        cd ../..
        ```

3. **Re-authenticate**
    - Launch the application
    - You'll see the QR code screen (old session is not compatible)
    - Scan the QR code with your phone
    - Your new session will be saved automatically

4. **Clean Up Old Session** (optional)

    ```bash
    # Remove old session directory
    rm -rf src-tauri/whatsapp-node/session
    ```

5. **Verify Connection**
    - Check that you're connected
    - Test group operations
    - Restart the app to verify session persistence

### For Developers

If you're maintaining or contributing to the codebase:

1. **Update Dependencies**

    ```bash
    # Root directory
    bun install

    # WhatsApp Node.js client
    cd src-tauri/whatsapp-node
    bun install
    cd ../..
    ```

2. **Review API Changes**

    **Connection Initialization:**

    ```javascript
    // Old (whatsapp-web.js)
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { headless: true }
    })
    await client.initialize()

    // New (Baileys)
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        auth: state,
        browser: ['WhatsApp Automation', 'Desktop', '1.0.0']
    })
    sock.ev.on('creds.update', saveCreds)
    ```

    **Get Groups:**

    ```javascript
    // Old (whatsapp-web.js)
    const chats = await client.getChats()
    const groups = chats.filter((chat) => chat.isGroup)

    // New (Baileys)
    const groups = await sock.groupFetchAllParticipating()
    const groupList = Object.values(groups)
    ```

    **Extract Members:**

    ```javascript
    // Old (whatsapp-web.js)
    const chat = await client.getChatById(groupId)
    const participants = chat.participants

    // New (Baileys)
    const groupMetadata = await sock.groupMetadata(groupId)
    const participants = groupMetadata.participants
    ```

    **Add to Group:**

    ```javascript
    // Old (whatsapp-web.js)
    await chat.addParticipants([phoneNumber])

    // New (Baileys)
    const jid = `${phoneNumber}@s.whatsapp.net`
    await sock.groupParticipantsUpdate(groupId, [jid], 'add')
    ```

3. **Update Event Handlers**

    **Connection Events:**

    ```javascript
    // Old (whatsapp-web.js)
    client.on('ready', () => {
        /* ... */
    })
    client.on('qr', (qr) => {
        /* ... */
    })
    client.on('disconnected', () => {
        /* ... */
    })

    // New (Baileys)
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update
        if (connection === 'open') {
            /* ready */
        }
        if (qr) {
            /* qr code */
        }
        if (connection === 'close') {
            /* disconnected */
        }
    })
    ```

4. **Update Error Handling**

    ```javascript
    // Old (whatsapp-web.js)
    // Generic error handling

    // New (Baileys)
    import { Boom } from '@hapi/boom'

    if (lastDisconnect?.error instanceof Boom) {
        const statusCode = lastDisconnect.error.output.statusCode
        if (statusCode === DisconnectReason.loggedOut) {
            // Handle logout
        }
    }
    ```

5. **Test Thoroughly**
    - Run automated tests: `cd src-tauri/whatsapp-node && bun test`
    - Follow manual testing guide: [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)
    - Test all group operations
    - Verify session persistence
    - Test error recovery

## Compatibility

### What Stays the Same

✅ **Tauri Commands**: All Tauri command signatures remain unchanged
✅ **Event Names**: Frontend event names are identical
✅ **Data Formats**: Group and member data structures unchanged
✅ **User Interface**: No UI changes required
✅ **Configuration**: App settings and preferences preserved

### What Changes

⚠️ **Session Format**: Old sessions are not compatible (re-authentication required)
⚠️ **Dependencies**: Different npm packages
⚠️ **Internal API**: WhatsApp client API is different (Baileys vs whatsapp-web.js)
⚠️ **Session Location**: New directory for auth state

## Rollback Plan

If you need to rollback to the old implementation:

1. **Checkout Previous Version**

    ```bash
    git checkout <previous-commit-hash>
    ```

2. **Reinstall Dependencies**

    ```bash
    bun install
    cd src-tauri/whatsapp-node
    bun install
    cd ../..
    ```

3. **Restore Old Session** (if backed up)

    ```bash
    cp -r ./session-backup src-tauri/whatsapp-node/session/session
    ```

4. **Rebuild Application**
    ```bash
    bun tauri build
    ```

## Common Issues

### Issue: "QR code not appearing"

**Solution:**

- Ensure Baileys is installed: `cd src-tauri/whatsapp-node && bun install`
- Check Node.js version: `node --version` (should be 18+)
- Check console for errors

### Issue: "Connection fails immediately"

**Solution:**

- Delete `auth_info` directory and try again
- Check internet connection
- Verify WhatsApp Web is not blocked

### Issue: "Old session not working"

**Expected Behavior:** Old sessions are not compatible with Baileys. You must re-authenticate by scanning a QR code.

### Issue: "Memory usage still high"

**Solution:**

- Ensure you're running the new version (check for Baileys in dependencies)
- Restart the application
- Check that no old Node.js processes are running

### Issue: "Build fails with missing dependencies"

**Solution:**

```bash
# Clean install
rm -rf node_modules
rm -rf src-tauri/whatsapp-node/node_modules
bun install
cd src-tauri/whatsapp-node
bun install
cd ../..
```

## Performance Verification

After migration, verify the improvements:

1. **Memory Usage**

    ```bash
    # Windows
    Get-Process | Where-Object {$_.ProcessName -like "*whatsapp*"}

    # Linux/Mac
    ps aux | grep whatsapp
    ```

    Expected: ~50-100MB (down from ~300-500MB)

2. **Startup Time**
    - Measure time from launch to "Connected" status
    - Expected: 2-5 seconds (down from 10-15 seconds)

3. **Browser Processes**

    ```bash
    # Windows
    Get-Process chrome, chromium -ErrorAction SilentlyContinue

    # Linux/Mac
    ps aux | grep -E "chrome|chromium"
    ```

    Expected: No Chrome/Chromium processes

## Support

If you encounter issues during migration:

1. Check this migration guide
2. Review [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)
3. Check existing GitHub issues
4. Open a new issue with:
    - Your OS and version
    - Node.js version
    - Error messages
    - Steps to reproduce

## Additional Resources

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [Baileys Migration Spec](.kiro/specs/baileys-migration/)
- [Manual Testing Guide](MANUAL_TESTING_GUIDE.md)
- [Architecture Documentation](ARCHITECTURE_CLEANUP_SUMMARY.md)
