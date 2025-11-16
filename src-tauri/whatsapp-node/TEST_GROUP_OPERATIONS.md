# Baileys Group Operations Test Documentation

This document describes the test suite for validating all group operations with Baileys.

## Test Coverage

The test suite covers the following requirements:
- **4.1**: Fetch all groups the user is a member of
- **4.2**: Extract member information from any group
- **4.3**: Support adding multiple users to a group
- **4.4**: Provide group metadata including name, description, and participant count
- **4.5**: Handle group permission checks before operations
- **9.1**: Support all existing Tauri commands with the same signatures
- **9.2**: Emit the same frontend events as before
- **9.3**: Maintain the same data formats for groups and members
- **9.4**: Preserve existing automation capabilities
- **9.5**: Maintain the same user interface and user experience

## Test Files

### 1. `test-group-operations.js` (Interactive Manual Tests)

Interactive test script that requires user input and a real WhatsApp connection.

**Features:**
- Tests with real WhatsApp connection
- Interactive prompts for test data
- Colored console output for better readability
- Comprehensive test coverage with user verification
- Real-time event monitoring

**Usage:**
```bash
cd src-tauri/whatsapp-node
node test-group-operations.js
```

**Prerequisites:**
- WhatsApp must be authenticated (auth_info directory exists)
- You must be a member of at least one group
- You should be an admin of at least one group for full testing

**Test Flow:**
1. Starts WhatsApp client and waits for connection
2. Fetches all groups and displays them
3. User selects a group for testing
4. Extracts members from the selected group
5. Optionally tests add operations (if user is admin)
6. Tests permission error handling (if user is not admin)
7. Displays comprehensive test summary

### 2. `test-group-operations-automated.js` (Automated Unit Tests)

Automated test script that uses mocks and doesn't require a real WhatsApp connection.

**Features:**
- No user interaction required
- Uses mock socket and data
- Fast execution
- Suitable for CI/CD pipelines
- Validates data structures and behavior

**Usage:**
```bash
cd src-tauri/whatsapp-node
node test-group-operations-automated.js
```

**Test Cases:**

#### Test 1: getGroups Operation
- ✓ Emits `groups_result` event
- ✓ Returns array of groups
- ✓ Each group has required fields: `id`, `name`, `participantCount`, `isAdmin`
- ✓ Field types are correct (string, number, boolean)
- ✓ Admin status is correctly detected

#### Test 2: extractMembers Operation
- ✓ Emits `members_result` event
- ✓ Returns array of members
- ✓ Each member has required fields: `phoneNumber`, `name`, `isAdmin`
- ✓ Phone numbers are properly parsed (no @ or : symbols)
- ✓ Admin status is correctly detected
- ✓ Includes `group_id` in response

#### Test 3: addToGroup Operation - Single User
- ✓ Emits `automation_progress` event
- ✓ Emits `automation_finished` event
- ✓ Progress event has correct structure
- ✓ Report has required fields: `successful`, `failed`, `total_processed`
- ✓ Successfully adds user to group

#### Test 4: addToGroup Operation - Bulk with Delay
- ✓ Emits multiple progress events (one per user)
- ✓ Progress events are in correct sequence
- ✓ Respects delay between additions
- ✓ Processes all users
- ✓ Final report is accurate

#### Test 5: addToGroup Operation - Permission Errors
- ✓ Tracks failed additions
- ✓ Provides meaningful error reasons
- ✓ Handles permission errors gracefully
- ✓ Continues processing after errors

#### Test 6: Phone Number Formatting
- ✓ Handles various phone number formats
- ✓ Strips special characters (-, (), ., spaces)
- ✓ Formats to JID correctly

#### Test 7: Event Emission Format
- ✓ All operations emit correct event types
- ✓ All events have data property
- ✓ Event format is consistent

## Test Results Format

### Interactive Tests
```
╔════════════════════════════════════════════════════════════╗
║   Baileys Group Operations Test Suite                     ║
╚════════════════════════════════════════════════════════════╝

=== TEST: Fetch All Groups ===
✓ Fetch Groups - PASSED - Retrieved 5 groups
✓ Group Data Format - PASSED - All fields present and correct types

=== TEST: Extract Members from Group ===
✓ Extract Members - PASSED - Retrieved 25 members
✓ Member Data Format - PASSED - All fields present and correct types
✓ Phone Number Parsing - PASSED - All phone numbers properly parsed

=== TEST SUMMARY ===
Passed: 5
Failed: 0
Warnings: 0
Total Tests: 5
Pass Rate: 100.0%
```

