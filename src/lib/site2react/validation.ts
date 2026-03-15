const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function normalizeImportUrl(rawValue: string) {
    const trimmedValue = rawValue.trim()

    if (!trimmedValue) {
        throw new Error('Cole uma URL para continuar.')
    }

    const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`

    let parsedUrl: URL

    try {
        parsedUrl = new URL(candidate)
    } catch {
        throw new Error('Informe uma URL valida.')
    }

    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
        throw new Error('Use apenas URLs HTTP ou HTTPS.')
    }

    return parsedUrl.toString()
}
