import { createContext, useContext, ReactNode } from 'react'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import type { WhatsAppStatus } from '@/hooks/useWhatsApp'

interface WhatsAppContextType {
    status: WhatsAppStatus
    qrCode: string | null
    phoneNumber: string | null
    error: string | null
    connect: () => Promise<void>
    isRecovering: boolean
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(
    undefined
)

export function WhatsAppProvider({ children }: { children: ReactNode }) {
    const whatsappState = useWhatsApp()

    return (
        <WhatsAppContext.Provider value={whatsappState}>
            {children}
        </WhatsAppContext.Provider>
    )
}

export function useWhatsAppContext() {
    const context = useContext(WhatsAppContext)
    if (context === undefined) {
        throw new Error(
            'useWhatsAppContext must be used within a WhatsAppProvider'
        )
    }
    return context
}
