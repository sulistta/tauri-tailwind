# Architecture Refactor Design Document

## Overview

This design document outlines the architectural changes needed to simplify the WhatsApp Automation application, eliminate duplicate initialization calls, and improve overall system reliability. The refactor focuses on creating a clear, linear initialization flow with proper state management and event handling.

## Architecture

### Current Issues

1. **Multiple Initialization Paths**: The app has several code paths that can trigger initialization:
    - `useWhatsApp` hook on mount via `checkSession()`
    - `AppShell` component checking session
    - Connection recovery mechanism
    - Manual connect button

2. **Race Conditions**: Frontend and backend don't coordinate initialization state, leading to:
    - Multiple simultaneous session checks
    - Duplicate WhatsApp client spawning attempts
    - Inconsistent state between layers

3. **Event Handling Gaps**: Missing handlers for Node.js events like `client_initializing` and `whatsapp_loading`

4. **Excessive Logging**: Routine operations logged at `info` level instead of `debug`

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useWhatsApp Hook (Simplified)                         │ │
│  │  - Manages UI state only                               │ │
│  │  - Listens to backend events                           │ │
│  │  - Delegates operations to backend                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           │ Tauri Commands & Events          │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                         Backend                              │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │  ConnectionManager (New)                                │ │
│  │  - Single source of truth for connection state          │ │
│  │  - Coordinates all initialization operations            │ │
│  │  - Implements initialization guards                     │ │
│  │  - Manages WhatsApp client lifecycle                    │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │  WhatsAppClient (Refactored)                            │ │
│  │  - Manages Node.js subprocess                           │ │
│  │  - Handles all Node.js events                           │ │
│  │  - Provides idempotent operations                       │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│                           │ stdin/stdout                     │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │  Node.js Process (whatsapp-web.js)                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. ConnectionManager (New Rust Module)

**Purpose**: Centralized connection state management and initialization coordination.

**State**:

```rust
pub struct ConnectionManager {
    client: Arc<Mutex<Option<WhatsAppClient>>>,
    state: Arc<Mutex<ConnectionState>>,
    initialization_lock: Arc<Mutex<()>>,
    app_handle: AppHandle,
    logger: Arc<Logger>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ConnectionState {
    Uninitialized,
    Initializing,
    Connected { phone_number: String },
    Disconnected,
    Error { message: String },
}
```

**Key Methods**:

```rust
impl ConnectionManager {
    // Initialize with session check - idempotent
    pub async fn initialize(&self) -> Result<ConnectionState, String>;

    // Get current state without side effects
    pub fn get_state(&self) -> ConnectionState;

    // Connect/reconnect - handles all cases
    pub async fn connect(&self) -> Result<(), String>;

    // Graceful disconnect
    pub async fn disconnect(&self) -> Result<(), String>;

    // Check if session exists (cached result)
    pub fn has_session(&self) -> bool;
}
```

### 2. Refactored WhatsAppClient

**Changes**:

- Add handlers for all Node.js events
- Make `initialize()` idempotent
- Reduce logging verbosity
- Add process state tracking

**New Event Handlers**:

```rust
match message.event.as_str() {
    "client_initializing" => {
        // Log at debug level, emit to frontend
        logger.debug(LogCategory::WhatsApp, "Client initializing".to_string()).await;
        let _ = app_handle.emit("whatsapp_initializing", message.data);
    }
    "whatsapp_loading" => {
        // Log at debug level, emit to frontend
        logger.debug(LogCategory::WhatsApp, "WhatsApp loading".to_string()).await;
        let _ = app_handle.emit("whatsapp_loading", message.data);
    }
    // ... existing handlers
}
```

**Idempotent Initialize**:

```rust
pub async fn initialize(&self) -> Result<(), String> {
    let mut process_guard = self.process.lock().await;

    // Check if already running
    if let Some(child) = process_guard.as_mut() {
        if let Ok(None) = child.try_wait() {
            // Process is running, return success
            return Ok(());
        }
        // Process died, clean up
        let _ = child.kill().await;
        *process_guard = None;
    }

    // Spawn new process
    // ... existing spawn logic
}
```

### 3. Simplified useWhatsApp Hook

**Changes**:

- Remove session checking logic (backend handles it)
- Simplify initialization flow
- Fix dependency arrays
- Remove duplicate event listeners

**New Implementation**:

```typescript
export function useWhatsApp() {
    const [status, setStatus] = useState<WhatsAppStatus>('initializing')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Initialize once on mount
    useEffect(() => {
        let mounted = true

        const init = async () => {
            try {
                // Backend handles session check and initialization
                await invoke('initialize_connection')
            } catch (err) {
                if (mounted) {
                    const error = parseTauriError(err)
                    setError(error.message)
                    setStatus('disconnected')
                }
            }
        }

        init()

        return () => {
            mounted = false
        }
    }, []) // Empty deps - run once

    // Setup event listeners once
    useEffect(() => {
        const listeners: UnlistenFn[] = []

        const setup = async () => {
            listeners.push(
                await listen('whatsapp_state_changed', (event) => {
                    // Single event for all state changes
                    const state = event.payload as ConnectionStateEvent
                    setStatus(state.status)
                    setPhoneNumber(state.phone_number || null)
                    setQrCode(state.qr_code || null)
                    setError(state.error || null)
                })
            )
        }

        setup()

        return () => {
            listeners.forEach((unlisten) => unlisten())
        }
    }, [])

    const connect = useCallback(async () => {
        setError(null)
        await invoke('connect_whatsapp')
    }, [])

    return { status, qrCode, phoneNumber, error, connect }
}
```

