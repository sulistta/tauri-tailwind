import { ReactNode, Suspense } from 'react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import AppErrorPage from '@/features/errors/app-error.tsx'
import { ErrorBoundary } from 'react-error-boundary'
import { ProjectsProvider } from '@/features/projects/context/projects-context'

export default function AppProvider({ children }: { children: ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
                    Carregando Site2React...
                </div>
            }
        >
            <ErrorBoundary FallbackComponent={AppErrorPage}>
                <TooltipProvider>
                    <ProjectsProvider>{children}</ProjectsProvider>
                </TooltipProvider>
            </ErrorBoundary>
        </Suspense>
    )
}
