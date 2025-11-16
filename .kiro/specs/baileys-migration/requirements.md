# Requirements Document

## Introduction

This document outlines the requirements for migrating the WhatsApp Automation application from whatsapp-web.js (Puppeteer-based) to @whiskeysockets/baileys. Baileys provides a direct connection to WhatsApp's protocol without requiring a headless browser, resulting in better performance, lower resource usage, and improved reliability for desktop applications built with Tauri.

## Glossary

- **Baileys**: A lightweight TypeScript/JavaScript library that connects directly to WhatsApp Web's WebSocket protocol
- **WhatsApp Client**: The Node.js-based client that manages WhatsApp connections
- **Session Management**: The mechanism for storing and restoring WhatsApp authentication state
- **QR Code Authentication**: The process of authenticating with WhatsApp by scanning a QR code
- **Multi-Device Support**: WhatsApp's feature allowing multiple devices to connect simultaneously
- **Connection Manager**: The Rust module that coordinates WhatsApp client lifecycle
- **Auth State**: The authentication credentials and keys stored for session persistence

## Requirements

### Requirement 1: Replace whatsapp-web.js with Baileys

**User Story:** As a developer, I want to use Baileys instead of whatsapp-web.js, so that the application is lighter and more efficient without Puppeteer dependencies.

#### Acceptance Criteria

1. THE System SHALL use @whiskeysockets/baileys as the WhatsApp client library
2. THE System SHALL remove all Puppeteer and whatsapp-web.js dependencies
3. THE System SHALL maintain the same external API for Tauri commands
4. WHEN THE migration is complete, THE System SHALL not require Chrome or Chromium to be installed
5. THE System SHALL reduce memory footprint by at least 50% compared to Puppeteer-based implementation

### Requirement 2: Implement Baileys Authentication Flow

**User Story:** As a user, I want to authenticate with WhatsApp using QR code, so that I can connect my WhatsApp account to the application.

#### Acceptance Criteria

1. WHEN THE user has no existing session, THE System SHALL generate a QR code for authentication
2. THE System SHALL display the QR code in the frontend interface
3. WHEN THE user scans the QR code with their phone, THE System SHALL establish a connection
4. THE System SHALL save authentication credentials securely to disk
5. WHEN THE application restarts, THE System SHALL restore the session without requiring a new QR code

### Requirement 3: Implement Session Persistence with Baileys

**User Story:** As a user, I want my WhatsApp session to persist across app restarts, so that I don't need to scan a QR code every time.

#### Acceptance Criteria

1. THE System SHALL store Baileys auth state in a secure location on disk
2. WHEN THE application starts, THE System SHALL attempt to restore the previous session
3. IF THE session is valid, THEN THE System SHALL connect automatically without QR code
4. IF THE session is invalid or expired, THEN THE System SHALL request a new QR code
5. THE System SHALL handle session updates and save them incrementally

### Requirement 4: Maintain Group Management Functionality

**User Story:** As a user, I want to manage WhatsApp groups, so that I can extract member lists and perform bulk operations.

#### Acceptance Criteria

1. THE System SHALL retrieve all groups the user is a member of
2. THE System SHALL extract member information from any group
3. THE System SHALL support adding multiple users to a group
4. THE System SHALL provide group metadata including name, description, and participant count
5. THE System SHALL handle group permission checks before operations

### Requirement 5: Implement Connection State Management

**User Story:** As a user, I want to see the current connection status, so that I know when the application is ready to use.

#### Acceptance Criteria

1. THE System SHALL emit connection state events to the frontend
2. WHEN THE connection state changes, THE System SHALL update the UI immediately
3. THE System SHALL distinguish between connecting, connected, disconnected, and error states
4. WHEN THE connection is lost, THE System SHALL attempt automatic reconnection
5. THE System SHALL provide clear error messages for connection failures

### Requirement 6: Handle Baileys Events and Messages

**User Story:** As a developer, I want to handle all relevant Baileys events, so that the application responds correctly to WhatsApp state changes.

#### Acceptance Criteria

1. THE System SHALL handle connection.update events for connection state changes
2. THE System SHALL handle creds.update events for auth state updates
3. THE System SHALL handle messages.upsert events for incoming messages if needed
4. THE System SHALL handle groups.update events for group changes
5. THE System SHALL log all unhandled events at debug level for troubleshooting

### Requirement 7: Implement Error Handling and Recovery

**User Story:** As a user, I want the application to recover from connection errors automatically, so that I have a reliable experience.

#### Acceptance Criteria

1. WHEN THE connection is lost, THE System SHALL attempt to reconnect automatically
2. THE System SHALL implement exponential backoff for reconnection attempts
3. IF THE session becomes invalid, THEN THE System SHALL notify the user and request re-authentication
4. THE System SHALL handle rate limiting from WhatsApp gracefully
5. WHEN THE maximum retry attempts are reached, THE System SHALL stop and notify the user

### Requirement 8: Optimize Performance and Resource Usage

**User Story:** As a user, I want the application to use minimal system resources, so that it runs smoothly on my computer.

#### Acceptance Criteria

1. THE System SHALL use less than 200MB of RAM during normal operation
2. THE System SHALL start up in less than 5 seconds on average
3. THE System SHALL not spawn browser processes
4. THE System SHALL handle concurrent operations efficiently
5. THE System SHALL clean up resources properly on shutdown

### Requirement 9: Maintain Backward Compatibility with Existing Features

**User Story:** As a user, I want all existing features to continue working, so that the migration doesn't disrupt my workflow.

#### Acceptance Criteria

1. THE System SHALL support all existing Tauri commands with the same signatures
2. THE System SHALL emit the same frontend events as before
3. THE System SHALL maintain the same data formats for groups and members
4. THE System SHALL preserve existing automation capabilities
5. THE System SHALL maintain the same user interface and user experience

### Requirement 10: Implement Secure Credential Storage

**User Story:** As a user, I want my WhatsApp credentials stored securely, so that my account is protected.

#### Acceptance Criteria

1. THE System SHALL store auth state in the application data directory
2. THE System SHALL use appropriate file permissions to protect credentials
3. THE System SHALL not log sensitive authentication data
4. THE System SHALL clear credentials on logout
5. THE System SHALL validate auth state integrity before use

### Requirement 11: Support Multi-Device Protocol

**User Story:** As a user, I want to use WhatsApp's multi-device feature, so that I can use WhatsApp on multiple devices simultaneously.

#### Acceptance Criteria

1. THE System SHALL use Baileys' multi-device support by default
2. THE System SHALL not disconnect other devices when connecting
3. THE System SHALL handle multi-device sync events properly
4. THE System SHALL support all multi-device features available in Baileys
5. THE System SHALL display the device name in WhatsApp's linked devices list

### Requirement 12: Provide Migration Path for Existing Users

**User Story:** As an existing user, I want to migrate to the new version smoothly, so that I don't lose my session or data.

#### Acceptance Criteria

1. WHEN THE user updates to the new version, THE System SHALL detect the old session format
2. THE System SHALL notify the user that re-authentication is required
3. THE System SHALL provide clear instructions for re-connecting
4. THE System SHALL preserve user settings and preferences during migration
5. THE System SHALL clean up old session files after successful migration
