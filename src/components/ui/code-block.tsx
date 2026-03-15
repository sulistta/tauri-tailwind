import { trimMultilineContent } from '@/lib/site2react/utils'

export function CodeBlock({
    content,
    emptyMessage
}: {
    content: string
    emptyMessage?: string
}) {
    return (
        <pre className="max-h-[620px] overflow-auto rounded-[24px] border border-zinc-900/85 bg-zinc-950 px-4 py-4 text-[13px] leading-6 text-zinc-100 shadow-inner select-text sm:px-5">
            {content.trim()
                ? content
                : (emptyMessage ?? trimMultilineContent(content))}
        </pre>
    )
}
