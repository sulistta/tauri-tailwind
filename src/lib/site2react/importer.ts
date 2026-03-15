import {
    PROJECT_FILE_PATHS,
    PROJECTS_DIRECTORY
} from '@/lib/site2react/constants'
import { fetchText } from '@/lib/tauri/http'
import { getErrorMessage } from '@/lib/site2react/utils'
import {
    getProjectById,
    upsertProjectRecord,
    writeProjectArtifacts
} from '@/lib/site2react/repository'
import type {
    CssSourceRecord,
    ProjectArtifacts,
    ProjectMetadataDocument,
    ProjectRecord
} from '@/types/projects'

const REMOVED_TAGS_SELECTOR =
    'script, noscript, iframe, object, embed, canvas, template, base'

const TRACKING_META_NAMES = [
    'google-site-verification',
    'facebook-domain-verification',
    'pinterest-site-verification'
]

const SANITIZED_ATTRIBUTE_NAMES = new Set([
    'nonce',
    'integrity',
    'crossorigin',
    'referrerpolicy',
    'fetchpriority',
    'ping'
])

let cheerioLoadPromise: Promise<
    (html: string) => ReturnType<typeof import('cheerio').load>
> | null = null

let htmlToJsxConverterPromise: Promise<{
    convert: (html: string, options?: { containerTag?: string }) => string
}> | null = null

async function getCheerioLoad() {
    if (!cheerioLoadPromise) {
        cheerioLoadPromise = import('cheerio').then((module) => module.load)
    }

    return cheerioLoadPromise
}

async function getHtmlToJsxConverter() {
    if (!htmlToJsxConverterPromise) {
        htmlToJsxConverterPromise = import('@erikwithuhk/html-to-jsx').then(
            (module) =>
                new module.default({
                    createClass: false,
                    indent: '    '
                })
        )
    }

    return htmlToJsxConverterPromise
}

function stripBOM(value: string) {
    return value.replace(/^\uFEFF/, '')
}

function absolutizeUrl(rawValue: string, baseUrl: string) {
    const trimmedValue = rawValue.trim()

    if (
        !trimmedValue ||
        trimmedValue.startsWith('#') ||
        trimmedValue.startsWith('data:') ||
        trimmedValue.startsWith('blob:') ||
        trimmedValue.startsWith('mailto:') ||
        trimmedValue.startsWith('tel:')
    ) {
        return trimmedValue
    }

    if (trimmedValue.startsWith('javascript:')) {
        return '#'
    }

    try {
        return new URL(trimmedValue, baseUrl).toString()
    } catch {
        return trimmedValue
    }
}

function rewriteSrcSet(value: string, baseUrl: string) {
    return value
        .split(',')
        .map((entry) => {
            const trimmedEntry = entry.trim()

            if (!trimmedEntry) {
                return trimmedEntry
            }

            const [url, descriptor] = trimmedEntry.split(/\s+/, 2)
            const resolvedUrl = absolutizeUrl(url, baseUrl)

            return descriptor ? `${resolvedUrl} ${descriptor}` : resolvedUrl
        })
        .join(', ')
}

function rewriteCssAssetUrls(css: string, baseUrl: string) {
    return css.replace(
        /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
        (fullMatch, _quote: string, rawUrl: string) => {
            const resolvedUrl = absolutizeUrl(rawUrl, baseUrl)

            if (!resolvedUrl || resolvedUrl === rawUrl) {
                return fullMatch
            }

            return `url("${resolvedUrl}")`
        }
    )
}

