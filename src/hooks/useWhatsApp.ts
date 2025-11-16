import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { useConnectionRecovery } from './useConnectionRecovery'
import { parseTauriError, showErrorToast, logError } from '@/lib/error-handler'

export type WhatsAppStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'initializing'

interface QRPayload {
    qr_base64: string
}

interface ReadyPayload {
    phone_number: string
}

export function useWhatsApp() {
    const [status, setStatus] = useState<WhatsAppStatus>('disconnected')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isInitialized, setIsInitialized] = useState<boolean>(false)

    // Enable automatic connection recovery
    const { isRecovering, resetRecovery } = useConnectionRecovery(
        status === 'connected',
        {
            enabled: true,
            maxAttempts: 3
        }
    )

    const checkSession = useCallback(async (): Promise<boolean> => {
        try {
            console.log('Checking for existing WhatsApp session...')
            const result = await invoke<{
                exists: boolean
                phone_number?: string | null
            }>('check_session')

            if (result.exists) {
                console.log('Existing session found')
                // Session exists, but we need to initialize to get the phone number
                // The phone number will be populated when the 'whatsapp_ready' event fires
                setStatus('connecting')
                setError(null)
                setIsInitialized(true)

                // Initialize the WhatsApp client to restore the session
                try {
                    await invoke('initialize_whatsapp')
                    return true
                } catch (initErr) {
                    const error = parseTauriError(initErr)
                    console.error(
                        'Failed to initialize WhatsApp with existing session:',
                        error
                    )
                    setStatus('disconnected')
                    setError(error.message)
                    logError(error, 'WhatsApp session restoration')
                    return false
                }
            } else {
                console.log('No existing session found')
                setStatus('disconnected')
                setIsInitialized(true)
                return false
            }
        } catch (err) {
            const error = parseTauriError(err)
            console.error('Session check failed:', error)
            // Treat session check failure as no session exists
            setStatus('disconnected')
            setIsInitialized(true)
            return false
        }
    }, [])

    // Check for existing session on mount
    useEffect(() => {
        const initializeSession = async () => {
            setStatus('initializing')
            await checkSession()
        }

        initializeSession()
    }, [checkSession])

    useEffect(() => {
        let unlistenQR: UnlistenFn | null = null
        let unlistenReady: UnlistenFn | null = null
        let unlistenDisconnected: UnlistenFn | null = null
        let unlistenError: UnlistenFn | null = null

        const setupListeners = async () => {
            try {
                // Listen for QR code events
                unlistenQR = await listen<QRPayload>('whatsapp_qr', (event) => {
                    console.log('QR code received')
                    setQrCode(event.payload.qr_base64)
                    setStatus('connecting')
                    setError(null)
                })

                // Listen for ready events
                unlistenReady = await listen<ReadyPayload>(
                    'whatsapp_ready',
                    (event) => {
                        console.log('WhatsApp ready')
                        setStatus('connected')
                        setQrCode(null)
                        setPhoneNumber(event.payload.phone_number)
                        setError(null)
                    }
                )

                // Listen for disconnected events
                unlistenDisconnected = await listen(
                    'whatsapp_disconnected',
                    () => {
                        console.log('WhatsApp disconnected')
                        setStatus('disconnected')
                        setQrCode(null)
                        setPhoneNumber(null)
                    }
                )

                // Listen for error events
                unlistenError = await listen<{
                    message: string
                    error?: string
                }>('whatsapp_error', (event) => {
                    console.error('WhatsApp error:', event.payload)
                    const errorMsg =
                        event.payload.error || event.payload.message
                    setError(errorMsg)
                    setStatus('disconnected')
                    showErrorToast(errorMsg, 'WhatsApp Error')
                })
            } catch (err) {
                const error = parseTauriError(err)
                console.error(
                    'Failed to setup WhatsApp event listeners:',
                    error
                )
                setError(error.message)
                logError(error, 'WhatsApp event listener setup')
                showErrorToast(error, 'Connection Error')
            }
        }

        setupListeners()

        // Cleanup function
        return () => {
            if (unlistenQR) unlistenQR()
            if (unlistenReady) unlistenReady()
            if (unlistenDisconnected) unlistenDisconnected()
            if (unlistenError) unlistenError()
        }
    }, [])

    const connect = useCallback(async () => {
        try {
            setStatus('connecting')
            setError(null)
            resetRecovery()
            await invoke('initialize_whatsapp')
        } catch (err) {
            const error = parseTauriError(err)
            console.error('Failed to initialize WhatsApp:', error)
            setError(error.message)
            setStatus('disconnected')
            logError(error, 'WhatsApp initialization')
            showErrorToast(error, 'Connection Failed')
        }
    }, [resetRecovery])

    return {
        status,
        qrCode,
        phoneNumber,
        error,
        connect,
        isRecovering,
        isInitialized,
        checkSession
    }
}
