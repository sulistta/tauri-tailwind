import { AlertCircle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorDisplayProps {
    error: Error | string | null
    title?: string
    onRetry?: () => void
    onDismiss?: () => void
    className?: string
    variant?: 'inline' | 'card' | 'banner'
}

/**
 * User-friendly error display component
 */
export function ErrorDisplay({
    error,
    title = 'An error occurred',
    onRetry,
    onDismiss,
    className,
    variant = 'card'
}: ErrorDisplayProps) {
    if (!error) return null

    const errorMessage = error instanceof Error ? error.message : error

    const baseClasses = 'flex items-start gap-3 text-sm'

    const variantClasses = {
        inline: 'p-3 rounded-md bg-red-50 border border-red-200',
        card: 'p-4 rounded-lg bg-red-50 border border-red-200 shadow-sm',
        banner: 'p-4 bg-red-50 border-l-4 border-red-500'
    }

    return (
        <div className={cn(baseClasses, variantClasses[variant], className)}>
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />

            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
                <p className="text-red-700 break-words">{errorMessage}</p>

                {(onRetry || onDismiss) && (
                    <div className="flex gap-2 mt-3">
                        {onRetry && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onRetry}
                                className="border-red-300 text-red-700 hover:bg-red-100"
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Retry
                            </Button>
                        )}
                        {onDismiss && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onDismiss}
                                className="text-red-700 hover:bg-red-100"
                            >
                                Dismiss
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="text-red-600 hover:text-red-800 flex-shrink-0"
                    aria-label="Dismiss error"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
        </div>
    )
}

/**
 * Compact error message for inline display
 */
export function ErrorMessage({
    error,
    className
}: {
    error: Error | string | null
    className?: string
}) {
    if (!error) return null

    const errorMessage = error instanceof Error ? error.message : error

    return (
        <div
            className={cn(
                'flex items-center gap-2 text-sm text-red-600',
                className
            )}
        >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
        </div>
    )
}
