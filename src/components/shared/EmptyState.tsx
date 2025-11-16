import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
    children?: ReactNode
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    children
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/10 p-12 text-center transition-colors',
                className
            )}
        >
            {Icon && (
                <div className="mb-4 rounded-full bg-muted p-4">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
            )}

            <h3 className="mb-2 text-lg font-semibold text-foreground">
                {title}
            </h3>

            {description && (
                <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}

            {action && (
                <Button onClick={action.onClick} className="transition-all">
                    {action.label}
                </Button>
            )}

            {children}
        </div>
    )
}
