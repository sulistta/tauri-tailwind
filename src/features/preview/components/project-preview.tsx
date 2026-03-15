import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import {
    SandpackLayout,
    SandpackPreview,
    SandpackProvider,
    useErrorMessage
} from '@codesandbox/sandpack-react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildIframePreviewDocument } from '@/lib/site2react/preview'
import { useProjects } from '@/features/projects/hooks/use-projects'
import { cn } from '@/lib/utils'
import type { ProjectArtifacts, ProjectRecord } from '@/types/projects'

function SandpackErrorBridge({
    onErrorChange
}: {
    onErrorChange: (errorMessage: string | null) => void
}) {
    const errorMessage = useErrorMessage()

    useEffect(() => {
        onErrorChange(errorMessage)
    }, [errorMessage, onErrorChange])

    return null
}

export function ProjectPreview({
    project,
    artifacts
}: {
    project: ProjectRecord
    artifacts: ProjectArtifacts | null
}) {
    const { updatePreviewMode } = useProjects()
    const previewContainerRef = useRef<HTMLDivElement | null>(null)
    const [runtimeError, setRuntimeError] = useState<string | null>(null)
    const [fullscreenError, setFullscreenError] = useState<string | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        setRuntimeError(null)
        setFullscreenError(null)
    }, [project.id, project.updatedAt])

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(
                document.fullscreenElement === previewContainerRef.current
            )
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange
            )
        }
    }, [])

    const handleErrorChange = useEffectEvent((errorMessage: string | null) => {
        setRuntimeError(errorMessage)

        if (errorMessage && project.previewMode !== 'iframe') {
            void updatePreviewMode(project.id, 'iframe')
        }
    })

    const iframePreviewDocument = useMemo(
        () =>
            buildIframePreviewDocument(
                artifacts?.cleanedHtml ?? '',
                artifacts?.stylesCss ?? ''
            ),
        [artifacts?.cleanedHtml, artifacts?.stylesCss]
    )

    const toggleFullscreen = useEffectEvent(async () => {
        const container = previewContainerRef.current

        if (!container || typeof container.requestFullscreen !== 'function') {
            setFullscreenError(
                'Tela cheia indisponivel neste ambiente de execucao.'
            )
            return
        }

        try {
            if (document.fullscreenElement === container) {
                await document.exitFullscreen()
            } else {
                await container.requestFullscreen()
            }

            setFullscreenError(null)
        } catch {
            setFullscreenError(
                'Nao foi possivel alternar o preview para tela cheia.'
            )
        }
    })

    const previewModeLabel =
        project.previewMode === 'iframe' || runtimeError
            ? 'Fallback iframe'
            : 'Preview React'

    const previewToolbar = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                {previewModeLabel}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void toggleFullscreen()}
            >
                {isFullscreen ? (
                    <Minimize2 className="mr-2 h-4 w-4" />
                ) : (
                    <Maximize2 className="mr-2 h-4 w-4" />
                )}
                {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            </Button>
        </div>
    )

    const shellClassName = cn(
        'flex flex-col gap-4',
        isFullscreen && 'h-full w-full bg-white p-4 sm:p-6'
    )

    const previewFrameClassName = cn(
        'w-full rounded-[24px] border border-zinc-200 bg-white',
        isFullscreen ? 'h-full flex-1 min-h-0' : 'min-h-[560px]'
    )

    const previewSurfaceClassName = cn(
        'overflow-hidden rounded-[24px] border border-zinc-200 bg-white',
        isFullscreen && 'flex-1 min-h-0'
    )

    const sandpackLayoutClassName = cn(
        'bg-white',
        isFullscreen ? 'h-full min-h-0' : 'min-h-[560px]'
    )

    const sandpackPreviewClassName = cn(
        isFullscreen ? 'h-full min-h-0' : 'min-h-[560px]'
    )

    if (!artifacts?.appJsx.trim()) {
        return (
            <div ref={previewContainerRef} className={shellClassName}>
                {previewToolbar}

                {fullscreenError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                        {fullscreenError}
                    </div>
                ) : null}

                <div
                    className={cn(
                        'flex items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50/80 px-6 text-center text-sm leading-6 text-zinc-500',
                        isFullscreen ? 'flex-1 min-h-0' : 'min-h-[560px]'
                    )}
                >
                    {project.status === 'processing'
                        ? 'Processando o site e preparando o preview...'
                        : 'Ainda nao ha artefatos suficientes para gerar o preview.'}
                </div>
            </div>
        )
    }

    if (project.previewMode === 'iframe' || runtimeError) {
        return (
            <div ref={previewContainerRef} className={shellClassName}>
                {previewToolbar}

                {fullscreenError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                        {fullscreenError}
                    </div>
                ) : null}

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    {runtimeError
                        ? `O preview React falhou e o app trocou automaticamente para iframe. Detalhe: ${runtimeError}`
                        : 'Preview React indisponivel para este projeto. Exibindo fallback em iframe com o HTML limpo.'}
                </div>

                <iframe
                    className={previewFrameClassName}
                    srcDoc={iframePreviewDocument}
                    sandbox="allow-forms allow-modals allow-popups allow-same-origin"
                    title={`Fallback preview for ${project.title}`}
                />
            </div>
        )
    }

    return (
        <div ref={previewContainerRef} className={shellClassName}>
            {previewToolbar}

            {fullscreenError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {fullscreenError}
                </div>
            ) : null}

            <div className={previewSurfaceClassName}>
                <SandpackProvider
                    template="vite-react"
                    files={{
                        '/App.jsx': artifacts.appJsx,
                        '/styles.css': artifacts.stylesCss,
                        '/src/main.jsx': artifacts.mainJsx,
                        '/index.html': artifacts.indexHtml,
                        '/package.json': artifacts.packageJson
                    }}
                    options={{
                        autorun: true,
                        autoReload: true,
                        activeFile: '/App.jsx',
                        visibleFiles: ['/App.jsx', '/styles.css'],
                        recompileMode: 'immediate'
                    }}
                >
                    <SandpackErrorBridge onErrorChange={handleErrorChange} />
                    <SandpackLayout className={sandpackLayoutClassName}>
                        <SandpackPreview
                            showNavigator={false}
                            showSandpackErrorOverlay
                            showOpenInCodeSandbox={false}
                            showOpenNewtab={false}
                            showRefreshButton
                            className={sandpackPreviewClassName}
                        />
                    </SandpackLayout>
                </SandpackProvider>
            </div>
        </div>
    )
}
