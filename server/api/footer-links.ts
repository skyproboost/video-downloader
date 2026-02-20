import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { platforms } from '@/../config/platforms'
import { existsSync } from 'node:fs'

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

// ═══════════════════════════════════════════════════
// Путь к content/pages
// ═══════════════════════════════════════════════════
function resolvePagesDir(): string {
    const cwd = process.cwd()

    const devPath = path.join(cwd, 'content', 'pages')
    if (existsSync(devPath)) return devPath

    const dockerPath = path.join(cwd, '.output', 'content', 'pages')
    if (existsSync(dockerPath)) return dockerPath

    const outputIdx = cwd.indexOf('.output')
    if (outputIdx !== -1) {
        const outputRoot = cwd.substring(0, outputIdx) + '.output'
        const localProdPath = path.join(outputRoot, 'content', 'pages')
        if (existsSync(localProdPath)) return localProdPath

        const projectRoot = cwd.substring(0, outputIdx).replace(/[\\/]+$/, '')
        const rootPath = path.join(projectRoot, 'content', 'pages')
        if (existsSync(rootPath)) return rootPath
    }

    return devPath
}

// ═══════════════════════════════════════════════════
// Sticky cache — никогда не возвращает [] если раньше были данные
// ═══════════════════════════════════════════════════
let stickyData: GroupedLinks[] = []
let lastReadTimestamp = 0
const isDev = process.env.NODE_ENV !== 'production'
const CACHE_TTL = isDev ? 5_000 : 10 * 60 * 1000

let resolvedDir: string | null = null

function getPagesDir(): string {
    if (resolvedDir && !isDev) return resolvedDir
    resolvedDir = resolvePagesDir()
    return resolvedDir
}

function readFromDisk(): GroupedLinks[] {
    const pagesDir = getPagesDir()

    if (!existsSync(pagesDir)) {
        resolvedDir = null
        const retryDir = getPagesDir()
        if (!existsSync(retryDir)) return []
    }

    const dir = existsSync(pagesDir) ? pagesDir : getPagesDir()
    let files: string[]
    try {
        files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'))
    } catch (e) {
        console.error('[footer-links] Cannot read dir:', dir, e)
        return []
    }

    const links: FooterLink[] = []

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8')
            const page = parse(content)

            if (page._status === 'translating') continue

            if (page.footerLinkText && page.platform) {
                links.push({
                    slug: page.slug || file.replace('.yml', ''),
                    text: page.footerLinkText,
                    platform: page.platform,
                })
            }
        } catch (e) {
            console.error(`[footer-links] Error reading ${file}:`, e)
        }
    }

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

    return grouped
}

function getFooterLinks(): GroupedLinks[] {
    const now = Date.now()
    const cacheValid = lastReadTimestamp > 0 && (now - lastReadTimestamp) < CACHE_TTL

    if (cacheValid && stickyData.length > 0) {
        return stickyData
    }

    const fresh = readFromDisk()

    if (fresh.length > 0) {
        stickyData = fresh
        lastReadTimestamp = now
        return stickyData
    }

    // Sticky: диск пуст, но данные были — отдаём старые
    if (stickyData.length > 0) {
        return stickyData
    }

    lastReadTimestamp = now
    return []
}

export default defineEventHandler((event) => {
    const data = getFooterLinks()

    setResponseHeaders(event, {
        'Cache-Control': isDev
            ? 'no-cache, no-store, must-revalidate'
            : 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    })

    return data
})