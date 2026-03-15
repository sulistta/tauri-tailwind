import { Link } from 'react-router'
import { Panel } from '@/components/ui/panel'
import { ProjectStatusBadge } from '@/features/projects/components/project-status-badge'
import {
    formatProjectTimestamp,
    getProjectDisplayTitle
} from '@/lib/site2react/utils'
import type { ProjectRecord } from '@/types/projects'

export function RecentProjectsList({
    projects,
    isLoading
}: {
    projects: ProjectRecord[]
    isLoading: boolean
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                        Projetos recentes
                    </h2>
                    <p className="text-sm text-zinc-500">
                        O historico fica salvo localmente no computador do
                        usuario.
                    </p>
                </div>
                <div className="text-sm text-zinc-500">
                    {projects.length} itens
                </div>
            </div>

            {isLoading ? (
                <Panel className="text-sm text-zinc-500">
                    Carregando historico local...
                </Panel>
            ) : null}

            {!isLoading && projects.length === 0 ? (
                <Panel className="text-sm leading-6 text-zinc-500">
                    Nenhum site foi importado ainda. Cole uma URL acima para
                    gerar o primeiro projeto.
                </Panel>
            ) : null}

            <div className="grid gap-3">
                {projects.map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                        <Panel className="space-y-3 transition hover:-translate-y-0.5 hover:border-zinc-200 hover:shadow-[0_30px_80px_-52px_rgba(15,23,42,0.55)]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <div className="truncate text-base font-semibold tracking-[-0.02em] text-zinc-950">
                                        {getProjectDisplayTitle(project)}
                                    </div>
                                    <div className="truncate text-sm text-zinc-500">
                                        {project.url}
                                    </div>
                                </div>
                                <ProjectStatusBadge status={project.status} />
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
                                <span>
                                    Atualizado{' '}
                                    {formatProjectTimestamp(project.updatedAt)}
                                </span>
                                <span>Preview {project.previewMode}</span>
                            </div>
                        </Panel>
                    </Link>
                ))}
            </div>
        </div>
    )
}
