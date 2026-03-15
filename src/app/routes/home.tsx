import { useNavigate } from 'react-router'
import { AppFrame } from '@/components/app-frame'
import { Panel } from '@/components/ui/panel'
import { ImportForm } from '@/features/import/components/import-form'
import { RecentProjectsList } from '@/features/projects/components/recent-projects-list'
import { useProjects } from '@/features/projects/hooks/use-projects'

export function HomePage() {
    const navigate = useNavigate()
    const { createImport, isImporting, isLoading, loadError, projects } =
        useProjects()

    return (
        <AppFrame
            eyebrow="Site2React"
            title="Importe uma pagina e gere um projeto React minimo"
            description="Cole uma URL, baixe HTML e CSS, limpe o markup, converta para JSX basico e inspecione o resultado com preview ao vivo."
        >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <Panel className="space-y-6">
                    <div className="space-y-3">
                        <div className="inline-flex rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
                            MVP local-first
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
                                Fluxo completo para paginas simples
                            </h2>
                            <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
                                O app baixa a pagina, coleta CSS externo, remove
                                scripts e elementos perigosos, gera artefatos
                                locais e monta um preview com fallback em
                                iframe.
                            </p>
                        </div>
                    </div>

                    {loadError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                            {loadError}
                        </div>
                    ) : null}

                    <ImportForm
                        disabled={isImporting}
                        onImport={async (url) => {
                            const project = await createImport(url)
                            navigate(`/projects/${project.id}`)
                            return project
                        }}
                    />
                </Panel>

                <Panel className="space-y-5">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                            Escopo desta versao
                        </h2>
                        <p className="text-sm leading-6 text-zinc-600">
                            Entrega o fluxo inteiro, mas deliberadamente suporta
                            menos casos para manter o MVP robusto.
                        </p>
                    </div>

                    <div className="grid gap-3">
                        {[
                            'Uma URL por importacao, sem crawler multi-pagina.',
                            'Sem backend remoto, autenticacao ou banco externo.',
                            'Foco em paginas estaticas/SSR, nao em SPAs pesadas.',
                            'Preview React com fallback automatico em iframe.'
                        ].map((item) => (
                            <div
                                key={item}
                                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </Panel>
            </div>

            <div className="mt-5">
                <RecentProjectsList projects={projects} isLoading={isLoading} />
            </div>
        </AppFrame>
    )
}

// Necessary for react router to lazy load.
export const Component = HomePage
