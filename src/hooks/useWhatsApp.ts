import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { useConnectionRecovery } from './useConnectionRecovery'
import {
    parseTauriError,
    showErrorToast,
    logError,
    WhatsAppError
} from '@/lib/error-handler'
import type { WhatsAppStatus, ConnectionStateEvent } from '@/types/whatsapp'

export type { WhatsAppStatus }

export function useWhatsApp() {
    const [status, setStatus] = useState<WhatsAppStatus>('initializing')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Enable automatic connection recovery
    const { isRecovering, resetRecovery } = useConnectionRecovery(
        status === 'connected',
        {
            enabled: true,
            maxAttempts: 3
        }
    )

    // Initialize connection once on mount
    useEffect(() => {
        let mounted = true

        const init = async () => {
            try {
                // Backend handles session check and initialization
                await invoke('initialize_connection')
            } catch (err) {
                if (mounted) {
                    const error = parseTauriError(err)
                    console.error('Failed to initialize connection:', error)
                    setError(error.message)
                    setStatus('disconnected')
                    logError(error, 'Connection initialization')
                }
            }
        }

        init()

        return () => {
            mounted = false
        }
    }, []) // Empty deps - run once on mount

    // Setup consolidated event listener
    useEffect(() => {
        let unlisten: UnlistenFn | null = null

        const setupListener = async () => {
            try {
                // Single event listener for all state changes
                unlisten = await listen<ConnectionStateEvent>(
                    'whatsapp_state_changed',
                    (event) => {
                        const state = event.payload
                        console.log('WhatsApp state changed:', state.status)

                        setStatus(state.status)
                        setPhoneNumber(state.phone_number || null)
                        setQrCode(state.qr_code || null)

                        // Handle error with detailed information
                        if (state.status === 'error' && state.error) {
                            const whatsappError = new WhatsAppError(
                                state.error,
                                'CONNECTION_ERROR',
                                undefined,
                                state.error_details
                            )
                            setError(whatsappError.getUserMessage())

                            // Only show toast for non-recoverable errors
                            if (!whatsappError.isRecoverable()) {
                                showErrorToast(whatsappError, 'WhatsApp Error')
                            } else {
                                console.log(
                                    'Recoverable error, auto-recovery in progress:',
                                    whatsappError.getCategory()
                                )
                            }
                        } else {
                            setError(null)
                        }
                    }
                )
            } catch (err) {
                const error = parseTauriError(err)
                console.error('Failed to setup WhatsApp event listener:', error)
                setError(error.message)
                logError(error, 'WhatsApp event listener setup')
                showErrorToast(error, 'Connection Error')
            }
        }

        setupListener()

        // Cleanup function
        return () => {
            if (unlisten) unlisten()
        }
    }, []) // Empty deps - setup once on mount

    const connect = useCallback(async () => {
        try {
            setError(null)
            resetRecovery()
            await invoke('connect_whatsapp')
        } catch (err) {
            const error = parseTauriError(err)
            console.error('Failed to connect WhatsApp:', error)
            setError(error.message)
            setStatus('disconnected')
            logError(error, 'WhatsApp connection')
            showErrorToast(error, 'Connection Failed')
        }
    }, [resetRecovery])

    return {
        status,
        qrCode,
        phoneNumber,
        error,
        connect,
        isRecovering
    }
}
