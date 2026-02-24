import { defineEventHandler, getQuery } from 'h3'
import { validateUpstreamUrl } from '../utils/allowed-hosts'

// Лёгкая проверка — только валидация URL и белый список.
// Никаких сетевых запросов — работает мгновенно в любом окружении.
// Если upstream недоступен — это обработает download.get.ts при стриминге.

export default defineEventHandler((event) => {
    const { url } = getQuery(event) as { url?: string }

    const check = validateUpstreamUrl(url)

    if (!check.ok) {
        return { proxy: false, reason: check.reason }
    }

    return { proxy: true }
})