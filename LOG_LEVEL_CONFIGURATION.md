# Log Level Configuration

## Overview

The logging system now supports configurable log levels to control verbosity. This allows you to see more or less detail in the logs depending on your needs.

## Log Levels

From most to least verbose:

- **Debug**: Detailed diagnostic information for troubleshooting (routine operations, state transitions)
- **Info**: General informational messages about application state (connections, important milestones)
- **Warning**: Potentially problematic situations that don't prevent operation
- **Error**: Error events that require attention

## Default Behavior

- Default log level: **Info**
- Debug logs are always printed to console in debug builds
- Only logs at or above the configured level are stored and emitted to the frontend

## Usage

### Backend (Rust)

```rust
// Set log level
logger.set_log_level(LogLevel::Debug).await;

// Get current log level
let level = logger.get_log_level().await;

// Log at different levels
logger.debug(LogCategory::WhatsApp, "Detailed debug info".to_string()).await;
logger.info(LogCategory::WhatsApp, "Important milestone".to_string()).await;
logger.warning(LogCategory::WhatsApp, "Potential issue".to_string()).await;
logger.error(LogCategory::WhatsApp, "Error occurred".to_string()).await;
```

### Frontend (TypeScript)

```typescript
import { useLogs } from '@/hooks/useLogs'

function LogSettings() {
    const { logLevel, setLogLevel } = useLogs()

    const handleLevelChange = async (level: LogLevel) => {
        try {
            await setLogLevel(level)
            console.log(`Log level changed to: ${level}`)
        } catch (error) {
            console.error('Failed to set log level:', error)
        }
    }

    return (
        <select value={logLevel} onChange={(e) => handleLevelChange(e.target.value as LogLevel)}>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
        </select>
    )
}
```

### Tauri Commands

```typescript
// Set log level
await invoke('set_log_level', { level: 'debug' })

// Get current log level
const level = await invoke<string>('get_log_level')
```

## Implementation Details

### What Changed

1. **Added Debug log level** to the `LogLevel` enum
2. **Updated Logger struct** to track minimum log level
3. **Modified log() method** to filter logs based on configured level
4. **Updated debug() method** to use the standard logging pipeline
5. **Added configuration methods**: `set_log_level()` and `get_log_level()`
6. **Added Tauri commands**: `set_log_level` and `get_log_level`
7. **Updated frontend types** to include 'debug' in LogLevel type
8. **Enhanced useLogs hook** with log level management

### Logging Best Practices

- **Debug**: Session checks, state transitions, routine operations
- **Info**: Connected/disconnected events, successful operations
- **Warning**: Recoverable errors, retries, unknown events
- **Error**: Failures requiring user attention

### Example Log Output

With log level set to **Info** (default):

```
[INFO] WhatsApp connected - +1234567890
[INFO] Groups fetch command sent successfully
[WARNING] Recovery attempt 1 failed: Connection timeout
[ERROR] Failed to initialize WhatsApp client: Process spawn failed
```

With log level set to **Debug**:

```
[DEBUG] Checking for existing session
[DEBUG] Existing session found
[DEBUG] WhatsApp client initializing
[DEBUG] Client loading
[INFO] WhatsApp connected - +1234567890
[DEBUG] Groups fetched successfully
```

## Benefits

1. **Reduced noise**: Default Info level keeps logs clean for users
2. **Troubleshooting**: Debug level provides detailed information when needed
3. **Performance**: Lower log levels reduce storage and event emission overhead
4. **Flexibility**: Users can adjust verbosity based on their needs
