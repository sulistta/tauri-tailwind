# Error Handling System Documentation

This document describes the comprehensive error handling and recovery system implemented in the WhatsApp Automation application.

## Overview

The error handling system provides:

- **Error Boundaries**: Catch React component errors at app and route levels
- **Toast Notifications**: User-friendly error and success messages using Sonner
- **Retry Logic**: Automatic retry with exponential backoff for failed operations
- **Connection Recovery**: Automatic reconnection for WhatsApp disconnections
- **Error Display Components**: Reusable UI components for showing errors
- **Error Logging**: Centralized error logging for debugging

## Components

### 1. Error Boundaries

#### App-Level Error Boundary

Located in `src/app/provider.tsx`, catches all unhandled errors in the application.

```tsx
<ErrorBoundary FallbackComponent={AppErrorPage}>{children}</ErrorBoundary>
```

#### Route-Level Error Boundary

Located in `src/components/shared/RouteErrorBoundary.tsx`, provides granular error catching per route.

```tsx
<RouteErrorBoundary>
    <YourPageComponent />
</RouteErrorBoundary>
```

### 2. Toast Notifications

Using Sonner for non-intrusive notifications. Available functions:

```typescript
import {
    showErrorToast,
    showSuccessToast,
    showInfoToast,
    showWarningToast
} from '@/lib/error-handler'

// Show error
showErrorToast('Something went wrong', 'Error Title')

// Show success
showSuccessToast('Operation completed', 'Success')

// Show info
showInfoToast('Information message', 'Info')

// Show warning
showWarningToast('Warning message', 'Warning')
```

### 3. Error Display Components

#### ErrorDisplay

Full-featured error display with retry and dismiss options.

```tsx
import { ErrorDisplay } from '@/components/shared/ErrorDisplay'

;<ErrorDisplay
    error={error}
    title="Operation Failed"
    onRetry={handleRetry}
    onDismiss={() => setError(null)}
    variant="card" // 'inline' | 'card' | 'banner'
/>
```

#### ErrorMessage

Compact inline error message.

```tsx
import { ErrorMessage } from '@/components/shared/ErrorDisplay'

;<ErrorMessage error={error} />
```

### 4. Retry Logic

#### invokeWithRetry

Wrapper for Tauri commands with automatic retry and exponential backoff.

```typescript
import { invokeWithRetry } from '@/lib/error-handler'

const result = await invokeWithRetry<ResultType>(
    'command_name',
    { arg1: 'value' },
    {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt}:`, error)
        }
    }
)
```

#### retryWithBackoff

Generic retry function for any async operation.

```typescript
import { retryWithBackoff } from '@/lib/error-handler'

const result = await retryWithBackoff(
    async () => {
        // Your async operation
        return await someAsyncFunction()
    },
    {
        maxAttempts: 3,
        initialDelay: 1000
    }
)
```

### 5. Connection Recovery

Automatic WhatsApp connection recovery with exponential backoff.

```typescript
import { useConnectionRecovery } from '@/hooks/useConnectionRecovery'

const { isRecovering, attemptCount, resetRecovery } = useConnectionRecovery(
    isConnected,
    {
        enabled: true,
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 2
    }
)
```

Features:

- Automatically attempts reconnection when disconnected
- Exponential backoff between attempts
- User notifications for each attempt
- Manual reset capability

### 6. Error Parsing and Logging

#### parseTauriError

Converts Tauri errors into structured WhatsAppError objects.

```typescript
import { parseTauriError } from '@/lib/error-handler'

try {
    await invoke('some_command')
} catch (err) {
    const error = parseTauriError(err)
    console.error(error.message, error.code)
}
```

#### logError

Centralized error logging with context.

```typescript
import { logError } from '@/lib/error-handler'

try {
    // Some operation
} catch (error) {
    logError(error, 'Context description')
}
```

## Usage Examples

### Example 1: Hook with Error Handling

```typescript
import { useState, useCallback } from 'react'
import {
    invokeWithRetry,
    parseTauriError,
    showErrorToast,
    showSuccessToast
} from '@/lib/error-handler'

export function useMyFeature() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const result = await invokeWithRetry('get_data', undefined, {
                maxAttempts: 2,
                initialDelay: 1000
            })
            setData(result)
            showSuccessToast('Data loaded successfully')
        } catch (err) {
            const error = parseTauriError(err)
            setError(error.message)
            showErrorToast(error, 'Failed to Load Data')
        } finally {
            setLoading(false)
        }
    }, [])

    return { data, loading, error, fetchData }
}
```

### Example 2: Page Component with Error Display

```tsx
import { useState } from 'react'
import { ErrorDisplay } from '@/components/shared/ErrorDisplay'
import { useMyFeature } from '@/hooks/useMyFeature'

export default function MyPage() {
    const { data, loading, error, fetchData } = useMyFeature()

    return (
        <div>
            <h1>My Page</h1>

            {error && (
                <ErrorDisplay
                    error={error}
                    title="Failed to Load"
                    onRetry={fetchData}
                    variant="card"
                />
            )}

            {loading && <p>Loading...</p>}
            {data && <div>{/* Display data */}</div>}
        </div>
    )
}
```

### Example 3: Error Boundary Usage

```tsx
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary'

export function MyRoute() {
    return (
        <RouteErrorBoundary>
            <MyPageComponent />
        </RouteErrorBoundary>
    )
}
```

## Error Logging in Logs Page

The Logs page (`src/pages/Logs.tsx`) displays all errors with:

- Expandable error details for error-level logs
- Color-coded log levels (info, warning, error)
- Timestamp and category information
- Full error messages and stack traces

Click on any error log entry to expand and view detailed information.

## Best Practices

1. **Always use parseTauriError** when catching Tauri command errors
2. **Show user-friendly messages** using toast notifications
3. **Provide retry options** for transient failures
4. **Log errors with context** for debugging
5. **Use ErrorDisplay components** for consistent error UI
6. **Implement error boundaries** at appropriate levels
7. **Test error scenarios** to ensure proper handling

## Configuration

### Toast Position

Configure in `src/app/provider.tsx`:

```tsx
<Toaster position="top-right" richColors closeButton />
```

### Retry Defaults

Modify in `src/lib/error-handler.ts`:

```typescript
const defaultRetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
}
```

### Connection Recovery

Configure in hook usage:

```typescript
useConnectionRecovery(isConnected, {
    enabled: true,
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 30000
})
```

## Testing Error Handling

To test error handling:

1. **Simulate network errors**: Disconnect from network
2. **Test retry logic**: Add artificial delays or failures
3. **Test error boundaries**: Throw errors in components
4. **Test connection recovery**: Disconnect WhatsApp
5. **Verify toast notifications**: Check all error paths
6. **Check error logging**: Verify errors appear in Logs page

## Troubleshooting

### Toasts not appearing

- Check that Toaster is mounted in provider
- Verify sonner is installed
- Check browser console for errors

### Retry not working

- Verify invokeWithRetry is used correctly
- Check retry options configuration
- Look for errors in console

### Connection recovery not triggering

- Ensure useConnectionRecovery is called with correct status
- Check that enabled option is true
- Verify maxAttempts is not exceeded

### Error boundaries not catching errors

- Ensure error boundaries wrap the failing component
- Check that errors are thrown, not caught silently
- Verify ErrorBoundary is properly configured
