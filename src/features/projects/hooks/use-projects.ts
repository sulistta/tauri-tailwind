import { useProjectsContext } from '@/features/projects/context/projects-context'

export function useProjects() {
    return useProjectsContext()
}
