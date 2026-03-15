import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { useProjects } from '@/features/projects/hooks/use-projects'
import { getErrorMessage } from '@/lib/site2react/utils'
import type {
    ProjectArtifacts,
    ProjectMetadataDocument
} from '@/types/projects'

function parseMetadata(metadataJson: string) {
    if (!metadataJson.trim()) {
        return null
    }

    try {
        return JSON.parse(metadataJson) as ProjectMetadataDocument
    } catch {
        return null
    }
}

export function useProjectDetails(projectId: string | undefined) {
    const { projects, readArtifacts } = useProjects()
    const project =
        projects.find((projectEntry) => projectEntry.id === projectId) ?? null
    const [artifacts, setArtifacts] = useState<ProjectArtifacts | null>(null)
    const [isArtifactsLoading, setIsArtifactsLoading] = useState(false)
    const [artifactsError, setArtifactsError] = useState<string | null>(null)

    const loadArtifacts = useEffectEvent(async () => {
        if (!projectId) {
            return
        }

        setIsArtifactsLoading(true)

        try {
            const nextArtifacts = await readArtifacts(projectId)

            startTransition(() => {
                setArtifacts(nextArtifacts)
                setArtifactsError(null)
                setIsArtifactsLoading(false)
            })
        } catch (error) {
            startTransition(() => {
                setArtifactsError(getErrorMessage(error))
                setIsArtifactsLoading(false)
            })
        }
    })

    useEffect(() => {
        if (!projectId || !project) {
            startTransition(() => {
                setArtifacts(null)
                setArtifactsError(null)
                setIsArtifactsLoading(false)
            })
            return
        }

        if (project.status === 'processing' && artifacts) {
            return
        }

        void loadArtifacts()
    }, [artifacts, project, projectId])

    return {
        project,
        artifacts,
        metadata: parseMetadata(artifacts?.metadataJson ?? ''),
        isArtifactsLoading,
        artifactsError
    }
}
