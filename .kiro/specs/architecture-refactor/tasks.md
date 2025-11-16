# Implementation Plan

- [x]   1. Create ConnectionManager module in Rust backend
    - Create new file `src-tauri/src/connection/manager.rs` with ConnectionManager struct
    - Implement ConnectionState enum with all states (Uninitialized, Initializing, Connected, Disconnected, Error)
    - Add initialization_lock mutex to prevent concurrent initialization
    - Implement `initialize()` method with session check and idempotent logic
    - Implement `get_state()` method for state queries without side effects
    - Implement `connect()` method for explicit connection requests
    - Implement `disconnect()` method for graceful shutdown
    - Add `has_session()` method with cached result
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 7.1, 7.2, 7.3, 10.1, 10.2, 10.3_

-

- [x]   2. Refactor WhatsAppClient for idempotency and complete event handling
    - [x] 2.1 Add missing Node.js event handlers
        - Add handler for `client_initializing` event with debug logging
        - Add handler for `whatsapp_loading` event with debug logging
        - Update `handle_node_message()` to route new events properly
        - Change unknown event logging from warning to debug level
        - _Requirements: 5.1, 5.2, 5.3, 5.4_

    - [x] 2.2 Make initialize() method idempotent
        - Add process state check at start of `initialize()`
        - Return success immediately if process is already running
        - Clean up dead processes before spawning new ones
        - Add process state tracking field to WhatsAppClient struct
        - _Requirements: 2.2, 2.3, 7.1, 7.2, 7.3_

    - [x] 2.3 Reduce logging verbosity
        - Change routine operation logs from info to debug level
        - Keep only user-relevant events at info level (connected, disconnected)
        - Update all log calls in `handle_node_message()`
        - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x]   3. Update AppState and integrate ConnectionManager
    - Modify `AppState` struct to include `connection_manager: Arc<ConnectionManager>`
    - Update `main.rs` setup to initialize ConnectionManager
    - Pass ConnectionManager to all relevant commands
    - Remove direct `whatsapp_client` access from commands where possible
    - _Requirements: 3.1, 3.3, 9.1, 9.2, 9.3_

- [x]   4. Create new Tauri commands for simplified API
    - [x] 4.1 Implement initialize_connection command
        - Create `initialize_connection()` command that calls ConnectionManager.initialize()
        - Return InitializationResult with state, has_session, and requires_qr
        - Add proper error handling and logging
        - _Requirements: 1.1, 2.1, 7.1, 9.4_

    - [x] 4.2 Implement connect_whatsapp command
        - Create `connect_whatsapp()` command that calls ConnectionManager.connect()
        - Handle case where client needs initialization first
        - Emit state change events to frontend
        - _Requirements: 2.1, 3.2, 7.1, 9.4_

    - [x] 4.3 Implement get_connection_state command
        - Create `get_connection_state()` command that returns current state
        - Ensure no side effects (pure query)
        - Return ConnectionState directly
        - _Requirements: 3.1, 3.4, 9.4_

- [x]   5. Refactor existing Tauri commands to use ConnectionManager
    - Update `get_groups()` to use ConnectionManager for client access
    - Update `extract_group_members()` to use ConnectionManager
    - Update `add_users_to_group()` to use ConnectionManager
    - Update `execute_automation()` to use ConnectionManager
    - Remove `check_session()` command (functionality moved to initialize_connection)
    - Remove `initialize_whatsapp()` command (replaced by new commands)
    - _Requirements: 3.1, 3.3, 9.1, 9.2, 9.3_

- [x]   6. Implement consolidated state change event emission
    - Create `emit_state_change()` helper method in ConnectionManager
    - Emit single `whatsapp_state_changed` event with all state data
    - Include status, phone_number, qr_code, error, and timestamp in event
    - Update all state transitions to use this helper
    - _Requirements: 3.2, 5.5, 9.3_

- [x]   7. Simplify useWhatsApp hook in frontend
    - [x] 7.1 Remove session checking logic
        - Remove `checkSession()` function
        - Remove session check useEffect
        - Remove `isInitialized` state variable
        - _Requirements: 1.1, 4.1, 4.2, 9.1, 9.4_

    - [x] 7.2 Consolidate event listeners
        - Replace multiple event listeners with single `whatsapp_state_changed` listener
        - Update state from consolidated event payload
        - Fix dependency arrays to prevent re-creation
        - _Requirements: 3.2, 4.3, 4.4, 5.5_

    - [x] 7.3 Simplify initialization flow
        - Call `initialize_connection` once on mount
        - Remove duplicate initialization attempts
        - Handle initialization errors properly
        - Add cleanup on unmount
        - _Requirements: 1.1, 2.1, 4.1, 4.2, 4.5_

- [x]   8. Update WhatsAppContext and provider
    - Remove `checkSession` from context interface
    - Remove `isInitialized` from context interface
    - Simplify context value to essential state only
    - Update all consumers of removed properties
    - _Requirements: 3.1, 9.1, 9.4_

- [x]   9. Update AppShell component
    - Remove session expiration detection logic (handled by backend)
    - Simplify routing based on connection status
    - Remove `isInitialized` check (always initialized now)
    - Update loading screen logic
    - _Requirements: 3.1, 4.1, 9.1_

- [x]   10. Implement connection recovery improvements
    - [x] 10.1 Update useConnectionRecovery hook
        - Coordinate with ConnectionManager state
        - Check if initialization is in progress before retrying
        - Implement exponential backoff
        - Add max retry limit
        - _Requirements: 8.1, 8.2, 8.3, 8.4_

    - [x] 10.2 Add recovery state to ConnectionManager
        - Track recovery attempts in ConnectionManager
        - Implement backoff logic in backend
        - Emit recovery events to frontend
        - Reset recovery state on manual connect
        - _Requirements: 8.1, 8.2, 8.4, 8.5_

-

- [x]   11. Add initialization guards and concurrency control
    - Implement mutex-based serialization in ConnectionManager
    - Add timeout for initialization operations (30 seconds)
    - Queue or reject concurrent initialization requests
    - Release locks on timeout or error
    - Add clear error messages for blocked operations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x]   12. Update TypeScript types for new API
    - Create ConnectionStateEvent interface
    - Create InitializationResult interface
    - Update WhatsAppStatus type if needed
    - Remove obsolete type definitions
    - _Requirements: 3.1, 9.3_

- [x]   13. Update logging configuration
    - Add Logger method for debug level logging
    - Update all routine operation logs to use debug level
    - Keep error and warning logs at appropriate levels
    - Add log level configuration option
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x]   14. Update error handling throughout the application
    - Implement ConnectionError enum in Rust
    - Add error recovery strategies in ConnectionManager
    - Update frontend error display for new error types
    - Add user-friendly error messages
    - _Requirements: 2.5, 8.1, 8.2, 8.3_

- [x]   15. Clean up deprecated code and update documentation
    - Remove old `check_session` command registration
    - Remove old `initialize_whatsapp` command registration
    - Update command handler list in main.rs
    - Remove unused imports and dead code
    - Update inline documentation and comments

    - _Requirements: 9.1, 9.2, 9.3_

-

- [x]   16. Verify and test the refactored architecture
    - Start application and verify single initialization in logs
    - Test cold start (no session) flow
    - Test warm start (existing session) flow
    - Test rapid reconnection attempts
    - Test connection recovery after process crash
    - Verify no duplicate logs during startup
    - Verify all Node.js events are handled without warnings
    - Test concurrent initialization attempts are properly serialized
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 10.1, 10.2_
