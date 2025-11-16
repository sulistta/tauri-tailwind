# Requirements Document

## Introduction

This document specifies the requirements for a WhatsApp Automation Desktop Application built with Tauri (Rust backend) and React (frontend). The application enables users to connect their WhatsApp account, extract group members, add users to groups, and create custom automations. The system integrates whatsapp-web.js library running in a Node.js process managed by Tauri, with real-time communication between frontend and backend using Tauri's event system and command invocation.

## Glossary

- **WhatsApp_Client**: The whatsapp-web.js library instance running in Node.js that manages WhatsApp Web connection
- **Tauri_Backend**: The Rust application layer that manages system resources and Node.js processes
- **React_Frontend**: The user interface layer built with React, Vite, and TailwindCSS
- **QR_Code**: Quick Response code displayed for WhatsApp authentication
- **Session_Data**: Persistent authentication data stored locally using LocalAuth
- **Group_Chat**: A WhatsApp group conversation with multiple participants
- **Participant**: A user member of a WhatsApp group
- **Automation**: A user-defined rule with triggers and actions for automated WhatsApp operations
- **Event_System**: Tauri's event emission mechanism for backend-to-frontend communication
- **Command_Invocation**: Tauri's invoke mechanism for frontend-to-backend communication

## Requirements

### Requirement 1: WhatsApp Connection Management

**User Story:** As a user, I want to connect my WhatsApp account to the application, so that I can automate WhatsApp operations from my desktop.

#### Acceptance Criteria

1. WHEN the application starts, THE Tauri_Backend SHALL initialize a Node.js process running the WhatsApp_Client
2. WHEN the WhatsApp_Client generates a QR_Code, THE Tauri_Backend SHALL emit a "whatsapp_qr" event containing the QR_Code in base64 format
3. WHEN the user scans the QR_Code, THE WhatsApp_Client SHALL save Session_Data to local storage using LocalAuth
4. WHEN Session_Data exists on application start, THE WhatsApp_Client SHALL authenticate automatically without requiring QR_Code scanning
5. WHEN the WhatsApp_Client successfully connects, THE Tauri_Backend SHALL emit a "whatsapp_ready" event

### Requirement 2: Connection Status Display

**User Story:** As a user, I want to see my WhatsApp connection status in real-time, so that I know when the application is ready to use.

#### Acceptance Criteria

1. WHEN the React_Frontend receives a "whatsapp_qr" event, THE React_Frontend SHALL display the QR_Code image in a centered card
2. WHEN the React_Frontend receives a "whatsapp_ready" event, THE React_Frontend SHALL display "Conectado ✔" status message
3. WHEN the React_Frontend receives a "whatsapp_disconnected" event, THE React_Frontend SHALL display a disconnection warning
4. THE React_Frontend SHALL provide a "Conectar ao WhatsApp" button that triggers connection initialization
5. WHILE the WhatsApp_Client is connecting, THE React_Frontend SHALL display a loading indicator

### Requirement 3: Dashboard Navigation

**User Story:** As a user, I want to navigate between different features of the application, so that I can access all automation capabilities.

#### Acceptance Criteria

1. WHEN the WhatsApp_Client is connected, THE React_Frontend SHALL display a dashboard with a sidebar menu
2. THE React_Frontend SHALL provide navigation menu items for Dashboard, Automação, Grupos, Lista Personalizada, Logs, and Configurações
3. WHEN the user clicks a menu item, THE React_Frontend SHALL navigate to the corresponding page
4. THE React_Frontend SHALL highlight the active menu item in the sidebar
5. THE Dashboard page SHALL display connection status, utility buttons, and recent WhatsApp events

### Requirement 4: Group Member Extraction

**User Story:** As a user, I want to extract all members from a WhatsApp group, so that I can analyze group composition or use the data for other purposes.

#### Acceptance Criteria

1. WHEN the user navigates to the "Extrair Membros" page, THE Tauri_Backend SHALL retrieve all Group_Chat instances where the user is a Participant
2. THE React_Frontend SHALL display a list of Group_Chat names for user selection
3. WHEN the user selects a Group_Chat and clicks "Extrair membros", THE Tauri_Backend SHALL retrieve all Participant data including phone number, name, and admin status
4. THE React_Frontend SHALL display extracted Participant data in a table with columns for number, name, and admin status
5. THE React_Frontend SHALL provide export buttons that save Participant data as JSON and CSV files

### Requirement 5: Bulk User Addition to Groups

**User Story:** As a user, I want to add multiple users to a WhatsApp group from a list, so that I can efficiently manage group membership.

#### Acceptance Criteria

1. WHEN the user navigates to the "Adicionar usuários ao grupo" page, THE React_Frontend SHALL provide a file upload interface accepting TXT and CSV formats
2. THE React_Frontend SHALL allow the user to select a target Group_Chat from available groups
3. WHEN the user initiates the addition process, THE Tauri_Backend SHALL add each phone number to the selected Group_Chat with a configurable delay between 2 and 10 seconds
4. WHILE the addition process is running, THE Tauri_Backend SHALL emit "automation_progress" events with current status
5. WHEN the addition process completes, THE Tauri_Backend SHALL emit an "automation_finished" event with a report containing successful additions, failures, and failure reasons

