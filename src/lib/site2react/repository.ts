import { appLocalDataDir, BaseDirectory, join } from '@tauri-apps/api/path'
import {
    exists,
    mkdir,
    readTextFile,
    writeTextFile
} from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-shell'
import { LazyStore } from '@tauri-apps/plugin-store'
import {
    PROJECTS_DIRECTORY,
    PROJECT_FILE_PATHS,
    SITE2REACT_STORE_KEY,
    SITE2REACT_STORE_PATH
} from '@/lib/site2react/constants'
import { sortProjects, upsertProject } from '@/lib/site2react/utils'
import type {
    PreviewMode,
    ProjectArtifacts,
    ProjectRecord
} from '@/types/projects'

const projectsStore = new LazyStore(SITE2REACT_STORE_PATH, {
    defaults: {
        [SITE2REACT_STORE_KEY]: []
    },
    autoSave: 150
})

async function getProjectsStore() {
    await projectsStore.init()
    return projectsStore
}

async function persistProjects(projects: ProjectRecord[]) {
    const store = await getProjectsStore()
    const nextProjects = sortProjects(projects)

    await store.set(SITE2REACT_STORE_KEY, nextProjects)
    await store.save()

    return nextProjects
}

async function readOptionalTextFile(relativePath: string) {
    const fileExists = await exists(relativePath, {
        baseDir: BaseDirectory.AppLocalData
    })

    if (!fileExists) {
        return ''
    }

    return readTextFile(relativePath, {
        baseDir: BaseDirectory.AppLocalData
    })
}

function getProjectRelativeDirectory(projectId: string) {
    return `${PROJECTS_DIRECTORY}/${projectId}`
}

function getProjectRelativeFilePath(
    projectId: string,
    relativePath: string
): string {
    return `${getProjectRelativeDirectory(projectId)}/${relativePath}`
}

async function buildProjectLocalPath(projectId: string) {
    return join(await appLocalDataDir(), PROJECTS_DIRECTORY, projectId)
}

export async function listProjects() {
    const store = await getProjectsStore()
    const projects =
        (await store.get<ProjectRecord[]>(SITE2REACT_STORE_KEY)) ?? []

    return sortProjects(projects)
}

export async function recoverInterruptedProjects() {
    const projects = await listProjects()
    const interruptedProjects = projects.filter(
        (project) => project.status === 'processing'
    )

    if (interruptedProjects.length === 0) {
        return projects
    }

    const recoveredProjects = projects.map((project) => {
        if (project.status !== 'processing') {
            return project
        }

        return {
            ...project,
            status: 'error' as const,
            updatedAt: new Date().toISOString(),
            errorMessage:
                'Importacao interrompida na sessao anterior. Reprocesse o projeto.'
        }
    })

    return persistProjects(recoveredProjects)
}

export async function getProjectById(projectId: string) {
    const projects = await listProjects()
    return projects.find((project) => project.id === projectId) ?? null
}

export async function upsertProjectRecord(project: ProjectRecord) {
    const projects = await listProjects()
    await persistProjects(upsertProject(projects, project))
    return project
}

export async function createProcessingProject(url: string) {
    const now = new Date().toISOString()
    const projectId = crypto.randomUUID()
    const projectUrl = new URL(url)
    const project: ProjectRecord = {
        id: projectId,
        url,
        title: projectUrl.hostname,
        status: 'processing',
        createdAt: now,
        updatedAt: now,
        localPath: await buildProjectLocalPath(projectId),
        previewMode: 'react'
    }

    await ensureProjectDirectory(projectId)
    await upsertProjectRecord(project)

    return project
}

export async function markProjectProcessing(projectId: string) {
    const currentProject = await getProjectById(projectId)

    if (!currentProject) {
        throw new Error('Projeto nao encontrado.')
    }

    const nextProject: ProjectRecord = {
        ...currentProject,
        status: 'processing',
        updatedAt: new Date().toISOString(),
        previewMode: 'react',
        errorMessage: undefined
    }

    await upsertProjectRecord(nextProject)
    return nextProject
}

export async function setProjectPreviewMode(
    projectId: string,
    previewMode: PreviewMode
) {
    const currentProject = await getProjectById(projectId)

    if (!currentProject || currentProject.previewMode === previewMode) {
        return currentProject
    }

    const nextProject: ProjectRecord = {
        ...currentProject,
        previewMode,
        updatedAt: new Date().toISOString()
    }

    await upsertProjectRecord(nextProject)
    return nextProject
}

export async function ensureProjectDirectory(projectId: string) {
    await mkdir(getProjectRelativeFilePath(projectId, 'src'), {
        baseDir: BaseDirectory.AppLocalData,
        recursive: true
    })
}

export async function writeProjectArtifacts(
    projectId: string,
    artifacts: ProjectArtifacts
) {
    await ensureProjectDirectory(projectId)

    await Promise.all([
        writeTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.rawHtml),
            artifacts.rawHtml,
            { baseDir: BaseDirectory.AppLocalData }
        ),
        writeTextFile(
            getProjectRelativeFilePath(
                projectId,
                PROJECT_FILE_PATHS.cleanedHtml
            ),
            artifacts.cleanedHtml,
            { baseDir: BaseDirectory.AppLocalData }
        ),
        writeTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.stylesCss),
            artifacts.stylesCss,
            { baseDir: BaseDirectory.AppLocalData }
        ),
        writeTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.appJsx),
            artifacts.appJsx,
            { baseDir: BaseDirectory.AppLocalData }
        ),
        writeTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.mainJsx),
            artifacts.mainJsx,
            { baseDir: BaseDirectory.AppLocalData }
        ),
        writeTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.indexHtml),
            artifacts.indexHtml,
            { baseDir: BaseDirectory.AppLocalData }
        ),
        writeTextFile(
            getProjectRelativeFilePath(
                projectId,
                PROJECT_FILE_PATHS.packageJson
            ),
            artifacts.packageJson,
            { baseDir: BaseDirectory.AppLocalData }
        ),
        writeTextFile(
            getProjectRelativeFilePath(
                projectId,
                PROJECT_FILE_PATHS.metadataJson
            ),
            artifacts.metadataJson,
            { baseDir: BaseDirectory.AppLocalData }
        )
    ])
}

export async function readProjectArtifacts(projectId: string) {
    const [
        rawHtml,
        cleanedHtml,
        stylesCss,
        appJsx,
        mainJsx,
        indexHtml,
        packageJson,
        metadataJson
    ] = await Promise.all([
        readOptionalTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.rawHtml)
        ),
        readOptionalTextFile(
            getProjectRelativeFilePath(
                projectId,
                PROJECT_FILE_PATHS.cleanedHtml
            )
        ),
        readOptionalTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.stylesCss)
        ),
        readOptionalTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.appJsx)
        ),
        readOptionalTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.mainJsx)
        ),
        readOptionalTextFile(
            getProjectRelativeFilePath(projectId, PROJECT_FILE_PATHS.indexHtml)
        ),
        readOptionalTextFile(
            getProjectRelativeFilePath(
                projectId,
                PROJECT_FILE_PATHS.packageJson
            )
        ),
        readOptionalTextFile(
            getProjectRelativeFilePath(
                projectId,
                PROJECT_FILE_PATHS.metadataJson
            )
        )
    ])

    return {
        rawHtml,
        cleanedHtml,
        stylesCss,
        appJsx,
        mainJsx,
        indexHtml,
        packageJson,
        metadataJson
    } satisfies ProjectArtifacts
}

export async function openProjectDirectory(project: ProjectRecord) {
    await open(project.localPath)
}
