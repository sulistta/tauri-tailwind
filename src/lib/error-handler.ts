import { toast } from 'sonner'

/**
 * Custom error class for WhatsApp operations
 */
export class WhatsAppError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: unknown
    ) {
        super(message)
        this.name = 'WhatsAppError'
    }
}

/**
 * Parse Tauri error into a user-friendly message
 */
export function parseTauriError(error: unknown): WhatsAppError {
    if (typeof error === 'string') {
        return new WhatsAppError(error, 'TAURI_ERROR')
    }

    if (error instanceof Error) {
        return new WhatsAppError(error.message, 'UNKNOWN_ERROR', error)
    }

    return new WhatsAppError(
        'An unknown error occurred',
        'UNKNOWN_ERROR',
        error
    )
}

/**
 * Display error toast notification
 */
export function showErrorToast(
    error: WhatsAppError | Error | string,
    title?: string
) {
    const message = error instanceof Error ? error.message : error
    toast.error(title || 'Error', {
        description: message,
        duration: 5000
    })
}

/**
 * Display success toast notification
 */
export function showSuccessToast(message: string, title?: string) {
    toast.success(title || 'Success', {
        description: message,
        duration: 3000
    })
}

/**
 * Display info toast notification
 */
export function showInfoToast(message: string, title?: string) {
    toast.info(title || 'Info', {
        description: message,
        duration: 3000
    })
}

/**
 * Display warning toast notification
 */
export function showWarningToast(message: string, title?: string) {
    toast.warning(title || 'Warning', {
        description: message,
        duration: 4000
    })
}

/**
 * Retry options for async operations
 */
export interface RetryOptions {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
    onRetry?: (attempt: number, error: Error) => void
}

/**
 * Exponential backoff delay calculation
 */
function calculateBackoffDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    multiplier: number
): number {
    const delay = initialDelay * Math.pow(multiplier, attempt - 1)
    return Math.min(delay, maxDelay)
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        onRetry
    } = options

    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error))

            if (attempt === maxAttempts) {
                break
            }

            const delay = calculateBackoffDelay(
                attempt,
                initialDelay,
                maxDelay,
                backoffMultiplier
            )

            if (onRetry) {
                onRetry(attempt, lastError)
            }

            await new Promise((resolve) => setTimeout(resolve, delay))
        }
    }

    throw lastError!
}

/**
 * Wrap a Tauri invoke call with retry logic
 */
export async function invokeWithRetry<T>(
    command: string,
    args?: Record<string, unknown>,
    options?: RetryOptions
): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core')

    return retryWithBackoff(() => invoke<T>(command, args), {
        ...options,
        onRetry: (attempt, error) => {
            console.warn(
                `Retry attempt ${attempt} for command "${command}":`,
                error.message
            )
            if (options?.onRetry) {
                options.onRetry(attempt, error)
            }
        }
    })
}

/**
 * Log error to console and optionally to backend
 */
export function logError(error: Error | WhatsAppError, context?: string) {
    const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
    }

    console.error('Error logged:', errorInfo)

    // Could emit to backend logging system here
    // emit('log_error', errorInfo)
}
