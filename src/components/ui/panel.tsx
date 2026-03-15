import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function Panel({
    className,
    ...props
}: ComponentPropsWithoutRef<'section'>) {
    return (
        <section
            className={cn(
                'rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur',
                className
            )}
            {...props}
        />
    )
}