function getProjectArtifactPaths(projectId: string) {
    return {
        rawHtml: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.rawHtml}`,
        cleanedHtml: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.cleanedHtml}`,
        stylesCss: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.stylesCss}`,
        appJsx: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.appJsx}`,
        mainJsx: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.mainJsx}`,
        indexHtml: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.indexHtml}`,
        packageJson: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.packageJson}`,
        metadataJson: `${PROJECTS_DIRECTORY}/${projectId}/${PROJECT_FILE_PATHS.metadataJson}`
    }
}

async function fetchHtmlDocument(url: string) {
    const response = await fetchText(url, {
        method: 'GET',
        maxRedirections: 8,
        connectTimeout: 20_000
    })

    if (!response.ok) {
        throw new Error(
            `Nao foi possivel baixar a pagina (${response.status} ${response.statusText}).`
        )
    }

    return stripBOM(await response.text())
}

async function collectStylesheetLinks(rawHtml: string, pageUrl: string) {
    const load = await getCheerioLoad()
    const $ = load(rawHtml)

    return $('link[href]')
        .toArray()
        .flatMap((element) => {
            const relValue = ($(element).attr('rel') ?? '').toLowerCase()

            if (!relValue.includes('stylesheet')) {
                return []
            }

            const href = $(element).attr('href')?.trim()

            if (!href) {
                return []
            }

            return [
                {
                    id: crypto.randomUUID(),
                    source: 'external' as const,
                    href,
                    resolvedUrl: absolutizeUrl(href, pageUrl),
                    success: false,
                    size: 0
                }
            ]
        })
}

async function sanitizeHtml(rawHtml: string, pageUrl: string) {
    const load = await getCheerioLoad()
    const $ = load(rawHtml)

    const title = $('title').first().text().trim() || new URL(pageUrl).hostname

    const inlineStyles = $('style')
        .toArray()
        .map((element) => $(element).html() ?? '')
        .map((styleContent) => rewriteCssAssetUrls(styleContent, pageUrl))
        .filter(Boolean)

    $('meta').each((_, element) => {
        const metaElement = $(element)
        const metaName = metaElement.attr('name')?.toLowerCase() ?? ''
        const metaProperty = metaElement.attr('property')?.toLowerCase() ?? ''
        const httpEquiv = metaElement.attr('http-equiv')?.toLowerCase() ?? ''

        if (
            TRACKING_META_NAMES.some((entry) => metaName.includes(entry)) ||
            metaProperty.includes('fb:app_id') ||
            httpEquiv === 'refresh'
        ) {
            metaElement.remove()
        }
    })

    $(REMOVED_TAGS_SELECTOR).remove()
    $('link').remove()
    $('style').remove()

    $('img').each((_, element) => {
        const imageElement = $(element)
        const width = imageElement.attr('width')
        const height = imageElement.attr('height')
        const source = imageElement.attr('src') ?? ''
        const altText = imageElement.attr('alt') ?? ''

        if (
            (width === '1' && height === '1') ||
            source.includes('analytics') ||
            source.includes('tracker') ||
            altText.toLowerCase().includes('tracking pixel')
        ) {
            imageElement.remove()
        }
    })

    $('*').each((_, element) => {
        const cheerioElement = $(element)
        const attributes =
            'attribs' in element && element.attribs ? element.attribs : {}

        Object.entries(attributes).forEach(
            ([attributeName, attributeValue]) => {
                const normalizedAttribute = attributeName.toLowerCase()
                const normalizedValue = String(attributeValue)

                if (
                    normalizedAttribute.startsWith('on') ||
                    SANITIZED_ATTRIBUTE_NAMES.has(normalizedAttribute)
                ) {
                    cheerioElement.removeAttr(attributeName)
                    return
                }

                if (normalizedAttribute === 'href') {
                    cheerioElement.attr(
                        attributeName,
                        absolutizeUrl(normalizedValue, pageUrl)
                    )
                    return
                }

                if (
                    normalizedAttribute === 'src' ||
                    normalizedAttribute === 'poster' ||
                    normalizedAttribute === 'action'
                ) {
                    cheerioElement.attr(
                        attributeName,
                        absolutizeUrl(normalizedValue, pageUrl)
                    )
                    return
                }

                if (normalizedAttribute === 'srcset') {
                    cheerioElement.attr(
                        attributeName,
                        rewriteSrcSet(normalizedValue, pageUrl)
                    )
                }
            }
        )
    })

    const bodyMarkup = $('body').html()?.trim() || $.root().html()?.trim() || ''

    if (!bodyMarkup) {
        throw new Error(
            'Nenhum markup renderizavel permaneceu depois da limpeza do HTML.'
        )
    }

    return {
        title,
        cleanedHtml: $.html(),
        jsxMarkup: bodyMarkup,
        inlineCss: inlineStyles.join('\n\n')
    }
}

async function convertHtmlToJsx(jsxMarkup: string) {
    const converter = await getHtmlToJsxConverter()
    const convertedMarkup = converter
        .convert(jsxMarkup, {
            containerTag: 'div'
        })
        .trim()

    if (!convertedMarkup) {
        throw new Error('Falha ao converter o HTML limpo para JSX.')
    }

    return convertedMarkup
}

function buildAppJsx(jsxMarkup: string) {
    return `export default function App() {
    return (
${jsxMarkup
    .split('\n')
    .map((line) => `        ${line}`)
    .join('\n')}
    )
}
`
}

function buildMainJsx() {
    return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App.jsx'
import '../styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
`
}

