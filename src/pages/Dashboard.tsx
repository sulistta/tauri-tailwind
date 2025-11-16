import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WhatsAppMessage {
    from: string
    body: string
    timestamp: number
}

interface WhatsAppEvent {
    id: string
    type: 'message' | 'qr' | 'ready' | 'disconnected'
    timestamp: number
    data: any
}

export default function Dashboard() {
    const { status, phoneNumber } = useWhatsApp()
    const [recentEvents, setRecentEvents] = useState<WhatsAppEvent[]>([])
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isTesting, setIsTesting] = useState(false)

    useEffect(() => {
        let unlistenMessage: UnlistenFn | null = null
        let unlistenQR: UnlistenFn | null = null
        let unlistenReady: UnlistenFn | null = null
        let unlistenDisconnected: UnlistenFn | null = null

        const setupEventListeners = async () => {
            try {
                // Listen for message events
                unlistenMessage = await listen<WhatsAppMessage>(
                    'whatsapp_message',
                    (event) => {
                        const newEvent: WhatsAppEvent = {
                            id: `msg-${Date.now()}-${Math.random()}`,
                            type: 'message',
                            timestamp: Date.now(),
                            data: event.payload
                        }
                        setRecentEvents((prev) =>
                            [newEvent, ...prev].slice(0, 10)
                        )
                    }
                )

                // Listen for QR events
                unlistenQR = await listen('whatsapp_qr', (event) => {
                    const newEvent: WhatsAppEvent = {
                        id: `qr-${Date.now()}`,
                        type: 'qr',
                        timestamp: Date.now(),
                        data: event.payload
                    }
                    setRecentEvents((prev) => [newEvent, ...prev].slice(0, 10))
                })

                // Listen for ready events
                unlistenReady = await listen('whatsapp_ready', (event) => {
                    const newEvent: WhatsAppEvent = {
                        id: `ready-${Date.now()}`,
                        type: 'ready',
                        timestamp: Date.now(),
                        data: event.payload
                    }
                    setRecentEvents((prev) => [newEvent, ...prev].slice(0, 10))
                })

                // Listen for disconnected events
                unlistenDisconnected = await listen(
                    'whatsapp_disconnected',
                    (event) => {
                        const newEvent: WhatsAppEvent = {
                            id: `disconnected-${Date.now()}`,
                            type: 'disconnected',
                            timestamp: Date.now(),
                            data: event.payload
                        }
                        setRecentEvents((prev) =>
                            [newEvent, ...prev].slice(0, 10)
                        )
                    }
                )
            } catch (err) {
                console.error('Failed to setup event listeners:', err)
            }
        }

        setupEventListeners()

        return () => {
            if (unlistenMessage) unlistenMessage()
            if (unlistenQR) unlistenQR()
            if (unlistenReady) unlistenReady()
            if (unlistenDisconnected) unlistenDisconnected()
        }
    }, [])

    const handleRefreshGroups = async () => {
        setIsRefreshing(true)
        try {
            await invoke('get_groups')
            // Add a success event
            const newEvent: WhatsAppEvent = {
                id: `refresh-${Date.now()}`,
                type: 'ready',
                timestamp: Date.now(),
                data: { message: 'Groups refreshed successfully' }
            }
            setRecentEvents((prev) => [newEvent, ...prev].slice(0, 10))
        } catch (err) {
            console.error('Failed to refresh groups:', err)
        } finally {
            setIsRefreshing(false)
        }
    }

    const handleTestConnection = async () => {
        setIsTesting(true)
        try {
            await invoke('get_groups')
            const newEvent: WhatsAppEvent = {
                id: `test-${Date.now()}`,
                type: 'ready',
                timestamp: Date.now(),
                data: { message: 'Connection test successful' }
            }
            setRecentEvents((prev) => [newEvent, ...prev].slice(0, 10))
        } catch (err) {
            console.error('Connection test failed:', err)
            const newEvent: WhatsAppEvent = {
                id: `test-error-${Date.now()}`,
                type: 'disconnected',
                timestamp: Date.now(),
                data: { message: 'Connection test failed' }
            }
            setRecentEvents((prev) => [newEvent, ...prev].slice(0, 10))
        } finally {
            setIsTesting(false)
        }
    }

    const getStatusBadge = () => {
        switch (status) {
            case 'connected':
                return (
                    <Badge className="bg-green-500 hover:bg-green-600">
                        Conectado
                    </Badge>
                )
            case 'connecting':
                return (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">
                        Conectando...
                    </Badge>
                )
            case 'disconnected':
                return <Badge variant="destructive">Desconectado</Badge>
            default:
                return <Badge variant="secondary">Desconhecido</Badge>
        }
    }

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const getEventIcon = (type: WhatsAppEvent['type']) => {
        switch (type) {
            case 'message':
                return '💬'
            case 'qr':
                return '📱'
            case 'ready':
                return '✅'
            case 'disconnected':
                return '❌'
            default:
                return '📋'
        }
    }

    const getEventDescription = (event: WhatsAppEvent) => {
        switch (event.type) {
            case 'message':
                return `Mensagem de ${event.data.from?.slice(0, 15) || 'Desconhecido'}: ${event.data.body?.slice(0, 50) || ''}`
            case 'qr':
                return 'QR Code gerado para autenticação'
            case 'ready':
                return (
                    event.data.message ||
                    `WhatsApp conectado${event.data.phone_number ? ` - ${event.data.phone_number}` : ''}`
                )
            case 'disconnected':
                return event.data.message || 'WhatsApp desconectado'
            default:
                return 'Evento desconhecido'
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Visão geral do sistema de automação WhatsApp
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Connection Status Card */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Status da Conexão
                        </CardTitle>
                        <CardDescription>
                            Estado atual do WhatsApp
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status:</span>
                            {getStatusBadge()}
                        </div>
                        {phoneNumber && (
                            <div className="flex items-center justify-between animate-fade-in">
                                <span className="text-sm font-medium">
                                    Número:
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {phoneNumber}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                Última atualização:
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {formatTimestamp(Date.now())}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Utility Buttons Card */}
                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in"
                    style={{ animationDelay: '100ms' }}
                >
                    <CardHeader>
                        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                        <CardDescription>
                            Utilitários do sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            onClick={handleRefreshGroups}
                            disabled={status !== 'connected' || isRefreshing}
                            className="w-full transition-all hover:scale-105"
                            variant="outline"
                        >
                            {isRefreshing
                                ? 'Atualizando...'
                                : '🔄 Atualizar Grupos'}
                        </Button>
                        <Button
                            onClick={handleTestConnection}
                            disabled={status !== 'connected' || isTesting}
                            className="w-full transition-all hover:scale-105"
                            variant="outline"
                        >
                            {isTesting ? 'Testando...' : '🔌 Testar Conexão'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Events Card */}
                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] md:col-span-2 lg:col-span-1 animate-fade-in"
                    style={{ animationDelay: '200ms' }}
                >
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Eventos Recentes
                        </CardTitle>
                        <CardDescription>
                            Últimos 10 eventos do WhatsApp
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentEvents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p className="text-sm">
                                    Nenhum evento registrado ainda
                                </p>
                                <p className="text-xs mt-1">
                                    Os eventos aparecerão aqui em tempo real
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {recentEvents.map((event, index) => (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200 hover:scale-[1.02] animate-fade-in-up"
                                        style={{
                                            animationDelay: `${index * 50}ms`
                                        }}
                                    >
                                        <span className="text-2xl">
                                            {getEventIcon(event.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {getEventDescription(event)}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatTimestamp(
                                                    event.timestamp
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Additional Info Section */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in-up"
                    style={{ animationDelay: '300ms' }}
                >
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            📊 Estatísticas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm transition-all hover:translate-x-1">
                                <span className="text-muted-foreground">
                                    Eventos hoje:
                                </span>
                                <span className="font-medium">
                                    {recentEvents.length}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm transition-all hover:translate-x-1">
                                <span className="text-muted-foreground">
                                    Mensagens:
                                </span>
                                <span className="font-medium">
                                    {
                                        recentEvents.filter(
                                            (e) => e.type === 'message'
                                        ).length
                                    }
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in-up"
                    style={{ animationDelay: '400ms' }}
                >
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">⚡ Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm transition-all hover:translate-x-1">
                                <span className="text-muted-foreground">
                                    Versão:
                                </span>
                                <span className="font-medium">1.0.0</span>
                            </div>
                            <div className="flex justify-between text-sm transition-all hover:translate-x-1">
                                <span className="text-muted-foreground">
                                    Status:
                                </span>
                                <span className="font-medium text-green-600">
                                    Operacional
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in-up"
                    style={{ animationDelay: '500ms' }}
                >
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            🤖 Automações
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm transition-all hover:translate-x-1">
                                <span className="text-muted-foreground">
                                    Ativas:
                                </span>
                                <span className="font-medium">0</span>
                            </div>
                            <div className="flex justify-between text-sm transition-all hover:translate-x-1">
                                <span className="text-muted-foreground">
                                    Total:
                                </span>
                                <span className="font-medium">0</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
