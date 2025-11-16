import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
    className?: string
    variant?: 'text' | 'card' | 'table' | 'button' | 'avatar'
    count?: number
}

export function LoadingSkeleton({
    className,
    variant = 'text',
    count = 1
}: LoadingSkeletonProps) {
    const baseClasses = 'animate-pulse bg-muted rounded'

    const variantClasses = {
        text: 'h-4 w-full',
        card: 'h-32 w-full',
        table: 'h-12 w-full',
        button: 'h-10 w-24',
        avatar: 'h-12 w-12 rounded-full'
    }

    const items = Array.from({ length: count }, (_, i) => i)

    return (
        <>
            {items.map((i) => (
                <div
                    key={i}
                    className={cn(
                        baseClasses,
                        variantClasses[variant],
                        className
                    )}
                />
            ))}
        </>
    )
}

export function CardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn('rounded-lg border bg-card p-6 space-y-4', className)}
        >
            <div className="space-y-2">
                <LoadingSkeleton variant="text" className="w-1/3" />
                <LoadingSkeleton variant="text" className="w-1/2" />
            </div>
            <div className="space-y-2">
                <LoadingSkeleton variant="text" />
                <LoadingSkeleton variant="text" />
                <LoadingSkeleton variant="text" className="w-4/5" />
            </div>
        </div>
    )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-2">
            <LoadingSkeleton variant="table" className="h-10" />
            {Array.from({ length: rows }, (_, i) => (
                <LoadingSkeleton key={i} variant="table" />
            ))}
        </div>
    )
}

export function ListSkeleton({ items = 3 }: { items?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <LoadingSkeleton variant="avatar" />
                    <div className="flex-1 space-y-2">
                        <LoadingSkeleton variant="text" className="w-1/3" />
                        <LoadingSkeleton variant="text" className="w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )
}
