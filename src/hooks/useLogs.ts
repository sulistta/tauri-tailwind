import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { LogEntry, LogFilter } from '../types/whatsapp'

export function useLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Listen for new log entries
        const unlisten = listen<LogEntry>('log_entry', (event) => {
            setLogs((prevLogs) => [...prevLogs, event.payload])
        })

        // Load initial logs
        loadLogs()

        return () => {
            unlisten.then((fn) => fn())
        }
    }, [])

    const loadLogs = async (filter?: LogFilter) => {
        setLoading(true)
        try {
            const result = await invoke<LogEntry[]>('get_logs', { filter })
            setLogs(result)
        } catch (error) {
            console.error('Failed to load logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const clearLogs = async () => {
        try {
            await invoke('clear_logs')
            setLogs([])
        } catch (error) {
            console.error('Failed to clear logs:', error)
        }
    }

    const filterLogs = (filter: LogFilter) => {
        loadLogs(filter)
    }

    return {
        logs,
        loading,
        loadLogs,
        clearLogs,
        filterLogs
    }
}
