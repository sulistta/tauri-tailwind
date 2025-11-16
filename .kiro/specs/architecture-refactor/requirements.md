# Requirements Document

## Introduction

This document outlines the requirements for refactoring the WhatsApp Automation application architecture to eliminate duplicate initialization calls, simplify the connection flow, and improve overall system reliability. The current implementation shows multiple redundant session checks and initialization attempts during app startup, indicating architectural issues that need to be addressed.

## Glossary

- **WhatsApp Client**: The Rust-based client that manages the Node.js subprocess running whatsapp-web.js
- **Session Check**: The process of verifying if a valid WhatsApp session exists on disk
- **Initialization Flow**: The sequence of operations that occur when the application starts
- **Connection Recovery**: The mechanism that attempts to restore WhatsApp connection after disconnection
- **Frontend Hook**: React custom hook that manages WhatsApp state and operations
- **Backend Command**: Tauri command exposed from Rust to the frontend

## Requirements

### Requirement 1: Eliminate Duplicate Session Checks

**User Story:** As a developer, I want the application to check for existing sessions only once during startup, so that the system is more efficient and logs are cleaner.

#### Acceptance Criteria

1. WHEN THE application starts, THE System SHALL perform exactly one session check operation
2. WHEN THE session check completes, THE System SHALL store the result in application state
3. IF THE session check is already in progress, THEN THE System SHALL return the pending result instead of initiating a new check
4. THE System SHALL log session check operations at the appropriate level without duplication
5. WHEN THE session exists, THE System SHALL proceed to initialization without additional session checks

### Requirement 2: Simplify WhatsApp Client Initialization

**User Story:** As a developer, I want a clear and linear initialization flow, so that the connection process is predictable and maintainable.

#### Acceptance Criteria

1. THE System SHALL define a single entry point for WhatsApp client initialization
2. WHEN THE initialization is requested, THE System SHALL check if the client is already initialized before proceeding
3. IF THE client is already running, THEN THE System SHALL return success without spawning additional processes
4. THE System SHALL emit initialization events only once per successful initialization
5. WHEN THE initialization fails, THE System SHALL provide clear error messages without retry loops

### Requirement 3: Consolidate Connection State Management

**User Story:** As a developer, I want centralized connection state management, so that all components have a consistent view of the WhatsApp connection status.

#### Acceptance Criteria

1. THE System SHALL maintain connection state in a single source of truth
2. WHEN THE connection state changes, THE System SHALL notify all subscribers through a single event
3. THE System SHALL prevent race conditions between multiple state update requests
4. WHEN THE frontend requests connection status, THE System SHALL return the current state without triggering new checks
5. THE System SHALL synchronize state between Rust backend and React frontend through well-defined events

### Requirement 4: Optimize Frontend Hook Architecture

**User Story:** As a developer, I want React hooks to manage side effects properly, so that initialization logic doesn't execute multiple times.

#### Acceptance Criteria

1. THE useWhatsApp hook SHALL use proper dependency arrays to prevent unnecessary re-renders
2. WHEN THE hook mounts, THE System SHALL execute initialization logic exactly once
3. THE System SHALL cleanup event listeners when components unmount
4. WHEN THE checkSession function is called, THE System SHALL use memoization to prevent recreation on every render
5. THE System SHALL separate session checking logic from connection initialization logic

### Requirement 5: Implement Proper Event Handling

**User Story:** As a developer, I want the system to handle all Node.js events properly, so that unknown events don't generate warnings.

#### Acceptance Criteria

1. THE System SHALL define handlers for all expected Node.js events including client_initializing and whatsapp_loading
2. WHEN THE Node.js process emits an event, THE System SHALL route it to the appropriate handler
3. IF THE event type is unknown, THEN THE System SHALL log it at debug level instead of warning level
4. THE System SHALL document all expected event types in the codebase
5. THE System SHALL emit frontend events only for user-relevant state changes

### Requirement 6: Reduce Logging Verbosity

**User Story:** As a user, I want to see only relevant logs during normal operation, so that I can focus on important information.

#### Acceptance Criteria

1. THE System SHALL log routine operations at debug level instead of info level
2. WHEN THE application starts successfully, THE System SHALL emit a single "ready" log entry
3. THE System SHALL log errors and warnings with sufficient context for debugging
4. WHEN THE session check succeeds, THE System SHALL log the result once without repetition
5. THE System SHALL provide a configuration option to adjust log verbosity levels

### Requirement 7: Implement Idempotent Operations

**User Story:** As a developer, I want initialization operations to be idempotent, so that calling them multiple times doesn't cause issues.

#### Acceptance Criteria

1. THE initialize_whatsapp command SHALL check current state before performing initialization
2. WHEN THE client is already initialized, THE System SHALL return success immediately
3. THE System SHALL use atomic operations to prevent concurrent initialization attempts
4. WHEN THE restart operation is requested, THE System SHALL cleanly terminate existing processes before starting new ones
5. THE System SHALL maintain consistent state even if operations are called out of order

### Requirement 8: Streamline Connection Recovery Logic

**User Story:** As a user, I want automatic connection recovery to work reliably without causing duplicate initialization attempts.

#### Acceptance Criteria

1. THE connection recovery mechanism SHALL coordinate with the main initialization flow
2. WHEN THE recovery is triggered, THE System SHALL check if initialization is already in progress
3. THE System SHALL implement exponential backoff for recovery attempts
4. WHEN THE maximum retry attempts are reached, THE System SHALL notify the user and stop retrying
5. THE System SHALL reset recovery state when the user manually initiates connection

### Requirement 9: Separate Concerns Between Layers

**User Story:** As a developer, I want clear separation between frontend state management and backend operations, so that the architecture is easier to understand and maintain.

#### Acceptance Criteria

1. THE frontend SHALL be responsible only for UI state and user interactions
2. THE backend SHALL manage WhatsApp client lifecycle and business logic
3. THE System SHALL communicate between layers using well-defined events and commands
4. WHEN THE frontend needs data, THE System SHALL request it through Tauri commands without managing backend state
5. THE System SHALL avoid duplicating state management logic across frontend and backend

### Requirement 10: Add Initialization Guards

**User Story:** As a developer, I want guards to prevent multiple simultaneous initialization attempts, so that the system remains stable.

#### Acceptance Criteria

1. THE System SHALL use a mutex or similar mechanism to serialize initialization requests
2. WHEN THE initialization is in progress, THE System SHALL queue or reject additional requests
3. THE System SHALL release locks when initialization completes or fails
4. WHEN THE initialization times out, THE System SHALL clean up resources and release locks
5. THE System SHALL provide clear feedback when initialization is blocked by an in-progress operation
