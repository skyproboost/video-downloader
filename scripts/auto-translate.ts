import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { parse, stringify } from 'yaml'
import { languages, languageCodes } from '../config/languages'

const LINGVA_INSTANCES = [
    'https://lingva.ml',
    'https://lingva.lunar.icu',
    'https://translate.plausibility.cloud',
]

// Поля которые НЕ переводятся (пути к файлам)
const SKIP_KEYS = ['image', 'ogImage', 'src', 'url', 'href']

const STATUS_FILE = path.resolve(process.cwd(), 'public/admin/status.json')

// ═══════════════════════════════════════════════════════════════
// СТАТУС
// ═══════════════════════════════════════════════════════════════

function setStatus(status: 'idle' | 'translating' | 'error', message: string) {
    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true })
    fs.writeFileSync(STATUS_FILE, JSON.stringify({
        status, message, updatedAt: new Date().toISOString()
    }, null, 2))
}

// ═══════════════════════════════════════════════════════════════
// FLATTEN / UNFLATTEN — работа с путями полей
// ═══════════════════════════════════════════════════════════════

function flatten(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {}

    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key

        if (Array.isArray(value)) {
            value.forEach((item, i) => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(result, flatten(item, `${path}[${i}]`))
                } else {
                    result[`${path}[${i}]`] = item
                }
            })
        } else if (typeof value === 'object' && value !== null) {
            Object.assign(result, flatten(value, path))
        } else {
            result[path] = value
        }
    }

    return result
}

function setByPath(obj: any, pathStr: string, value: any) {
    const parts = pathStr.split(/\.|\[(\d+)\]/).filter(Boolean)
    let current = obj

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        const next = parts[i + 1]

        if (!(part in current)) {
            current[part] = /^\d+$/.test(next) ? [] : {}
        }
        current = current[part]
    }

    current[parts[parts.length - 1]] = value
}

function getByPath(obj: any, pathStr: string): any {
    const parts = pathStr.split(/\.|\[(\d+)\]/).filter(Boolean)
    let current = obj

    for (const part of parts) {
        if (current === undefined || current === null) return undefined
        current = current[part]
    }

    return current
}

// ═══════════════════════════════════════════════════════════════
// ХЭШИ ПОЛЕЙ
// ═══════════════════════════════════════════════════════════════

function hashValue(value: any): string {
    return crypto.createHash('md5').update(String(value)).digest('hex').substring(0, 8)
}

function getFieldHashes(data: any): Record<string, string> {
    const flat = flatten(data)
    const hashes: Record<string, string> = {}

    for (const [path, value] of Object.entries(flat)) {
        if (value !== undefined && value !== null && value !== '') {
            hashes[path] = hashValue(value)
        }
    }

    return hashes
}

// ═══════════════════════════════════════════════════════════════
// ОПРЕДЕЛЕНИЕ ИЗМЕНЕНИЙ
// ═══════════════════════════════════════════════════════════════

interface Change {
    path: string
    value: any
    needsTranslation: boolean
}

