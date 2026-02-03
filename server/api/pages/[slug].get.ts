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
    _status?: 'translating' | 'ready'  // Статус публикации
    _hashes?: Record<string, any>
}

// Вычисляем путь один раз при старте сервера
const ROOT_DIR = process.cwd().endsWith('.output')
    ? resolve(process.cwd(), '..')
    : process.cwd()

const PAGES_DIR = join(ROOT_DIR, 'content', 'pages')

// Кэш в памяти (короткий TTL для быстрого обновления статуса)
const cache = new Map<string, { data: PageData; timestamp: number }>()
const CACHE_TTL = 30 * 1000  // 30 секунд
const isDev = process.env.NODE_ENV !== 'production'

// Валидация slug (только буквы, цифры, дефис, без расширений файлов)
const SLUG_REGEX = /^[a-z0-9-]+$/
const IGNORED_EXTENSIONS = /\.(js|json|css|map|ico|png|jpg|svg|webp|txt|xml)$/i

export default defineEventHandler(async (event) => {
    // Защита от внешних запросов в production
    if (process.env.NODE_ENV === 'production') {
        const secFetch = getRequestHeader(event, 'sec-fetch-site')
        if (secFetch === 'cross-site') {
            throw createError({ status: 403, message: 'Forbidden' })
        }
    }

    const slug = getRouterParam(event, 'slug')

    // Игнорируем запросы к файлам (sw.js, favicon.ico и т.д.)
    if (slug && IGNORED_EXTENSIONS.test(slug)) {
        throw createError({ status: 404, message: 'Not found' })
    }

    // Валидация slug
    if (!slug || !SLUG_REGEX.test(slug)) {
        throw createError({ status: 400, message: 'Invalid slug' })
    }

    // Блокируем системные пути
    if (slug.startsWith('_') || slug.startsWith('.')) {
        throw createError({ status: 404, message: 'Page not found' })
    }

    // Проверяем кэш (только в production)
    const now = Date.now()
    if (!isDev) {
        const cached = cache.get(slug)
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            // Проверяем статус даже из кэша
            if (cached.data._status === 'translating') {
                throw createError({
                    status: 404,
                    message: 'Page is being prepared'
                })
            }
            return cached.data
        }
    }

    const filePath = join(PAGES_DIR, `${slug}.yml`)

    // Асинхронная проверка существования файла
    try {
        await access(filePath)
    } catch {
        throw createError({ status: 404, message: 'Page not found' })
    }

    // Асинхронное чтение и парсинг
    try {
        const content = await readFile(filePath, 'utf-8')
        const page = parse(content) as PageData

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
        console.error(`Error reading ${slug}.yml:`, e)
        throw createError({ status: 500, message: 'Error reading page' })
    }
})