import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { parse, stringify } from 'yaml'
import { languageCodes } from '../config/languages'

// ═══════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════

const DEEPL_API_KEY = '94886d77-fa04-4568-91db-dbda3212f1d9:fx'
const DEEPL_API_URL = 'https://api-free.deepl.com/v2'

const DEEPL_SPECIAL_CODES: Record<string, string> = {
    'pt': 'PT-PT',
    'zh': 'ZH-HANS',
    'no': 'NB',
}

const SKIP_TRANSLATION_KEYS = [
    'image', 'ogImage', 'src', 'url', 'href', 'icon',
    'platform', 'slug', 'footerLinkText', 'imageAlt', 'ogImageAlt'
]

const CONTENT_DIR = path.resolve(process.cwd(), 'content/pages')
const STATUS_FILE = path.resolve(process.cwd(), 'public/admin/status.json')
const QUEUE_FILE = path.resolve(process.cwd(), 'public/admin/queue.json')

const TRANSLATE_DELAY = 100
let requestCount = 0
const SHOW_USAGE_EVERY = 20

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

interface PageData {
    slug: string
    platform: string
    source_lang: string
    footerLinkText?: string
    meta: Record<string, any>
    pageContent: Record<string, any>
    translations?: Record<string, {
        meta: Record<string, any>
        pageContent: Record<string, any>
    }>
    _status?: 'translating' | 'ready'
    _hashes?: {
        _slug: string
        _contentHash: string
        fields: Record<string, string>
    }
}

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

interface FieldChange {
    path: string
    type: 'added' | 'changed' | 'deleted'
    value?: any
    needsTranslation: boolean
}

interface DeepLUsage {
    character_count: number
    character_limit: number
}

// ═══════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}

function hash(value: any): string {
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 12)
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function shouldTranslate(key: string): boolean {
    return !SKIP_TRANSLATION_KEYS.includes(key)
}

function toDeepLLang(lang: string): string {
    const lower = lang.toLowerCase()
    return DEEPL_SPECIAL_CODES[lower] || lang.toUpperCase()
}

// ═══════════════════════════════════════════════════════════════
// CACHE WARMING (прогрев ISR кэша)
// ═══════════════════════════════════════════════════════════════

async function warmCache(slug: string): Promise<void> {
    const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    try {
        await fetch(`${siteUrl}/${slug}`, {
            signal: AbortSignal.timeout(5000),
            headers: { 'X-Cache-Warm': '1' }
        })
        console.log(`  🔥 Cache warmed: ${slug}`)
    } catch {
        // Игнорируем — сервер может быть не запущен
    }
}

// ═══════════════════════════════════════════════════════════════
// DeepL API
// ═══════════════════════════════════════════════════════════════

async function getDeepLUsage(): Promise<DeepLUsage | null> {
    try {
        const res = await fetch(`${DEEPL_API_URL}/usage`, {
            headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}` }
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

async function showUsageInfo(force = false): Promise<void> {
    if (!force && requestCount % SHOW_USAGE_EVERY !== 0) return

    const usage = await getDeepLUsage()
    if (usage) {
        const used = usage.character_count.toLocaleString()
        const limit = usage.character_limit.toLocaleString()
        const percent = ((usage.character_count / usage.character_limit) * 100).toFixed(1)
        const remaining = (usage.character_limit - usage.character_count).toLocaleString()
        console.log(`\n  📊 DeepL: ${used}/${limit} символов (${percent}%) | Осталось: ${remaining}`)
    }
}

async function translateText(text: string, from: string, to: string): Promise<string> {
    if (!text || typeof text !== 'string') return text
    if (from === to) return text
    if (text.startsWith('/') || text.startsWith('http')) return text
    if (text.trim().length === 0) return text

    const sourceLang = toDeepLLang(from)
    const targetLang = toDeepLLang(to)

    try {
        const res = await fetch(`${DEEPL_API_URL}/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text],
                source_lang: sourceLang,
                target_lang: targetLang,
            }),
            signal: AbortSignal.timeout(30000)
        })

        if (!res.ok) {
            const errorText = await res.text()
            console.warn(`\n    ⚠️ DeepL error ${res.status}: ${errorText}`)

            if (res.status === 456) {
                console.error('\n    ❌ DeepL quota exceeded!')
                await showUsageInfo(true)
            }
            return text
        }

        const data = await res.json()
        requestCount++

        await showUsageInfo()
        await sleep(TRANSLATE_DELAY)

        if (data.translations?.[0]?.text) {
            return data.translations[0].text
        }

        return text
    } catch (err) {
        console.warn(`\n    ⚠️ DeepL failed: ${err instanceof Error ? err.message : 'unknown'}`)
        return text
    }
}

