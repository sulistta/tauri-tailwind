import { Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Automation } from '@/types/automation'
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

interface AutomationListProps {
    automations: Automation[]
    onToggle: (id: string) => void
    onDelete: (id: string) => void
}

export default function AutomationList({
    automations,
    onToggle,
    onDelete
}: AutomationListProps) {
    const getTriggerLabel = (trigger: Automation['trigger']) => {
        switch (trigger.type) {
            case 'on_message':
                return 'Ao receber mensagem'
            case 'on_group_join':
                return 'Ao entrar no grupo'
            case 'on_app_start':
                return 'Ao iniciar o app'
            default:
                return 'Desconhecido'
        }
    }

    const getActionLabel = (action: Automation['actions'][0]) => {
        switch (action.type) {
            case 'send_message':
                return 'Enviar mensagem'
            case 'extract_info':
                return 'Extrair informações'
            case 'add_to_group':
                return 'Adicionar ao grupo'
            case 'save_to_list':
                return 'Salvar em lista'
            default:
                return 'Desconhecido'
        }
    }

    if (automations.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                        <p className="text-lg font-medium">
                            Nenhuma automação criada
                        </p>
                        <p className="mt-2 text-sm">
                            Clique em "Nova Automação" para começar
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {automations.map((automation) => (
                <Card key={automation.id} className="hover:shadow-md">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-lg">
                                    {automation.name}
                                </CardTitle>
                                <p className="mt-1 text-sm text-gray-500">
                                    Criado em{' '}
                                    {new Date(
                                        automation.createdAt
                                    ).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={automation.enabled}
                                    onCheckedChange={() =>
                                        onToggle(automation.id)
                                    }
                                />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Excluir automação?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação não pode ser desfeita.
                                                A automação "{automation.name}"
                                                será permanentemente excluída.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancelar
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() =>
                                                    onDelete(automation.id)
                                                }
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                Excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    Gatilho
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                    {getTriggerLabel(automation.trigger)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    Ações ({automation.actions.length})
                                </p>
                                <ul className="mt-1 space-y-1">
                                    {automation.actions.map((action, index) => (
                                        <li
                                            key={index}
                                            className="text-sm text-gray-600"
                                        >
                                            • {getActionLabel(action)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
