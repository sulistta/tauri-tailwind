import { Channel, invoke } from '@tauri-apps/api/core'

const ERROR_REQUEST_CANCELLED = 'Request cancelled'

type HttpFetchOptions = RequestInit & {
    connectTimeout?: number
    maxRedirections?: number
}

type FetchSendResponse = {
    headers: Array<[string, string]>
    rid: number
    status: number
    statusText: string
    url: string
}

type TauriTextResponse = {
    headers: Headers
    ok: boolean
    status: number
    statusText: string
    text: () => Promise<string>
    url: string
}

function createCancelledError() {
    return new Error(ERROR_REQUEST_CANCELLED)
}

function concatChunks(chunks: Uint8Array[]) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const merged = new Uint8Array(totalLength)
    let offset = 0

    chunks.forEach((chunk) => {
        merged.set(chunk, offset)
        offset += chunk.byteLength
    })

    return merged
}

async function readResponseBody(rid: number, signal?: AbortSignal) {
    const chunks: Uint8Array[] = []
    let settled = false

    await new Promise<void>((resolve, reject) => {
        const streamChannel = new Channel<ArrayBuffer | number[]>()

        const cleanup = () => {
            signal?.removeEventListener('abort', handleAbort)
        }

        const fail = (error: unknown) => {
            if (settled) {
                return
            }

            settled = true
            cleanup()
            reject(error)
        }

        const finish = () => {
            if (settled) {
                return
            }

            settled = true
            cleanup()
            resolve()
        }

        const handleAbort = () => {
            fail(createCancelledError())
        }

        streamChannel.onmessage = (message) => {
            if (settled) {
                return
            }

            const data = new Uint8Array(message)
            const lastByte = data[data.byteLength - 1]
            const chunk = data.slice(0, data.byteLength - 1)

            if (lastByte === 1) {
                finish()
                return
            }

            if (chunk.byteLength > 0) {
                chunks.push(chunk)
            }
        }

        signal?.addEventListener('abort', handleAbort, { once: true })

        void invoke('plugin:http|fetch_read_body', {
            rid,
            streamChannel
        }).catch(fail)
    })

    return concatChunks(chunks)
}

export async function fetchText(
    input: string | URL | Request,
    init?: HttpFetchOptions
): Promise<TauriTextResponse> {
    const signal = init?.signal ?? undefined

    if (signal?.aborted) {
        throw createCancelledError()
    }

    const extraHeaders =
        init?.headers instanceof Headers
            ? init.headers
            : new Headers(init?.headers)
    const request = new Request(input, init)
    const bodyBuffer = await request.arrayBuffer()
    const data =
        bodyBuffer.byteLength > 0
            ? Array.from(new Uint8Array(bodyBuffer))
            : null

    for (const [key, value] of request.headers) {
        if (!extraHeaders.get(key)) {
            extraHeaders.set(key, value)
        }
    }

    const rid = await invoke<number>('plugin:http|fetch', {
        clientConfig: {
            connectTimeout: init?.connectTimeout,
            data,
            headers: Array.from(extraHeaders.entries()),
            maxRedirections: init?.maxRedirections,
            method: request.method,
            url: request.url
        }
    })

    const cancelRequest = async () => {
        try {
            await invoke('plugin:http|fetch_cancel', { rid })
        } catch {
            return
        }
    }

    if (signal?.aborted) {
        void cancelRequest()
        throw createCancelledError()
    }

    const abortRequest = () => {
        void cancelRequest()
    }

    signal?.addEventListener('abort', abortRequest, { once: true })

    try {
        const response = await invoke<FetchSendResponse>(
            'plugin:http|fetch_send',
            {
                rid
            }
        )

        signal?.removeEventListener('abort', abortRequest)

        const body =
            [101, 103, 204, 205, 304].includes(response.status) ||
            signal?.aborted
                ? new Uint8Array()
                : await readResponseBody(response.rid, signal)

        const responseHeaders = new Headers(response.headers)
        const textContent = new TextDecoder().decode(body)

        return {
            headers: responseHeaders,
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText,
            text: async () => textContent,
            url: response.url
        }
    } catch (error) {
        signal?.removeEventListener('abort', abortRequest)
        throw error
    }
}
