import { useWhatsAppContext } from '@/contexts/WhatsAppContext'
import QRCodeViewer from '@/components/whatsapp/QRCodeViewer'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ErrorDisplay } from '@/components/shared/ErrorDisplay'

export default function Connect() {
    const { status, qrCode, connect, error, isRecovering } =
        useWhatsAppContext()

    const handleConnect = async () => {
        await connect()
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
            <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-2xl animate-scale-in">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 animate-fade-in">
                        WhatsApp Automation
                    </h1>
                    <p
                        className="mt-2 text-sm text-gray-600 animate-fade-in"
                        style={{ animationDelay: '100ms' }}
                    >
                        Conecte sua conta do WhatsApp para começar
                    </p>
                </div>

                <div className="flex flex-col items-center space-y-6">
                    {/* Show QR Code when available */}
                    {qrCode && (
                        <div className="flex flex-col items-center space-y-2 animate-fade-in-up">
                            <QRCodeViewer qrCode={qrCode} />
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Aguardando escaneamento...</span>
                            </div>
                        </div>
                    )}

                    {/* Show connected status */}
                    {status === 'connected' && (
                        <div className="flex flex-col items-center space-y-2 animate-scale-in">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 animate-pulse">
                                <svg
                                    className="h-8 w-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <p className="text-lg font-semibold text-green-600">
                                Conectado ✔
                            </p>
                        </div>
                    )}

                    {/* Show connect button when disconnected */}
                    {status === 'disconnected' && !qrCode && (
                        <Button
                            onClick={handleConnect}
                            size="lg"
                            className="w-full transition-all hover:scale-105 animate-fade-in-up"
                        >
                            Conectar ao WhatsApp
                        </Button>
                    )}

                    {/* Show loading spinner during connection process */}
                    {status === 'connecting' && !qrCode && (
                        <div className="flex items-center space-x-2 animate-fade-in">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm text-gray-600">
                                Inicializando conexão...
                            </span>
                        </div>
                    )}

                    {/* Show error message if any */}
                    {error && (
                        <div className="animate-fade-in w-full">
                            <ErrorDisplay
                                error={error}
                                title="Connection Error"
                                onRetry={handleConnect}
                                variant="card"
                                className="w-full"
                                showDetails={true}
                            />
                        </div>
                    )}

                    {/* Show recovery status */}
                    {isRecovering && (
                        <div className="w-full rounded-md border border-yellow-200 bg-yellow-50 p-3 animate-fade-in">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                                <p className="text-sm text-yellow-700">
                                    Attempting to reconnect...
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                    <p
                        className="text-center text-xs text-gray-500 animate-fade-in"
                        style={{ animationDelay: '200ms' }}
                    >
                        Ao conectar, você concorda em usar o WhatsApp Web de
                        forma responsável
                    </p>
                </div>
            </div>
        </div>
    )
}
