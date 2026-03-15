export type ProjectStatus = 'idle' | 'processing' | 'success' | 'error'

export type PreviewMode = 'react' | 'iframe'

export interface CssSourceRecord {
    id: string
    source: 'external' | 'inline'
    href: string
    resolvedUrl: string
    success: boolean
    size: number
    errorMessage?: string
}

export interface ProjectRecord {
    id: string
    url: string
    title: string
    status: ProjectStatus
    createdAt: string
    updatedAt: string
    localPath: string
    previewMode: PreviewMode
    errorMessage?: string
}

export interface ProjectMetadataDocument {
    project: ProjectRecord
    generatedAt: string
    cssSources: CssSourceRecord[]
    artifactPaths: {
        rawHtml: string
        cleanedHtml: string
        stylesCss: string
        appJsx: string
        mainJsx: string
        indexHtml: string
        packageJson: string
        metadataJson: string
    }
}

export interface ProjectArtifacts {
    rawHtml: string
    cleanedHtml: string
    stylesCss: string
    appJsx: string
    mainJsx: string
    indexHtml: string
    packageJson: string
    metadataJson: string
}
