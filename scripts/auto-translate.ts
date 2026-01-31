import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { parse, stringify } from 'yaml'
import { languageCodes } from '../config/languages'

const LINGVA_INSTANCES = [
    'https://lingva.ml',
    'https://lingva.lunar.icu',
    'https://translate.plausibility.cloud',
]

// Поля которые НЕ переводятся
const SKIP_KEYS = ['image', 'ogImage', 'src', 'url', 'href', 'icon', 'platform']

const STATUS_FILE = path.resolve(process.cwd(), 'public/admin/status.json')
const QUEUE_FILE = path.resolve(process.cwd(), 'public/admin/queue.json')

// ═══════════════════════════════════════════════════════════════
// ОЧЕРЕДЬ
// ═══════════════════════════════════════════════════════════════

interface QueueItem {
    file: string
    slug: string
    force: boolean
    addedAt: string
    status: 'pending' | 'processing' | 'done' | 'error'
    error?: string
}

interface QueueState {
    items: QueueItem[]
    processing: boolean
    currentFile: string | null
}

function loadQueue(): QueueState {
    try {
        if (fs.existsSync(QUEUE_FILE)) {
            return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'))
        }
    } catch {}
    return { items: [], processing: false, currentFile: null }
}

function saveQueue(queue: QueueState) {
    fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true })
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2))
    updateStatus(queue)
}

function addToQueue(file: string, force = false): QueueState {
    const queue = loadQueue()
    const slug = path.basename(file, '.yml')

    const existing = queue.items.find(i => i.file === file && i.status === 'pending')
    if (existing) {
        existing.force = existing.force || force
        existing.addedAt = new Date().toISOString()
        console.log(`  ⏫ Updated in queue: ${slug}`)
    } else {
        queue.items.push({
            file,
            slug,
            force,
            addedAt: new Date().toISOString(),
            status: 'pending'
        })
        console.log(`  ➕ Added to queue: ${slug}`)
    }

    saveQueue(queue)
    return queue
}

function updateStatus(queue: QueueState) {
    const pending = queue.items.filter(i => i.status === 'pending').length
    const processing = queue.items.find(i => i.status === 'processing')
    const done = queue.items.filter(i => i.status === 'done').length
    const errors = queue.items.filter(i => i.status === 'error')
    const total = queue.items.length

    let status: 'idle' | 'translating' | 'error' = 'idle'
    let message = 'Ожидание изменений'

    if (processing) {
        const processed = done + 1
        status = 'translating'
        message = `Перевод ${processed}/${total}: ${processing.slug}`
        if (pending > 0) {
            message += ` (ещё ${pending} в очереди)`
        }
    } else if (pending > 0) {
        status = 'translating'
        message = `В очереди: ${pending} файл(ов)`
    }

    if (errors.length > 0) {
        status = 'error'
        message = `Ошибки: ${errors.map(e => e.slug).join(', ')}`
    }

    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true })
    fs.writeFileSync(STATUS_FILE, JSON.stringify({
        status,
        message,
        queue: { pending, processing: processing?.slug || null, done, errors: errors.length, total },
        updatedAt: new Date().toISOString()
    }, null, 2))
}

function cleanOldItems(queue: QueueState): QueueState {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    queue.items = queue.items.filter(item => {
        // pending и processing всегда оставляем
        if (item.status === 'pending' || item.status === 'processing') return true
        // done удаляем сразу
        if (item.status === 'done') return false
        // error оставляем на 5 минут
        const addedAt = new Date(item.addedAt).getTime()
        return addedAt > fiveMinAgo
    })
    return queue
}

// ═══════════════════════════════════════════════════════════════
// FLATTEN / UNFLATTEN
// ═══════════════════════════════════════════════════════════════

