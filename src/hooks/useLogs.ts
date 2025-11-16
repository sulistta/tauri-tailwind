import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { LogEntry, LogFilter, LogLevel } from '../types/whatsapp'

export function useLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [logLevel, setLogLevelState] = useState<LogLevel>('info')

    useEffect(() => {
        // Listen for new log entries
        const unlisten = listen<LogEntry>('log_entry', (event) => {
            setLogs((prevLogs) => [...prevLogs, event.payload])
        })

        // Load initial logs and log level
        loadLogs()
        loadLogLevel()

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

    const loadLogLevel = async () => {
        try {
            const level = await invoke<string>('get_log_level')
            setLogLevelState(level as LogLevel)
        } catch (error) {
            console.error('Failed to load log level:', error)
        }
    }

    const setLogLevel = async (level: LogLevel) => {
        try {
            await invoke('set_log_level', { level })
            setLogLevelState(level)
        } catch (error) {
            console.error('Failed to set log level:', error)
            throw error
        }
    }

    return {
        logs,
        loading,
        logLevel,
        loadLogs,
        clearLogs,
        filterLogs,
        setLogLevel,
        loadLogLevel
    }
}
