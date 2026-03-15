import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
    ({ className, type = 'text', ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                className={cn(
                    'flex h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] text-zinc-950 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.4)] transition outline-none placeholder:text-zinc-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60',
                    className
                )}
                {...props}
            />
        )
    }
)

Input.displayName = 'Input'

export { Input }
