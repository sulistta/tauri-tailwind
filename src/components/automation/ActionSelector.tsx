import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AutomationAction } from '@/types/automation'
import { useGroups } from '@/hooks/useGroups'

interface ActionSelectorProps {
    actions: AutomationAction[]
    onAddAction: (action: AutomationAction) => void
    onRemoveAction: (index: number) => void
}

export default function ActionSelector({
    actions,
    onAddAction,
    onRemoveAction
}: ActionSelectorProps) {
    const { groups } = useGroups()
    const [actionType, setActionType] =
        useState<AutomationAction['type']>('send_message')
    const [showForm, setShowForm] = useState(false)

    // Form state for different action types
    const [sendMessageTo, setSendMessageTo] = useState('')
    const [sendMessageText, setSendMessageText] = useState('')
    const [sendMessageDelay, setSendMessageDelay] = useState(0)

    const [extractInfoGroupId, setExtractInfoGroupId] = useState('')

    const [addToGroupId, setAddToGroupId] = useState('')
    const [addToGroupNumbers, setAddToGroupNumbers] = useState('')

    const [saveToListName, setSaveToListName] = useState('')

    const resetForm = () => {
        setSendMessageTo('')
        setSendMessageText('')
        setSendMessageDelay(0)
        setExtractInfoGroupId('')
        setAddToGroupId('')
        setAddToGroupNumbers('')
        setSaveToListName('')
        setShowForm(false)
    }

    const handleAddAction = () => {
        let action: AutomationAction | null = null

        switch (actionType) {
            case 'send_message':
                if (sendMessageTo && sendMessageText) {
                    action = {
                        type: 'send_message',
                        to: sendMessageTo,
                        message: sendMessageText,
                        delay:
                            sendMessageDelay > 0 ? sendMessageDelay : undefined
                    }
                }
                break
            case 'extract_info':
                if (extractInfoGroupId) {
                    action = {
                        type: 'extract_info',
                        groupId: extractInfoGroupId
                    }
                }
                break
            case 'add_to_group':
                if (addToGroupId && addToGroupNumbers) {
                    action = {
                        type: 'add_to_group',
                        groupId: addToGroupId,
                        numbers: addToGroupNumbers
                            .split(',')
                            .map((n) => n.trim())
                            .filter(Boolean)
                    }
                }
                break
            case 'save_to_list':
                if (saveToListName) {
                    action = {
                        type: 'save_to_list',
                        listName: saveToListName,
                        data: {}
                    }
                }
                break
        }

        if (action) {
            onAddAction(action)
            resetForm()
        }
    }

    const getActionLabel = (action: AutomationAction) => {
        switch (action.type) {
            case 'send_message':
                return `Enviar mensagem para ${action.to}`
            case 'extract_info':
                return `Extrair informações do grupo`
            case 'add_to_group':
                return `Adicionar ${action.numbers.length} usuários ao grupo`
            case 'save_to_list':
                return `Salvar em lista: ${action.listName}`
            default:
                return 'Ação desconhecida'
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Ações
                </label>
                <p className="mt-1 text-xs text-gray-500">
                    Adicione uma ou mais ações que serão executadas quando o
                    gatilho for ativado
                </p>
            </div>

            {/* Actions List */}
            {actions.length > 0 && (
                <div className="space-y-2">
                    {actions.map((action, index) => (
                        <Card key={index}>
                            <CardContent className="flex items-center justify-between p-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                        {getActionLabel(action)}
                                    </p>
                                    {action.type === 'send_message' && (
                                        <p className="mt-1 text-xs text-gray-500 truncate">
                                            {action.message}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemoveAction(index)}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Action Button */}
            {!showForm && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(true)}
                    className="w-full"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Ação
                </Button>
            )}

            {/* Action Form */}
            {showForm && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="space-y-4 p-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Tipo de Ação
                            </label>
                            <select
                                value={actionType}
                                onChange={(e) =>
                                    setActionType(
                                        e.target
                                            .value as AutomationAction['type']
                                    )
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="send_message">
                                    Enviar mensagem
                                </option>
                                <option value="extract_info">
                                    Extrair informações
                                </option>
                                <option value="add_to_group">
                                    Adicionar ao grupo
                                </option>
                                <option value="save_to_list">
                                    Salvar em lista
                                </option>
                            </select>
                        </div>

                        {/* Send Message Fields */}
                        {actionType === 'send_message' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Destinatário
                                    </label>
                                    <input
                                        type="text"
                                        value={sendMessageTo}
                                        onChange={(e) =>
                                            setSendMessageTo(e.target.value)
                                        }
                                        placeholder="Número ou ID do grupo"
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Mensagem
                                    </label>
                                    <textarea
                                        value={sendMessageText}
                                        onChange={(e) =>
                                            setSendMessageText(e.target.value)
                                        }
                                        placeholder="Digite a mensagem..."
                                        rows={3}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Atraso (segundos)
                                    </label>
                                    <input
                                        type="number"
                                        value={sendMessageDelay}
                                        onChange={(e) =>
                                            setSendMessageDelay(
                                                Number(e.target.value)
                                            )
                                        }
                                        min="0"
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </>
                        )}

                        {/* Extract Info Fields */}
                        {actionType === 'extract_info' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Grupo
                                </label>
                                <select
                                    value={extractInfoGroupId}
                                    onChange={(e) =>
                                        setExtractInfoGroupId(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Selecione um grupo</option>
                                    {groups.map((group) => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Add to Group Fields */}
                        {actionType === 'add_to_group' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Grupo
                                    </label>
                                    <select
                                        value={addToGroupId}
                                        onChange={(e) =>
                                            setAddToGroupId(e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">
                                            Selecione um grupo
                                        </option>
                                        {groups.map((group) => (
                                            <option
                                                key={group.id}
                                                value={group.id}
                                            >
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Números (separados por vírgula)
                                    </label>
                                    <textarea
                                        value={addToGroupNumbers}
                                        onChange={(e) =>
                                            setAddToGroupNumbers(e.target.value)
                                        }
                                        placeholder="5511999999999, 5511888888888"
                                        rows={3}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </>
                        )}

                        {/* Save to List Fields */}
                        {actionType === 'save_to_list' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Nome da Lista
                                </label>
                                <input
                                    type="text"
                                    value={saveToListName}
                                    onChange={(e) =>
                                        setSaveToListName(e.target.value)
                                    }
                                    placeholder="Ex: contatos_importantes"
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                onClick={handleAddAction}
                                size="sm"
                                className="flex-1"
                            >
                                Adicionar
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
