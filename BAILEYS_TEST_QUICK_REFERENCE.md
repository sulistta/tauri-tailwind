# Baileys Testing Quick Reference

## Quick Test Commands

### Session Management

```powershell
# Check if session exists
Test-Path src-tauri\whatsapp-node\auth_info

# Remove session (for fresh start)
Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info -ErrorAction SilentlyContinue

# List session files
Get-ChildItem src-tauri\whatsapp-node\auth_info

# Check creds.json validity
Get-Content src-tauri\whatsapp-node\auth_info\creds.json | ConvertFrom-Json
```

### Process Management

```powershell
# Find WhatsApp Node.js process
Get-Process node | Where-Object {$_.Path -like "*whatsapp-node*"}

# Kill WhatsApp process (for testing reconnection)
Get-Process node | Where-Object {$_.Path -like "*whatsapp-node*"} | Stop-Process -Force

# List all Node.js processes
Get-Process node
```

### Application Control

```powershell
# Start development mode
bun tauri dev

# Build application
bun tauri build

# Build with debug symbols
bun tauri build --debug
```

## Test Scenarios Summary

### 1. Fresh Connection (No Session)

**Goal:** Test QR code flow  
**Steps:**

1. Remove auth_info directory
2. Start app
3. Scan QR code
4. Verify connection

**Expected:** QR displayed → Scan → Connected in < 15 seconds

### 2. Session Restoration

**Goal:** Test automatic reconnection with existing session  
**Steps:**

1. Ensure session exists
2. Restart app
3. Verify auto-connect

**Expected:** No QR → Auto-connect in < 10 seconds

### 3. Connection Loss Recovery

**Goal:** Test automatic reconnection  
**Steps:**

1. Connect app
2. Kill Node.js process
3. Monitor reconnection attempts

**Expected:** 5 attempts with exponential backoff (3s, 6s, 12s, 24s, 48s)

### 4. Logout Flow

**Goal:** Test session cleanup  
**Steps:**

1. Connect app
2. Click logout
3. Verify session cleared

**Expected:** Session removed, no auto-reconnect

### 5. Invalid Session

**Goal:** Test error handling  
**Steps:**

1. Corrupt creds.json
2. Start app
3. Verify recovery

**Expected:** Error message → Session cleared → New QR

### 6. QR Code Retry Limit

**Goal:** Test max QR attempts  
**Steps:**

1. Start app
2. Don't scan QR (let it expire 3 times)
3. Verify error after 3rd attempt

**Expected:** 3 QR codes → Error message → Manual restart required

### 7. Max Reconnection Attempts

**Goal:** Test reconnection limit  
**Steps:**

1. Connect app
2. Kill process and keep it killed
3. Monitor 5 reconnection attempts

**Expected:** 5 attempts → Error message → Manual restart required

## Expected Event Sequences

### Fresh Connection

```
client_initializing
→ whatsapp_loading (connecting)
→ whatsapp_qr
→ [user scans QR]
→ whatsapp_loading (connecting)
→ whatsapp_ready
```

### Session Restoration

```
client_initializing
→ whatsapp_loading (connecting)
→ whatsapp_ready
```

### Connection Loss

```
whatsapp_disconnected (attempt 1, delay 3000ms)
→ whatsapp_loading (reconnecting)
→ whatsapp_disconnected (attempt 2, delay 6000ms)
→ whatsapp_loading (reconnecting)
→ ... (up to 5 attempts)
→ whatsapp_error (max attempts reached)
```

### Logout

```
whatsapp_logged_out
→ auth_state_cleared
```

### Invalid Session

```
whatsapp_error (session corrupted)
→ auth_state_cleared
→ whatsapp_qr (new QR)
```

## Timing Expectations

| Operation                  | Expected Time |
| -------------------------- | ------------- |
| Fresh connection (with QR) | < 15 seconds  |
| Session restoration        | < 10 seconds  |
| QR code generation         | < 5 seconds   |
| Disconnect detection       | < 1 second    |
| First reconnection attempt | ~3 seconds    |
| QR code expiration         | ~60 seconds   |

