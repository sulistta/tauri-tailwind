# Authentication State Directory Structure

This document describes the `auth_info` directory structure used by Baileys for session persistence.

## Overview

Baileys uses a multi-file authentication state strategy to store WhatsApp credentials and sync keys. This approach provides better performance and reliability compared to single-file session storage.

## Directory Location

```
src-tauri/whatsapp-node/auth_info/
```

This directory is created automatically when you first connect to WhatsApp and is managed by Baileys' `useMultiFileAuthState` function.

## File Structure

### Core Files

#### `creds.json`

**Purpose**: Stores authentication credentials and account information

**Contents**:

- Account registration data
- Encryption keys
- Device identity
- WhatsApp account details
- Protocol version information

**Security**: This file contains sensitive authentication data. It should never be committed to version control or shared publicly.

**Example structure** (simplified):

```json
{
  "noiseKey": { ... },
  "signedIdentityKey": { ... },
  "signedPreKey": { ... },
  "registrationId": 12345,
  "advSecretKey": "...",
  "me": {
    "id": "1234567890:1@s.whatsapp.net",
    "name": "WhatsApp Automation"
  },
  "account": { ... },
  "signalIdentities": [ ... ],
  "myAppStateKeyId": "..."
}
```

#### `app-state-sync-key-*.json`

**Purpose**: Multi-device sync keys for WhatsApp's multi-device protocol

**Naming Pattern**: `app-state-sync-key-[KEY_ID].json`

**Contents**:

- Sync key data for multi-device synchronization
- Key identifiers
- Encryption parameters

**Multiple Files**: You may see several of these files (e.g., `app-state-sync-key-AAAAABCD.json`, `app-state-sync-key-AAAAABCE.json`). This is normal and expected.

**Example structure** (simplified):

```json
{
  "keyData": "...",
  "fingerprint": { ... },
  "timestamp": 1234567890
}
```

## File Management

### Automatic Management

Baileys automatically manages these files:

1. **Creation**: Files are created when you first authenticate
2. **Updates**: Files are updated as credentials change
3. **Sync**: New sync keys are added as needed for multi-device support

### Manual Management

#### Viewing Files

```bash
# List all auth files
ls -la src-tauri/whatsapp-node/auth_info/

# Windows PowerShell
Get-ChildItem src-tauri\whatsapp-node\auth_info
```

#### Backing Up Session

```bash
# Create backup
cp -r src-tauri/whatsapp-node/auth_info ./auth_info_backup

# Windows PowerShell
Copy-Item -Recurse src-tauri\whatsapp-node\auth_info .\auth_info_backup
```

#### Restoring Session

```bash
# Restore from backup
rm -rf src-tauri/whatsapp-node/auth_info
cp -r ./auth_info_backup src-tauri/whatsapp-node/auth_info

# Windows PowerShell
Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info
Copy-Item -Recurse .\auth_info_backup src-tauri\whatsapp-node\auth_info
```

#### Clearing Session (Force Re-authentication)

```bash
# Delete auth_info directory
rm -rf src-tauri/whatsapp-node/auth_info

# Windows PowerShell
Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info
```

After clearing, you'll need to scan a QR code to re-authenticate.

## Security Considerations

### File Permissions

The `auth_info` directory should have restricted permissions:

```bash
# Linux/Mac - Restrict to owner only
chmod 700 src-tauri/whatsapp-node/auth_info
chmod 600 src-tauri/whatsapp-node/auth_info/*

# Windows - Use File Explorer to set permissions
# Right-click → Properties → Security → Advanced
```

### Version Control

**IMPORTANT**: Never commit `auth_info` to version control!

The `.gitignore` file should include:

```gitignore
# WhatsApp session data
src-tauri/whatsapp-node/auth_info/
src-tauri/whatsapp-node/session/
```

### Encryption at Rest

Consider encrypting the `auth_info` directory at rest for additional security:

- **Windows**: Use BitLocker or EFS
- **macOS**: Use FileVault
- **Linux**: Use LUKS or eCryptfs

### Secure Deletion

When permanently removing a session, use secure deletion:

```bash
# Linux - Secure delete
shred -vfz -n 10 src-tauri/whatsapp-node/auth_info/*
rm -rf src-tauri/whatsapp-node/auth_info

# macOS - Secure delete
srm -rf src-tauri/whatsapp-node/auth_info

# Windows - Use SDelete (Sysinternals)
sdelete -p 10 src-tauri\whatsapp-node\auth_info\*
Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info
```

## Troubleshooting

### Issue: "Auth state corrupted"

**Symptoms**: Connection fails with "bad session" error

**Solution**:

1. Delete the `auth_info` directory
2. Restart the application
3. Scan a new QR code

```bash
rm -rf src-tauri/whatsapp-node/auth_info
```

### Issue: "Permission denied"

**Symptoms**: Cannot read or write auth files

**Solution**:

1. Check file permissions
2. Ensure the application has write access
3. Run with appropriate permissions

```bash
# Linux/Mac
chmod -R 700 src-tauri/whatsapp-node/auth_info

# Windows - Run as Administrator or check folder permissions
```

### Issue: "Missing creds.json"

**Symptoms**: Application can't restore session

**Solution**:

1. This indicates the session was not properly saved or was deleted
2. Delete the entire `auth_info` directory
3. Re-authenticate with a new QR code

### Issue: "Too many sync keys"

**Symptoms**: Many `app-state-sync-key-*.json` files

**Solution**: This is normal. Baileys creates multiple sync keys for multi-device support. Old keys are automatically cleaned up by WhatsApp's protocol.

## Migration from Old Session Format

If you're migrating from whatsapp-web.js (old `session/session` directory):

### Old Format (whatsapp-web.js)

```
src-tauri/whatsapp-node/session/session/
├── Default/
│   ├── Cache/
│   ├── Code Cache/
│   ├── Local Storage/
│   └── Session Storage/
└── [Puppeteer session data]
```

### New Format (Baileys)

```
src-tauri/whatsapp-node/auth_info/
├── creds.json
├── app-state-sync-key-AAAAABCD.json
├── app-state-sync-key-AAAAABCE.json
└── app-state-sync-key-AAAAABCF.json
```

### Migration Steps

1. **No automatic migration**: Old sessions are not compatible
2. **Delete old session**: Remove `session/session` directory
3. **Re-authenticate**: Scan QR code to create new `auth_info`
4. **Verify**: Check that `auth_info` directory is created

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.

## Implementation Details

### Code Reference

The auth state is managed in `src-tauri/whatsapp-node/index.js`:

```javascript
const { useMultiFileAuthState } = require('@whiskeysockets/baileys')

// Initialize auth state
async function initAuthState() {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    return { state, saveCreds }
}

// Save credentials on update
sock.ev.on('creds.update', saveCreds)
```

### Baileys Documentation

For more details on Baileys' authentication system:

- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [Multi-File Auth State](https://github.com/WhiskeySockets/Baileys#saving-restoring-sessions)

## Best Practices

1. **Regular Backups**: Backup `auth_info` before major updates
2. **Secure Storage**: Keep auth files in a secure location
3. **Access Control**: Restrict file permissions appropriately
4. **Version Control**: Never commit auth files to git
5. **Monitoring**: Log auth state updates for debugging
6. **Cleanup**: Remove old sessions when no longer needed
7. **Testing**: Test session restoration after backups

## Related Documentation

- [MIGRATION.md](./MIGRATION.md) - Migration guide from whatsapp-web.js
- [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) - Testing procedures
- [README.md](./README.md) - General project documentation
- [Baileys Migration Spec](.kiro/specs/baileys-migration/) - Complete migration specification