### Automated Tests
```
╔════════════════════════════════════════════════════════════╗
║   Baileys Group Operations Automated Test Suite           ║
╚════════════════════════════════════════════════════════════╝

=== Test 1: getGroups Operation ===
✓ getGroups: Should emit at least one event
✓ getGroups: Should emit groups_result event
✓ getGroups: Should have groups array in data
✓ getGroups: Groups should be an array
✓ getGroups: Should return 2 groups
✓ getGroups: Group should have required fields (keys: id, name, participantCount, isAdmin)
✓ getGroups: Group id should be string
✓ getGroups: Group name should be string
✓ getGroups: Group participantCount should be number
✓ getGroups: Group isAdmin should be boolean
✓ getGroups: Should correctly detect admin status

=== TEST SUMMARY ===
Total Tests: 35
Passed: 35 ✓
Failed: 0 ✗
Pass Rate: 100.0%
```

## Data Structure Validation

### Groups Result Event
```json
{
  "event": "groups_result",
  "data": {
    "groups": [
      {
        "id": "120363123456789012@g.us",
        "name": "Test Group",
        "participantCount": 25,
        "isAdmin": true
      }
    ]
  }
}
```

### Members Result Event
```json
{
  "event": "members_result",
  "data": {
    "group_id": "120363123456789012@g.us",
    "members": [
      {
        "phoneNumber": "1234567890",
        "name": "John Doe",
        "isAdmin": false
      }
    ]
  }
}
```

### Automation Progress Event
```json
{
  "event": "automation_progress",
  "data": {
    "current": 1,
    "total": 5,
    "status": "Added 1234567890"
  }
}
```

### Automation Finished Event
```json
{
  "event": "automation_finished",
  "data": {
    "report": {
      "successful": ["1234567890", "9876543210"],
      "failed": [
        {
          "phone_number": "5555555555",
          "reason": "Not authorized (not an admin)"
        }
      ],
      "total_processed": 3
    }
  }
}
```

## Error Handling Tests

### Permission Errors
- Tests adding users when not an admin
- Verifies error message is meaningful
- Confirms operation continues for other users

### Invalid Phone Numbers
- Tests various phone number formats
- Verifies proper formatting and sanitization
- Confirms invalid numbers are handled gracefully

### Network Errors
- Tests timeout scenarios
- Verifies retry logic
- Confirms error events are emitted

## Performance Tests

### Delay Verification
- Measures actual time taken for bulk operations
- Verifies delay is respected between additions
- Confirms operations don't take unnecessarily long

### Event Emission
- Verifies all progress events are emitted
- Confirms events are emitted in correct order
- Validates event timing

## Integration with Existing System

### Backward Compatibility
- All event names match previous implementation
- Data structures are identical
- Command format is unchanged
- Frontend integration requires no changes

### Requirements Mapping

| Requirement | Test Coverage |
|-------------|---------------|
| 4.1 - Retrieve all groups | Test 1: getGroups |
| 4.2 - Extract member information | Test 2: extractMembers |
| 4.3 - Add multiple users | Test 3, 4: addToGroup |
| 4.4 - Group metadata | Test 1: getGroups |
| 4.5 - Permission checks | Test 5: Permission errors |
| 9.1 - Same command signatures | All tests |
| 9.2 - Same events | Test 7: Event format |
| 9.3 - Same data formats | All tests |
| 9.4 - Preserve automation | Test 4: Bulk operations |
| 9.5 - Same UX | All tests |

## Running Tests in CI/CD

### GitHub Actions Example
```yaml
- name: Test Group Operations
  run: |
    cd src-tauri/whatsapp-node
    node test-group-operations-automated.js
```

### Expected Output
- Exit code 0 if all tests pass
- Exit code 1 if any test fails
- Detailed test results in stdout

## Troubleshooting

### Test Failures

**"WhatsApp client not ready"**
- Ensure auth_info directory exists
- Check WhatsApp connection status
- Verify credentials are valid

**"No groups found"**
- Ensure WhatsApp account is member of at least one group
- Check group fetch permissions
- Verify connection is established

**"Permission denied"**
- Ensure you are admin of the test group
- Use a different group for testing
- Test permission error handling instead

**"Timeout waiting for response"**
- Increase timeout value
- Check network connection
- Verify WhatsApp service is available

## Manual Testing Checklist

- [ ] Fresh installation QR code flow works
- [ ] Session persistence across restarts
- [ ] Fetch all groups returns correct data
- [ ] Group data format matches expected structure
- [ ] Extract members returns all participants
- [ ] Member data format matches expected structure
- [ ] Phone numbers are properly parsed (no @ symbols)
- [ ] Admin status is correctly detected
- [ ] Add single user to group works
- [ ] Bulk add operation processes all users
- [ ] Delay between additions is respected
- [ ] Progress events are emitted for each user
- [ ] Final report is accurate
- [ ] Permission errors are handled gracefully
- [ ] Error messages are user-friendly
- [ ] All operations work with real WhatsApp connection

## Conclusion

This test suite provides comprehensive coverage of all group operations with Baileys, ensuring:
- Functional correctness
- Data structure integrity
- Backward compatibility
- Error handling
- Performance requirements
- User experience consistency

Both interactive and automated tests are provided to support different testing scenarios and environments.