async function translateValue(value: any, from: string, to: string): Promise<any> {
    if (typeof value === 'string') {
        return translateText(value, from, to)
    }

    if (Array.isArray(value)) {
        const result = []
        for (const item of value) {
            result.push(await translateValue(item, from, to))
        }
        return result
    }

    if (typeof value === 'object' && value !== null) {
        const result: Record<string, any> = {}
        for (const [key, val] of Object.entries(value)) {
            result[key] = shouldTranslate(key)
                ? await translateValue(val, from, to)
                : deepClone(val)
        }
        return result
    }

    return value
}

async function translateObject(obj: any, from: string, to: string): Promise<any> {
    return translateValue(obj, from, to)
}

// ═══════════════════════════════════════════════════════════════
// РАБОТА С ПУТЯМИ В ОБЪЕКТЕ
// ═══════════════════════════════════════════════════════════════

function flatten(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {}
    if (obj === null || obj === undefined) return result

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = prefix ? `${prefix}.${key}` : key

        if (Array.isArray(value)) {
            result[`${currentPath}.__isArray`] = true
            result[`${currentPath}.__length`] = value.length
            value.forEach((item, i) => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(result, flatten(item, `${currentPath}[${i}]`))
                } else {
                    result[`${currentPath}[${i}]`] = item
                }
            })
        } else if (typeof value === 'object' && value !== null) {
            Object.assign(result, flatten(value, currentPath))
        } else {
            result[currentPath] = value
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

function setByPath(obj: any, pathStr: string, value: any): void {
    const parts = pathStr.split(/\.|\[(\d+)\]/).filter(Boolean)
    let current = obj

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        const nextPart = parts[i + 1]

        if (!(part in current)) {
            current[part] = /^\d+$/.test(nextPart) ? [] : {}
        }
        current = current[part]
    }

    const lastPart = parts[parts.length - 1]
    current[lastPart] = value
}

