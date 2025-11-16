// WhatsApp Connection Types
export type WhatsAppStatus =
    | 'initializing'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'uninitialized'
    | 'error'

export interface ConnectionStateEvent {
    status: WhatsAppStatus
    phone_number?: string
    qr_code?: string
    error?: string
    error_details?: ConnectionErrorDetails
    timestamp: number
}

export interface ConnectionErrorDetails {
    type: ConnectionErrorType
    category: string
    recoverable: boolean
    user_message: string
    technical_message: string
}

export type ConnectionErrorType =
    | {
          type: 'InitializationFailed'
          details: { message: string; recoverable: boolean }
      }
    | { type: 'InitializationTimeout'; details: { duration_seconds: number } }
    | { type: 'InitializationInProgress' }
    | { type: 'InitializationBlocked'; details: { duration_seconds: number } }
    | { type: 'ProcessSpawnFailed'; details: { message: string } }
    | { type: 'ProcessDied'; details: { exit_code: number | null } }
    | { type: 'ProcessNotRunning' }
    | { type: 'SessionCheckFailed'; details: { message: string } }
    | { type: 'ConnectionTimeout'; details: { duration_seconds: number } }
    | { type: 'ConnectionLost'; details: { reason: string | null } }
    | { type: 'AuthenticationFailed'; details: { reason: string } }
    | { type: 'QRCodeTimeout'; details: { duration_seconds: number } }
    | { type: 'CommandFailed'; details: { command: string; message: string } }
    | {
          type: 'RecoveryFailed'
          details: { attempts: number; last_error: string }
      }
    | {
          type: 'InvalidState'
          details: {
              current_state: string
              required_state: string
              operation: string
          }
      }
    | { type: 'Other'; details: { message: string } }

export interface InitializationResult {
    state: WhatsAppStatus
    has_session: boolean
    requires_qr: boolean
}

// Group Management Types
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

// Logging Types
export type LogLevel = 'debug' | 'info' | 'warning' | 'error'
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
