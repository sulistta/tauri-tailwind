import { useState } from 'react'
import { useWhatsAppContext } from '@/contexts/WhatsAppContext'
import { useAutomations } from '@/hooks/useAutomations'
import { useSettings } from '@/hooks/useSettings'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { LogOut, Zap, Info, Clock } from 'lucide-react'

export default function Settings() {
    const { status, phoneNumber } = useWhatsAppContext()
    const { automations, toggleAutomation } = useAutomations()
    const { settings, updateSettings } = useSettings()
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    const handleDisconnect = async () => {
        setIsDisconnecting(true)
        try {
            // In a real implementation, we would call a Tauri command to disconnect
            // For now, we'll just simulate it
            await new Promise((resolve) => setTimeout(resolve, 1000))
            // The actual disconnect would be handled by the backend
            console.log('Disconnect requested')
        } catch (err) {
            console.error('Failed to disconnect:', err)
        } finally {
            setIsDisconnecting(false)
        }
    }

    const handleDelayChange = (value: number) => {
        updateSettings({ bulkOperationDelay: value })
    }

    const handleToggleAllAutomations = async (enabled: boolean) => {
        updateSettings({ automationsEnabled: enabled })

        // Toggle all automations
        try {
            for (const automation of automations) {
                if (automation.enabled !== enabled) {
                    await toggleAutomation(automation.id)
                }
            }
        } catch (err) {
            console.error('Failed to toggle automations:', err)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie as configurações do aplicativo
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Session Management */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LogOut className="h-5 w-5" />
                            Gerenciamento de Sessão
                        </CardTitle>
                        <CardDescription>
                            Controle sua conexão com o WhatsApp
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Status:
                                </span>
                                <span className="font-medium capitalize">
                                    {status}
                                </span>
                            </div>
                            {phoneNumber && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Número:
                                    </span>
                                    <span className="font-medium">
                                        {phoneNumber}
                                    </span>
                                </div>
                            )}
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    disabled={status !== 'connected'}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Desconectar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Desconectar do WhatsApp?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você será desconectado do WhatsApp e
                                        precisará escanear o QR code novamente
                                        para reconectar.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDisconnect}
                                        disabled={isDisconnecting}
                                    >
                                        {isDisconnecting
                                            ? 'Desconectando...'
                                            : 'Desconectar'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>

                {/* Bulk Operations Delay */}
                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in"
                    style={{ animationDelay: '100ms' }}
                >
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Configuração de Atraso
                        </CardTitle>
                        <CardDescription>
                            Defina o atraso entre operações em massa
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">
                                    Atraso entre adições
                                </label>
                                <span className="text-sm font-bold text-primary">
                                    {settings.bulkOperationDelay}s
                                </span>
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="10"
                                step="1"
                                value={settings.bulkOperationDelay}
                                onChange={(e) =>
                                    handleDelayChange(Number(e.target.value))
                                }
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>2s (Rápido)</span>
                                <span>10s (Seguro)</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Um atraso maior reduz o risco de ser bloqueado pelo
                            WhatsApp durante operações em massa.
                        </p>
                    </CardContent>
                </Card>

                {/* Automation Settings */}
                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in"
                    style={{ animationDelay: '200ms' }}
                >
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Configurações de Automação
                        </CardTitle>
                        <CardDescription>
                            Controle o comportamento das automações
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">
                                    Habilitar todas as automações
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Ativar ou desativar todas as automações de
                                    uma vez
                                </p>
                            </div>
                            <Switch
                                checked={settings.automationsEnabled}
                                onCheckedChange={handleToggleAllAutomations}
                            />
                        </div>

                        <div className="pt-2 border-t">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Total de automações:
                                </span>
                                <span className="font-medium">
                                    {automations.length}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-muted-foreground">
                                    Automações ativas:
                                </span>
                                <span className="font-medium text-green-600">
                                    {
                                        automations.filter((a) => a.enabled)
                                            .length
                                    }
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* About Section */}
                <Card
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in"
                    style={{ animationDelay: '300ms' }}
                >
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            Sobre
                        </CardTitle>
                        <CardDescription>
                            Informações sobre o aplicativo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Nome:
                                </span>
                                <span className="font-medium">
                                    WhatsApp Automation
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Versão:
                                </span>
                                <span className="font-medium">1.0.0</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Desenvolvido por:
                                </span>
                                <span className="font-medium">MrLightful</span>
                            </div>
                        </div>

                        <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground">
                                Aplicativo desktop para automação do WhatsApp
                                construído com Tauri, React e whatsapp-web.js.
                            </p>
                        </div>

                        <div className="pt-2">
                            <p className="text-xs text-muted-foreground">
                                © 2024 MrLightful. Todos os direitos
                                reservados.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Information */}
            <Card
                className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in-up"
                style={{ animationDelay: '400ms' }}
            >
                <CardHeader>
                    <CardTitle className="text-base">
                        ⚠️ Aviso Importante
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Este aplicativo utiliza a API não oficial do WhatsApp
                        Web. Use por sua conta e risco. O WhatsApp pode bloquear
                        contas que violem seus termos de serviço. Recomendamos
                        usar atrasos adequados entre operações em massa e evitar
                        spam.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