function deleteByPath(obj: any, pathStr: string): void {
    const parts = pathStr.split(/\.|\[(\d+)\]/).filter(Boolean)
    let current = obj

    for (let i = 0; i < parts.length - 1; i++) {
        if (current === undefined || current === null) return
        current = current[parts[i]]
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

function getFieldKey(pathStr: string): string {
    const match = pathStr.match(/\.([^.\[]+)$|\[(\d+)\]\.([^.\[]+)$|^([^.\[]+)$/)
    return match?.[1] || match?.[3] || match?.[4] || pathStr.split('.').pop() || ''
}

// ═══════════════════════════════════════════════════════════════
// ХЭШИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════

function computeContentHash(meta: any, pageContent: any): string {
    return hash({ meta, pageContent })
}

function computeFieldHashes(data: any): Record<string, string> {
    const flat = flatten(data)
    const hashes: Record<string, string> = {}

    for (const [path, value] of Object.entries(flat)) {
        if (path.endsWith('.__isArray') || path.endsWith('.__length')) continue
        if (value !== undefined && value !== null && value !== '') {
            hashes[path] = hash(value)
        }
    }
    return hashes
}

// ═══════════════════════════════════════════════════════════════
// ОПРЕДЕЛЕНИЕ СЦЕНАРИЯ И ИЗМЕНЕНИЙ
// ═══════════════════════════════════════════════════════════════

type PageScenario = 'new' | 'duplicated' | 'corrupted' | 'unchanged' | 'incremental'

function detectScenario(page: PageData): PageScenario {
    const hasHashes = !!page._hashes?.fields
    const hasTranslations = !!page.translations

    const hasAllTranslations = languageCodes.every(lang => {
        const t = page.translations?.[lang]
        return t?.meta?.title && t?.pageContent?.mainTitle
    })

    if (!hasHashes && !hasTranslations) return 'new'
    if (hasHashes && page._hashes!._slug !== page.slug) return 'duplicated'
    if (!hasAllTranslations) return 'corrupted'

    const currentContentHash = computeContentHash(page.meta, page.pageContent)
    if (hasHashes && page._hashes!._contentHash === currentContentHash) return 'unchanged'

    return 'incremental'
}

function detectFieldChanges(
    currentHashes: Record<string, string>,
    savedHashes: Record<string, string>,
    sourceData: any
): FieldChange[] {
    const changes: FieldChange[] = []

    for (const [path, currentHash] of Object.entries(currentHashes)) {
        const savedHash = savedHashes[path]
        const fieldKey = getFieldKey(path)
        const needsTranslation = shouldTranslate(fieldKey)

        if (!savedHash) {
            changes.push({ path, type: 'added', value: getByPath(sourceData, path), needsTranslation })
        } else if (savedHash !== currentHash) {
            changes.push({ path, type: 'changed', value: getByPath(sourceData, path), needsTranslation })
        }
    }

    for (const path of Object.keys(savedHashes)) {
        if (!(path in currentHashes)) {
            changes.push({ path, type: 'deleted', needsTranslation: false })
        }
    }

    return changes
}

// ═══════════════════════════════════════════════════════════════
// СИНХРОНИЗАЦИЯ ПЕРЕВОДОВ
// ═══════════════════════════════════════════════════════════════

function ensureTranslationStructure(page: PageData): void {
    if (!page.translations) page.translations = {}

    for (const lang of languageCodes) {
        if (!page.translations[lang]) {
            page.translations[lang] = { meta: {}, pageContent: {} }
        }
        if (!page.translations[lang].meta) page.translations[lang].meta = {}
        if (!page.translations[lang].pageContent) page.translations[lang].pageContent = {}
    }
}

function syncNonTranslatableField(page: PageData, path: string, value: any): void {
    for (const lang of languageCodes) {
        setByPath(page.translations![lang], path, deepClone(value))
    }
}

async function syncTranslatableField(
    page: PageData, path: string, value: any, srcLang: string
): Promise<void> {
    const targets = languageCodes.filter(l => l !== srcLang)
    setByPath(page.translations![srcLang], path, deepClone(value))

    for (const lang of targets) {
        const translated = await translateValue(value, srcLang, lang)
        setByPath(page.translations![lang], path, translated)
    }
}

function removeDeletedField(page: PageData, path: string): void {
    for (const lang of languageCodes) {
        deleteByPath(page.translations![lang], path)
    }
}

// ═══════════════════════════════════════════════════════════════
// СОХРАНЕНИЕ ФАЙЛА
// ═══════════════════════════════════════════════════════════════

let isSavingFile = false
const recentlySaved = new Set<string>()

function markAsSaving(filePath: string): void {
    isSavingFile = true
    const fileName = path.basename(filePath)
    recentlySaved.add(fileName)
    setTimeout(() => {
        recentlySaved.delete(fileName)
        isSavingFile = false
    }, 3000)
}

function savePageFile(filePath: string, page: PageData): void {
    markAsSaving(filePath)
    fs.writeFileSync(filePath, stringify(page))
}

// ═══════════════════════════════════════════════════════════════
// ОБРАБОТКА СТРАНИЦЫ
// ═══════════════════════════════════════════════════════════════

async function processPage(filePath: string, force = false): Promise<boolean> {
    const fileName = path.basename(filePath)
    const fileSlug = fileName.replace('.yml', '')

    console.log(`\n${'─'.repeat(50)}`)
    console.log(`📄 ${fileName}`)

    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const page = parse(content) as PageData

        if (!page.meta || !page.pageContent) {
            console.log('  ⏭️  Skip: no meta or pageContent')
            return false
        }

        if (!page.slug) page.slug = fileSlug

        if (page.slug !== fileSlug) {
            const newFilePath = path.join(path.dirname(filePath), `${page.slug}.yml`)

            if (fs.existsSync(newFilePath)) {
                console.log(`  ❌ Error: File ${page.slug}.yml already exists!`)
                console.log(`  💡 Change slug in ${fileName} to something unique`)

                if (/^.+-\d+\.yml$/.test(fileName)) {
                    console.log(`  🗑️  Removing duplicate file: ${fileName}`)
                    fs.unlinkSync(filePath)
                }
                return false
            }

            console.log(`  📝 Renaming: ${fileName} → ${page.slug}.yml`)
            fs.renameSync(filePath, newFilePath)
            filePath = newFilePath
        }

        const srcLang = page.source_lang || 'en'
        const sourceData = { meta: page.meta, pageContent: page.pageContent }
        const scenario = force ? 'new' : detectScenario(page)
        console.log(`  📋 Scenario: ${scenario}`)

        // ═══════════════════════════════════════════════════════════
        // ПОЛНЫЙ ПЕРЕВОД
        // ═══════════════════════════════════════════════════════════
        if (['new', 'duplicated', 'corrupted'].includes(scenario)) {
            const reason = {
                'new': '🆕 New page',
                'duplicated': '📋 Duplicated page detected',
                'corrupted': '🔧 Missing/corrupted translations'
            }[scenario]

            console.log(`  ${reason} → Full translation`)

            await showUsageInfo(true)

            page._status = 'translating'
            savePageFile(filePath, page)
            console.log('  🔒 Page hidden until translation complete')

            page.translations = {}
            ensureTranslationStructure(page)
            page.translations[srcLang] = deepClone(sourceData)

            const targets = languageCodes.filter(l => l !== srcLang)
            for (const lang of targets) {
                process.stdout.write(`  → ${lang}...`)
                page.translations[lang] = {
                    meta: await translateObject(deepClone(sourceData.meta), srcLang, lang),
                    pageContent: await translateObject(deepClone(sourceData.pageContent), srcLang, lang),
                }
                console.log(' ✓')
            }

            page._status = 'ready'
            page._hashes = {
                _slug: page.slug,
                _contentHash: computeContentHash(page.meta, page.pageContent),
                fields: computeFieldHashes(sourceData)
            }

            savePageFile(filePath, page)
            console.log('  🔓 Page published!')

            await warmCache(page.slug)
            await showUsageInfo(true)
            return true
        }

        // ═══════════════════════════════════════════════════════════
        // БЕЗ ИЗМЕНЕНИЙ
        // ═══════════════════════════════════════════════════════════
        if (scenario === 'unchanged') {
            console.log('  ⏭️  No changes detected')
            return false
        }

        // ═══════════════════════════════════════════════════════════
        // ИНКРЕМЕНТАЛЬНОЕ ОБНОВЛЕНИЕ
        // ═══════════════════════════════════════════════════════════
        const currentHashes = computeFieldHashes(sourceData)
        const savedHashes = page._hashes?.fields || {}
        const changes = detectFieldChanges(currentHashes, savedHashes, sourceData)

        if (changes.length === 0) {
            console.log('  ⏭️  No field changes')
            page._hashes = {
                _slug: page.slug,
                _contentHash: computeContentHash(page.meta, page.pageContent),
                fields: currentHashes
            }
            savePageFile(filePath, page)
            return false
        }

        const toTranslate = changes.filter(c => c.type !== 'deleted' && c.needsTranslation)
        const toSync = changes.filter(c => c.type !== 'deleted' && !c.needsTranslation)
        const toDelete = changes.filter(c => c.type === 'deleted')

        console.log(`  📝 Changes: ${toTranslate.length} translate, ${toSync.length} sync, ${toDelete.length} delete`)

        ensureTranslationStructure(page)

        for (const change of toDelete) {
            removeDeletedField(page, change.path)
        }
        if (toDelete.length > 0) console.log(`  🗑️  Deleted ${toDelete.length} field(s)`)

        for (const change of toSync) {
            syncNonTranslatableField(page, change.path, change.value)
        }
        if (toSync.length > 0) console.log(`  🔗 Synced ${toSync.length} field(s)`)

        if (toTranslate.length > 0) {
            const targets = languageCodes.filter(l => l !== srcLang)

            for (const lang of targets) {
                process.stdout.write(`  → ${lang}: `)

                for (const change of toTranslate) {
                    const translated = await translateValue(change.value, srcLang, lang)
                    setByPath(page.translations![lang], change.path, translated)
                    process.stdout.write('.')
                }
                console.log(' ✓')
            }

            for (const change of toTranslate) {
                setByPath(page.translations![srcLang], change.path, deepClone(change.value))
            }

            console.log(`  📝 Translated ${toTranslate.length} field(s)`)
        }

        page._hashes = {
            _slug: page.slug,
            _contentHash: computeContentHash(page.meta, page.pageContent),
            fields: currentHashes
        }

        savePageFile(filePath, page)
        console.log('  ✅ Saved!')

        await warmCache(page.slug)
        return true

    } catch (error) {
        console.error(`  ❌ Error: ${error}`)
        throw error
    }
}

// ═══════════════════════════════════════════════════════════════
// ОЧЕРЕДЬ
// ═══════════════════════════════════════════════════════════════

function loadQueue(): QueueState {
    try {
        if (fs.existsSync(QUEUE_FILE)) {
            return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'))
        }
    } catch {}
    return { items: [], processing: false, currentFile: null }
}

function saveQueue(queue: QueueState): void {
    fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true })
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2))
    updateStatus(queue)
}

