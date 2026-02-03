import { defineEventHandler } from 'h3'
import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { parse } from 'yaml'
import { languageCodes, defaultLanguage } from '@/../config/languages'

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

interface PageMeta {
    title?: string
    ogImage?: string
}

interface PageData {
    slug?: string
    meta?: PageMeta
    pageContent?: unknown
    translations?: Record<string, {
        meta?: PageMeta
        pageContent?: unknown
    }>
}

// Кэш результатов
let cache: { data: SitemapUrl[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

const IMAGE_REGEX = /\.(?:jpe?g|png|gif|webp|avif|svg)$/i
const PAGES_DIR = resolve(process.cwd(), 'content/pages')

// Собираем картинки итеративно (без рекурсии)
function collectImages(obj: unknown, baseUrl: string, images: Set<string>): void {
    const stack: unknown[] = [obj]

    while (stack.length > 0) {
        const item = stack.pop()
        if (!item) continue

        if (typeof item === 'string') {
            if (IMAGE_REGEX.test(item)) {
                images.add(item[0] === '/' ? `${baseUrl}${item}` : item)
            }
        } else if (Array.isArray(item)) {
            stack.push(...item)
        } else if (typeof item === 'object') {
            stack.push(...Object.values(item as Record<string, unknown>))
        }
    }
}

function addOgImage(ogImage: string | undefined, baseUrl: string, images: Set<string>): void {
    if (ogImage) {
        images.add(ogImage[0] === '/' ? `${baseUrl}${ogImage}` : ogImage)
    }
}

function formatDate(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

async function processPage(filePath: string, baseUrl: string): Promise<SitemapUrl[] | null> {
    const [content, stats] = await Promise.all([
        readFile(filePath, 'utf-8'),
        stat(filePath),
    ])

    const page = parse(content) as PageData
    if (!page?.slug) return null

    const lastmod = formatDate(stats.mtime)
    const images = new Set<string>()

    // Собираем картинки из основного контента
    addOgImage(page.meta?.ogImage, baseUrl, images)
    collectImages(page.pageContent, baseUrl, images)

    // Собираем картинки из переводов
    if (page.translations) {
        for (const lang of languageCodes) {
            const trans = page.translations[lang]
            if (!trans) continue
            addOgImage(trans.meta?.ogImage, baseUrl, images)
            collectImages(trans.pageContent, baseUrl, images)
        }
    }

    const title = page.meta?.title || page.slug
    const sitemapImages: SitemapImage[] | undefined = images.size > 0
        ? [...images].map(loc => ({ loc, title }))
        : undefined

    // URL для всех языков
    return languageCodes.map(locale => ({
        loc: `${baseUrl}${locale === defaultLanguage ? '' : `/${locale}`}/${page.slug}`,
        lastmod,
        changefreq: 'weekly' as const,
        priority: 0.8,
        ...(sitemapImages && { images: sitemapImages }),
    }))
}

async function generateSitemap(): Promise<SitemapUrl[]> {
    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const today = formatDate(new Date())

    // Главные страницы для каждого языка
    const homeUrls: SitemapUrl[] = languageCodes.map(locale => ({
        loc: locale === defaultLanguage ? baseUrl : `${baseUrl}/${locale}`,
        lastmod: today,
        changefreq: 'daily',
        priority: 1.0,
    }))

    try {
        const files = await readdir(PAGES_DIR)
        const ymlFiles = files.filter(f => f.endsWith('.yml'))

        // Параллельная обработка всех файлов
        const results = await Promise.all(
            ymlFiles.map(file =>
                processPage(join(PAGES_DIR, file), baseUrl).catch(err => {
                    console.error(`Sitemap: Error processing ${file}`, err)
                    return null
                })
            )
        )

        const pageUrls = results.flat().filter((url): url is SitemapUrl => url !== null)

        return [...homeUrls, ...pageUrls].filter(u => !u.loc.includes('127.0.0.1'))
    } catch (e) {
        console.error('Sitemap: Error reading pages directory', e)
        return homeUrls
    }
}

export default defineEventHandler(async (): Promise<SitemapUrl[]> => {
    const now = Date.now()

    // Возвращаем кэш если свежий
    if (cache && (now - cache.timestamp) < CACHE_TTL) {
        return cache.data
    }

    const data = await generateSitemap()
    cache = { data, timestamp: now }

    return data
})