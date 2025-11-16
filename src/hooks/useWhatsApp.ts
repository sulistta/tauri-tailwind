import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { useConnectionRecovery } from './useConnectionRecovery'
import { parseTauriError, showErrorToast, logError } from '@/lib/error-handler'

export type WhatsAppStatus = 'disconnected' | 'connecting' | 'connected'

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

    // Enable automatic connection recovery
    const { isRecovering, resetRecovery } = useConnectionRecovery(
        status === 'connected',
        {
            enabled: true,
            maxAttempts: 3
        }
    )

    useEffect(() => {
        let unlistenQR: UnlistenFn | null = null
        let unlistenReady: UnlistenFn | null = null
        let unlistenDisconnected: UnlistenFn | null = null

        const setupListeners = async () => {
            try {
                // Listen for QR code events
                unlistenQR = await listen<QRPayload>('whatsapp_qr', (event) => {
                    setQrCode(event.payload.qr_base64)
                    setStatus('connecting')
                    setError(null)
                })

                // Listen for ready events
                unlistenReady = await listen<ReadyPayload>(
                    'whatsapp_ready',
                    (event) => {
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
                        setStatus('disconnected')
                        setQrCode(null)
                        setPhoneNumber(null)
                    }
                )
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
        isRecovering
    }
}