function updateStatus(queue: QueueState): void {
    const pending = queue.items.filter(i => i.status === 'pending').length
    const processing = queue.items.find(i => i.status === 'processing')
    const done = queue.items.filter(i => i.status === 'done').length
    const errors = queue.items.filter(i => i.status === 'error')

    let status: 'idle' | 'translating' | 'error' = 'idle'
    let message = 'Ожидание изменений'

    if (processing) {
        status = 'translating'
        message = `Перевод: ${processing.slug}`
        if (pending > 0) message += ` (+${pending} в очереди)`
    } else if (pending > 0) {
        status = 'translating'
        message = `В очереди: ${pending}`
    }

    if (errors.length > 0) {
        status = 'error'
        message = `Ошибки: ${errors.map(e => e.slug).join(', ')}`
    }

    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true })
    fs.writeFileSync(STATUS_FILE, JSON.stringify({
        status,
        message,
        queue: { pending, processing: processing?.slug || null, done, errors: errors.length },
        updatedAt: new Date().toISOString()
    }, null, 2))
}

function addToQueue(file: string, force = false): boolean {
    const queue = loadQueue()
    const slug = path.basename(file, '.yml')

    const existing = queue.items.find(
        i => i.file === file && (i.status === 'pending' || i.status === 'processing')
    )

    if (existing) {
        if (force && !existing.force) {
            existing.force = true
            saveQueue(queue)
            console.log(`  🔄 Updated in queue: ${slug} (force)`)
        }
        return false
    }

    queue.items.push({
        file,
        slug,
        force,
        addedAt: new Date().toISOString(),
        status: 'pending'
    })

    console.log(`  ➕ Queue: ${slug}${force ? ' (force)' : ''}`)
    saveQueue(queue)
    return true
}

