import { readFile, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

interface PageMeta {
    title: string
    description: string
    keywords?: string
    ogImage?: string
    ogImageAlt?: string
}

interface PageContent {
    mainTitle: string
    subtitle?: string
    intro?: string
    how_to?: {
        title: string
        steps: Array<{
            title: string
            description: string
            image?: string
            imageAlt?: string
        }>
    }
    features?: {
        title: string
        items: Array<{
            icon?: string
            title: string
            description: string
        }>
    }
    faq?: Array<{
        question: string
        answer: string
    }>
}

interface PageData {
    slug: string
    platform: string
    footerLinkText?: string
    source_lang: string
    meta: PageMeta
    pageContent: PageContent
    translations?: Record<string, {
        meta: PageMeta
        pageContent: PageContent
    }>
    _status?: 'translating' | 'ready'
    _hashes?: Record<string, any>
}

// Вычисляем путь один раз при старте сервера
const ROOT_DIR = process.cwd().endsWith('.output')
    ? resolve(process.cwd(), '..')
    : process.cwd()

const PAGES_DIR = join(ROOT_DIR, 'content', 'pages')

// Кэш в памяти
const cache = new Map<string, { data: PageData; timestamp: number }>()
const CACHE_TTL = 30 * 1000  // 30 секунд
const isDev = process.env.NODE_ENV !== 'production'

// Валидация slug
const SLUG_REGEX = /^[a-z0-9-]+$/
const IGNORED_EXTENSIONS = /\.(js|json|css|map|ico|png|jpg|svg|webp|txt|xml)$/i

export default defineEventHandler(async (event) => {
    // Защита от внешних запросов в production
    if (process.env.NODE_ENV === 'production') {
        const secFetch = getRequestHeader(event, 'sec-fetch-site')
        if (secFetch === 'cross-site') {
            throw createError({ statusCode: 403, message: 'Forbidden' })
        }
    }

    const slug = getRouterParam(event, 'slug')

    // Игнорируем запросы к файлам
    if (slug && IGNORED_EXTENSIONS.test(slug)) {
        throw createError({ statusCode: 404, message: 'Not found' })
    }

    // Валидация slug
    if (!slug || !SLUG_REGEX.test(slug)) {
        throw createError({ statusCode: 400, message: 'Invalid slug' })
    }

    // Блокируем служебные пути
    if (slug.startsWith('_') || slug.startsWith('.')) {
        throw createError({ statusCode: 404, message: 'Page not found' })
    }

    const now = Date.now()

    // Проверяем кэш (только в production)
    if (!isDev) {
        const cached = cache.get(slug)
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            // Проверяем статус даже из кэша
            if (cached.data._status === 'translating') {
                throw createError({
                    statusCode: 404,
                    message: 'Page is being prepared'
                })
            }
            return cached.data
        }
    }

    const filePath = join(PAGES_DIR, `${slug}.yml`)

    // Проверка существования файла
    try {
        await access(filePath)
    } catch {
        throw createError({ statusCode: 404, message: 'Page not found' })
    }

    // Чтение и парсинг
    try {
        const content = await readFile(filePath, 'utf-8')
        const page = parse(content) as PageData

        // ═══════════════════════════════════════════════════════════
        // ПРОВЕРКА: страница ещё переводится?
        // ═══════════════════════════════════════════════════════════
        if (page._status === 'translating') {
            throw createError({
                statusCode: 404,
                message: 'Page is being prepared'
            })
        }

        // Сохраняем в кэш (только в production)
        if (!isDev) {
            cache.set(slug, { data: page, timestamp: now })
        }

        // Заголовки для ISR
        setResponseHeader(
            event,
            'Cache-Control',
            'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
        )

        return page
    } catch (e) {
        // Если это наша ошибка (page is being prepared) — пробрасываем
        if (e && typeof e === 'object' && 'statusCode' in e) {
            throw e
        }

        console.error(`Error reading ${slug}.yml:`, e)
        throw createError({ statusCode: 500, message: 'Error reading page' })
    }
})