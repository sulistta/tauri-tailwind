import { useState, useEffect } from 'react'
import { useGroups } from '@/hooks/useGroups'
import { listen } from '@tauri-apps/api/event'
import GroupSelector from '@/components/whatsapp/GroupSelector'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { invoke } from '@tauri-apps/api/core'
import type { AdditionReport } from '@/types/whatsapp'
import { UserPlus, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function AddToGroup() {
    const { groups, loading: groupsLoading, fetchGroups } = useGroups()
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [phoneNumbers, setPhoneNumbers] = useState<string[]>([])
    const [delaySeconds, setDelaySeconds] = useState(5)
    const [isAdding, setIsAdding] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [report, setReport] = useState<AdditionReport | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Filter only groups where user is admin
    const adminGroups = groups.filter((group) => group.isAdmin)

    useEffect(() => {
        fetchGroups()
    }, [fetchGroups])

    useEffect(() => {
        // Listen for progress events
        const setupListeners = async () => {
            const unlistenProgress = await listen<{
                current: number
                total: number
            }>('automation_progress', (event) => {
                setProgress(event.payload)
            })

            const unlistenFinished = await listen<{ report: AdditionReport }>(
                'automation_finished',
                (event) => {
                    setReport(event.payload.report)
                    setIsAdding(false)
                }
            )

            const unlistenError = await listen<{ message: string }>(
                'automation_error',
                (event) => {
                    setError(event.payload.message)
                    setIsAdding(false)
                }
            )

            return () => {
                unlistenProgress()
                unlistenFinished()
                unlistenError()
            }
        }

        const cleanup = setupListeners()
        return () => {
            cleanup.then((fn) => fn())
        }
    }, [])

    const handleFileUpload = (numbers: string[]) => {
        setPhoneNumbers(numbers)
        setReport(null)
        setError(null)
    }

    const handleStartAddition = async () => {
        if (!selectedGroupId || phoneNumbers.length === 0) return

        setIsAdding(true)
        setError(null)
        setReport(null)
        setProgress({ current: 0, total: phoneNumbers.length })

        try {
            await invoke('add_users_to_group', {
                groupId: selectedGroupId,
                phoneNumbers,
                delaySeconds
            })
        } catch (err) {
            console.error('Failed to add users:', err)
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to add users to group'
            )
            setIsAdding(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Adicionar ao Grupo
                </h1>
                <p className="text-gray-600 mt-1">
                    Adicione múltiplos usuários a um grupo do WhatsApp
                </p>
            </div>

            <Card className="p-6 transition-all hover:shadow-lg">
                <div className="space-y-6">
                    <FileUpload
                        onUpload={handleFileUpload}
                        disabled={isAdding}
                    />

                    {phoneNumbers.length > 0 && (
                        <div className="rounded-lg bg-blue-50 p-4 animate-fade-in">
                            <p className="text-sm text-blue-800">
                                <span className="font-semibold">
                                    {phoneNumbers.length}
                                </span>{' '}
                                números carregados
                            </p>
                        </div>
                    )}

                    <GroupSelector
                        groups={adminGroups}
                        selectedGroupId={selectedGroupId}
                        onSelectGroup={setSelectedGroupId}
                        disabled={groupsLoading || isAdding}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Delay entre adições: {delaySeconds} segundos
                        </label>
                        <input
                            type="range"
                            min="2"
                            max="10"
                            step="1"
                            value={delaySeconds}
                            onChange={(e) =>
                                setDelaySeconds(Number(e.target.value))
                            }
                            disabled={isAdding}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>2s</span>
                            <span>10s</span>
                        </div>
                    </div>

                    <Button
                        onClick={handleStartAddition}
                        disabled={
                            !selectedGroupId ||
                            phoneNumbers.length === 0 ||
                            isAdding ||
                            groupsLoading
                        }
                        className="w-full transition-all hover:scale-[1.02]"
                    >
                        {isAdding ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adicionando usuários...
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Iniciar Adição
                            </>
                        )}
                    </Button>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 animate-fade-in">
                            {error}
                        </div>
                    )}
                </div>
            </Card>

            {isAdding && progress.total > 0 && (
                <Card className="p-6 transition-all hover:shadow-lg animate-fade-in-up">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Progresso da Adição
                        </h2>
                        <ProgressBar
                            current={progress.current}
                            total={progress.total}
                        />
                        <p className="text-sm text-gray-600 text-center">
                            {progress.current} de {progress.total} processados
                        </p>
                    </div>
                </Card>
            )}

            {report && (
                <Card className="p-6 transition-all hover:shadow-lg animate-fade-in-up">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Relatório de Adição
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-lg bg-green-50 p-4 transition-all hover:scale-[1.02] animate-scale-in">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-green-900">
                                            Adicionados com Sucesso
                                        </p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {report.successful.length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="rounded-lg bg-red-50 p-4 transition-all hover:scale-[1.02] animate-scale-in"
                                style={{ animationDelay: '100ms' }}
                            >
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    <div>
                                        <p className="text-sm font-medium text-red-900">
                                            Falhas
                                        </p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {report.failed.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {report.failed.length > 0 && (
                            <div className="space-y-2 animate-fade-in">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Detalhes das Falhas
                                </h3>
                                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                                    <div className="divide-y divide-gray-100">
                                        {report.failed.map((failure, index) => (
                                            <div
                                                key={index}
                                                className="p-3 transition-colors hover:bg-gray-50"
                                            >
                                                <p className="font-mono text-sm text-gray-900">
                                                    {failure.phoneNumber}
                                                </p>
                                                <p className="text-xs text-red-600 mt-1">
                                                    {failure.reason}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    )
}
