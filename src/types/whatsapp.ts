export interface GroupInfo {
    id: string
    name: string
    participantCount: number
    isAdmin: boolean
}

export interface Participant {
    phoneNumber: string
    name: string | null
    isAdmin: boolean
}

export interface AdditionReport {
    successful: string[]
    failed: FailedAddition[]
    totalProcessed: number
}

export interface FailedAddition {
    phoneNumber: string
    reason: string
}

export type LogLevel = 'info' | 'warning' | 'error'
export type LogCategory = 'general' | 'automation' | 'whatsapp'

export interface LogEntry {
    id: string
    timestamp: string
    level: LogLevel
    category: LogCategory
    message: string
}

export interface LogFilter {
    level?: LogLevel
    category?: LogCategory
}
