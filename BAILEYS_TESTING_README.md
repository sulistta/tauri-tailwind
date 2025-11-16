# Baileys Testing Documentation

This directory contains comprehensive testing documentation for the Baileys WhatsApp client implementation.

---

## Quick Navigation

### Test Plans

1. **[Baileys Authentication & Session Test Plan](BAILEYS_AUTH_SESSION_TEST_PLAN.md)**
    - Requirements: 2.1-2.5, 3.1-3.5
    - Topics: QR code authentication, session persistence, credential storage
    - Tests: 8 comprehensive tests

2. **[Baileys Multi-Device Support Test Plan](BAILEYS_MULTI_DEVICE_TEST_PLAN.md)**
    - Requirements: 11.1-11.5
    - Topics: Multi-device protocol, device synchronization, concurrent usage
    - Tests: 5 individual tests + 1 integration test

3. **[Baileys Connection State Test Plan](BAILEYS_CONNECTION_STATE_TEST_PLAN.md)**
    - Requirements: 5.1-5.5, 7.1-7.5
    - Topics: Connection management, error recovery, reconnection logic
    - Tests: Connection state transitions, error handling

### Implementation References

1. **[Baileys Multi-Device Implementation](BAILEYS_MULTI_DEVICE_IMPLEMENTATION.md)**
    - Technical details about multi-device support
    - Event handlers and API reference
    - Best practices and troubleshooting

2. **[Auth Info Structure](AUTH_INFO_STRUCTURE.md)**
    - Authentication state file structure
    - Credential storage details
    - Security considerations

### Quick References

1. **[Baileys Test Quick Reference](BAILEYS_TEST_QUICK_REFERENCE.md)**
    - Common commands
    - Expected behaviors
    - Troubleshooting tips

### Task Summaries

1. **[Task 15: Multi-Device Verification Summary](TASK_15_MULTI_DEVICE_VERIFICATION_SUMMARY.md)**
    - Completion summary for task 15
    - Requirements verification
    - Key findings and recommendations

---

## Testing Workflow

### For New Testers

1. **Start Here:**
    - Read [Manual Testing Guide](MANUAL_TESTING_GUIDE.md)
    - Understand the testing structure
    - Set up your environment

2. **Authentication Testing:**
    - Follow [Baileys Authentication & Session Test Plan](BAILEYS_AUTH_SESSION_TEST_PLAN.md)
    - Test QR code flow
    - Verify session persistence

3. **Multi-Device Testing:**
    - Follow [Baileys Multi-Device Support Test Plan](BAILEYS_MULTI_DEVICE_TEST_PLAN.md)
    - Test with multiple devices
    - Verify synchronization

4. **Connection Testing:**
    - Follow [Baileys Connection State Test Plan](BAILEYS_CONNECTION_STATE_TEST_PLAN.md)
    - Test error recovery
    - Verify reconnection logic

### For Developers

1. **Implementation Review:**
    - Read [Baileys Multi-Device Implementation](BAILEYS_MULTI_DEVICE_IMPLEMENTATION.md)
    - Understand event flows
    - Review API usage

2. **Code Verification:**
    - Check `src-tauri/whatsapp-node/index.js`
    - Verify event handlers
    - Review error handling

3. **Testing:**
    - Run manual tests from test plans
    - Document results
    - Report issues

---

## Test Coverage

### Requirements Coverage

| Requirement | Topic                | Test Plan                                                 | Status   |
| ----------- | -------------------- | --------------------------------------------------------- | -------- |
| 2.1-2.5     | Authentication Flow  | [Auth & Session](BAILEYS_AUTH_SESSION_TEST_PLAN.md)       | ✅ Ready |
| 3.1-3.5     | Session Persistence  | [Auth & Session](BAILEYS_AUTH_SESSION_TEST_PLAN.md)       | ✅ Ready |
| 5.1-5.5     | Connection State     | [Connection State](BAILEYS_CONNECTION_STATE_TEST_PLAN.md) | ✅ Ready |
| 7.1-7.5     | Error Handling       | [Connection State](BAILEYS_CONNECTION_STATE_TEST_PLAN.md) | ✅ Ready |
| 11.1-11.5   | Multi-Device Support | [Multi-Device](BAILEYS_MULTI_DEVICE_TEST_PLAN.md)         | ✅ Ready |

### Feature Coverage

- ✅ QR Code Authentication
- ✅ Session Persistence
- ✅ Multi-Device Protocol
- ✅ Device Synchronization
- ✅ Connection Management
- ✅ Error Recovery
- ✅ Automatic Reconnection
- ✅ Group Operations
- ✅ Message Operations
- ✅ Credential Storage

---

## Common Commands

### Start Application

```powershell
# Development mode
bun tauri dev

# Production build
bun tauri build
```

### Session Management

```powershell
# Check if session exists
Test-Path src-tauri\whatsapp-node\auth_info

# View session files
Get-ChildItem src-tauri\whatsapp-node\auth_info

# Clear session (for fresh test)
Remove-Item -Recurse -Force src-tauri\whatsapp-node\auth_info
```

### Process Management

```powershell
# Find Node.js processes
Get-Process node

# Kill specific process
Stop-Process -Id <PID> -Force
```

