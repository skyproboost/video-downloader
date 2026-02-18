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
    _sitemap?: string
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

const CACHE_TTL = 5 * 60 * 1000
const IMAGE_REGEX = /\.(?:jpe?g|png|gif|webp|avif|svg)$/i
const isDev = process.env.NODE_ENV !== 'production'

let cache: { data: SitemapUrl[]; timestamp: number } | null = null

// Маппинг code → iso для имён sitemap'ов (en-US.xml, ru-RU.xml)
// @nuxtjs/sitemap + i18n именует файлы по iso коду локали
import { languages } from '@/../config/languages'
const codeToIso = Object.fromEntries(languages.map(l => [l.code, l.iso]))

// ═══════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
}

function buildUrl(locale: string, slug?: string): string {
    const parts = locale === defaultLanguage ? [''] : ['', locale]
    if (slug) parts.push(slug)
    return parts.join('/') || '/'
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

    if (!page?.slug || page._status === 'translating') {
        return []
    }

    const lastmod = formatDate(stats.mtime)
    const images = new Set<string>()

    if (page.meta?.ogImage) {
        const og = page.meta.ogImage
        images.add(og.startsWith('/') ? `${baseUrl}${og}` : og)
    }

    collectImages(page.pageContent, baseUrl, images)

    if (page.translations) {
        for (const trans of Object.values(page.translations)) {
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

    // URL для каждой локали, привязанный к своему sitemap через _sitemap
    return languageCodes.map(locale => ({
        loc: buildUrl(locale, page.slug),
        lastmod,
        changefreq: 'weekly' as const,
        priority: 0.8,
        _sitemap: codeToIso[locale] || locale,
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

    // Главные страницы — каждая в свой sitemap
    const homeUrls: SitemapUrl[] = languageCodes.map(locale => ({
        loc: buildUrl(locale),
        lastmod: today,
        changefreq: 'daily' as const,
        priority: 1.0,
        _sitemap: codeToIso[locale] || locale,
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

        const results = await Promise.all(
            ymlFiles.map(file =>
                processPage(join(pagesDir, file), baseUrl).catch(err => {
                    console.error(`❌ Sitemap error [${file}]:`, err.message)
                    return []
                })
            )
        )

        const allUrls = [...homeUrls, ...results.flat()]

        allUrls.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority
            return a.loc.localeCompare(b.loc)
        })

        if (isDev) {
            console.log(`✅ Sitemap: generated ${allUrls.length} URLs across ${languageCodes.length} locales`)
        }

        return allUrls
    } catch (e) {
        console.error('❌ Sitemap error:', e)
        return homeUrls
    }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

export default defineEventHandler(async (): Promise<SitemapUrl[]> => {
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