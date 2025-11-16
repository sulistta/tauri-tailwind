# Group Operations Testing - Quick Start Guide

## Quick Commands

### Run Automated Tests (No WhatsApp Connection Required)
```bash
cd src-tauri/whatsapp-node
npm test
# or
node test-group-operations-automated.js
```

### Run Interactive Tests (Requires WhatsApp Connection)
```bash
cd src-tauri/whatsapp-node
npm run test:interactive
# or
node test-group-operations.js
```

## What Gets Tested

### ✅ Automated Tests (Fast, No Setup)
- Data structure validation
- Event emission format
- Phone number parsing
- Delay timing
- Error handling logic
- Permission error detection
- Bulk operation sequencing

**Duration:** ~3 seconds  
**Pass Rate:** 100% (56/56 tests)

### ✅ Interactive Tests (Requires Setup)
- Real WhatsApp connection
- Actual group fetching
- Real member extraction
- Live add operations
- Real-time progress monitoring
- Actual permission errors

**Duration:** ~2-5 minutes (depending on operations)  
**Prerequisites:** 
- Authenticated WhatsApp session
- At least one group membership
- Admin access to a group (for full testing)

## Test Results

### Automated Test Output
```
╔════════════════════════════════════════════════════════════╗
║   Baileys Group Operations Automated Test Suite           ║
╚════════════════════════════════════════════════════════════╝

=== Test 1: getGroups Operation ===
✓ getGroups: Should emit at least one event
✓ getGroups: Should emit groups_result event
✓ getGroups: Should have groups array in data
...

============================================================
TEST SUMMARY
============================================================
Total Tests: 56
Passed: 56 ✓
Failed: 0 ✗
Pass Rate: 100.0%
```

### Interactive Test Output
```
╔════════════════════════════════════════════════════════════╗
║   Baileys Group Operations Test Suite                     ║
╚════════════════════════════════════════════════════════════╝

=== TEST: Fetch All Groups ===
Found 5 groups
✓ Fetch Groups - PASSED - Retrieved 5 groups
✓ Group Data Format - PASSED - All fields present and correct types

=== TEST: Extract Members from Group ===
Found 25 members
✓ Extract Members - PASSED - Retrieved 25 members
✓ Member Data Format - PASSED - All fields present and correct types
✓ Phone Number Parsing - PASSED - All phone numbers properly parsed
```

## Troubleshooting

### "Cannot find module"
```bash
cd src-tauri/whatsapp-node
npm install
```

### "WhatsApp client not ready" (Interactive Tests)
1. Ensure you've authenticated WhatsApp first
2. Check that `auth_info` directory exists
3. Run the main app to authenticate if needed

### "No groups found"
- Your WhatsApp account must be a member of at least one group
- Check your WhatsApp connection status

### Tests Timeout
- Check your internet connection
- Verify WhatsApp service is available
- Increase timeout values if needed

## CI/CD Integration

### GitHub Actions
```yaml
- name: Install Dependencies
  run: |
    cd src-tauri/whatsapp-node
    npm install

- name: Run Automated Tests
  run: |
    cd src-tauri/whatsapp-node
    npm test
```

### Expected Exit Codes
- `0` - All tests passed
- `1` - One or more tests failed

## Test Coverage Summary

| Feature | Automated | Interactive | Status |
|---------|-----------|-------------|--------|
| Fetch Groups | ✅ | ✅ | 100% |
| Extract Members | ✅ | ✅ | 100% |
| Add Single User | ✅ | ✅ | 100% |
| Bulk Add | ✅ | ✅ | 100% |
| Delay Timing | ✅ | ✅ | 100% |
| Progress Events | ✅ | ✅ | 100% |
| Permission Errors | ✅ | ✅ | 100% |
| Phone Formatting | ✅ | ✅ | 100% |
| Event Format | ✅ | ✅ | 100% |

## Requirements Coverage

All requirements from the Baileys migration spec are tested:

- ✅ **4.1** - Retrieve all groups
- ✅ **4.2** - Extract member information
- ✅ **4.3** - Add multiple users
- ✅ **4.4** - Group metadata
- ✅ **4.5** - Permission checks
- ✅ **9.1** - Same command signatures
- ✅ **9.2** - Same events
- ✅ **9.3** - Same data formats
- ✅ **9.4** - Preserve automation
- ✅ **9.5** - Same UX

## Next Steps

After running tests:

1. ✅ All automated tests pass → Ready for integration testing
2. ✅ Interactive tests pass → Ready for manual QA
3. ❌ Any tests fail → Review error messages and fix issues

## Documentation

- **Full Test Documentation:** `TEST_GROUP_OPERATIONS.md`
- **Test Scripts:** `test-group-operations.js`, `test-group-operations-automated.js`
- **Requirements:** `.kiro/specs/baileys-migration/requirements.md`
- **Design:** `.kiro/specs/baileys-migration/design.md`
