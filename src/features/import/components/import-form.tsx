import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/site2react/utils'
import type { ProjectRecord } from '@/types/projects'

export function ImportForm({
    disabled,
    onImport
}: {
    disabled: boolean
    onImport: (url: string) => Promise<ProjectRecord>
}) {
    const [url, setUrl] = useState('')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setErrorMessage(null)

        try {
            await onImport(url)
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
                <label
                    className="text-sm font-medium text-zinc-700"
                    htmlFor="site-url"
                >
                    URL do site
                </label>
                <Input
                    id="site-url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com"
                    autoComplete="off"
                    disabled={disabled || isSubmitting}
                />
                <p className="text-sm leading-6 text-zinc-500">
                    O MVP prioriza paginas estaticas ou SSR simples. SPAs
                    pesadas e interacoes complexas ficam fora do escopo.
                </p>
            </div>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            <Button
                type="submit"
                size="lg"
                className="w-full rounded-2xl"
                disabled={disabled || isSubmitting}
            >
                {isSubmitting ? 'Importando...' : 'Importar site'}
            </Button>
        </form>
    )
}
