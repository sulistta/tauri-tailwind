# Implementation Plan - WhatsApp Automation Desktop Application

- [x]   1. Setup Node.js WhatsApp client infrastructure
    - Create `src-tauri/whatsapp-node/` directory structure
    - Initialize package.json with whatsapp-web.js, qrcode, and puppeteer dependencies
    - Implement main client in `index.js` with LocalAuth configuration
    - Create communication protocol using JSON over stdio for Tauri integration
    - Implement QR code generation and base64 encoding
    - Setup event handlers for qr, ready, disconnected, and message events
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x]   2. Implement Tauri backend core structure
    - [x] 2.1 Setup Rust project structure and dependencies
        - Add tauri-plugin-shell to Cargo.toml
        - Create module structure: commands.rs, whatsapp/mod.rs, whatsapp/client.rs, whatsapp/types.rs
        - Define Rust types (GroupInfo, Participant, AdditionReport, Automation) with Serialize/Deserialize
        - _Requirements: 1.1, 9.2_

    - [x] 2.2 Implement Node.js process management
        - Create WhatsAppClient struct to manage Node.js process lifecycle
        - Implement process spawning using tauri-plugin-shell with stdio pipes
        - Setup stdin writer for sending commands to Node.js
        - Setup stdout reader for receiving events from Node.js
        - Implement JSON message parsing and event routing
        - Add process health checks and automatic restart logic
        - _Requirements: 1.1, 11.5_

    - [x] 2.3 Implement Tauri command handlers
        - Create `initialize_whatsapp` command to spawn Node.js process
        - Create `get_groups` command to fetch all WhatsApp groups
        - Create `extract_group_members` command with group_id parameter
        - Create `add_users_to_group` command with delay configuration
        - Implement error handling and Result types for all commands
        - _Requirements: 1.1, 4.1, 4.3, 5.3_

    - [x] 2.4 Implement event emission system
        - Setup AppHandle storage in Tauri state
        - Create event emitter functions for whatsapp_qr, whatsapp_ready, whatsapp_disconnected
        - Implement message forwarding from Node.js stdout to Tauri events
        - Add event emission for automation_progress, automation_finished, automation_error
        - _Requirements: 1.2, 1.5, 5.4, 5.5, 8.1, 8.2_

- [x]   3. Create React frontend foundation
    - [x] 3.1 Setup routing and layout structure
        - Configure React Router with routes for all pages
        - Create Layout component with Sidebar integration
        - Implement Sidebar component with navigation menu items
        - Add route guards to redirect to Connect page when not authenticated
        - _Requirements: 3.1, 3.2, 3.3_

    - [x] 3.2 Implement WhatsApp integration hooks
        - Create useWhatsApp hook with status state management
        - Implement Tauri event listeners for whatsapp_qr, whatsapp_ready, whatsapp_disconnected
        - Add connect function using invoke('initialize_whatsapp')
        - Setup automatic cleanup of event listeners on unmount
        - _Requirements: 1.2, 1.5, 8.3, 8.5_

    - [x] 3.3 Create shared UI components
        - Implement QRCodeViewer component to display base64 QR codes
        - Create ConnectionStatus component with status indicator
        - Build GroupSelector dropdown component with search functionality
        - Create ProgressBar component for bulk operations
        - Implement FileUpload component for CSV/TXT files
        - _Requirements: 2.1, 2.2, 4.2, 5.1, 10.1, 10.2, 10.3_

-

- [x]   4. Implement WhatsApp connection page
    - Create Connect.tsx page component
    - Integrate useWhatsApp hook for connection management
    - Display centered card with "Conectar ao WhatsApp" button
    - Show QRCodeViewer when qrCode state is available
    - Display "Conectado ✔" status when connection is ready
    - Add loading spinner during connection process
    - Implement automatic redirect to Dashboard on successful connection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x]   5. Build Dashboard page
    - Create Dashboard.tsx with grid layout for cards
    - Display connection status card with real-time updates
    - Add utility buttons card (refresh groups, test connection)
    - Implement recent events card showing last 10 WhatsApp events
    - Use useWhatsApp hook to display current connection state
    - Add event listener for whatsapp_message to update recent events
    - Style with TailwindCSS cards, shadows, and transitions
    - _Requirements: 3.5, 8.1, 10.1, 10.2, 10.3, 10.4_

