import type { ProjectRecord } from '@/types/projects'

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'string') {
        return error
    }

    return 'Unexpected error'
}

export function sortProjects(projects: ProjectRecord[]) {
    return [...projects].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
    )
}

export function upsertProject(
    projects: ProjectRecord[],
    project: ProjectRecord
): ProjectRecord[] {
    return sortProjects(
        projects.filter((entry) => entry.id !== project.id).concat(project)
    )
}

export function formatProjectTimestamp(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value))
}

export function getProjectDisplayTitle(project: ProjectRecord) {
    return project.title.trim() || project.url
}

export function trimMultilineContent(content: string) {
    return content.trim().length > 0 ? content : 'Nenhum conteúdo disponível.'
}
