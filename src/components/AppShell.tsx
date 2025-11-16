import { useWhatsAppContext } from '@/contexts/WhatsAppContext'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import AuthenticatedApp from '@/components/AuthenticatedApp'
import Connect from '@/pages/Connect'

export default function AppShell() {
    const { status } = useWhatsAppContext()

    // Show loading screen during initialization
    if (status === 'initializing') {
        return <LoadingScreen message="Inicializando conexão..." />
    }

    // Route based on connection status
    if (status === 'connected') {
        return <AuthenticatedApp />
    }

    return <Connect />
}
