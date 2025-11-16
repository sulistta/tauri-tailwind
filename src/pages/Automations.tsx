import { useState } from 'react'
import { Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAutomations } from '@/hooks/useAutomations'
import AutomationList from '@/components/automation/AutomationList'
import AutomationForm from '@/components/automation/AutomationForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { ListSkeleton } from '@/components/shared/LoadingSkeleton'

export default function Automations() {
    const {
        automations,
        loading,
        error,
        createAutomation,
        deleteAutomation,
        toggleAutomation
    } = useAutomations()
    const [showForm, setShowForm] = useState(false)

    const handleSave = async (
        automation: Parameters<typeof createAutomation>[0]
    ) => {
        await createAutomation(automation)
        setShowForm(false)
    }

    const handleDelete = async (id: string) => {
        await deleteAutomation(id)
    }

    const handleToggle = async (id: string) => {
        await toggleAutomation(id)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Automações
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Crie e gerencie automações para o WhatsApp
                    </p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="transition-all hover:scale-105"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Automação
                    </Button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 animate-fade-in">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="animate-fade-in-down">
                    <AutomationForm
                        onSave={handleSave}
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            {/* Loading State */}
            {loading && !automations.length && (
                <div className="animate-fade-in">
                    <ListSkeleton items={3} />
                </div>
            )}

            {/* Automation List */}
            {!loading && automations.length > 0 && (
                <div className="animate-fade-in-up">
                    <AutomationList
                        automations={automations}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                    />
                </div>
            )}

            {/* Empty State */}
            {!loading && !showForm && automations.length === 0 && (
                <EmptyState
                    icon={Zap}
                    title="Nenhuma automação criada"
                    description="Crie sua primeira automação para começar a automatizar tarefas no WhatsApp."
                    action={{
                        label: 'Criar Automação',
                        onClick: () => setShowForm(true)
                    }}
                    className="animate-fade-in"
                />
            )}
        </div>
    )
}