function buildIndexHtml(title: string) {
    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/src/main.jsx"></script>
    </body>
</html>
`
}

function buildPackageJson() {
    return JSON.stringify(
        {
            name: 'site2react-export',
            private: true,
            version: '0.0.0',
            type: 'module',
            scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview'
            },
            dependencies: {
                react: '^19.2.0',
                'react-dom': '^19.2.0'
            },
            devDependencies: {
                vite: '^7.1.12',
                '@vitejs/plugin-react': '^5.1.0'
            }
        },
        null,
        2
    )
}

function buildStylesCss(cssChunks: string[]) {
    const normalizedCss = cssChunks.filter(Boolean).join('\n\n').trim()

    return `body {
    margin: 0;
}

#root {
    min-height: 100vh;
}

${normalizedCss}
`
}

function buildArtifacts(
    title: string,
    rawHtml: string,
    cleanedHtml: string,
    stylesCss: string,
    appJsx: string,
    metadataJson: string
) {
    return {
        rawHtml,
        cleanedHtml,
        stylesCss,
        appJsx,
        mainJsx: buildMainJsx(),
        indexHtml: buildIndexHtml(title),
        packageJson: buildPackageJson(),
        metadataJson
    } satisfies ProjectArtifacts
}

function buildMetadataDocument(
    project: ProjectRecord,
    cssSources: CssSourceRecord[]
) {
    return {
        project,
        generatedAt: new Date().toISOString(),
        cssSources,
        artifactPaths: getProjectArtifactPaths(project.id)
    } satisfies ProjectMetadataDocument
}

export async function processSiteImport(projectId: string, url: string) {
    const currentProject = await getProjectById(projectId)

    if (!currentProject) {
        throw new Error('Projeto nao encontrado.')
    }

    try {
        const rawHtml = await fetchHtmlDocument(url)
        await writeProjectArtifacts(projectId, {
            rawHtml,
            cleanedHtml: '',
            stylesCss: '',
            appJsx: '',
            mainJsx: buildMainJsx(),
            indexHtml: buildIndexHtml(currentProject.title),
            packageJson: buildPackageJson(),
            metadataJson: ''
        })
        const stylesheetLinks = await collectStylesheetLinks(rawHtml, url)
        const { title, cleanedHtml, jsxMarkup, inlineCss } = await sanitizeHtml(
            rawHtml,
            url
        )
        const downloadedStylesheets = await Promise.allSettled(
            stylesheetLinks.map(async (cssSource) => {
                const response = await fetchText(cssSource.resolvedUrl, {
                    method: 'GET',
                    maxRedirections: 8,
                    connectTimeout: 20_000
                })

                if (!response.ok) {
                    throw new Error(
                        `Falha ao baixar CSS (${response.status} ${response.statusText}).`
                    )
                }

                const rawCss = stripBOM(await response.text())
                const normalizedCss = rewriteCssAssetUrls(
                    rawCss,
                    cssSource.resolvedUrl
                )

                return {
                    source: {
                        ...cssSource,
                        success: true,
                        size: normalizedCss.length
                    } satisfies CssSourceRecord,
                    cssText: `/* Source: ${cssSource.resolvedUrl} */\n${normalizedCss}`
                }
            })
        )

        const cssSources: CssSourceRecord[] = []
        const collectedCss: string[] = []

        downloadedStylesheets.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                cssSources.push(result.value.source)
                collectedCss.push(result.value.cssText)
                return
            }

            cssSources.push({
                ...stylesheetLinks[index],
                success: false,
                errorMessage: getErrorMessage(result.reason)
            })
        })

        if (inlineCss.trim()) {
            cssSources.push({
                id: crypto.randomUUID(),
                source: 'inline',
                href: '<style>',
                resolvedUrl: url,
                success: true,
                size: inlineCss.length
            })
            collectedCss.push(`/* Inline styles */\n${inlineCss}`)
        }

        const appJsx = buildAppJsx(await convertHtmlToJsx(jsxMarkup))
        const updatedProject: ProjectRecord = {
            ...currentProject,
            url,
            title,
            status: 'success',
            updatedAt: new Date().toISOString(),
            previewMode: 'react',
            errorMessage: undefined
        }

        const metadataDocument = buildMetadataDocument(
            updatedProject,
            cssSources
        )
        const artifacts = buildArtifacts(
            title,
            rawHtml,
            cleanedHtml,
            buildStylesCss(collectedCss),
            appJsx,
            JSON.stringify(metadataDocument, null, 2)
        )

        await writeProjectArtifacts(projectId, artifacts)
        await upsertProjectRecord(updatedProject)

        return updatedProject
    } catch (error) {
        const failedProject: ProjectRecord = {
            ...currentProject,
            status: 'error',
            updatedAt: new Date().toISOString(),
            errorMessage: getErrorMessage(error)
        }

        await upsertProjectRecord(failedProject)
        return failedProject
    }
}
