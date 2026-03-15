import {
    createContext,
    startTransition,
    useContext,
    useEffect,
    useEffectEvent,
    useMemo,
    useState,
    type ReactNode
} from 'react'
import {
    createProcessingProject,
    listProjects,
    markProjectProcessing,
    openProjectDirectory,
    recoverInterruptedProjects,
    readProjectArtifacts,
    setProjectPreviewMode
} from '@/lib/site2react/repository'
import { getErrorMessage, upsertProject } from '@/lib/site2react/utils'
import { normalizeImportUrl } from '@/lib/site2react/validation'
import type {
    PreviewMode,
    ProjectArtifacts,
    ProjectRecord
} from '@/types/projects'

interface ProjectsContextValue {
    projects: ProjectRecord[]
    isLoading: boolean
    isImporting: boolean
    loadError: string | null
    createImport: (rawUrl: string) => Promise<ProjectRecord>
    reprocessProject: (projectId: string) => Promise<ProjectRecord>
    refreshProjects: () => Promise<void>
    readArtifacts: (projectId: string) => Promise<ProjectArtifacts>
    updatePreviewMode: (
        projectId: string,
        previewMode: PreviewMode
    ) => Promise<void>
    openLocalFolder: (project: ProjectRecord) => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<ProjectRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const syncProject = useEffectEvent((project: ProjectRecord) => {
        startTransition(() => {
            setProjects((currentProjects) =>
                upsertProject(currentProjects, project)
            )
        })
    })

    const refreshProjects = useEffectEvent(async () => {
        try {
            const nextProjects = await listProjects()

            startTransition(() => {
                setProjects(nextProjects)
                setLoadError(null)
                setIsLoading(false)
            })
        } catch (error) {
            startTransition(() => {
                setLoadError(getErrorMessage(error))
                setIsLoading(false)
            })
        }
    })

    const runBackgroundImport = useEffectEvent(
        async (projectId: string, url: string) => {
            const { processSiteImport } = await import(
                '@/lib/site2react/importer'
            )
            const project = await processSiteImport(projectId, url)
            syncProject(project)
            await refreshProjects()
        }
    )

    useEffect(() => {
        void (async () => {
            try {
                const nextProjects = await recoverInterruptedProjects()

                startTransition(() => {
                    setProjects(nextProjects)
                    setLoadError(null)
                    setIsLoading(false)
                })
            } catch (error) {
                startTransition(() => {
                    setLoadError(getErrorMessage(error))
                    setIsLoading(false)
                })
            }
        })()
    }, [])

    const createImport = useEffectEvent(async (rawUrl: string) => {
        const normalizedUrl = normalizeImportUrl(rawUrl)
        const project = await createProcessingProject(normalizedUrl)

        syncProject(project)
        void runBackgroundImport(project.id, normalizedUrl)

        return project
    })

    const reprocessProject = useEffectEvent(async (projectId: string) => {
        const project = await markProjectProcessing(projectId)

        syncProject(project)
        void runBackgroundImport(project.id, project.url)

        return project
    })

    const updatePreviewMode = useEffectEvent(
        async (projectId: string, previewMode: PreviewMode) => {
            const project = await setProjectPreviewMode(projectId, previewMode)

            if (project) {
                syncProject(project)
            }
        }
    )

    const openLocalFolder = useEffectEvent(async (project: ProjectRecord) => {
        await openProjectDirectory(project)
    })

    const value = useMemo<ProjectsContextValue>(
        () => ({
            projects,
            isLoading,
            isImporting: projects.some(
                (project) => project.status === 'processing'
            ),
            loadError,
            createImport,
            reprocessProject,
            refreshProjects,
            readArtifacts: readProjectArtifacts,
            updatePreviewMode,
            openLocalFolder
        }),
        [
            createImport,
            isLoading,
            loadError,
            openLocalFolder,
            projects,
            refreshProjects,
            reprocessProject,
            updatePreviewMode
        ]
    )

    return (
        <ProjectsContext.Provider value={value}>
            {children}
        </ProjectsContext.Provider>
    )
}

export function useProjectsContext() {
    const value = useContext(ProjectsContext)

    if (!value) {
        throw new Error('ProjectsProvider is missing.')
    }

    return value
}
