import { Loader2 } from 'lucide-react'

interface LoadingScreenProps {
    message?: string
}

export function LoadingScreen({
    message = 'Carregando...'
}: LoadingScreenProps) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background animate-fade-in">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    )
}
