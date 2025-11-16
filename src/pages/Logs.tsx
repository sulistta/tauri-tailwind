import { useState } from 'react'
import { useLogs } from '../hooks/useLogs'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ChevronDown, ChevronRight, AlertCircle, FileText } from 'lucide-react'
import type { LogLevel, LogCategory } from '../types/whatsapp'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'

export default function Logs() {
    const { logs, loading, clearLogs, filterLogs } = useLogs()
    const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
    const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>(
        'all'
    )
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

    const handleFilterChange = () => {
        const filter: any = {}
        if (levelFilter !== 'all') filter.level = levelFilter
        if (categoryFilter !== 'all') filter.category = categoryFilter

        if (Object.keys(filter).length > 0) {
            filterLogs(filter)
        } else {
            filterLogs({})
        }
    }

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case 'info':
                return 'bg-blue-500 text-white'
            case 'warning':
                return 'bg-yellow-500 text-white'
            case 'error':
                return 'bg-red-500 text-white'
            default:
                return 'bg-gray-500 text-white'
        }
    }

    const getCategoryColor = (category: LogCategory) => {
        switch (category) {
            case 'general':
                return 'bg-gray-600 text-white'
            case 'automation':
                return 'bg-purple-600 text-white'
            case 'whatsapp':
                return 'bg-green-600 text-white'
            default:
                return 'bg-gray-500 text-white'
        }
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleString()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Logs</h1>
                <Button
                    onClick={clearLogs}
                    variant="outline"
                    className="transition-all hover:scale-105"
                >
                    Clear Logs
                </Button>
            </div>

            <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">
                                Level
                            </label>
                            <select
                                value={levelFilter}
                                onChange={(e) =>
                                    setLevelFilter(
                                        e.target.value as LogLevel | 'all'
                                    )
                                }
                                className="w-full px-3 py-2 border rounded-md bg-white transition-all focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">All Levels</option>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="error">Error</option>
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">
                                Category
                            </label>
                            <select
                                value={categoryFilter}
                                onChange={(e) =>
                                    setCategoryFilter(
                                        e.target.value as LogCategory | 'all'
                                    )
                                }
                                className="w-full px-3 py-2 border rounded-md bg-white transition-all focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">All Categories</option>
                                <option value="general">General</option>
                                <option value="automation">Automation</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>
                        </div>

                        <Button
                            onClick={handleFilterChange}
                            className="transition-all hover:scale-105"
                        >
                            Apply Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                    <CardTitle>Log Entries ({logs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="animate-fade-in">
                            <TableSkeleton rows={8} />
                        </div>
                    ) : logs.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="Nenhum log disponível"
                            description="Os logs aparecerão aqui conforme as ações forem executadas."
                            className="animate-fade-in"
                        />
                    ) : (
                        <div className="overflow-auto max-h-[600px] animate-fade-in">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white border-b shadow-sm">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-medium">
                                            Timestamp
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium">
                                            Level
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium">
                                            Category
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium">
                                            Message
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, index) => {
                                        const isExpanded =
                                            expandedLogId === log.id
                                        const isError = log.level === 'error'

                                        return (
                                            <>
                                                <tr
                                                    key={log.id}
                                                    className={`border-b hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
                                                        isError
                                                            ? 'bg-red-50 hover:bg-red-100'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        setExpandedLogId(
                                                            isExpanded
                                                                ? null
                                                                : log.id
                                                        )
                                                    }
                                                    style={{
                                                        animationDelay: `${index * 20}ms`
                                                    }}
                                                >
                                                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            {isError ? (
                                                                isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4 text-red-600 transition-transform" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 text-red-600 transition-transform" />
                                                                )
                                                            ) : (
                                                                <span className="w-4" />
                                                            )}
                                                            {formatTimestamp(
                                                                log.timestamp
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Badge
                                                            className={`${getLevelColor(log.level)} transition-all`}
                                                        >
                                                            {log.level}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Badge
                                                            className={`${getCategoryColor(log.category)} transition-all`}
                                                        >
                                                            {log.category}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm">
                                                        <div className="flex items-start gap-2">
                                                            {isError && (
                                                                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                                            )}
                                                            <span className="wrap-break-word">
                                                                {log.message}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && isError && (
                                                    <tr
                                                        key={`${log.id}-details`}
                                                        className="animate-fade-in-down"
                                                    >
                                                        <td
                                                            colSpan={4}
                                                            className="bg-red-50 border-b"
                                                        >
                                                            <div className="p-4 space-y-2">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="font-semibold text-sm text-red-900">
                                                                        Error
                                                                        Details:
                                                                    </span>
                                                                </div>
                                                                <div className="bg-white rounded-md p-3 border border-red-200 transition-all">
                                                                    <pre className="text-xs text-red-800 whitespace-pre-wrap wrap-break-word font-mono">
                                                                        {
                                                                            log.message
                                                                        }
                                                                    </pre>
                                                                </div>
                                                                <div className="text-xs text-gray-600">
                                                                    <span className="font-medium">
                                                                        Timestamp:
                                                                    </span>{' '}
                                                                    {new Date(
                                                                        log.timestamp
                                                                    ).toISOString()}
                                                                </div>
                                                                <div className="text-xs text-gray-600">
                                                                    <span className="font-medium">
                                                                        Log ID:
                                                                    </span>{' '}
                                                                    {log.id}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
