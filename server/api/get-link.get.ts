import { defineEventHandler, getQuery, createError } from 'h3'

const API_BASE = process.env.DOWNLOAD_API_BASE || 'https://api.adownloader.org'
const FETCH_TIMEOUT = 15_000
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

export default defineEventHandler(async (event) => {
    const { url } = getQuery(event) as { url?: string }

    if (!url || typeof url !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'Missing url parameter' })
    }

    try {
        const parsed = new URL(url)
        if (!parsed.protocol.startsWith('http')) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
        }
    } catch {
        throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
        const apiUrl = new URL('/api/get_download_link', API_BASE)
        apiUrl.searchParams.set('url', url)

        const resp = await fetch(apiUrl.toString(), {
            method: 'GET',
            signal: controller.signal,
            headers: { 'User-Agent': USER_AGENT },
        })

        clearTimeout(timer)

        if (!resp.ok) {
            throw createError({
                statusCode: resp.status,
                statusMessage: `API error: ${resp.statusText}`,
            })
        }

        return await resp.json()
    } catch (e: any) {
        clearTimeout(timer)
        if (e?.name === 'AbortError') {
            throw createError({ statusCode: 504, statusMessage: 'API timeout' })
        }
        if (e?.statusCode) throw e
        throw createError({ statusCode: 502, statusMessage: 'Failed to reach download API' })
    }
})