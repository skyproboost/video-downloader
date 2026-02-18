import fs from 'node:fs'
import path from 'node:path'
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

// ═══════════════════════════════════════════════════════════════
// Определяем путь к content/pages — работает в dev, локальном билде и Docker
// ═══════════════════════════════════════════════════════════════

function resolvePagesDir(): string {
    const cwd = process.cwd()

    // 1. Dev: cwd = /project, файлы в /project/content/pages
    const devPath = path.join(cwd, 'content', 'pages')
    if (fs.existsSync(devPath)) return devPath

    // 2. Docker: cwd = /app, файлы в /app/.output/content/pages
    const dockerPath = path.join(cwd, '.output', 'content', 'pages')
    if (fs.existsSync(dockerPath)) return dockerPath

    // 3. Локальный билд: cwd содержит .output
    const outputIdx = cwd.indexOf('.output')
    if (outputIdx !== -1) {
        const outputRoot = cwd.substring(0, outputIdx) + '.output'
        const localProdPath = path.join(outputRoot, 'content', 'pages')
        if (fs.existsSync(localProdPath)) return localProdPath

        const projectRoot = cwd.substring(0, outputIdx).replace(/[\\/]+$/, '')
        const rootPath = path.join(projectRoot, 'content', 'pages')
        if (fs.existsSync(rootPath)) return rootPath
    }

    console.warn('[footer-links] Could not resolve pages dir, tried:', devPath, dockerPath)
    return devPath
}

const PAGES_DIR = resolvePagesDir()

export default defineEventHandler((event) => {
    if (!fs.existsSync(PAGES_DIR)) {
        return []
    }

    const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.yml'))
    const links: FooterLink[] = []

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(PAGES_DIR, file), 'utf-8')
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