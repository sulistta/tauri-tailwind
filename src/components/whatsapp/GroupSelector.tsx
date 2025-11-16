import { useState, useMemo } from 'react'
import type { GroupInfo } from '@/types/whatsapp'
import { Search } from 'lucide-react'

interface GroupSelectorProps {
    groups: GroupInfo[]
    selectedGroupId: string | null
    onSelectGroup: (groupId: string) => void
    disabled?: boolean
}

export default function GroupSelector({
    groups,
    selectedGroupId,
    onSelectGroup,
    disabled = false
}: GroupSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groups

        return groups.filter((group) =>
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [groups, searchTerm])

    const selectedGroup = groups.find((g) => g.id === selectedGroupId)

    return (
        <div className="w-full space-y-2">
            <label className="text-sm font-medium text-gray-700">
                Selecionar Grupo
            </label>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar grupo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {filteredGroups.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                        {searchTerm
                            ? 'Nenhum grupo encontrado'
                            : 'Nenhum grupo disponível'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredGroups.map((group) => (
                            <button
                                key={group.id}
                                onClick={() => onSelectGroup(group.id)}
                                disabled={disabled}
                                className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    selectedGroupId === group.id
                                        ? 'bg-blue-50 hover:bg-blue-100'
                                        : ''
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                            {group.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {group.participantCount} membros
                                            {group.isAdmin && ' • Admin'}
                                        </p>
                                    </div>
                                    {selectedGroupId === group.id && (
                                        <div className="ml-2 h-2 w-2 rounded-full bg-blue-600" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedGroup && (
                <p className="text-sm text-gray-600">
                    Selecionado:{' '}
                    <span className="font-medium">{selectedGroup.name}</span>
                </p>
            )}
        </div>
    )
}
