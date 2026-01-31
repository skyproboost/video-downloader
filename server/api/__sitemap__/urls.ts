import { defineEventHandler } from 'h3'
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'
import { languageCodes, defaultLanguage } from '@/../config/languages'

// Собираем все картинки из объекта страницы
function collectImages(obj: any, baseUrl: string): string[] {
    const images: string[] = []

    function traverse(item: any) {
        if (!item) return

        if (typeof item === 'string') {
            // Проверяем это картинка
            if (item.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) {
                const url = item.startsWith('/') ? `${baseUrl}${item}` : item
                if (!images.includes(url)) {
                    images.push(url)
                }
            }
            return
        }

        if (Array.isArray(item)) {
            item.forEach(traverse)
            return
        }

        if (typeof item === 'object') {
            Object.values(item).forEach(traverse)
        }
    }

    traverse(obj)
    return images
}

// Форматируем дату для sitemap (ISO 8601)
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
}

export default defineEventHandler(async () => {
    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const urls: any[] = []
    const today = formatDate(new Date())

    // Главная для каждого языка
    languageCodes.forEach((locale) => {
        const loc = locale === defaultLanguage ? baseUrl : `${baseUrl}/${locale}`
        urls.push({
            loc,
            lastmod: today,
            changefreq: 'daily',
            priority: 1.0,
        })
    })

    // Страницы инструментов
    const pagesDir = path.resolve(process.cwd(), 'content/pages')

    try {
        const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.yml'))

        for (const file of files) {
            const filePath = path.join(pagesDir, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const page = parse(content)

            // Получаем дату модификации файла
            const stats = fs.statSync(filePath)
            const lastmod = formatDate(stats.mtime)

            if (page?.slug) {
                // Собираем картинки из оригинала и всех переводов
                const allImages: string[] = []

                // Картинки из meta
                if (page.meta?.ogImage) {
                    const url = page.meta.ogImage.startsWith('/')
                        ? `${baseUrl}${page.meta.ogImage}`
                        : page.meta.ogImage
                    allImages.push(url)
                }

                // Картинки из pageContent
                const contentImages = collectImages(page.pageContent, baseUrl)
                allImages.push(...contentImages)

                // Картинки из переводов
                if (page.translations) {
                    Object.entries(page.translations).forEach(([lang, trans]: [string, any]) => {
                        if (lang === 'manual_edit' || lang === 'source_hash') return
                        if (trans?.meta?.ogImage) {
                            const url = trans.meta.ogImage.startsWith('/')
                                ? `${baseUrl}${trans.meta.ogImage}`
                                : trans.meta.ogImage
                            if (!allImages.includes(url)) allImages.push(url)
                        }
                        const transImages = collectImages(trans?.pageContent, baseUrl)
                        transImages.forEach(img => {
                            if (!allImages.includes(img)) allImages.push(img)
                        })
                    })
                }

                // Создаём URL для каждого языка
                languageCodes.forEach((locale) => {
                    const pagePath = locale === defaultLanguage
                        ? `/${page.slug}`
                        : `/${locale}/${page.slug}`

                    urls.push({
                        loc: `${baseUrl}${pagePath}`,
                        lastmod,
                        changefreq: 'weekly',
                        priority: 0.8,
                        images: allImages.map(img => ({
                            loc: img,
                            title: page.meta?.title || page.slug,
                        })),
                    })
                })
            }
        }
    } catch (e) {
        console.error('Sitemap: Error reading pages', e)
    }

    return urls.filter(u => !u.loc.includes('127.0.0.1'))
})