- [x]   6. Implement group member extraction feature
    - [x] 6.1 Create ExtractUsers page and hooks
        - Create ExtractUsers.tsx page component
        - Implement useGroups hook with fetchGroups and extractMembers functions
        - Add state management for selected group and extracted members
        - _Requirements: 4.1, 4.3_

    - [x] 6.2 Build extraction UI
        - Display GroupSelector component with all available groups
        - Add "Extrair membros" button that calls extractMembers
        - Show loading state during extraction
        - Display extracted members in a Table component with columns: number, name, admin status
        - _Requirements: 4.2, 4.4_

    - [x] 6.3 Implement export functionality
        - Add "Exportar JSON" button that downloads members as JSON file
        - Add "Exportar CSV" button that converts members to CSV format
        - Use Tauri's save dialog for file selection
        - Implement CSV conversion utility function
        - _Requirements: 4.5_

-

- [x]   7. Implement bulk user addition feature
    - [x] 7.1 Create AddToGroup page structure
        - Create AddToGroup.tsx page component
        - Add state for uploaded file, selected group, delay configuration
        - Implement file parsing for TXT and CSV formats
        - _Requirements: 5.1, 5.2_

    - [x] 7.2 Build addition UI and progress tracking
        - Create FileUpload component for TXT/CSV files
        - Display GroupSelector for target group selection
        - Add delay configuration slider (2-10 seconds)
        - Implement "Iniciar Adição" button
        - _Requirements: 5.1, 5.2, 5.3_

    - [x] 7.3 Implement real-time progress monitoring
        - Add event listener for automation_progress events
        - Display ProgressBar with current/total counts
        - Listen for automation_finished event
        - Show final report with successful additions, failures, and reasons
        - Display report in a formatted card with color-coded results
        - _Requirements: 5.4, 5.5_

-

- [x]   8. Create automation system backend
    - [x] 8.1 Implement automation storage
        - Create automation/storage.rs module
        - Implement JSON file persistence in app data directory
        - Create functions: save_automation, load_automations, delete_automation
        - Add file locking to prevent concurrent write issues
        - _Requirements: 6.4_

    - [x] 8.2 Build automation executor
        - Create automation/executor.rs module
        - Implement trigger matching logic for on_message, on_group_join, on_app_start
        - Create action executor for send_message, extract_info, add_to_group, save_to_list
        - Add delay and repetition handling
        - Implement automation scheduling for time-based triggers
        - _Requirements: 6.5_

    - [x] 8.3 Create automation Tauri commands
        - Implement create_automation command with validation
        - Create get_automations command to list all automations
        - Add delete_automation command
        - Implement toggle_automation command to enable/disable
        - Add execute_automation command for manual triggering
        - _Requirements: 6.4_

- [x]   9. Build automation management UI
    - [x] 9.1 Create automation hooks and types
        - Define Automation, AutomationTrigger, AutomationAction TypeScript types
        - Create useAutomations hook with CRUD operations
        - Implement state management for automation list
        - _Requirements: 6.1, 6.2, 6.3_

    - [x] 9.2 Implement Automations page
        - Create Automations.tsx page with list and form sections
        - Display AutomationList component showing all automations
        - Add "Nova Automação" button to open creation form
        - Implement enable/disable toggle for each automation
        - Add delete confirmation dialog
        - _Requirements: 6.1_

    - [x] 9.3 Build automation creation form
        - Create AutomationForm component with name input
        - Implement TriggerSelector with options: on_message, on_group_join, on_app_start
        - Build ActionSelector with multiple action types
        - Add action configuration fields (message text, group selection, delay)
        - Implement form validation using Zod
        - Add save button that calls create_automation command
        - _Requirements: 6.2, 6.3, 6.4_

