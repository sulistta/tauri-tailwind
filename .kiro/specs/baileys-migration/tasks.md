# Implementation Plan

- [x]   1. Prepare project for Baileys migration
    - Update `src-tauri/whatsapp-node/package.json` to replace whatsapp-web.js with Baileys dependencies
    - Remove puppeteer and whatsapp-web.js from dependencies
    - Add @whiskeysockets/baileys, @hapi/boom, and pino to dependencies
    - Create backup branch of current implementation
    - _Requirements: 1.1, 1.2, 1.3_

- [ ]   2. Implement Baileys authentication and connection management
    - [x] 2.1 Create auth state management functions
        - Implement `initAuthState()` function using `useMultiFileAuthState`
        - Create auth_info directory structure
        - Add credential saving logic with `creds.update` event handler
        - _Requirements: 2.5, 3.1, 3.2, 10.1, 10.2_

    - [x] 2.2 Implement connection initialization
        - Create `startConnection()` function with `makeWASocket`
        - Configure socket with proper browser identifier and settings
        - Fetch latest Baileys version for compatibility
        - Set up Pino logger with silent level
        - _Requirements: 1.1, 2.1, 5.1, 8.2_

    - [ ] 2.3 Implement QR code generation and handling
        - Add QR code event handler in `connection.update`
        - Generate base64 QR code using qrcode library
        - Emit `whatsapp_qr` event to Tauri backend
        - Implement QR retry limit (max 3 attempts)

        - _Requirements: 2.1, 2.2, 2.3_

    - [ ] 2.4 Implement connection state event handlers
        - Handle 'open' connection state for successful authentication
        - Handle 'close' connection state with disconnect reason analysis

        - Handle 'connecting' state for loading feedback
        - Emit appropriate events to Tauri (whatsapp_ready, whatsapp_disconnected, whatsapp_loading)
        - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x]   3. Implement reconnection and error handling logic
    - [ ] 3.1 Add automatic reconnection logic
        - Check disconnect reason using Boom error analysis
        - Implement reconnection for non-logout disconnects

        - Add 3-second delay before reconnection attempt

        - Prevent reconnection on explicit logout
        - _Requirements: 7.1, 7.2, 7.3, 5.1_

    - [ ] 3.2 Handle session expiration and logout
        - Detect `DisconnectReason.loggedOut` status
        - Emit `whatsapp_logged_out` event

        - Clear auth state directory on logout
        - Prevent automatic reconnection after logout
        - _Requirements: 3.3, 3.4, 7.3, 10.4_

    - [ ] 3.3 Implement error recovery strategies
        - Handle bad session errors by clearing auth state
        - Handle rate limiting with exponential backoff

        - Handle connection timeout errors
        - Emit appropriate error events to frontend
        - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]   4. Refactor group operations for Baileys API
    - [x] 4.1 Refactor getGroups operation
        - Replace whatsapp-web.js `getChats()` with Baileys `groupFetchAllParticipating()`
        - Transform Baileys group format to expected output format
        - Map group.subject to name, group.id to id
        - Check admin status using participant.admin field
        - Maintain same event emission format (groups_result)

        - _Requirements: 4.1, 4.4, 9.1, 9.2, 9.3_

    - [ ] 4.2 Refactor extractMembers operation
        - Replace `getChatById()` with Baileys `groupMetadata()`
        - Extract participant information from groupMetadata.participants
        - Parse phone numbers from JID format (split by '@')

        - Map participant.notify to name field
        - Check admin status using participant.admin field
        - Maintain same event emission format (members_result)
        - _Requirements: 4.2, 4.4, 9.1, 9.2, 9.3_

    - [x] 4.3 Refactor addToGroup operation
        - Replace `chat.addParticipants()` with Baileys `groupParticipantsUpdate()`
        - Format phone numbers to JID format (@s.whatsapp.net)
        - Parse response status codes (200 for success)
        - Maintain delay logic between additions

        - Emit progress events (automation_progress)
        - Emit final report (automation_finished)
        - Handle group permission errors

        - _Requirements: 4.3, 4.5, 9.1, 9.2, 9.3_

