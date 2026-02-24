import { defineEventHandler, getQuery, sendStream, setHeaders, createError } from 'h3'
import {
    validateUpstreamUrl,
    fetchWithTimeout,
    guessFileExt,
    sanitizeFilename,
    DL_MAX_FILE_SIZE,
    DL_STREAM_TIMEOUT,
} from '../utils/allowed-hosts'

export default defineEventHandler(async (event) => {
    const { url, filename } = getQuery(event) as { url?: string; filename?: string }

    // ── Валидация ──
    const check = validateUpstreamUrl(url)
    if (!check.ok) {
        throw createError({ statusCode: 403, statusMessage: check.reason })
    }

    // ── Fetch с таймаутом ──
    const { promise, abort } = fetchWithTimeout(url as string, {
        method: 'GET',
        redirect: 'follow',
        timeout: DL_STREAM_TIMEOUT,
    })

    // Если клиент отключился — прерываем upstream, не сливаем трафик
    event.node.req.on('close', () => abort())

    let upstream: Response
    try {
        upstream = await promise
    } catch (e: any) {
        if (e?.name === 'AbortError') {
            throw createError({ statusCode: 504, statusMessage: 'Upstream timeout' })
        }
        throw createError({ statusCode: 502, statusMessage: 'Failed to reach upstream' })
    }

    if (!upstream.ok) {
        throw createError({
            statusCode: upstream.status,
            statusMessage: `Upstream: ${upstream.statusText}`,
        })
    }

    // ── Проверка размера ──
    const contentLength = upstream.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > DL_MAX_FILE_SIZE) {
        // Прерываем стрим, не сливаем трафик
        abort()
        throw createError({ statusCode: 413, statusMessage: 'File too large' })
    }

    // ── Заголовки ответа ──
    const contentType = upstream.headers.get('content-type')
    const ext = guessFileExt(contentType, url as string)
    const safeName = sanitizeFilename(filename)
    const fullName = `${safeName}.${ext}`

    setHeaders(event, {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fullName)}"; filename*=UTF-8''${encodeURIComponent(fullName)}`,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
    })

    // ── Стриминг ──
    if (upstream.body) {
        return sendStream(event, upstream.body as any)
    }

    // Фоллбэк (не должно случиться)
    const buf = await upstream.arrayBuffer()
    return Buffer.from(buf)
})