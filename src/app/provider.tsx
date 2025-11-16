import { ReactNode, Suspense } from 'react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import AppErrorPage from '@/features/errors/app-error.tsx'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'sonner'
import { WhatsAppProvider } from '@/contexts/WhatsAppContext'

export default function AppProvider({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<>Loading...</>}>
            <ErrorBoundary FallbackComponent={AppErrorPage}>
                <WhatsAppProvider>
                    <TooltipProvider>
                        {children}
                        <Toaster position="top-right" richColors closeButton />
                    </TooltipProvider>
                </WhatsAppProvider>
            </ErrorBoundary>
        </Suspense>
    )
}
