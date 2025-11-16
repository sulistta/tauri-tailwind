import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
    Automation,
    AutomationTrigger,
    AutomationAction
} from '@/types/automation'
import TriggerSelector from './TriggerSelector'
import ActionSelector from './ActionSelector'

interface AutomationFormProps {
    onSave: (automation: Omit<Automation, 'id' | 'createdAt'>) => Promise<void>
    onCancel: () => void
}

export default function AutomationForm({
    onSave,
    onCancel
}: AutomationFormProps) {
    const [name, setName] = useState('')
    const [trigger, setTrigger] = useState<AutomationTrigger>({
        type: 'on_message'
    })
    const [actions, setActions] = useState<AutomationAction[]>([])
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!name.trim()) {
            newErrors.name = 'Nome é obrigatório'
        }

        if (actions.length === 0) {
            newErrors.actions = 'Adicione pelo menos uma ação'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) {
            return
        }

        setSaving(true)
        try {
            await onSave({
                name: name.trim(),
                enabled: true,
                trigger,
                actions
            })
        } catch (error) {
            console.error('Failed to save automation:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleAddAction = (action: AutomationAction) => {
        setActions([...actions, action])
        setErrors({ ...errors, actions: '' })
    }

    const handleRemoveAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index))
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nova Automação</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Nome da Automação
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setErrors({ ...errors, name: '' })
                            }}
                            placeholder="Ex: Responder mensagens automaticamente"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Trigger Selector */}
                    <TriggerSelector trigger={trigger} onChange={setTrigger} />

                    {/* Action Selector */}
                    <ActionSelector
                        actions={actions}
                        onAddAction={handleAddAction}
                        onRemoveAction={handleRemoveAction}
                    />
                    {errors.actions && (
                        <p className="text-sm text-red-600">{errors.actions}</p>
                    )}

                    {/* Form Actions */}
                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={saving}
                            className="flex-1"
                        >
                            {saving ? 'Salvando...' : 'Salvar Automação'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