function flatten(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${key}` : key
        if (Array.isArray(value)) {
            value.forEach((item, i) => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(result, flatten(item, `${p}[${i}]`))
                } else {
                    result[`${p}[${i}]`] = item
                }
            })
        } else if (typeof value === 'object' && value !== null) {
            Object.assign(result, flatten(value, p))
        } else {
            result[p] = value
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
// ХЭШИ И ИЗМЕНЕНИЯ
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

interface Change {
    path: string
    value: any
    needsTranslation: boolean
}

function detectChanges(currentHashes: Record<string, string>, savedHashes: Record<string, string>, data: any): Change[] {
    const changes: Change[] = []
    for (const [path, hash] of Object.entries(currentHashes)) {
        if (savedHashes[path] !== hash) {
            const lastKey = path.split(/\.|\[/).pop()?.replace(']', '') || ''
            const needsTranslation = !SKIP_KEYS.includes(lastKey)
            changes.push({ path, value: getByPath(data, path), needsTranslation })
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

        const hasTranslations = targets.every(l => page.translations?.[l]?.meta?.title)
        const currentHashes = getFieldHashes(data)
        const savedHashes = page._hashes || {}

        // ПОЛНЫЙ ПЕРЕВОД
        if (force || !hasTranslations) {
            console.log(force ? '  🔄 Full translation' : '  🆕 First translation')

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
            console.log('  ✅ Saved!')
            return true
        }

        // ЧАСТИЧНОЕ ОБНОВЛЕНИЕ
        const changes = detectChanges(currentHashes, savedHashes, data)

        if (changes.length === 0) {
            console.log('  ⏭️ No changes')
            return false
        }

        const toTranslate = changes.filter(c => c.needsTranslation)
        const toSync = changes.filter(c => !c.needsTranslation)

        console.log(`  📝 ${toTranslate.length} text, ${toSync.length} media`)

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
            for (const change of toTranslate) {
                setByPath(page.translations[src], change.path, change.value)
            }
        }

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
        console.log('  ✅ Saved!')
        return true

    } catch (e) {
        console.error(`  ❌ Error: ${e}`)
        throw e
    }
}

// ═══════════════════════════════════════════════════════════════
// ПРОЦЕССОР ОЧЕРЕДИ
// ═══════════════════════════════════════════════════════════════

let isProcessing = false

async function processQueue() {
    if (isProcessing) return
    isProcessing = true

    const startTime = Date.now()
    let processed = 0
    let errors = 0

    try {
        while (true) {
            let queue = loadQueue()
            queue = cleanOldItems(queue)

            const next = queue.items.find(i => i.status === 'pending')
            if (!next) {
                queue.processing = false
                queue.currentFile = null
                saveQueue(queue)
                break
            }

            // Помечаем как processing
            next.status = 'processing'
            queue.processing = true
            queue.currentFile = next.file
            saveQueue(queue)

            const pending = queue.items.filter(i => i.status === 'pending').length
            console.log(`\n🔄 [${processed + 1}/${processed + pending + 1}] Processing: ${next.slug}`)

            try {
                await processFile(next.file, next.force)
                next.status = 'done'
                processed++
            } catch (e) {
                next.status = 'error'
                next.error = String(e)
                errors++
            }

            // Обновляем статус в очереди
            queue = loadQueue()
            const item = queue.items.find(i => i.file === next.file && i.status === 'processing')
            if (item) {
                item.status = next.status
                item.error = next.error
            }
            saveQueue(queue)
        }
    } finally {
        isProcessing = false

        // Очищаем завершённые записи
        let queue = loadQueue()
        queue = cleanOldItems(queue)
        saveQueue(queue)

        // Итоговый отчёт
        const duration = ((Date.now() - startTime) / 1000).toFixed(1)

        if (processed > 0 || errors > 0) {
            console.log('\n' + '═'.repeat(50))
            console.log('📊 ИТОГО:')
            console.log(`   ✅ Обработано: ${processed} страниц(ы)`)
            if (errors > 0) {
                console.log(`   ❌ Ошибок: ${errors}`)
            }
            console.log(`   ⏱️ Время: ${duration} сек`)
            console.log('═'.repeat(50))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// BATCH
// ═══════════════════════════════════════════════════════════════

async function processAll(force = false) {
    const dir = path.resolve(process.cwd(), 'content/pages')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'))

    console.log('\n' + '═'.repeat(50))
    console.log(`📁 Найдено файлов: ${files.length}`)
    console.log(`🔧 Режим: ${force ? 'принудительный перевод' : 'только изменения'}`)
    console.log('═'.repeat(50))

    for (const f of files) {
        addToQueue(path.join(dir, f), force)
    }

    await processQueue()

    console.log('\n🎉 Все переводы завершены!\n')
}

// ═══════════════════════════════════════════════════════════════
// WATCH
// ═══════════════════════════════════════════════════════════════

function watch() {
    const dir = path.resolve(process.cwd(), 'content/pages')

    console.log('\n' + '═'.repeat(50))
    console.log('👀 РЕЖИМ НАБЛЮДЕНИЯ')
    console.log('═'.repeat(50))
    console.log(`📁 Папка: ${dir}`)
    console.log(`🌍 Языки: ${languageCodes.join(', ')}`)
    console.log('⌨️ Нажмите Ctrl+C для выхода')
    console.log('═'.repeat(50) + '\n')

    // Очищаем очередь при старте
    saveQueue({ items: [], processing: false, currentFile: null })

    let timers: Map<string, NodeJS.Timeout> = new Map()
    let lastSaved: Map<string, number> = new Map()

    fs.watch(dir, (event, file) => {
        if (!file?.endsWith('.yml')) return

        const now = Date.now()
        const lastSaveTime = lastSaved.get(file) || 0

        if ((now - lastSaveTime) < 5000) return

        const existing = timers.get(file)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(async () => {
            timers.delete(file)
            const fp = path.join(dir, file)
            if (!fs.existsSync(fp)) return

            console.log(`\n📝 Обнаружено изменение: ${file}`)
            addToQueue(fp, false)

            lastSaved.set(file, Date.now())

            await processQueue()

            lastSaved.set(file, Date.now())

            console.log('\n👀 Ожидание изменений...')
        }, 2000)

        timers.set(file, timer)
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
} else if (args.includes('--status')) {
    const queue = loadQueue()
    console.log('\n📊 Статус очереди:')
    console.log(`   Обработка: ${queue.processing ? 'Да' : 'Нет'}`)
    console.log(`   Текущий: ${queue.currentFile || '-'}`)
    console.log(`   Всего: ${queue.items.length}`)
    if (queue.items.length > 0) {
        console.log('\n   Файлы:')
        queue.items.forEach(item => {
            const icon = { pending: '⏳', processing: '🔄', done: '✅', error: '❌' }[item.status]
            console.log(`   ${icon} ${item.slug} (${item.status})`)
        })
    }
} else {
    const slug = args.find(a => !a.startsWith('--'))
    if (!slug) {
        console.log('\n📖 Использование:')
        console.log('   npx tsx scripts/auto-translate.ts --watch        # Режим наблюдения')
        console.log('   npx tsx scripts/auto-translate.ts --all          # Перевести все')
        console.log('   npx tsx scripts/auto-translate.ts --all --force  # Перевести все принудительно')
        console.log('   npx tsx scripts/auto-translate.ts --status       # Статус очереди')
        console.log('   npx tsx scripts/auto-translate.ts <slug>         # Перевести один файл')
        process.exit(1)
    }
    const fp = path.resolve(`content/pages/${slug}.yml`)
    if (!fs.existsSync(fp)) {
        console.error('❌ Файл не найден:', fp)
        process.exit(1)
    }
    addToQueue(fp, args.includes('--force'))
    processQueue()
}