### Monitoring

```powershell
# Watch logs (if logging to file)
Get-Content -Tail 50 -Wait logs\app.log

# Check file timestamps
Get-Item src-tauri\whatsapp-node\auth_info\creds.json | Select-Object LastWriteTime
```

---

## Expected Behaviors

### Authentication

- **First Connection:** QR code displayed → Scan → Connected
- **Reconnection:** Auto-connect without QR code
- **Session Expiry:** QR code displayed again

### Multi-Device

- **Device List:** Application appears as "WhatsApp Automation"
- **Other Devices:** Remain connected when app connects
- **Synchronization:** Messages and groups sync across devices

### Connection

- **States:** connecting → open (or close with reason)
- **Reconnection:** Automatic with exponential backoff
- **Max Attempts:** 5 attempts, then stops

### Error Handling

- **Rate Limiting:** Exponential backoff applied
- **Timeout:** Retry with backoff
- **Bad Session:** Clear auth state, request re-authentication
- **Logout:** Clear auth state, no reconnection

---

## Troubleshooting

### QR Code Not Appearing

1. Check browser console for errors
2. Verify backend is emitting QR events
3. Check that frontend is listening for events
4. Review logs for connection errors

### Session Not Persisting

1. Verify `auth_info` directory exists
2. Check file permissions
3. Verify `creds.json` is being updated
4. Check for errors during credential save

### Other Devices Disconnecting

1. Verify multi-device protocol is enabled
2. Check for `multideviceMismatch` errors
3. Ensure using latest Baileys version
4. Review browser configuration

### Sync Events Not Received

1. Verify event handlers are registered
2. Check logger level (set to 'debug')
3. Monitor network connectivity
4. Check for connection drops

---

## File Structure

```
Project Root/
├── BAILEYS_AUTH_SESSION_TEST_PLAN.md          # Auth & session testing
├── BAILEYS_MULTI_DEVICE_TEST_PLAN.md          # Multi-device testing
├── BAILEYS_CONNECTION_STATE_TEST_PLAN.md      # Connection testing
├── BAILEYS_MULTI_DEVICE_IMPLEMENTATION.md     # Implementation reference
├── BAILEYS_TEST_QUICK_REFERENCE.md            # Quick reference
├── BAILEYS_TESTING_README.md                  # This file
├── MANUAL_TESTING_GUIDE.md                    # Main testing guide
├── AUTH_INFO_STRUCTURE.md                     # Auth state documentation
├── TASK_15_MULTI_DEVICE_VERIFICATION_SUMMARY.md  # Task summary
│
└── src-tauri/whatsapp-node/
    ├── index.js                                # Main implementation
    ├── operations/
    │   ├── getGroups.js
    │   ├── extractMembers.js
    │   └── addToGroup.js
    └── auth_info/                              # Session storage
        ├── creds.json
        └── app-state-sync-key-*.json
```

---

## Contributing

### Reporting Issues

When reporting test failures:

1. **Describe the Test:**
    - Which test plan?
    - Which specific test?
    - What were you testing?

2. **Provide Details:**
    - Steps to reproduce
    - Expected behavior
    - Actual behavior
    - Error messages

3. **Include Logs:**
    - Relevant log excerpts
    - Screenshots if applicable
    - Timestamps

4. **Environment:**
    - Operating system
    - Node.js version
    - Baileys version
    - Application version

### Updating Tests

When updating test plans:

1. **Maintain Structure:**
    - Keep consistent formatting
    - Use clear headings
    - Include pass/fail criteria

2. **Document Changes:**
    - Update version number
    - Note what changed
    - Update requirements coverage

3. **Cross-Reference:**
    - Link related documents
    - Update navigation
    - Maintain consistency

---

## Resources

### External Documentation

- **Baileys GitHub:** https://github.com/WhiskeySockets/Baileys
- **WhatsApp Multi-Device:** https://faq.whatsapp.com/1324084875126592
- **Tauri Documentation:** https://tauri.app/

### Internal Documentation

- **Requirements:** `.kiro/specs/baileys-migration/requirements.md`
- **Design:** `.kiro/specs/baileys-migration/design.md`
- **Tasks:** `.kiro/specs/baileys-migration/tasks.md`

---

## Status

### Test Plans

- ✅ Authentication & Session Test Plan - Complete
- ✅ Multi-Device Support Test Plan - Complete
- ✅ Connection State Test Plan - Complete

### Implementation

- ✅ Multi-Device Protocol - Implemented
- ✅ Event Handlers - Implemented
- ✅ Error Recovery - Implemented
- ✅ Session Management - Implemented

### Documentation

- ✅ Test Plans - Complete
- ✅ Implementation Reference - Complete
- ✅ Quick Reference - Complete
- ✅ Task Summaries - Complete

---

## Next Steps

1. **Execute Tests:**
    - Run all test plans
    - Document results
    - Report issues

2. **Verify Requirements:**
    - Check all requirements are met
    - Verify test coverage
    - Update status

3. **Production Readiness:**
    - Complete all tests
    - Fix any issues
    - Update documentation

---

**Last Updated:** 2025-11-16  
**Version:** 1.0  
**Status:** Ready for Testing