- [-] 5. Update command handlers and message operations
    - [ ] 5.1 Update command handler to use Baileys socket
        - Replace client references with sock (Baileys socket)
        - Add socket readiness check before command execution

        - Update all operation calls to pass sock instead of client
        - Maintain same command format and stdin/stdout protocol

        - _Requirements: 9.1, 9.2, 9.3_

    - [ ] 5.2 Implement send message handler
        - Use Baileys `sendMessage()` API with text payload format
        - Format recipient JID correctly

        - Emit message_sent event on success
        - Handle send errors appropriately
        - _Requirements: 4.3, 9.1, 9.3_

    - [ ] 5.3 Implement get status handler
        - Check if socket exists and has user property

        - Extract phone number from sock.user.id
        - Return connection status and phone number
        - Emit status_result event
        - _Requirements: 5.1, 9.1, 9.3_

    - [ ] 5.4 Implement logout command handler
        - Call sock.logout() to disconnect

        - Clear auth_info directory completely
        - Emit whatsapp_logged_out event
        - Set sock to null after logout
        - _Requirements: 3.4, 10.4, 10.5_

- [ ]   6. Add additional Baileys event handlers
    - [x] 6.1 Implement messages.upsert handler
        - Add event listener for incoming messages
        - Parse message data if needed for future automation features
        - Keep implementation minimal for now
        - _Requirements: 5.3, 6.3_

    - [ ] 6.2 Implement groups.update handler
        - Add event listener for group changes

        - Emit groups_updated event to frontend
        - Include update count and timestamp
        - _Requirements: 5.4, 6.4_

- [ ]   7. Update session management in Rust backend
    - [ ] 7.1 Update session directory path
        - Change session check from './session' to './auth_info'
        - Update `check_session_exists()` to look for auth_info directory
        - Check for creds.json file existence
        - _Requirements: 3.1, 3.2, 12.1, 12.2_

    - [x] 7.2 Add session cleanup on logout
        - Ensure auth_info directory is removed on logout command
        - Handle cleanup errors gracefully
        - Verify cleanup in connection manager
        - _Requirements: 10.4, 10.5, 12.5_

- [ ]   8. Update graceful shutdown handlers
    - Replace `client.destroy()` with `sock.end()` in SIGINT handler
    - Replace `client.destroy()` with `sock.end()` in SIGTERM handler
    - Ensure proper cleanup of Baileys socket connection
    - Add timeout for graceful shutdown (5 seconds max)
    - _Requirements: 8.4, 8.5_

- [ ]   9. Test authentication and session persistence
    - Test fresh installation QR code flow
    - Verify QR code is displayed correctly in frontend
    - Test successful authentication after QR scan
    - Verify auth_info directory is created with credentials
    - Test app restart with existing session (no QR required)
    - Test session restoration on cold start
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x]   10. Test connection state management and recovery
    - Test connection state transitions (connecting → open)
    - Test automatic reconnection after connection loss
    - Test logout flow and session cleanup
    - Test invalid session handling
    - Verify all connection events are emitted correctly
    - Test max retry limit for QR code
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]   11. Test all group operations with Baileys
    - Test fetching all groups
    - Verify group data format matches expected structure
    - Test extracting members from a group
    - Verify member data format and phone number parsing
    - Test adding single user to group
    - Test bulk add operation with multiple users
    - Test delay between additions
    - Verify progress events are emitted
    - Test group permission errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]   12. Verify performance improvements
    - Measure memory usage during normal operation (should be < 200MB)
    - Measure startup time (should be < 5 seconds)
    - Verify no browser processes are spawned
    - Compare performance with previous whatsapp-web.js implementation
    - Document performance metrics
    - _Requirements: 1.4, 1.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]   13. Test error handling and edge cases
    - Test connection loss during operation
    - Test rate limiting scenarios
    - Test invalid group ID errors
    - Test invalid phone number errors
    - Test network timeout errors
    - Verify error messages are user-friendly
    - Test recovery from all error scenarios
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]   14. Update documentation and cleanup
    - Remove old whatsapp-web.js code comments
    - Update inline documentation for Baileys
    - Document new auth_info directory structure
    - Update README with Baileys information
    - Remove old session directory if exists
    - Document migration steps for users
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x]   15. Verify multi-device support
    - Test connecting while other devices are active
    - Verify app appears in WhatsApp's linked devices list
    - Test that other devices remain connected
    - Verify multi-device sync events are handled
    - Test device name display in WhatsApp
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]   16. Final integration testing
    - Run complete end-to-end test flow
    - Test all features in sequence (connect → groups → extract → add)
    - Verify all Tauri commands work correctly
    - Test frontend integration with new events
    - Verify backward compatibility with existing features
    - Test on all target platforms (Windows, macOS, Linux)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
