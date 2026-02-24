import { defineEventHandler, getQuery } from 'h3'
import {
    validateUpstreamUrl,
    fetchWithTimeout,
    DL_FETCH_TIMEOUT,
    DL_MAX_FILE_SIZE,
} from '../utils/allowed-hosts'

export default defineEventHandler(async (event) => {
    const { url } = getQuery(event) as { url?: string }

    // 1) Валидация: длина, протокол, credentials, белый список, SSRF
    const check = validateUpstreamUrl(url)
    if (!check.ok) {
        return { proxy: false, reason: check.reason }
    }

    // 2) HEAD к upstream — проверяем доступность (не качаем тело)
    try {
        const { promise } = fetchWithTimeout(url as string, {
            method: 'HEAD',
            redirect: 'follow',
            timeout: DL_FETCH_TIMEOUT,
        })

        const res = await promise

        if (!res.ok) {
            return { proxy: false, reason: 'upstream_error', status: res.status }
        }

        // 3) Проверяем что размер не превышает лимит
        const cl = res.headers.get('content-length')
        if (cl && parseInt(cl, 10) > DL_MAX_FILE_SIZE) {
            return { proxy: false, reason: 'file_too_large' }
        }

        return { proxy: true }
    } catch (e: any) {
        const reason = e?.name === 'AbortError' ? 'upstream_timeout' : 'upstream_unreachable'
        return { proxy: false, reason }
    }
})