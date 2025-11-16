import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { WhatsAppStatus } from '@/hooks/useWhatsApp'

interface ConnectionStatusProps {
    status: WhatsAppStatus
    phoneNumber?: string | null
}

export default function ConnectionStatus({
    status,
    phoneNumber
}: ConnectionStatusProps) {
    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    icon: CheckCircle,
                    text: 'Conectado',
                    variant: 'default' as const,
                    color: 'text-green-600'
                }
            case 'connecting':
                return {
                    icon: Loader2,
                    text: 'Conectando...',
                    variant: 'secondary' as const,
                    color: 'text-blue-600',
                    animate: true
                }
            case 'disconnected':
                return {
                    icon: XCircle,
                    text: 'Desconectado',
                    variant: 'destructive' as const,
                    color: 'text-red-600'
                }
        }
    }

    const config = getStatusConfig()
    const Icon = config.icon

    return (
        <div className="flex items-center gap-3">
            <Icon
                className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
            />
            <div className="flex flex-col">
                <Badge variant={config.variant} className="w-fit">
                    {config.text}
                </Badge>
                {phoneNumber && status === 'connected' && (
                    <span className="mt-1 text-xs text-gray-500">
                        {phoneNumber}
                    </span>
                )}
            </div>
        </div>
    )
}
