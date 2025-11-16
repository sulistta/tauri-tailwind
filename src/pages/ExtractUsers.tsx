import { useState, useEffect } from 'react'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { useGroups } from '@/hooks/useGroups'
import GroupSelector from '@/components/whatsapp/GroupSelector'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
} from '@/components/ui/table'
import type { Participant } from '@/types/whatsapp'
import { Download, Users, Loader2, UserX } from 'lucide-react'
import { ErrorDisplay } from '@/components/shared/ErrorDisplay'
import { showSuccessToast, showErrorToast } from '@/lib/error-handler'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'

export default function ExtractUsers() {
    const {
        groups,
        loading: groupsLoading,
        fetchGroups,
        extractMembers
    } = useGroups()
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [extractedMembers, setExtractedMembers] = useState<Participant[]>([])
    const [extracting, setExtracting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchGroups()
    }, [fetchGroups])

    const handleExtractMembers = async () => {
        if (!selectedGroupId) return

        setExtracting(true)
        setError(null)

        try {
            const members = await extractMembers(selectedGroupId)
            setExtractedMembers(members)
            setError(null)
        } catch (err) {
            console.error('Failed to extract members:', err)
            setError(
                err instanceof Error ? err.message : 'Failed to extract members'
            )
        } finally {
            setExtracting(false)
        }
    }

    const handleExportJSON = async () => {
        if (extractedMembers.length === 0) return

        try {
            const filePath = await save({
                defaultPath: 'members.json',
                filters: [
                    {
                        name: 'JSON',
                        extensions: ['json']
                    }
                ]
            })

            if (filePath) {
                const jsonContent = JSON.stringify(extractedMembers, null, 2)
                await writeTextFile(filePath, jsonContent)
                showSuccessToast(
                    'Members exported successfully',
                    'Export Complete'
                )
            }
        } catch (err) {
            console.error('Failed to export JSON:', err)
            const errorMsg = 'Failed to export JSON file'
            setError(errorMsg)
            showErrorToast(errorMsg, 'Export Failed')
        }
    }

    const handleExportCSV = async () => {
        if (extractedMembers.length === 0) return

        try {
            const filePath = await save({
                defaultPath: 'members.csv',
                filters: [
                    {
                        name: 'CSV',
                        extensions: ['csv']
                    }
                ]
            })

            if (filePath) {
                const csvContent = convertToCSV(extractedMembers)
                await writeTextFile(filePath, csvContent)
                showSuccessToast(
                    'Members exported successfully',
                    'Export Complete'
                )
            }
        } catch (err) {
            console.error('Failed to export CSV:', err)
            const errorMsg = 'Failed to export CSV file'
            setError(errorMsg)
            showErrorToast(errorMsg, 'Export Failed')
        }
    }

    const convertToCSV = (members: Participant[]): string => {
        const headers = ['Phone Number', 'Name', 'Is Admin']
        const rows = members.map((member) => [
            member.phoneNumber,
            member.name || 'N/A',
            member.isAdmin ? 'Yes' : 'No'
        ])

        const csvRows = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
        ]

        return csvRows.join('\n')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Extrair Membros
                </h1>
                <p className="text-gray-600 mt-1">
                    Extraia a lista de membros de um grupo do WhatsApp
                </p>
            </div>

            <Card className="p-6 transition-all hover:shadow-lg">
                <div className="space-y-4">
                    <GroupSelector
                        groups={groups}
                        selectedGroupId={selectedGroupId}
                        onSelectGroup={setSelectedGroupId}
                        disabled={groupsLoading || extracting}
                    />

                    <Button
                        onClick={handleExtractMembers}
                        disabled={
                            !selectedGroupId || extracting || groupsLoading
                        }
                        className="w-full transition-all hover:scale-[1.02]"
                    >
                        {extracting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Extraindo membros...
                            </>
                        ) : (
                            <>
                                <Users className="mr-2 h-4 w-4" />
                                Extrair membros
                            </>
                        )}
                    </Button>

                    {error && (
                        <ErrorDisplay
                            error={error}
                            title="Extraction Error"
                            onRetry={handleExtractMembers}
                            onDismiss={() => setError(null)}
                            variant="inline"
                        />
                    )}
                </div>
            </Card>

            {extracting && (
                <Card className="p-6 animate-fade-in">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Carregando membros...
                        </h2>
                        <TableSkeleton rows={5} />
                    </div>
                </Card>
            )}

            {!extracting && extractedMembers.length > 0 && (
                <Card className="p-6 transition-all hover:shadow-lg animate-fade-in-up">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Membros Extraídos ({extractedMembers.length})
                            </h2>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleExportJSON}
                                    variant="outline"
                                    size="sm"
                                    className="transition-all hover:scale-105"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar JSON
                                </Button>
                                <Button
                                    onClick={handleExportCSV}
                                    variant="outline"
                                    size="sm"
                                    className="transition-all hover:scale-105"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar CSV
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Número</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Admin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {extractedMembers.map((member, index) => (
                                        <TableRow
                                            key={index}
                                            className="transition-colors hover:bg-muted/50"
                                        >
                                            <TableCell className="font-mono text-sm">
                                                {member.phoneNumber}
                                            </TableCell>
                                            <TableCell>
                                                {member.name || (
                                                    <span className="text-gray-400 italic">
                                                        Sem nome
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {member.isAdmin ? (
                                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 transition-all">
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </Card>
            )}

            {!extracting &&
                !error &&
                extractedMembers.length === 0 &&
                selectedGroupId && (
                    <EmptyState
                        icon={UserX}
                        title="Nenhum membro encontrado"
                        description="Selecione um grupo e clique em 'Extrair membros' para começar."
                        className="animate-fade-in"
                    />
                )}
        </div>
    )
}