### 4. Simplified Tauri Commands

**New Command Structure**:

```rust
// Single initialization command
#[tauri::command]
pub async fn initialize_connection(
    state: State<'_, AppState>,
) -> Result<ConnectionState, String> {
    state.connection_manager.initialize().await
}

// Explicit connect command
#[tauri::command]
pub async fn connect_whatsapp(
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.connection_manager.connect().await
}

// Get current state (no side effects)
#[tauri::command]
pub fn get_connection_state(
    state: State<'_, AppState>,
) -> ConnectionState {
    state.connection_manager.get_state()
}
```

**Remove Commands**:

- `check_session` (merged into `initialize_connection`)
- `initialize_whatsapp` (replaced by `initialize_connection` and `connect_whatsapp`)

## Data Models

### ConnectionState Event

```typescript
interface ConnectionStateEvent {
    status:
        | 'initializing'
        | 'connecting'
        | 'connected'
        | 'disconnected'
        | 'error'
    phone_number?: string
    qr_code?: string
    error?: string
    timestamp: number
}
```

### Initialization Result

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct InitializationResult {
    pub state: ConnectionState,
    pub has_session: bool,
    pub requires_qr: bool,
}
```

## Error Handling

### Initialization Errors

1. **Already Initializing**: Return current state without error
2. **Process Spawn Failure**: Log error, emit event, return error to frontend
3. **Session Check Failure**: Treat as no session, continue with QR flow
4. **Timeout**: Clean up resources, return timeout error

### Connection Errors

1. **Client Not Initialized**: Initialize first, then connect
2. **Node.js Process Died**: Restart process, attempt reconnection
3. **WhatsApp Disconnected**: Emit event, update state, allow manual reconnection

### Error Recovery Strategy

```rust
impl ConnectionManager {
    async fn handle_error(&self, error: ConnectionError) -> Result<(), String> {
        match error {
            ConnectionError::ProcessDied => {
                self.logger.warning(LogCategory::WhatsApp, "Process died, restarting".to_string()).await;
                self.restart().await
            }
            ConnectionError::Timeout => {
                self.logger.error(LogCategory::WhatsApp, "Connection timeout".to_string()).await;
                self.set_state(ConnectionState::Error {
                    message: "Connection timeout".to_string()
                }).await;
                Err("Connection timeout".to_string())
            }
            // ... other error types
        }
    }
}
```

## Testing Strategy

### Unit Tests

1. **ConnectionManager Tests**:
    - Test idempotent initialization
    - Test state transitions
    - Test concurrent initialization attempts
    - Test error handling and recovery

2. **WhatsAppClient Tests**:
    - Test process lifecycle management
    - Test event handling for all event types
    - Test idempotent operations

3. **Frontend Hook Tests**:
    - Test single initialization on mount
    - Test event listener cleanup
    - Test state updates from backend events

### Integration Tests

1. **Initialization Flow**:
    - Test cold start (no session)
    - Test warm start (existing session)
    - Test initialization with concurrent requests

2. **Connection Recovery**:
    - Test automatic reconnection
    - Test manual reconnection
    - Test recovery after process crash

3. **State Synchronization**:
    - Test frontend-backend state consistency
    - Test event propagation
    - Test state updates during transitions

### Manual Testing Scenarios

1. **Normal Startup**: Verify single session check and initialization
2. **Rapid Reconnection**: Click connect multiple times quickly
3. **Process Kill**: Kill Node.js process, verify recovery
4. **Session Expiration**: Let session expire, verify clean reconnection

## Migration Strategy

### Phase 1: Backend Refactor

1. Create `ConnectionManager` module
2. Refactor `WhatsAppClient` for idempotency
3. Add missing event handlers
4. Update Tauri commands
5. Add initialization guards

### Phase 2: Frontend Simplification

1. Simplify `useWhatsApp` hook
2. Remove duplicate session checking
3. Update event listeners
4. Fix dependency arrays

### Phase 3: Testing & Validation

1. Run unit tests
2. Perform integration testing
3. Manual testing of all scenarios
4. Monitor logs for duplicates

### Phase 4: Cleanup

1. Remove deprecated commands
2. Remove unused code
3. Update documentation
4. Adjust log levels

## Performance Considerations

1. **Initialization Time**: Should remain the same or improve slightly
2. **Memory Usage**: Slight reduction from eliminating duplicate processes
3. **Event Overhead**: Reduced by consolidating state change events
4. **Lock Contention**: Minimal due to short critical sections

## Security Considerations

1. **Session Storage**: No changes to existing session security
2. **Process Isolation**: Maintain existing Node.js subprocess isolation
3. **Event Validation**: Validate all events from Node.js process
4. **State Access**: Ensure thread-safe state access with proper locking

## Logging Strategy

### Log Levels

- **Debug**: Routine operations (session checks, state transitions)
- **Info**: Important milestones (connected, disconnected)
- **Warning**: Recoverable issues (unknown events, retries)
- **Error**: Failures requiring user attention

### Example Log Output (After Refactor)

```
[DEBUG] Initializing connection manager
[DEBUG] Checking for existing session
[DEBUG] Session found, restoring connection
[DEBUG] WhatsApp client initializing
[DEBUG] Client loading
[INFO] WhatsApp connected - +1234567890
```

## Rollback Plan

If issues arise:

1. Revert to previous commit
2. Keep new event handlers (safe addition)
3. Gradually introduce changes in smaller increments
4. Add feature flag for new initialization flow
