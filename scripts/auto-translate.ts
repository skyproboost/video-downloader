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

// Поля которые НЕ переводятся (копируются как есть)
const SKIP_KEYS = ['image', 'ogImage', 'src', 'url', 'href', 'icon', 'platform', 'slug', 'footerLinkText', 'imageAlt', 'ogImageAlt']

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
            file, slug, force,
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
        status = 'translating'
        message = `Перевод ${done + 1}/${total}: ${processing.slug}`
        if (pending > 0) message += ` (ещё ${pending} в очереди)`
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
        status, message,
        queue: { pending, processing: processing?.slug || null, done, errors: errors.length, total },
        updatedAt: new Date().toISOString()
    }, null, 2))
}

function cleanOldItems(queue: QueueState): QueueState {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    queue.items = queue.items.filter(item => {
        if (item.status === 'pending' || item.status === 'processing') return true
        if (item.status === 'done') return false
        return new Date(item.addedAt).getTime() > fiveMinAgo
    })
    return queue
}

// ═══════════════════════════════════════════════════════════════
// FLATTEN / UNFLATTEN - работа с путями полей
// ═══════════════════════════════════════════════════════════════

function flatten(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {}

    if (obj === null || obj === undefined) return result

    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key

        if (Array.isArray(value)) {
            // Сохраняем информацию о длине массива
            result[`${path}.__length`] = value.length

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

function getByPath(obj: any, pathStr: string): any {
    const parts = pathStr.split(/\.|\[(\d+)\]/).filter(Boolean)
    let current = obj
    for (const part of parts) {
        if (current === undefined || current === null) return undefined
        current = current[part]
    }
    return current
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

function deleteByPath(obj: any, pathStr: string) {
    const parts = pathStr.split(/\.|\[(\d+)\]/).filter(Boolean)
    let current = obj
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (current === undefined || current === null || !(part in current)) return
        current = current[part]
    }
    const lastPart = parts[parts.length - 1]
    if (current && lastPart in current) {
        if (Array.isArray(current)) {
            current.splice(Number(lastPart), 1)
        } else {
            delete current[lastPart]
        }
    }
}

// Получаем ключ поля из пути (последняя часть)
function getFieldKey(pathStr: string): string {
    const match = pathStr.match(/\.([^.\[]+)$|\[(\d+)\]$|^([^.\[]+)$/)
    if (match) return match[1] || match[2] || match[3] || ''
    return ''
}

// Проверяем, нужно ли переводить это поле
function needsTranslation(pathStr: string): boolean {
    const key = getFieldKey(pathStr)
    return !SKIP_KEYS.includes(key)
}

// ═══════════════════════════════════════════════════════════════
// ХЭШИ
// ═══════════════════════════════════════════════════════════════

function hashValue(value: any): string {
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8)
}

function getFieldHashes(data: any): Record<string, string> {
    const flat = flatten(data)
    const hashes: Record<string, string> = {}

    for (const [path, value] of Object.entries(flat)) {
        // Пропускаем служебные поля __length
        if (path.endsWith('.__length')) {
            hashes[path] = String(value) // сохраняем длину как строку
        } else if (value !== undefined && value !== null && value !== '') {
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
    type: 'added' | 'changed' | 'deleted'
    value?: any
    needsTranslation: boolean
}

function detectChanges(
    currentHashes: Record<string, string>,
    savedHashes: Record<string, string>,
    data: any
): Change[] {
    const changes: Change[] = []
    const processedArrays = new Set<string>()

    // 1. Проверяем изменения длины массивов (удаление элементов)
    for (const [path, value] of Object.entries(savedHashes)) {
        if (path.endsWith('.__length')) {
            const arrayPath = path.replace('.__length', '')
            const oldLength = Number(value)
            const newLength = Number(currentHashes[path] || 0)

            if (newLength < oldLength) {
                // Массив уменьшился — помечаем для синхронизации
                processedArrays.add(arrayPath)
                changes.push({
                    path: arrayPath,
                    type: 'changed',
                    value: getByPath(data, arrayPath),
                    needsTranslation: false // структурное изменение
                })
            }
        }
    }

    // 2. Новые и изменённые поля
    for (const [path, hash] of Object.entries(currentHashes)) {
        if (path.endsWith('.__length')) continue

        // Проверяем, не является ли это частью уже обработанного массива
        const isPartOfProcessedArray = Array.from(processedArrays).some(ap => path.startsWith(ap + '['))
        if (isPartOfProcessedArray) continue

        if (!(path in savedHashes)) {
            // Новое поле
            changes.push({
                path,
                type: 'added',
                value: getByPath(data, path),
                needsTranslation: needsTranslation(path)
            })
        } else if (savedHashes[path] !== hash) {
            // Изменённое поле
            changes.push({
                path,
                type: 'changed',
                value: getByPath(data, path),
                needsTranslation: needsTranslation(path)
            })
        }
    }

    // 3. Удалённые поля
    for (const [path, _] of Object.entries(savedHashes)) {
        if (path.endsWith('.__length')) continue

        const isPartOfProcessedArray = Array.from(processedArrays).some(ap => path.startsWith(ap + '['))
        if (isPartOfProcessedArray) continue

        if (!(path in currentHashes)) {
            changes.push({
                path,
                type: 'deleted',
                needsTranslation: false
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

async function translateValue(value: any, from: string, to: string): Promise<any> {
    if (typeof value === 'string') {
        await new Promise(r => setTimeout(r, 100))
        return translate(value, from, to)
    }

    if (Array.isArray(value)) {
        const result = []
        for (const item of value) {
            result.push(await translateValue(item, from, to))
        }
        return result
    }

    if (typeof value === 'object' && value !== null) {
        const result: any = {}
        for (const [k, v] of Object.entries(value)) {
            result[k] = SKIP_KEYS.includes(k) ? v : await translateValue(v, from, to)
        }
        return result
    }

    return value
}

async function translateObject(obj: any, from: string, to: string): Promise<any> {
    if (typeof obj === 'string') {
        return translate(obj, from, to)
    }
    if (Array.isArray(obj)) {
        const res = []
        for (const item of obj) {
            res.push(await translateObject(item, from, to))
        }
        return res
    }
    if (typeof obj === 'object' && obj !== null) {
        const res: any = {}
        for (const [k, v] of Object.entries(obj)) {
            res[k] = SKIP_KEYS.includes(k) ? v : await translateObject(v, from, to)
        }
        return res
    }
    return obj
}

// ═══════════════════════════════════════════════════════════════
// СИНХРОНИЗАЦИЯ СТРУКТУРЫ
// ═══════════════════════════════════════════════════════════════

function syncArrayLength(target: any, pathStr: string, newLength: number) {
    const arr = getByPath(target, pathStr)
    if (Array.isArray(arr) && arr.length > newLength) {
        arr.length = newLength // обрезаем массив
    }
}

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
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

        const srcLang = page.source_lang || 'en'
        const targets = languageCodes.filter(l => l !== srcLang)
        const sourceData = { meta: page.meta, pageContent: page.pageContent }

        const currentHashes = getFieldHashes(sourceData)
        const savedHashes = page._hashes || {}

        // Проверяем есть ли переводы
        const hasAllTranslations = languageCodes.every(l =>
            page.translations?.[l]?.meta?.title && page.translations?.[l]?.pageContent?.mainTitle
        )

        // ═══════════════════════════════════════════════════════════
        // ПОЛНЫЙ ПЕРЕВОД (создание или force)
        // ═══════════════════════════════════════════════════════════
        if (force || !hasAllTranslations) {
            console.log(force ? '  🔄 Force full translation' : '  🆕 Initial translation')

            page.translations = {}

            for (const lang of targets) {
                process.stdout.write(`  → ${lang}...`)
                page.translations[lang] = {
                    meta: await translateObject(deepClone(sourceData.meta), srcLang, lang),
                    pageContent: await translateObject(deepClone(sourceData.pageContent), srcLang, lang),
                }
                console.log(' ✓')
            }

            // Сохраняем source language как есть
            page.translations[srcLang] = deepClone(sourceData)

            page._hashes = currentHashes
            fs.writeFileSync(filePath, stringify(page))
            console.log('  ✅ Saved!')
            return true
        }

        // ═══════════════════════════════════════════════════════════
        // ИНКРЕМЕНТАЛЬНОЕ ОБНОВЛЕНИЕ
        // ═══════════════════════════════════════════════════════════
        const changes = detectChanges(currentHashes, savedHashes, sourceData)

        if (changes.length === 0) {
            console.log('  ⏭️ No changes')
            return false
        }

        const toTranslate = changes.filter(c => c.type !== 'deleted' && c.needsTranslation)
        const toSync = changes.filter(c => c.type !== 'deleted' && !c.needsTranslation)
        const toDelete = changes.filter(c => c.type === 'deleted')
        const arrayChanges = changes.filter(c => c.path.includes('.__length') ||
            (c.type === 'changed' && Array.isArray(c.value)))

        console.log(`  📝 Changes: ${toTranslate.length} translate, ${toSync.length} sync, ${toDelete.length} delete`)

        // 1. Синхронизируем структуру массивов (обрезаем если нужно)
        for (const change of arrayChanges) {
            if (Array.isArray(change.value)) {
                const newLength = change.value.length
                for (const lang of languageCodes) {
                    if (page.translations[lang]) {
                        syncArrayLength(page.translations[lang], change.path, newLength)
                    }
                }
            }
        }

        // 2. Удаляем удалённые поля
        if (toDelete.length > 0) {
            for (const change of toDelete) {
                for (const lang of languageCodes) {
                    if (page.translations[lang]) {
                        deleteByPath(page.translations[lang], change.path)
                    }
                }
            }
            console.log(`  🗑️ Deleted ${toDelete.length} field(s)`)
        }

        // 3. Синхронизируем поля без перевода (картинки, иконки и т.д.)
        if (toSync.length > 0) {
            for (const change of toSync) {
                // Если это массив — копируем структуру с переводом содержимого
                if (Array.isArray(change.value)) {
                    for (const lang of languageCodes) {
                        if (!page.translations[lang]) {
                            page.translations[lang] = { meta: {}, pageContent: {} }
                        }
                        if (lang === srcLang) {
                            setByPath(page.translations[lang], change.path, deepClone(change.value))
                        } else {
                            const translated = await translateObject(deepClone(change.value), srcLang, lang)
                            setByPath(page.translations[lang], change.path, translated)
                        }
                    }
                } else {
                    // Простое значение — копируем во все языки
                    for (const lang of languageCodes) {
                        if (page.translations[lang]) {
                            setByPath(page.translations[lang], change.path, change.value)
                        }
                    }
                }
            }
            console.log(`  🔗 Synced ${toSync.length} field(s)`)
        }

        // 4. Переводим текстовые поля
        if (toTranslate.length > 0) {
            for (const lang of targets) {
                process.stdout.write(`  → ${lang}: `)
                let count = 0

                for (const change of toTranslate) {
                    if (!page.translations[lang]) {
                        page.translations[lang] = { meta: {}, pageContent: {} }
                    }

                    const translated = await translateValue(change.value, srcLang, lang)
                    setByPath(page.translations[lang], change.path, translated)
                    count++
                    process.stdout.write('.')
                }
                console.log(` ${count} field(s)`)
            }

            // Обновляем source language
            for (const change of toTranslate) {
                if (!page.translations[srcLang]) {
                    page.translations[srcLang] = { meta: {}, pageContent: {} }
                }
                setByPath(page.translations[srcLang], change.path, change.value)
            }
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
    let processed = 0, errors = 0

    try {
        while (true) {
            let queue = cleanOldItems(loadQueue())

            const next = queue.items.find(i => i.status === 'pending')
            if (!next) {
                queue.processing = false
                queue.currentFile = null
                saveQueue(queue)
                break
            }

            next.status = 'processing'
            queue.processing = true
            queue.currentFile = next.file
            saveQueue(queue)

            try {
                await processFile(next.file, next.force)
                next.status = 'done'
                processed++
            } catch (e) {
                next.status = 'error'
                next.error = String(e)
                errors++
            }

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
        saveQueue(cleanOldItems(loadQueue()))

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        if (processed > 0 || errors > 0) {
            console.log('\n' + '═'.repeat(50))
            console.log(`📊 ИТОГО: ✅ ${processed} | ❌ ${errors} | ⏱️ ${duration}s`)
            console.log('═'.repeat(50))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// BATCH & WATCH
// ═══════════════════════════════════════════════════════════════

async function processAll(force = false) {
    const dir = path.resolve(process.cwd(), 'content/pages')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'))

    console.log('\n' + '═'.repeat(50))
    console.log(`📁 Files: ${files.length} | Mode: ${force ? 'FORCE' : 'incremental'}`)
    console.log('═'.repeat(50))

    for (const f of files) addToQueue(path.join(dir, f), force)
    await processQueue()
    console.log('\n🎉 Done!\n')
}

function watch() {
    const dir = path.resolve(process.cwd(), 'content/pages')

    console.log('\n' + '═'.repeat(50))
    console.log('👀 WATCH MODE')
    console.log(`📁 ${dir}`)
    console.log(`🌍 ${languageCodes.join(', ')}`)
    console.log('═'.repeat(50) + '\n')

    saveQueue({ items: [], processing: false, currentFile: null })

    const timers = new Map<string, NodeJS.Timeout>()
    const lastSaved = new Map<string, number>()

    fs.watch(dir, (_, file) => {
        if (!file?.endsWith('.yml')) return

        const now = Date.now()
        if ((now - (lastSaved.get(file) || 0)) < 5000) return

        clearTimeout(timers.get(file))
        timers.set(file, setTimeout(async () => {
            timers.delete(file)
            const fp = path.join(dir, file)
            if (!fs.existsSync(fp)) return

            console.log(`\n📝 Changed: ${file}`)
            addToQueue(fp, false)
            lastSaved.set(file, Date.now())
            await processQueue()
            lastSaved.set(file, Date.now())
            console.log('\n👀 Watching...')
        }, 2000))
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
    const q = loadQueue()
    console.log(`\n📊 Queue: ${q.items.length} items, processing: ${q.processing}`)
    q.items.forEach(i => console.log(`  ${{pending:'⏳',processing:'🔄',done:'✅',error:'❌'}[i.status]} ${i.slug}`))
} else {
    const slug = args.find(a => !a.startsWith('--'))
    if (!slug) {
        console.log(`
📖 Usage:
  npx tsx scripts/auto-translate.ts --watch
  npx tsx scripts/auto-translate.ts --all [--force]
  npx tsx scripts/auto-translate.ts <slug> [--force]
  npx tsx scripts/auto-translate.ts --status`)
        process.exit(1)
    }
    const fp = path.resolve(`content/pages/${slug}.yml`)
    if (!fs.existsSync(fp)) {
        console.error('❌ Not found:', fp)
        process.exit(1)
    }
    addToQueue(fp, args.includes('--force'))
    processQueue()
}