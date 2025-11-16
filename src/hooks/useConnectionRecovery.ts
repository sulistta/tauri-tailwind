import { useEffect, useRef, useCallback, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { showWarningToast, showSuccessToast } from '@/lib/error-handler'

interface ConnectionRecoveryOptions {
    maxAttempts?: number
    enabled?: boolean
}

interface RecoveryEvent {
    attempt?: number
    attempts?: number
    max_attempts: number
    error?: string
    timestamp: number
}

/**
 * Hook to automatically recover WhatsApp connection with exponential backoff
 * Coordinates with ConnectionManager backend for recovery state and backoff logic
 */
export function useConnectionRecovery(
    isConnected: boolean,
    options: ConnectionRecoveryOptions = {}
) {
    const { maxAttempts = 3, enabled = true } = options

    const [attemptCount, setAttemptCount] = useState(0)
    const [isRecovering, setIsRecovering] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const recoveryIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

    // Attempt recovery using backend logic
    const attemptReconnection = useCallback(async () => {
        if (!enabled) {
            return
        }

        try {
            // Check if initialization is in progress
            const initializing = await invoke<boolean>('is_initializing')
            if (initializing) {
                console.log(
                    'Initialization in progress, skipping recovery attempt'
                )
                return
            }

            // Attempt recovery through backend (handles backoff logic)
            const shouldContinue = await invoke<boolean>(
                'attempt_connection_recovery',
                { maxAttempts }
            )

            if (!shouldContinue) {
                // Max attempts reached or already recovering
                console.log(
                    'Recovery not attempted - max attempts or already recovering'
                )
            }
        } catch (error) {
            console.error('Recovery attempt failed:', error)
        }
    }, [enabled, maxAttempts])

    // Setup event listeners for recovery events
    useEffect(() => {
        const listeners: UnlistenFn[] = []

        const setupListeners = async () => {
            // Recovery started event
            listeners.push(
                await listen<RecoveryEvent>(
                    'whatsapp_recovery_started',
                    (event) => {
                        const { attempt, max_attempts } = event.payload
                        console.log(
                            `Recovery attempt ${attempt}/${max_attempts} started`
                        )
                        setIsRecovering(true)
                        setAttemptCount(attempt || 0)
                        showWarningToast(
                            `Attempting to reconnect (${attempt}/${max_attempts})...`,
                            'Connection Lost'
                        )
                    }
                )
            )

            // Recovery attempt failed event
            listeners.push(
                await listen<RecoveryEvent>(
                    'whatsapp_recovery_attempt_failed',
                    (event) => {
                        const { attempt, max_attempts, error } = event.payload
                        console.log(
                            `Recovery attempt ${attempt}/${max_attempts} failed:`,
                            error
                        )
                        setIsRecovering(false)
                        setAttemptCount(attempt || 0)

                        if (attempt && attempt < max_attempts) {
                            showWarningToast(
                                `Reconnection failed. Will retry automatically...`,
                                'Reconnection Failed'
                            )
                        }
                    }
                )
            )

            // Recovery success event
            listeners.push(
                await listen<RecoveryEvent>(
                    'whatsapp_recovery_success',
                    (event) => {
                        const { attempts } = event.payload
                        console.log(
                            `Recovery successful after ${attempts} attempts`
                        )
                        setIsRecovering(false)
                        setAttemptCount(0)
                        showSuccessToast(
                            'Successfully reconnected to WhatsApp',
                            'Connection Restored'
                        )
                    }
                )
            )

            // Recovery failed (max attempts) event
            listeners.push(
                await listen<RecoveryEvent>(
                    'whatsapp_recovery_failed',
                    (event) => {
                        const { attempts, max_attempts } = event.payload
                        console.log(
                            `Recovery failed after ${attempts}/${max_attempts} attempts`
                        )
                        setIsRecovering(false)
                        setAttemptCount(attempts || 0)
                        showWarningToast(
                            'Please reconnect manually from the Connect page',
                            'Max Reconnection Attempts Reached'
                        )
                    }
                )
            )
        }

        setupListeners()

        return () => {
            listeners.forEach((unlisten) => unlisten())
        }
    }, [])

    // Monitor connection state and trigger recovery
    useEffect(() => {
        // Clear any existing timers
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        if (recoveryIntervalRef.current) {
            clearInterval(recoveryIntervalRef.current)
        }

        // Reset state when connected
        if (isConnected) {
            setAttemptCount(0)
            setIsRecovering(false)
            return
        }

        // Start recovery when disconnected
        if (enabled && !isConnected) {
            // Wait a bit before starting recovery to avoid false positives
            timeoutRef.current = setTimeout(() => {
                // Initial recovery attempt
                attemptReconnection()

                // Set up interval to check if recovery should continue
                // Backend handles backoff, we just periodically check
                recoveryIntervalRef.current = setInterval(() => {
                    attemptReconnection()
                }, 5000) // Check every 5 seconds
            }, 2000)
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            if (recoveryIntervalRef.current) {
                clearInterval(recoveryIntervalRef.current)
            }
        }
    }, [isConnected, enabled, attemptReconnection])

    const resetRecovery = useCallback(() => {
        setAttemptCount(0)
        setIsRecovering(false)
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        if (recoveryIntervalRef.current) {
            clearInterval(recoveryIntervalRef.current)
        }
    }, [])

    return {
        isRecovering,
        attemptCount,
        resetRecovery
    }
}
