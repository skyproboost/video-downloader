import { defineEventHandler, getQuery, createError } from 'h3'
import { DL_FETCH_TIMEOUT, DL_USER_AGENT } from '../utils/allowed-hosts'

// Серверный прокси для получения ссылки на скачивание.
// Важно: вызов идёт С СЕРВЕРА, поэтому googlevideo URL
// будет привязан к IP сервера — и download.get.ts сможет его скачать.

const API_BASE = process.env.DOWNLOAD_API_BASE || 'https://api.adownloader.org'

export default defineEventHandler(async (event) => {
    const { url } = getQuery(event) as { url?: string }

    if (!url || typeof url !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'Missing url parameter' })
    }

    // Базовая валидация входного URL
    try {
        const parsed = new URL(url)
        if (!parsed.protocol.startsWith('http')) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
        }
    } catch {
        throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DL_FETCH_TIMEOUT)

    try {
        const apiUrl = new URL('/api/get_download_link', API_BASE)
        apiUrl.searchParams.set('url', url)

        const resp = await fetch(apiUrl.toString(), {
            method: 'GET',
            signal: controller.signal,
            headers: { 'User-Agent': DL_USER_AGENT },
        })

        clearTimeout(timer)

        if (!resp.ok) {
            throw createError({
                statusCode: resp.status,
                statusMessage: `API error: ${resp.statusText}`,
            })
        }

        const data = await resp.json()
        return data
    } catch (e: any) {
        clearTimeout(timer)
        if (e?.name === 'AbortError') {
            throw createError({ statusCode: 504, statusMessage: 'API timeout' })
        }
        if (e?.statusCode) throw e
        throw createError({ statusCode: 502, statusMessage: 'Failed to reach download API' })
    }
})