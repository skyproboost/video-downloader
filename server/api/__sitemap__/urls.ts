import { defineEventHandler } from 'h3'
import { readFile, readdir, stat, access } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { parse } from 'yaml'
import { languageCodes, defaultLanguage } from '@/../config/languages'

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

interface SitemapImage {
    loc: string
    title?: string
}

interface SitemapUrl {
    loc: string
    lastmod: string
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority: number
    images?: SitemapImage[]
}

interface PageData {
    slug?: string
    meta?: { title?: string; ogImage?: string }
    pageContent?: unknown
    translations?: Record<string, { meta?: { ogImage?: string }; pageContent?: unknown }>
    _status?: string
}

// ═══════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════

const CACHE_TTL = 5 * 60 * 1000 // 5 минут
const IMAGE_REGEX = /\.(?:jpe?g|png|gif|webp|avif|svg)$/i
const isDev = process.env.NODE_ENV !== 'production'

let cache: { data: SitemapUrl[]; timestamp: number } | null = null

// ═══════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
}

function buildUrl(baseUrl: string, locale: string, slug?: string): string {
    const parts = [baseUrl]

    if (locale !== defaultLanguage) {
        parts.push(locale)
    }

    if (slug) {
        parts.push(slug)
    }

    return parts.join('/').replace(/\/+/g, '/').replace(':/', '://')
}

function collectImages(obj: unknown, baseUrl: string, images: Set<string>): void {
    const stack: unknown[] = [obj]

    while (stack.length > 0) {
        const item = stack.pop()
        if (!item) continue

        if (typeof item === 'string' && IMAGE_REGEX.test(item)) {
            images.add(item.startsWith('/') ? `${baseUrl}${item}` : item)
        } else if (Array.isArray(item)) {
            stack.push(...item)
        } else if (typeof item === 'object') {
            stack.push(...Object.values(item as Record<string, unknown>))
        }
    }
}

function getPagesDir(): string {
    const cwd = process.cwd()

    // В production .output может быть cwd
    if (cwd.endsWith('.output') || cwd.includes('.output')) {
        return resolve(cwd, '..', 'content/pages')
    }

    return resolve(cwd, 'content/pages')
}

// ═══════════════════════════════════════════════════════════════
// ОБРАБОТКА СТРАНИЦЫ
// ═══════════════════════════════════════════════════════════════

async function processPage(filePath: string, baseUrl: string): Promise<SitemapUrl[]> {
    const [content, stats] = await Promise.all([
        readFile(filePath, 'utf-8'),
        stat(filePath),
    ])

    const page = parse(content) as PageData

    // Пропускаем страницы без slug или в процессе перевода
    if (!page?.slug || page._status === 'translating') {
        return []
    }

    const lastmod = formatDate(stats.mtime)
    const images = new Set<string>()

    // Собираем картинки
    if (page.meta?.ogImage) {
        const og = page.meta.ogImage
        images.add(og.startsWith('/') ? `${baseUrl}${og}` : og)
    }

    collectImages(page.pageContent, baseUrl, images)

    if (page.translations) {
        for (const lang of languageCodes) {
            const trans = page.translations[lang]
            if (!trans) continue

            if (trans.meta?.ogImage) {
                const og = trans.meta.ogImage
                images.add(og.startsWith('/') ? `${baseUrl}${og}` : og)
            }
            collectImages(trans.pageContent, baseUrl, images)
        }
    }

    const title = page.meta?.title || page.slug
    const sitemapImages: SitemapImage[] | undefined = images.size > 0
        ? [...images].map(loc => ({ loc, title }))
        : undefined

    // Генерируем URL для всех языков
    return languageCodes.map(locale => ({
        loc: buildUrl(baseUrl, locale, page.slug),
        lastmod,
        changefreq: 'weekly' as const,
        priority: 0.8,
        ...(sitemapImages && { images: sitemapImages }),
    }))
}

// ═══════════════════════════════════════════════════════════════
// ГЕНЕРАЦИЯ SITEMAP
// ═══════════════════════════════════════════════════════════════

async function generateSitemap(): Promise<SitemapUrl[]> {
    const baseUrl = (process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
    const today = formatDate(new Date())
    const pagesDir = getPagesDir()

    // Главные страницы
    const homeUrls: SitemapUrl[] = languageCodes.map(locale => ({
        loc: buildUrl(baseUrl, locale),
        lastmod: today,
        changefreq: 'daily' as const,
        priority: 1.0,
    }))

    try {
        await access(pagesDir)

        const files = await readdir(pagesDir)
        const ymlFiles = files.filter(f => f.endsWith('.yml'))

        if (isDev) {
            console.log(`📄 Sitemap: found ${ymlFiles.length} pages`)
        }

        if (ymlFiles.length === 0) {
            return homeUrls
        }

        // Параллельная обработка
        const results = await Promise.all(
            ymlFiles.map(file =>
                processPage(join(pagesDir, file), baseUrl).catch(err => {
                    console.error(`❌ Sitemap error [${file}]:`, err.message)
                    return []
                })
            )
        )

        const pageUrls = results.flat()

        // Объединяем и дедуплицируем по loc
        const allUrls = [...homeUrls, ...pageUrls]
        const seen = new Set<string>()
        const uniqueUrls = allUrls.filter(url => {
            if (seen.has(url.loc)) {
                console.warn(`⚠️ Sitemap: duplicate URL removed: ${url.loc}`)
                return false
            }
            seen.add(url.loc)
            return true
        })

        // Сортировка: сначала по приоритету (desc), потом по URL (asc)
        uniqueUrls.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority
            return a.loc.localeCompare(b.loc)
        })

        if (isDev) {
            console.log(`✅ Sitemap: generated ${uniqueUrls.length} URLs`)
        }

        return uniqueUrls
    } catch (e) {
        console.error('❌ Sitemap error:', e)
        return homeUrls
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

export default defineEventHandler(async (): Promise<SitemapUrl[]> => {
    // В dev всегда генерируем заново для удобства
    if (isDev) {
        return generateSitemap()
    }

    const now = Date.now()

    if (cache && (now - cache.timestamp) < CACHE_TTL) {
        return cache.data
    }

    const data = await generateSitemap()
    cache = { data, timestamp: now }

    return data
})