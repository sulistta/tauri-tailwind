import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function AppFrame({
    children,
    eyebrow,
    title,
    description
}: {
    children: ReactNode
    eyebrow: string
    title: string
    description: string
}) {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.08),transparent_38%),linear-gradient(180deg,#f7f5f1_0%,#f2efe9_100%)]">
            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
                <header className="mb-8 rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur sm:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <Link
                                to="/"
                                className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600"
                            >
                                {eyebrow}
                            </Link>
                            <div className="space-y-1">
                                <h1 className="font-['Avenir_Next','Segoe_UI',sans-serif] text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl">
                                    {title}
                                </h1>
                                <p className="max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
                                    {description}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
                            HTML estatico in, React exportavel out.
                        </div>
                    </div>
                </header>

                {children}
            </div>
        </div>
    )
}