## Exponential Backoff Schedule

| Attempt | Delay from Previous | Cumulative Time |
| ------- | ------------------- | --------------- |
| 1       | Immediate           | 0s              |
| 2       | 3 seconds           | 3s              |
| 3       | 6 seconds           | 9s              |
| 4       | 12 seconds          | 21s             |
| 5       | 24 seconds          | 45s             |
| Max     | 60 seconds (cap)    | -               |

## Common Issues & Solutions

### Issue: QR Code Not Displaying

**Check:**

- Browser console for errors
- Backend logs for `whatsapp_qr` event
- Network connectivity

**Solution:**

- Restart application
- Clear browser cache
- Check firewall settings

### Issue: Session Not Restoring

**Check:**

- auth_info directory exists
- creds.json is valid JSON
- File permissions

**Solution:**

- Remove auth_info and re-authenticate
- Check file corruption
- Verify directory permissions

### Issue: Reconnection Not Working

**Check:**

- Connection recovery enabled
- Process death detected
- Network connectivity

**Solution:**

- Check logs for disconnect events
- Verify reconnection attempts in logs
- Test with manual reconnect

### Issue: Infinite Reconnection Loop

**Check:**

- Reconnection counter
- Max attempts setting
- Explicit logout flag

**Solution:**

- Should stop after 5 attempts
- Check for bugs in reconnection logic
- Verify max attempts constant

## Log Monitoring

### Important Log Patterns

**Successful Connection:**

```
[DEBUG] [WhatsApp] Checking for existing session
[DEBUG] [WhatsApp] Initializing connection
[INFO] [WhatsApp] WhatsApp connected and ready
```

**Reconnection Attempt:**

```
[INFO] [WhatsApp] Connection lost. Reconnecting... (1/5)
[DEBUG] [WhatsApp] Reconnection delay: 3000ms
```

**Session Corruption:**

```
[ERROR] [WhatsApp] Session corrupted. Please re-authenticate.
[DEBUG] [WhatsApp] Authentication state cleared
```

**Max Attempts:**

```
[ERROR] [WhatsApp] Maximum reconnection attempts reached
```

## Testing Checklist

### Before Testing

- [ ] Application built successfully
- [ ] WhatsApp mobile app available
- [ ] Terminal access ready
- [ ] Browser console open
- [ ] Test environment clean

### During Testing

- [ ] Monitor backend logs
- [ ] Monitor browser console
- [ ] Record timing measurements
- [ ] Document any errors
- [ ] Take screenshots of key moments

### After Testing

- [ ] Document all test results
- [ ] Update test plan with findings
- [ ] Report critical issues
- [ ] Mark tasks as complete
- [ ] Save test artifacts

## Test Documentation

### Test Plans

1. **BAILEYS_AUTH_SESSION_TEST_PLAN.md** - Authentication and session persistence (Requirements 2.x, 3.x)
2. **BAILEYS_CONNECTION_STATE_TEST_PLAN.md** - Connection state management and recovery (Requirements 5.x, 7.x)
3. **MANUAL_TESTING_GUIDE.md** - General manual testing procedures

### Test Results

- Document results in respective test plan files
- Update task status in `.kiro/specs/baileys-migration/tasks.md`
- Create summary in test plan "Test Summary" section

## Contact & Support

If you encounter issues during testing:

1. Check this quick reference
2. Review detailed test plans
3. Check application logs
4. Review requirements and design documents
5. Document the issue with reproduction steps

---

**Last Updated:** 2024-11-16  
**Version:** 1.0.0  
**Related Documents:**

- BAILEYS_AUTH_SESSION_TEST_PLAN.md
- BAILEYS_CONNECTION_STATE_TEST_PLAN.md
- MANUAL_TESTING_GUIDE.md
- .kiro/specs/baileys-migration/requirements.md
- .kiro/specs/baileys-migration/design.md