function detectChanges(currentHashes: Record<string, string>, savedHashes: Record<string, string>, data: any): Change[] {
    const changes: Change[] = []

    for (const [path, hash] of Object.entries(currentHashes)) {
        if (savedHashes[path] !== hash) {
            // Определяем нужен ли перевод по последнему ключу в пути
            const lastKey = path.split(/\.|\[/).pop()?.replace(']', '') || ''
            const needsTranslation = !SKIP_KEYS.includes(lastKey)

            changes.push({
                path,
                value: getByPath(data, path),
                needsTranslation
            })
        }
    }

    return changes
}

// ═══════════════════════════════════════════════════════════════
// ПЕРЕВОД
// ═══════════════════════════════════════════════════════════════

async function translate(text: string, from: string, to: string): Promise<string> {
    if (!text || from === to || typeof text !== 'string') return text
    if (text.startsWith('/') || text.startsWith('http')) return text

    for (const instance of LINGVA_INSTANCES) {
        try {
            const res = await fetch(`${instance}/api/v1/${from}/${to}/${encodeURIComponent(text)}`)
            const data = await res.json()
            if (data.translation) return data.translation
        } catch { continue }
    }
    return text
}

async function translateObj(obj: any, from: string, to: string): Promise<any> {
    if (typeof obj === 'string') {
        await new Promise(r => setTimeout(r, 150))
        return translate(obj, from, to)
    }
    if (Array.isArray(obj)) {
        const res = []
        for (const item of obj) res.push(await translateObj(item, from, to))
        return res
    }
    if (typeof obj === 'object' && obj !== null) {
        const res: any = {}
        for (const [k, v] of Object.entries(obj)) {
            res[k] = SKIP_KEYS.includes(k) ? v : await translateObj(v, from, to)
        }
        return res
    }
    return obj
}

// ═══════════════════════════════════════════════════════════════
// ОБРАБОТКА ФАЙЛА
// ═══════════════════════════════════════════════════════════════

async function processFile(filePath: string, force = false): Promise<boolean> {
    const name = path.basename(filePath)
    const slug = name.replace('.yml', '')

    console.log(`\n📄 ${name}`)

    try {
        const page = parse(fs.readFileSync(filePath, 'utf-8'))

        if (!page.meta || !page.pageContent) {
            console.log('  ⏭️ Skip (no content)')
            return false
        }

        const src = page.source_lang || 'en'
        const targets = languageCodes.filter(l => l !== src)
        const data = { meta: page.meta, pageContent: page.pageContent }

        // Проверяем есть ли переводы
        const hasTranslations = targets.every(l => page.translations?.[l]?.meta?.title)

        // Получаем хэши
        const currentHashes = getFieldHashes(data)
        const savedHashes = page._hashes || {}

        // ═══════════════════════════════════════════════════════
        // ПОЛНЫЙ ПЕРЕВОД (первый раз или --force)
        // ═══════════════════════════════════════════════════════
        if (force || !hasTranslations) {
            console.log(force ? '  🔄 Full translation' : '  🆕 First translation')
            setStatus('translating', `Перевод: ${slug}`)

            if (!page.translations) page.translations = {}

            for (const lang of targets) {
                process.stdout.write(`  → ${lang}...`)
                page.translations[lang] = {
                    meta: await translateObj(data.meta, src, lang),
                    pageContent: await translateObj(data.pageContent, src, lang),
                }
                process.stdout.write(' ✓\n')
            }

            page.translations[src] = {
                meta: { ...data.meta },
                pageContent: JSON.parse(JSON.stringify(data.pageContent)),
            }

            page._hashes = currentHashes
            fs.writeFileSync(filePath, stringify(page))
            setStatus('idle', 'Всё переведено')
            console.log('  ✅ Saved!')
            return true
        }

        // ═══════════════════════════════════════════════════════
        // ЧАСТИЧНОЕ ОБНОВЛЕНИЕ
        // ═══════════════════════════════════════════════════════
        const changes = detectChanges(currentHashes, savedHashes, data)

        if (changes.length === 0) {
            console.log('  ⏭️ No changes')
            setStatus('idle', 'Всё переведено')
            return false
        }

        const toTranslate = changes.filter(c => c.needsTranslation)
        const toSync = changes.filter(c => !c.needsTranslation)

        console.log(`  📝 ${toTranslate.length} text, ${toSync.length} media`)
        setStatus('translating', `Обновление: ${slug}`)

        // Переводим текстовые поля
        if (toTranslate.length > 0) {
            for (const lang of targets) {
                process.stdout.write(`  → ${lang}...`)
                for (const change of toTranslate) {
                    await new Promise(r => setTimeout(r, 150))
                    const translated = await translate(change.value, src, lang)
                    setByPath(page.translations[lang], change.path, translated)
                }
                process.stdout.write(' ✓\n')
            }
            // Оригинал
            for (const change of toTranslate) {
                setByPath(page.translations[src], change.path, change.value)
            }
        }

        // Синхронизируем медиа (без перевода)
        if (toSync.length > 0) {
            for (const change of toSync) {
                for (const lang of languageCodes) {
                    setByPath(page.translations[lang], change.path, change.value)
                }
            }
            console.log(`  🖼️ Media synced`)
        }

        page._hashes = currentHashes
        fs.writeFileSync(filePath, stringify(page))
        setStatus('idle', 'Всё переведено')
        console.log('  ✅ Saved!')
        return true

    } catch (e) {
        console.error(`  ❌ Error: ${e}`)
        setStatus('error', `Ошибка: ${slug}`)
        return false
    }
}

// ═══════════════════════════════════════════════════════════════
// BATCH
// ═══════════════════════════════════════════════════════════════

async function processAll(force = false) {
    const dir = path.resolve(process.cwd(), 'content/pages')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'))

    console.log(`\n🔄 Processing ${files.length} files${force ? ' (force)' : ''}`)
    setStatus('translating', `Обработка ${files.length} страниц`)

    for (const f of files) {
        await processFile(path.join(dir, f), force)
    }

    setStatus('idle', 'Всё переведено')
    console.log('\n✅ All done!')
}

// ═══════════════════════════════════════════════════════════════
// WATCH
// ═══════════════════════════════════════════════════════════════

function watch() {
    const dir = path.resolve(process.cwd(), 'content/pages')

    console.log('👀 Watching for changes...')
    console.log(`   Path: ${dir}`)
    console.log(`   Languages: ${languageCodes.join(', ')}`)
    console.log('   Press Ctrl+C to stop\n')

    setStatus('idle', 'Ожидание изменений')

    let busy = false
    let timer: NodeJS.Timeout | null = null
    let lastSaved: string | null = null
    let lastSaveTime = 0

    fs.watch(dir, (event, file) => {
        if (!file?.endsWith('.yml')) return

        const now = Date.now()
        if (file === lastSaved && (now - lastSaveTime) < 5000) return

        if (timer) clearTimeout(timer)

        timer = setTimeout(async () => {
            const fp = path.join(dir, file)
            if (!fs.existsSync(fp)) return

            if (busy) return

            busy = true
            console.log(`\n📝 Change detected: ${file}`)

            const saved = await processFile(fp, false)

            if (saved) {
                lastSaved = file
                lastSaveTime = Date.now()
            }

            busy = false
        }, 2000)
    })
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2)

if (args.includes('--watch')) {
    watch()
} else if (args.includes('--all')) {
    processAll(args.includes('--force'))
} else {
    const slug = args.find(a => !a.startsWith('--'))
    if (!slug) {
        console.log('Usage: npx tsx scripts/auto-translate.ts <--watch|--all|slug> [--force]')
        process.exit(1)
    }
    const fp = path.resolve(`content/pages/${slug}.yml`)
    if (!fs.existsSync(fp)) {
        console.error('❌ File not found')
        process.exit(1)
    }
    processFile(fp, args.includes('--force')).then(() => {
        setStatus('idle', 'Готово')
    })
}