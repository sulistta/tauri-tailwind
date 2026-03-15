export function buildIframePreviewDocument(
    cleanedHtml: string,
    stylesCss: string
) {
    const normalizedStyles = stylesCss.trim()

    if (!cleanedHtml.trim()) {
        return ''
    }

    if (cleanedHtml.includes('</head>')) {
        return cleanedHtml.replace(
            '</head>',
            `<style>${normalizedStyles}</style></head>`
        )
    }

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${normalizedStyles}</style>
    </head>
    <body>
${cleanedHtml}
    </body>
</html>`
}