### Requirement 6: Custom Automation Creation

**User Story:** As a user, I want to create custom automations with triggers and actions, so that I can automate repetitive WhatsApp tasks.

#### Acceptance Criteria

1. WHEN the user navigates to the "Automação" page, THE React_Frontend SHALL display a form for creating new automations
2. THE React_Frontend SHALL provide trigger options including "Ao receber mensagem", "Ao entrar no grupo", and "Ao iniciar o app"
3. THE React_Frontend SHALL provide action options including "Enviar mensagem", "Extrair info", "Adicionar ao grupo", and "Salvar em lista"
4. WHEN the user saves an automation, THE Tauri_Backend SHALL persist the automation configuration to a local JSON file
5. WHEN a trigger condition is met, THE Tauri_Backend SHALL execute the configured actions with specified delays and repetitions

### Requirement 7: Event Logging System

**User Story:** As a user, I want to view logs of all application activities, so that I can monitor operations and troubleshoot issues.

#### Acceptance Criteria

1. WHEN the Tauri_Backend performs any operation, THE Tauri_Backend SHALL generate log entries with timestamp, level, and message
2. THE Tauri_Backend SHALL emit log events to the React_Frontend in real-time
3. WHEN the user navigates to the "Logs" page, THE React_Frontend SHALL display all log entries in a scrollable table
4. THE React_Frontend SHALL categorize logs into general logs, automation logs, and WhatsApp logs
5. THE React_Frontend SHALL implement infinite scroll for efficient rendering of large log datasets

### Requirement 8: Real-time Event Communication

**User Story:** As a user, I want the application to respond immediately to WhatsApp events, so that automations execute without delay.

#### Acceptance Criteria

1. WHEN the WhatsApp_Client receives a message, THE Tauri_Backend SHALL emit a "whatsapp_message" event containing message data
2. THE Tauri_Backend SHALL maintain persistent event listeners for all WhatsApp_Client events
3. WHEN the React_Frontend mounts, THE React_Frontend SHALL register listeners for all Tauri event types
4. THE Event_System SHALL deliver events to the React_Frontend within 100 milliseconds of emission
5. WHEN the React_Frontend unmounts, THE React_Frontend SHALL unregister all event listeners

### Requirement 9: Session Persistence

**User Story:** As a user, I want my WhatsApp session to persist between application restarts, so that I don't need to scan the QR code every time.

#### Acceptance Criteria

1. WHEN the WhatsApp_Client authenticates successfully, THE WhatsApp_Client SHALL save Session_Data to a local directory
2. THE Tauri_Backend SHALL configure the WhatsApp_Client to use LocalAuth strategy for session management
3. WHEN the application starts, THE WhatsApp_Client SHALL attempt to load existing Session_Data before requesting QR_Code authentication
4. IF Session_Data is corrupted or invalid, THEN THE WhatsApp_Client SHALL delete the Session_Data and request new QR_Code authentication
5. THE Tauri_Backend SHALL store Session_Data in the application's data directory with appropriate file permissions

### Requirement 10: User Interface Design

**User Story:** As a user, I want a clean and modern interface, so that the application is pleasant and easy to use.

#### Acceptance Criteria

1. THE React_Frontend SHALL implement all UI components using TailwindCSS utility classes
2. THE React_Frontend SHALL use rounded borders, subtle shadows, and smooth transitions for all interactive elements
3. THE React_Frontend SHALL implement a responsive layout that adapts to different window sizes
4. THE React_Frontend SHALL apply transition-all classes to elements that change state
5. THE React_Frontend SHALL maintain a minimalist design aesthetic with consistent spacing and typography

### Requirement 11: Error Handling and Reporting

**User Story:** As a user, I want to be notified of errors with clear messages, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN the Tauri_Backend encounters an error, THE Tauri_Backend SHALL emit an "automation_error" event with error details
2. WHEN the React_Frontend receives an error event, THE React_Frontend SHALL display a user-friendly error message
3. IF a Group_Chat operation fails, THEN THE Tauri_Backend SHALL include the failure reason in the operation report
4. THE Tauri_Backend SHALL log all errors with stack traces to the logging system
5. WHEN the WhatsApp_Client disconnects unexpectedly, THE Tauri_Backend SHALL attempt automatic reconnection up to 3 times

### Requirement 12: Build and Deployment

**User Story:** As a developer, I want the application to build successfully for multiple platforms, so that users can install it on their operating systems.

#### Acceptance Criteria

1. THE Tauri_Backend SHALL compile successfully for Windows, macOS, and Linux platforms
2. THE React_Frontend SHALL build production assets using Vite with code splitting and optimization
3. THE build process SHALL bundle the Node.js runtime and whatsapp-web.js dependencies
4. THE application SHALL include all necessary Tauri plugins (shell, process) in the final build
5. THE build output SHALL produce platform-specific installers (MSI for Windows, DMG for macOS, AppImage for Linux)
