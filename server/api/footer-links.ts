import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'
import { platforms } from '@/../config/platforms'

interface FooterLink {
    slug: string
    text: string
    platform: string
}

interface GroupedLinks {
    platformId: string
    platformName: string
    links: { slug: string; text: string }[]
}

export default defineEventHandler((event) => {
    const cwd = process.cwd()
    const rootDir = cwd.endsWith('.output') ? path.resolve(cwd, '..') : cwd
    const pagesDir = path.join(rootDir, 'content', 'pages')

    if (!fs.existsSync(pagesDir)) {
        return []
    }

    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.yml'))
    const links: FooterLink[] = []

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8')
            const page = parse(content)

            if (page.footerLinkText && page.platform) {
                links.push({
                    slug: page.slug,
                    text: page.footerLinkText,
                    platform: page.platform,
                })
            }
        } catch (e) {
            console.error(`Error reading ${file}:`, e)
        }
    }

    // Группируем по платформам
    const grouped: GroupedLinks[] = []

    for (const p of platforms) {
        const platformLinks = links.filter(l => l.platform === p.id)
        if (platformLinks.length > 0) {
            grouped.push({
                platformId: p.id,
                platformName: p.name,
                links: platformLinks.map(l => ({ slug: l.slug, text: l.text })),
            })
        }
    }

    setResponseHeaders(event, {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    })

    return grouped
})