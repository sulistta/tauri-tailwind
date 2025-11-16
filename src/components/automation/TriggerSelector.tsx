import { useState } from 'react'
import type { AutomationTrigger } from '@/types/automation'
import { useGroups } from '@/hooks/useGroups'

interface TriggerSelectorProps {
    trigger: AutomationTrigger
    onChange: (trigger: AutomationTrigger) => void
}

export default function TriggerSelector({
    trigger,
    onChange
}: TriggerSelectorProps) {
    const { groups } = useGroups()
    const [messageFilter, setMessageFilter] = useState(
        trigger.type === 'on_message' ? trigger.filter?.contains || '' : ''
    )
    const [selectedGroupId, setSelectedGroupId] = useState(
        trigger.type === 'on_group_join' ? trigger.groupId || '' : ''
    )

    const handleTriggerTypeChange = (type: AutomationTrigger['type']) => {
        switch (type) {
            case 'on_message':
                onChange({
                    type: 'on_message',
                    filter: messageFilter
                        ? { contains: messageFilter }
                        : undefined
                })
                break
            case 'on_group_join':
                onChange({
                    type: 'on_group_join',
                    groupId: selectedGroupId || undefined
                })
                break
            case 'on_app_start':
                onChange({ type: 'on_app_start' })
                break
        }
    }

    const handleMessageFilterChange = (value: string) => {
        setMessageFilter(value)
        if (trigger.type === 'on_message') {
            onChange({
                type: 'on_message',
                filter: value ? { contains: value } : undefined
            })
        }
    }

    const handleGroupChange = (groupId: string) => {
        setSelectedGroupId(groupId)
        if (trigger.type === 'on_group_join') {
            onChange({ type: 'on_group_join', groupId: groupId || undefined })
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Gatilho
                </label>
                <select
                    value={trigger.type}
                    onChange={(e) =>
                        handleTriggerTypeChange(
                            e.target.value as AutomationTrigger['type']
                        )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="on_message">Ao receber mensagem</option>
                    <option value="on_group_join">Ao entrar no grupo</option>
                    <option value="on_app_start">Ao iniciar o app</option>
                </select>
            </div>

            {/* Message Filter */}
            {trigger.type === 'on_message' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Filtro de Mensagem (opcional)
                    </label>
                    <input
                        type="text"
                        value={messageFilter}
                        onChange={(e) =>
                            handleMessageFilterChange(e.target.value)
                        }
                        placeholder="Ex: ajuda, suporte"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Deixe em branco para todas as mensagens
                    </p>
                </div>
            )}

            {/* Group Selection */}
            {trigger.type === 'on_group_join' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Grupo Específico (opcional)
                    </label>
                    <select
                        value={selectedGroupId}
                        onChange={(e) => handleGroupChange(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">Qualquer grupo</option>
                        {groups.map((group) => (
                            <option key={group.id} value={group.id}>
                                {group.name}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                        Deixe em branco para qualquer grupo
                    </p>
                </div>
            )}
        </div>
    )
}