- [x]   10. Implement logging system
    - [x] 10.1 Create logging backend
        - Create logging/logger.rs module
        - Implement LogEntry struct with timestamp, level, category, message
        - Create in-memory log buffer with size limit (1000 entries)
        - Add log emission to frontend via log_entry events
        - Implement log filtering by level and category
        - _Requirements: 7.1, 7.4_

    - [x] 10.2 Integrate logging throughout backend
        - Add logging to all Tauri command handlers
        - Log WhatsApp events (connection, disconnection, messages)
        - Log automation execution start, progress, and completion
        - Log all errors with stack traces
        - _Requirements: 7.1, 11.4_

    - [x] 10.3 Create Logs page UI
        - Create Logs.tsx page component
        - Implement useLogs hook with event listener for log_entry
        - Build log table with columns: timestamp, level, category, message
        - Add filtering controls for level and category
        - Implement virtual scrolling for performance with large log lists
        - Add color coding for log levels (info: blue, warning: yellow, error: red)
        - _Requirements: 7.2, 7.3, 7.5_

- [x]   11. Create Settings page
    - Create Settings.tsx page component
    - Add session management section with "Desconectar" button
    - Implement delay configuration for bulk operations
    - Add automation settings (enable/disable all automations)
    - Create about section with app version and credits
    - Implement settings persistence using localStorage
    - _Requirements: 9.1, 9.2, 9.3_

- [x]   12. Implement Node.js operation handlers
    - [x] 12.1 Create group operations
        - Implement getGroups handler in operations/getGroups.js
        - Use client.getChats() to fetch all group chats
        - Filter for group chats only (exclude individual chats)
        - Return group id, name, participant count, and admin status
        - _Requirements: 4.1_

    - [x] 12.2 Create member extraction
        - Implement extractMembers handler in operations/extractMembers.js
        - Use client.getChatById() to get specific group
        - Extract participants array with phone numbers, names, and admin flags
        - Handle cases where participant names are unavailable
        - _Requirements: 4.3_

    - [x] 12.3 Create bulk addition handler
        - Implement addToGroup handler in operations/addToGroup.js
        - Accept array of phone numbers and delay configuration
        - Use chat.addParticipants() for each number with delay
        - Track successful additions and failures with reasons
        - Send progress updates via sendToTauri for each processed number
        - Return final report with all results
        - _Requirements: 5.3, 5.4, 5.5_

- [x]   13. Enhance error handling and recovery
    - Implement error boundaries in React for component error catching
    - Add toast notification system using sonner or react-hot-toast
    - Create error display component for user-friendly error messages
    - Implement retry logic for failed Tauri commands
    - Add connection recovery mechanism with exponential backoff
    - Display error details in Logs page for debugging

    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]   14. Polish UI and add animations
    - Apply consistent TailwindCSS styling across all pages
    - Add transition-all to all interactive elements
    - Implement loading skeletons for data fetching states
    - Add hover effects to buttons and cards
    - Create smooth page transitions using React Router
    - Implement toast notifications for success/error feedback
    - Add empty states for lists (no groups, no automations, no logs)

    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]   15. Configure Tauri for production build
    - Update tauri.conf.json with proper app metadata
    - Configure bundle settings for Windows (MSI), macOS (DMG), Linux (AppImage)
    - Add whatsapp-node directory to bundle resources
    - Configure Node.js as external binary sidecar
    - Setup proper file system permissions for session storage
    - Configure Content Security Policy
    - Add application icons for all platforms
    - Test build process on all target platforms
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]   16. Integration and end-to-end testing
    - [ ]\* 16.1 Write integration tests
        - Test WhatsApp connection flow from QR to ready state
        - Test group fetching and member extraction flow
        - Test bulk addition with mock phone numbers
        - Test automation creation and execution
        - _Requirements: All_
    - [ ]\* 16.2 Perform manual testing
        - Test complete user flow: connect → extract → add → automate
        - Verify session persistence across app restarts
        - Test error scenarios (disconnection, invalid numbers, etc.)
        - Verify all UI interactions and transitions
        - Test on Windows, macOS, and Linux
        - _Requirements: All_
    - [ ]\* 16.3 Performance testing
        - Test with large groups (500+ members)
        - Test bulk addition with 100+ numbers
        - Verify log system performance with 1000+ entries
        - Check memory usage during long-running operations
        - _Requirements: All_