function cleanQueue(queue: QueueState): QueueState {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    queue.items = queue.items.filter(item => {
        if (item.status === 'pending' || item.status === 'processing') return true
        if (item.status === 'done') return false
        return new Date(item.addedAt).getTime() > fiveMinAgo
    })
    return queue
}

let isProcessing = false

async function processQueue(): Promise<void> {
    if (isProcessing) return
    isProcessing = true

    const startTime = Date.now()
    let processed = 0
    let errors = 0

    try {
        while (true) {
            let queue = cleanQueue(loadQueue())
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
                const changed = await processPage(next.file, next.force)
                next.status = 'done'
                if (changed) processed++
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
        saveQueue(cleanQueue(loadQueue()))

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        if (processed > 0 || errors > 0) {
            console.log(`\n${'═'.repeat(50)}`)
            console.log(`📊 Result: ✅ ${processed} translated | ❌ ${errors} errors | ⏱️ ${duration}s`)
            await showUsageInfo(true)
            console.log('═'.repeat(50))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// КОМАНДЫ
// ═══════════════════════════════════════════════════════════════

async function processAll(force = false): Promise<void> {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.yml'))

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📁 Files: ${files.length} | Mode: ${force ? 'FORCE' : 'incremental'}`)
    console.log(`🔤 Translator: DeepL API`)

    await showUsageInfo(true)
    console.log('═'.repeat(50))

    for (const file of files) {
        addToQueue(path.join(CONTENT_DIR, file), force)
    }

    await processQueue()
    console.log('\n🎉 Done!\n')
}

async function watch(): Promise<void> {
    console.log(`\n${'═'.repeat(50)}`)
    console.log('👀 WATCH MODE')
    console.log(`📁 ${CONTENT_DIR}`)
    console.log(`🌍 Languages: ${languageCodes.join(', ')}`)
    console.log(`🔤 Translator: DeepL API`)

    await showUsageInfo(true)
    console.log('═'.repeat(50) + '\n')

    saveQueue({ items: [], processing: false, currentFile: null })

    const debounceTimers = new Map<string, NodeJS.Timeout>()
    const processingFiles = new Set<string>()

    fs.watch(CONTENT_DIR, async (eventType, fileName) => {
        if (!fileName?.endsWith('.yml')) return
        if (recentlySaved.has(fileName)) return
        if (processingFiles.has(fileName)) return

        const queue = loadQueue()
        const alreadyInQueue = queue.items.some(
            i => i.slug === fileName.replace('.yml', '') &&
                (i.status === 'pending' || i.status === 'processing')
        )
        if (alreadyInQueue) return

        clearTimeout(debounceTimers.get(fileName))
        debounceTimers.set(fileName, setTimeout(async () => {
            debounceTimers.delete(fileName)

            if (recentlySaved.has(fileName) || processingFiles.has(fileName)) return

            const filePath = path.join(CONTENT_DIR, fileName)
            if (!fs.existsSync(filePath)) {
                console.log(`\n🗑️  Deleted: ${fileName}`)
                return
            }

            console.log(`\n📝 Changed: ${fileName}`)
            processingFiles.add(fileName)

            addToQueue(filePath, false)
            await processQueue()

            processingFiles.delete(fileName)
            console.log('\n👀 Watching...')
        }, 3000))
    })

    console.log('👀 Watching for changes...\n')
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2)
const hasForce = args.includes('--force')

if (args.includes('--watch')) {
    watch()
} else if (args.includes('--all')) {
    processAll(hasForce)
} else if (args.includes('--status')) {
    const queue = loadQueue()
    console.log(`\n📊 Queue: ${queue.items.length} items`)
    const icons = { pending: '⏳', processing: '🔄', done: '✅', error: '❌' }
    queue.items.forEach(i => console.log(`  ${icons[i.status]} ${i.slug}`))
    showUsageInfo(true)
} else if (args.includes('--usage')) {
    showUsageInfo(true).then(() => console.log(''))
} else {
    const slug = args.find(a => !a.startsWith('--'))
    if (!slug) {
        console.log(`
📖 Auto-Translate v2 (DeepL)

Usage:
  npx tsx scripts/auto-translate.ts --watch          Watch for changes
  npx tsx scripts/auto-translate.ts --all            Translate all (incremental)
  npx tsx scripts/auto-translate.ts --all --force    Translate all (force)
  npx tsx scripts/auto-translate.ts <slug>           Translate one page
  npx tsx scripts/auto-translate.ts <slug> --force   Force translate one page
  npx tsx scripts/auto-translate.ts --status         Show queue status
  npx tsx scripts/auto-translate.ts --usage          Show DeepL usage/limits

Scenarios handled:
  🆕 New page        → Full translation
  📋 Duplicated      → Detected by slug mismatch → Full translation  
  🔧 Corrupted       → Missing translations → Full translation
  📝 Changed         → Incremental update (only changed fields)
  ⏭️  Unchanged       → Skip
`)
        process.exit(1)
    }

    const filePath = path.resolve(CONTENT_DIR, `${slug}.yml`)
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Not found: ${filePath}`)
        process.exit(1)
    }

    addToQueue(filePath, hasForce)
    processQueue()
}