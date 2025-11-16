import { useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { showWarningToast, showSuccessToast } from '@/lib/error-handler'

interface ConnectionRecoveryOptions {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
    enabled?: boolean
}

/**
 * Hook to automatically recover WhatsApp connection with exponential backoff
 */
export function useConnectionRecovery(
    isConnected: boolean,
    options: ConnectionRecoveryOptions = {}
) {
    const {
        maxAttempts = 3,
        initialDelay = 2000,
        maxDelay = 30000,
        backoffMultiplier = 2,
        enabled = true
    } = options

    const attemptCount = useRef(0)
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const isRecovering = useRef(false)

    const calculateDelay = useCallback(
        (attempt: number) => {
            const delay = initialDelay * Math.pow(backoffMultiplier, attempt)
            return Math.min(delay, maxDelay)
        },
        [initialDelay, maxDelay, backoffMultiplier]
    )

    const attemptReconnection = useCallback(async () => {
        if (
            !enabled ||
            isRecovering.current ||
            attemptCount.current >= maxAttempts
        ) {
            return
        }

        isRecovering.current = true
        attemptCount.current += 1

        try {
            showWarningToast(
                `Attempting to reconnect (${attemptCount.current}/${maxAttempts})...`,
                'Connection Lost'
            )

            await invoke('initialize_whatsapp')

            // Reset on successful connection
            attemptCount.current = 0
            isRecovering.current = false

            showSuccessToast(
                'Successfully reconnected to WhatsApp',
                'Connection Restored'
            )
        } catch (error) {
            console.error('Reconnection attempt failed:', error)
            isRecovering.current = false

            if (attemptCount.current < maxAttempts) {
                const delay = calculateDelay(attemptCount.current)
                showWarningToast(
                    `Retrying in ${Math.round(delay / 1000)} seconds...`,
                    'Reconnection Failed'
                )

                timeoutRef.current = setTimeout(() => {
                    attemptReconnection()
                }, delay)
            } else {
                showWarningToast(
                    'Please reconnect manually from the Connect page',
                    'Max Reconnection Attempts Reached'
                )
            }
        }
    }, [enabled, maxAttempts, calculateDelay])

    useEffect(() => {
        // Reset attempt count when connection is restored
        if (isConnected) {
            attemptCount.current = 0
            isRecovering.current = false
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
        // Start recovery when disconnected
        else if (
            enabled &&
            !isRecovering.current &&
            attemptCount.current === 0
        ) {
            // Wait a bit before starting recovery to avoid false positives
            timeoutRef.current = setTimeout(() => {
                attemptReconnection()
            }, 2000)
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [isConnected, enabled, attemptReconnection])

    const resetRecovery = useCallback(() => {
        attemptCount.current = 0
        isRecovering.current = false
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
    }, [])

    return {
        isRecovering: isRecovering.current,
        attemptCount: attemptCount.current,
        resetRecovery
    }
}
