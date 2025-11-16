import { useEffect, useRef } from 'react'
import { useWhatsAppContext } from '@/contexts/WhatsAppContext'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import AuthenticatedApp from '@/components/AuthenticatedApp'
import Connect from '@/pages/Connect'
import { toast } from 'sonner'

export default function AppShell() {
    const { status, isInitialized } = useWhatsAppContext()
    const previousStatusRef = useRef(status)

    // Handle session expiration
    useEffect(() => {
        const previousStatus = previousStatusRef.current

        // Detect session expiration: transition from 'connected' to 'disconnected'
        if (previousStatus === 'connected' && status === 'disconnected') {
            toast.error('Sessão expirada. Por favor, reconecte.', {
                duration: 5000,
                position: 'top-center'
            })
        }

        // Update the ref for next comparison
        previousStatusRef.current = status
    }, [status])

    // Show loading screen during initialization
    if (!isInitialized) {
        return <LoadingScreen message="Verificando sessão..." />
    }

    // Route based on authentication status
    if (status === 'connected') {
        return <AuthenticatedApp />
    }

    return <Connect />
}
