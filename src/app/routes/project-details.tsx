import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AppFrame } from '@/components/app-frame'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { Panel } from '@/components/ui/panel'
import { ProjectStatusBadge } from '@/features/projects/components/project-status-badge'
import { useProjectDetails } from '@/features/projects/hooks/use-project-details'
import { useProjects } from '@/features/projects/hooks/use-projects'
import { ProjectPreview } from '@/features/preview/components/project-preview'
import {
    formatProjectTimestamp,
    trimMultilineContent
} from '@/lib/site2react/utils'

const DETAIL_TABS = [
    { id: 'preview', label: 'Preview' },
    { id: 'raw', label: 'HTML bruto' },
    { id: 'cleaned', label: 'HTML limpo' },
    { id: 'jsx', label: 'JSX gerado' },
    { id: 'css', label: 'CSS coletado' }
] as const

type DetailTab = (typeof DETAIL_TABS)[number]['id']

export function ProjectDetailsPage() {
    const { projectId } = useParams()
    const { reprocessProject, openLocalFolder } = useProjects()
    const { project, artifacts, metadata, isArtifactsLoading, artifactsError } =
        useProjectDetails(projectId)
    const [activeTab, setActiveTab] = useState<DetailTab>('preview')
    const [actionError, setActionError] = useState<string | null>(null)

    const cssSummary = useMemo(() => {
        if (!metadata) {
            return []
        }

        return metadata.cssSources.slice(0, 6)
    }, [metadata])

    function renderTabContent() {
        if (!project) {
            return null
        }

        if (activeTab === 'preview') {
            return <ProjectPreview project={project} artifacts={artifacts} />
        }

        if (activeTab === 'raw') {
            return (
                <CodeBlock
                    content={artifacts?.rawHtml ?? ''}
                    emptyMessage="O HTML bruto ainda nao esta disponivel."
                />
            )
        }

        if (activeTab === 'cleaned') {
            return (
                <CodeBlock
                    content={artifacts?.cleanedHtml ?? ''}
                    emptyMessage="O HTML limpo ainda nao esta disponivel."
                />
            )
        }

        if (activeTab === 'jsx') {
            return (
                <CodeBlock
                    content={artifacts?.appJsx ?? ''}
                    emptyMessage="O JSX gerado ainda nao esta disponivel."
                />
            )
        }

        return (
            <CodeBlock
                content={artifacts?.stylesCss ?? ''}
                emptyMessage="Nenhum CSS foi coletado para este projeto."
            />
        )
    }

    if (!project) {
        return (
            <AppFrame
                eyebrow="Site2React"
                title="Projeto nao encontrado"
                description="O item solicitado nao existe mais no historico local ou ainda nao foi persistido."
            >
                <Panel className="space-y-4">
                    <p className="text-sm leading-6 text-zinc-600">
                        Volte para a tela inicial e escolha um projeto valido na
                        lista recente.
                    </p>
                    <Button asChild className="rounded-2xl">
                        <Link to="/">Voltar para importacao</Link>
                    </Button>
                </Panel>
            </AppFrame>
        )
    }

    return (
        <AppFrame
            eyebrow="Detalhes"
            title={project.title}
            description={project.url}
        >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_360px]">
                <div className="space-y-5">
                    <Panel className="space-y-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <ProjectStatusBadge
                                        status={project.status}
                                    />
                                    <span className="text-sm text-zinc-500">
                                        Criado em{' '}
                                        {formatProjectTimestamp(
                                            project.createdAt
                                        )}
                                    </span>
                                    <span className="text-sm text-zinc-500">
                                        Atualizado em{' '}
                                        {formatProjectTimestamp(
                                            project.updatedAt
                                        )}
                                    </span>
                                </div>

                                <p className="text-sm leading-6 text-zinc-600">
                                    {project.errorMessage
                                        ? `Ultimo erro: ${project.errorMessage}`
                                        : 'Preview e artefatos do projeto convertido.'}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    className="rounded-2xl"
                                    onClick={() => {
                                        void (async () => {
                                            try {
                                                setActionError(null)
                                                await openLocalFolder(project)
                                            } catch (error) {
                                                setActionError(
                                                    trimMultilineContent(
                                                        String(
                                                            error instanceof
                                                                Error
                                                                ? error.message
                                                                : error
                                                        )
                                                    )
                                                )
                                            }
                                        })()
                                    }}
                                >
                                    Abrir pasta local
                                </Button>
                                <Button
                                    className="rounded-2xl"
                                    disabled={project.status === 'processing'}
                                    onClick={() => {
                                        void (async () => {
                                            try {
                                                setActionError(null)
                                                await reprocessProject(
                                                    project.id
                                                )
                                            } catch (error) {
                                                setActionError(
                                                    trimMultilineContent(
                                                        String(
                                                            error instanceof
                                                                Error
                                                                ? error.message
                                                                : error
                                                        )
                                                    )
                                                )
                                            }
                                        })()
                                    }}
                                >
                                    {project.status === 'processing'
                                        ? 'Reprocessando...'
                                        : 'Reprocessar'}
                                </Button>
                            </div>
                        </div>

                        {actionError ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                                {actionError}
                            </div>
                        ) : null}
                    </Panel>

                    <Panel className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {DETAIL_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                        activeTab === tab.id
                                            ? 'bg-zinc-950 text-white'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {isArtifactsLoading && activeTab !== 'preview' ? (
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                                Carregando artefatos locais...
                            </div>
                        ) : null}

                        {artifactsError ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                                {artifactsError}
                            </div>
                        ) : null}

                        {renderTabContent()}
                    </Panel>
                </div>

                <div className="space-y-5">
                    <Panel className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                                Resumo do projeto
                            </h2>
                            <p className="text-sm text-zinc-500">
                                Metadados persistidos localmente para este
                                import.
                            </p>
                        </div>

                        <dl className="space-y-3 text-sm leading-6 text-zinc-600">
                            <div>
                                <dt className="text-zinc-400">URL original</dt>
                                <dd className="break-all text-zinc-900">
                                    {project.url}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-400">
                                    Modo de preview
                                </dt>
                                <dd className="text-zinc-900">
                                    {project.previewMode}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-400">Pasta local</dt>
                                <dd className="break-all text-zinc-900">
                                    {project.localPath}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-400">CSS coletado</dt>
                                <dd className="text-zinc-900">
                                    {metadata?.cssSources.filter(
                                        (source) => source.success
                                    ).length ?? 0}{' '}
                                    arquivos/fontes
                                </dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                                Fontes CSS
                            </h2>
                            <p className="text-sm text-zinc-500">
                                Registro curto do que foi coletado durante o
                                processamento.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {cssSummary.length === 0 ? (
                                <div className="text-sm leading-6 text-zinc-500">
                                    Nenhuma fonte CSS registrada ainda.
                                </div>
                            ) : null}

                            {cssSummary.map((source) => (
                                <div
                                    key={source.id}
                                    className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                                >
                                    <div className="truncate text-sm font-medium text-zinc-900">
                                        {source.source === 'inline'
                                            ? 'Inline <style>'
                                            : source.resolvedUrl}
                                    </div>
                                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">
                                        {source.success
                                            ? `${source.size} chars`
                                            : trimMultilineContent(
                                                  source.errorMessage ?? ''
                                              )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>
        </AppFrame>
    )
}

export const Component = ProjectDetailsPage
