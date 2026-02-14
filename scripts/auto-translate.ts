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
    'pt': 'PT-PT', 'zh': 'ZH-HANS', 'no': 'NB',
}

const SKIP_TRANSLATION_KEYS = [
    'image', 'ogImage', 'src', 'url', 'href', 'icon',
    'platform', 'slug', 'footerLinkText', 'imageAlt', 'ogImageAlt'
]

const CONTENT_DIR = path.resolve(process.cwd(), 'content/pages')
const ADMIN_DIR = path.resolve(process.cwd(), 'public/admin')
const STATUS_FILE = path.join(ADMIN_DIR, 'status.json')
const QUEUE_FILE = path.join(ADMIN_DIR, 'queue.json')
const RETRY_FILE = path.join(ADMIN_DIR, 'retry.json')
const FAILED_FILE = path.join(ADMIN_DIR, 'failed.json')

const TRANSLATE_DELAY = 100
const RETRY_INTERVAL = 3 * 60 * 1000
const MAX_RETRIES = 20
let requestCount = 0
const SHOW_USAGE_EVERY = 20

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

class TranslationError extends Error {
    constructor(msg: string, public statusCode?: number) {
        super(msg); this.name = 'TranslationError'
    }
}

interface PageData {
    slug: string
    platform: string
    source_lang: string
    footerLinkText?: string
    meta: Record<string, any>
    pageContent: Record<string, any>
    translations?: Record<string, { meta: Record<string, any>; pageContent: Record<string, any> }>
    _status?: 'translating' | 'ready'
    _translationPending?: boolean
    _hashes?: { _slug: string; _contentHash: string; fields: Record<string, string> }
}

interface QueueItem {
    file: string; slug: string; force: boolean
    addedAt: string
    status: 'pending' | 'processing' | 'done' | 'error'
    error?: string
}

interface QueueState { items: QueueItem[]; processing: boolean; currentFile: string | null }

interface RetryItem {
    file: string; slug: string
    failedAt: string; nextRetryAt: string
    retryCount: number; lastError: string; scenario: string
}
interface RetryState { items: RetryItem[] }

interface FailedItem {
    file: string; slug: string
    failedAt: string; exhaustedAt: string
    totalAttempts: number; lastError: string; scenario: string
}
interface FailedState { items: FailedItem[] }

interface FieldChange {
    path: string; type: 'added' | 'changed' | 'deleted'
    value?: any; needsTranslation: boolean
}

// ═══════════════════════════════════════════════════════════════
// LIVE PROCESSING STATE (для отображения в админке)
// ═══════════════════════════════════════════════════════════════

let liveProcessing: {
    slug: string
    scenario: string
    stage: string           // 'starting' | 'translating' | 'saving' | 'warming'
    currentLang?: string
    langsTotal: number
    langsDone: number
    fieldsTotal?: number
    fieldsDone?: number
} | null = null

let lastStatusBroadcast = 0

function broadcastStatus(): void {
    // Throttle: не чаще раз в 500мс
    const now = Date.now()
    if (now - lastStatusBroadcast < 500) return
    lastStatusBroadcast = now
    writeFullStatus()
}

function writeFullStatus(): void {
    const queue = loadQueue()
    const retry = loadRetry()
    const failed = loadFailed()

    const pending = queue.items.filter(i => i.status === 'pending')
    const processing = queue.items.find(i => i.status === 'processing')
    const errors = queue.items.filter(i => i.status === 'error')

    let status: string = 'idle'
    let message = 'Ожидание изменений'

    if (processing || liveProcessing) {
        status = 'translating'
        const slug = liveProcessing?.slug || processing?.slug || '?'
        const stage = liveProcessing?.stage || 'processing'
        if (stage === 'translating' && liveProcessing?.currentLang) {
            message = `Перевод: ${slug} → ${liveProcessing.currentLang}`
            if (liveProcessing.fieldsTotal) {
                message += ` (${liveProcessing.fieldsDone || 0}/${liveProcessing.fieldsTotal})`
            }
        } else {
            message = `Перевод: ${slug}`
        }
        if (pending.length > 0) message += ` (+${pending.length} в очереди)`
    } else if (pending.length > 0) {
        status = 'translating'
        message = `В очереди: ${pending.length}`
    }

    if (errors.length > 0 && status !== 'translating') {
        status = 'error'
        message = `Ошибки: ${errors.map(e => e.slug).join(', ')}`
    }

    let nextRetryIn: number | null = null
    if (retry.items.length > 0) {
        const nearest = Math.min(...retry.items.map(i => new Date(i.nextRetryAt).getTime()))
        nextRetryIn = Math.max(0, Math.round((nearest - Date.now()) / 1000))
    }

    writeJson(STATUS_FILE, {
        status, message,
        processing: liveProcessing ? {
            slug: liveProcessing.slug,
            scenario: liveProcessing.scenario,
            stage: liveProcessing.stage,
            currentLang: liveProcessing.currentLang || null,
            langsTotal: liveProcessing.langsTotal,
            langsDone: liveProcessing.langsDone,
            fieldsTotal: liveProcessing.fieldsTotal || null,
            fieldsDone: liveProcessing.fieldsDone || null,
        } : null,
        queue: {
            total: queue.items.length,
            pending: pending.length,
            items: pending.map(i => ({ slug: i.slug })),
        },
        retry: {
            count: retry.items.length,
            nextRetryIn,
            interval: RETRY_INTERVAL / 1000,
            maxRetries: MAX_RETRIES,
            items: retry.items.map(i => ({
                slug: i.slug,
                lastError: i.lastError.substring(0, 100),
                retryCount: i.retryCount,
                maxRetries: MAX_RETRIES,
                nextRetryAt: i.nextRetryAt,
                scenario: i.scenario,
            })),
        },
        failed: {
            count: failed.items.length,
            fixCommand: 'npx tsx scripts/auto-translate.ts --fix-failed',
            items: failed.items.map(i => ({
                slug: i.slug,
                lastError: i.lastError.substring(0, 100),
                totalAttempts: i.totalAttempts,
                exhaustedAt: i.exhaustedAt,
                scenario: i.scenario,
            })),
        },
        updatedAt: new Date().toISOString(),
    })
}

// ═══════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════

function deepClone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)) }

function hash(value: any): string {
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 12)
}

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }
function shouldTranslate(key: string): boolean { return !SKIP_TRANSLATION_KEYS.includes(key) }
function toDeepLLang(lang: string): string { return DEEPL_SPECIAL_CODES[lang.toLowerCase()] || lang.toUpperCase() }
function ensureDir(fp: string): void { fs.mkdirSync(path.dirname(fp), { recursive: true }) }

function readJsonSafe<T>(fp: string, fb: T): T {
    try { if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf-8')) } catch {} return fb
}
function writeJson(fp: string, data: any): void { ensureDir(fp); fs.writeFileSync(fp, JSON.stringify(data, null, 2)) }

// ═══════════════════════════════════════════════════════════════
// CACHE WARMING
// ═══════════════════════════════════════════════════════════════

async function warmCache(slug: string): Promise<void> {
    const url = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    try {
        await fetch(`${url}/${slug}`, { signal: AbortSignal.timeout(5000), headers: { 'X-Cache-Warm': '1' } })
        console.log(`  🔥 Cache warmed: ${slug}`)
    } catch {}
}

// ═══════════════════════════════════════════════════════════════
// DeepL API
// ═══════════════════════════════════════════════════════════════

async function getDeepLUsage(): Promise<{ character_count: number; character_limit: number } | null> {
    try {
        const r = await fetch(`${DEEPL_API_URL}/usage`, { headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}` } })
        return r.ok ? await r.json() : null
    } catch { return null }
}

async function showUsageInfo(force = false): Promise<void> {
    if (!force && requestCount % SHOW_USAGE_EVERY !== 0) return
    const u = await getDeepLUsage()
    if (u) {
        const pct = ((u.character_count / u.character_limit) * 100).toFixed(1)
        console.log(`\n  📊 DeepL: ${u.character_count.toLocaleString()}/${u.character_limit.toLocaleString()} (${pct}%) | Осталось: ${(u.character_limit - u.character_count).toLocaleString()}`)
    }
}

async function translateText(text: string, from: string, to: string): Promise<string> {
    if (!text || typeof text !== 'string' || from === to) return text
    if (text.startsWith('/') || text.startsWith('http') || text.trim().length === 0) return text

    try {
        const res = await fetch(`${DEEPL_API_URL}/translate`, {
            method: 'POST',
            headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: [text], source_lang: toDeepLLang(from), target_lang: toDeepLLang(to) }),
            signal: AbortSignal.timeout(30000)
        })
        if (!res.ok) {
            const body = await res.text().catch(() => '')
            const short = body.includes('<html') ? (body.match(/<title>(.*?)<\/title>/)?.[1] || `HTTP ${res.status}`) : body.substring(0, 120)
            console.warn(`\n    ⚠️ DeepL ${res.status}: ${short}`)
            if (res.status === 456) { console.error('\n    ❌ DeepL quota!'); await showUsageInfo(true) }
            throw new TranslationError(`DeepL ${res.status}: ${short}`, res.status)
        }
        const data = await res.json()
        requestCount++; await showUsageInfo(); await sleep(TRANSLATE_DELAY)
        if (data.translations?.[0]?.text) return data.translations[0].text
        throw new TranslationError('DeepL: empty result')
    } catch (err) {
        if (err instanceof TranslationError) throw err
        throw new TranslationError(`DeepL failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
}

async function translateValue(v: any, from: string, to: string): Promise<any> {
    if (typeof v === 'string') return translateText(v, from, to)
    if (Array.isArray(v)) { const r = []; for (const i of v) r.push(await translateValue(i, from, to)); return r }
    if (typeof v === 'object' && v !== null) {
        const r: Record<string, any> = {}
        for (const [k, val] of Object.entries(v)) r[k] = shouldTranslate(k) ? await translateValue(val, from, to) : deepClone(val)
        return r
    }
    return v
}

async function translateObject(obj: any, from: string, to: string): Promise<any> {
    return translateValue(obj, from, to)
}

// ═══════════════════════════════════════════════════════════════
// ПУТИ В ОБЪЕКТЕ
// ═══════════════════════════════════════════════════════════════

function flatten(obj: any, prefix = ''): Record<string, any> {
    const r: Record<string, any> = {}
    if (obj == null) return r
    for (const [k, v] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${k}` : k
        if (Array.isArray(v)) {
            r[`${p}.__isArray`] = true; r[`${p}.__length`] = v.length
            v.forEach((item, i) => { typeof item === 'object' && item !== null ? Object.assign(r, flatten(item, `${p}[${i}]`)) : r[`${p}[${i}]`] = item })
        } else if (typeof v === 'object' && v !== null) { Object.assign(r, flatten(v, p)) }
        else r[p] = v
    }
    return r
}

function getByPath(obj: any, p: string): any {
    const parts = p.split(/\.|\[(\d+)\]/).filter(Boolean)
    let c = obj; for (const x of parts) { if (c == null) return undefined; c = c[x] }; return c
}

function setByPath(obj: any, p: string, val: any): void {
    const parts = p.split(/\.|\[(\d+)\]/).filter(Boolean); let c = obj
    for (let i = 0; i < parts.length - 1; i++) { const x = parts[i], nx = parts[i+1]; if (!(x in c)) c[x] = /^\d+$/.test(nx) ? [] : {}; c = c[x] }
    c[parts[parts.length - 1]] = val
}

function getFieldKey(p: string): string {
    const m = p.match(/\.([^.\[]+)$|\[(\d+)\]\.([^.\[]+)$|^([^.\[]+)$/)
    return m?.[1] || m?.[3] || m?.[4] || p.split('.').pop() || ''
}

function syncStructure(src: any, tgt: any): void {
    if (!src || !tgt || typeof src !== 'object' || typeof tgt !== 'object') return
    if (Array.isArray(src)) {
        if (!Array.isArray(tgt)) return
        while (tgt.length > src.length) tgt.pop()
        for (let i = 0; i < Math.min(src.length, tgt.length); i++) {
            if (src[i] && tgt[i] && typeof src[i] === 'object') syncStructure(src[i], tgt[i])
        }
        return
    }
    for (const k of Object.keys(tgt)) { if (!(k in src)) delete tgt[k] }
    for (const k of Object.keys(src)) { if (k in tgt && typeof src[k] === 'object' && src[k] !== null) syncStructure(src[k], tgt[k]) }
}

// ═══════════════════════════════════════════════════════════════
// ХЭШИРОВАНИЕ + СЦЕНАРИИ
// ═══════════════════════════════════════════════════════════════

function computeContentHash(meta: any, pc: any): string { return hash({ meta, pageContent: pc }) }

function computeFieldHashes(data: any): Record<string, string> {
    const flat = flatten(data); const h: Record<string, string> = {}
    for (const [p, v] of Object.entries(flat)) { if (!p.endsWith('.__isArray') && !p.endsWith('.__length') && v != null && v !== '') h[p] = hash(v) }
    return h
}

type Scenario = 'new' | 'duplicated' | 'corrupted' | 'missing-langs' | 'unchanged' | 'incremental'

function detectScenario(page: PageData): Scenario {
    if (page._translationPending) return 'corrupted'
    const hasH = !!page._hashes?.fields, hasTr = !!page.translations
    if (!hasH && !hasTr) return 'new'
    if (hasH && page._hashes!._slug !== page.slug) return 'duplicated'

    const missing: string[] = [], broken: string[] = []
    for (const l of languageCodes) {
        const t = page.translations?.[l]
        if (!t?.meta || !t?.pageContent) missing.push(l)
        else if (!t.meta.title || !t.pageContent.mainTitle) broken.push(l)
    }
    if (broken.length > 0) return 'corrupted'
    if (missing.length > 0) return 'missing-langs'

    const cur = computeContentHash(page.meta, page.pageContent)
    if (hasH && page._hashes!._contentHash === cur) return 'unchanged'
    return 'incremental'
}

function detectFieldChanges(curH: Record<string, string>, savedH: Record<string, string>, src: any): FieldChange[] {
    const ch: FieldChange[] = []
    for (const [p, h] of Object.entries(curH)) {
        const s = savedH[p], fk = getFieldKey(p), nt = shouldTranslate(fk)
        if (!s) ch.push({ path: p, type: 'added', value: getByPath(src, p), needsTranslation: nt })
        else if (s !== h) ch.push({ path: p, type: 'changed', value: getByPath(src, p), needsTranslation: nt })
    }
    for (const p of Object.keys(savedH)) { if (!(p in curH)) ch.push({ path: p, type: 'deleted', needsTranslation: false }) }
    return ch
}

// ═══════════════════════════════════════════════════════════════
// ХЭЛПЕРЫ ПЕРЕВОДОВ
// ═══════════════════════════════════════════════════════════════

function ensureTranslationStructure(page: PageData): void {
    if (!page.translations) page.translations = {}
    for (const l of languageCodes) {
        if (!page.translations[l]) page.translations[l] = { meta: {}, pageContent: {} }
        if (!page.translations[l].meta) page.translations[l].meta = {}
        if (!page.translations[l].pageContent) page.translations[l].pageContent = {}
    }
}

function syncNonTranslatableField(page: PageData, p: string, val: any): void {
    for (const l of languageCodes) setByPath(page.translations![l], p, deepClone(val))
}

// ═══════════════════════════════════════════════════════════════
// ФАЙЛЫ
// ═══════════════════════════════════════════════════════════════

const recentlySaved = new Set<string>()
function markAsSaving(fp: string): void {
    const fn = path.basename(fp); recentlySaved.add(fn)
    setTimeout(() => recentlySaved.delete(fn), 3000)
}
function savePageFile(fp: string, page: PageData): void { markAsSaving(fp); fs.writeFileSync(fp, stringify(page)) }
function getFileMtime(fp: string): number { try { return fs.statSync(fp).mtimeMs } catch { return 0 } }

// ═══════════════════════════════════════════════════════════════
// RETRY + FAILED
// ═══════════════════════════════════════════════════════════════

function loadRetry(): RetryState { return readJsonSafe(RETRY_FILE, { items: [] }) }
function saveRetry(s: RetryState): void { writeJson(RETRY_FILE, s) }
function loadFailed(): FailedState { return readJsonSafe(FAILED_FILE, { items: [] }) }
function saveFailed(s: FailedState): void { writeJson(FAILED_FILE, s) }

function isInRetry(slug: string): boolean { return loadRetry().items.some(i => i.slug === slug) }

function addToRetry(file: string, slug: string, error: string, scenario: string): void {
    const retry = loadRetry()
    const existing = retry.items.find(i => i.slug === slug)
    const count = existing ? existing.retryCount + 1 : 1
    retry.items = retry.items.filter(i => i.slug !== slug)

    if (count > MAX_RETRIES) {
        console.log(`  ⛔ ${slug}: ${MAX_RETRIES} попыток исчерпано → failed.json`)
        const failed = loadFailed()
        failed.items = failed.items.filter(i => i.slug !== slug)
        failed.items.push({ file, slug, failedAt: existing?.failedAt || new Date().toISOString(), exhaustedAt: new Date().toISOString(), totalAttempts: count, lastError: error, scenario })
        saveFailed(failed); saveRetry(retry); return
    }

    retry.items.push({ file, slug, failedAt: existing?.failedAt || new Date().toISOString(), nextRetryAt: new Date(Date.now() + RETRY_INTERVAL).toISOString(), retryCount: count, lastError: error, scenario })
    console.log(`  🔄 ${slug}: retry ${count}/${MAX_RETRIES} через 3 мин`)
    saveRetry(retry)
}

function removeFromRetry(slug: string): void {
    const r = loadRetry(); const had = r.items.length
    r.items = r.items.filter(i => i.slug !== slug)
    if (r.items.length !== had) { saveRetry(r); console.log(`  ✅ ${slug}: убран из retry`) }
}

function removeFromFailed(slug: string): void {
    const f = loadFailed(); const had = f.items.length
    f.items = f.items.filter(i => i.slug !== slug)
    if (f.items.length !== had) { saveFailed(f); console.log(`  ✅ ${slug}: убран из failed`) }
}

function getRetryDue(): RetryItem[] {
    return loadRetry().items.filter(i => new Date(i.nextRetryAt).getTime() <= Date.now())
}

// ═══════════════════════════════════════════════════════════════
// ОБРАБОТКА СТРАНИЦЫ
// ═══════════════════════════════════════════════════════════════

async function processPage(filePath: string, force = false): Promise<boolean> {
    const fileName = path.basename(filePath)
    const fileSlug = fileName.replace('.yml', '')

    console.log(`\n${'─'.repeat(50)}`)
    console.log(`📄 ${fileName}`)

    const content = fs.readFileSync(filePath, 'utf-8')
    const page = parse(content) as PageData
    const mtimeBefore = getFileMtime(filePath)

    if (!page.meta || !page.pageContent) { console.log('  ⏭️  Skip: no meta/pageContent'); return false }
    if (!page.slug) page.slug = fileSlug

    // ── Переименование при несовпадении slug ──
    if (page.slug !== fileSlug) {
        const newPath = path.join(path.dirname(filePath), `${page.slug}.yml`)
        if (fs.existsSync(newPath)) {
            console.log(`  ❌ ${page.slug}.yml уже существует!`)
            if (/^.+-\d+\.yml$/.test(fileName)) { console.log(`  🗑️  Удаляю дубликат`); fs.unlinkSync(filePath) }
            return false
        }
        console.log(`  📝 Rename: ${fileName} → ${page.slug}.yml`)
        fs.renameSync(filePath, newPath); filePath = newPath
    }

    const srcLang = page.source_lang || 'en'
    const sourceData = { meta: page.meta, pageContent: page.pageContent }
    const scenario = force ? 'new' : detectScenario(page)
    console.log(`  📋 Scenario: ${scenario}`)

    // ═══ БЭКАП перед любыми изменениями ═══
    const fullBackup = deepClone(page)
    const targets = languageCodes.filter(l => l !== srcLang)

    // ═════════════════════════════════════════════════════════
    // ПОЛНЫЙ ПЕРЕВОД (new / duplicated / corrupted)
    // ═════════════════════════════════════════════════════════
    if (['new', 'duplicated', 'corrupted'].includes(scenario)) {
        const reasons: Record<string, string> = { 'new': '🆕 Новая', 'duplicated': '📋 Дубликат', 'corrupted': '🔧 Битая/pending' }
        console.log(`  ${reasons[scenario]} → Полный перевод`)
        await showUsageInfo(true)

        // Скрываем ТОЛЬКО новые стр при ПЕРВОЙ попытке (не retry)
        const isRetryAttempt = isInRetry(page.slug)
        if (scenario === 'new' && !isRetryAttempt) {
            page._status = 'translating'
            savePageFile(filePath, page)
            console.log('  🔒 Скрыта до завершения')
        }

        liveProcessing = { slug: page.slug, scenario, stage: 'translating', langsTotal: targets.length, langsDone: 0 }
        broadcastStatus()

        const newTranslations: Record<string, any> = {}
        newTranslations[srcLang] = deepClone(sourceData)
        let failed = false

        for (let li = 0; li < targets.length; li++) {
            const lang = targets[li]
            process.stdout.write(`  → ${lang}...`)
            liveProcessing.currentLang = lang; liveProcessing.langsDone = li
            broadcastStatus()

            try {
                newTranslations[lang] = {
                    meta: await translateObject(deepClone(sourceData.meta), srcLang, lang),
                    pageContent: await translateObject(deepClone(sourceData.pageContent), srcLang, lang),
                }
                console.log(' ✓')
            } catch (err) {
                console.log(' ✗')
                console.error(`  ❌ ${err instanceof TranslationError ? err.message : err}`)
                failed = true; break
            }
        }

        liveProcessing = null

        if (failed) {
            console.log('  ↩️ Откат: файл без изменений')
            savePageFile(filePath, fullBackup)
            broadcastStatus()
            throw new TranslationError(`Full translation failed (${scenario})`)
        }

        // Успех → применяем
        page.translations = newTranslations
        ensureTranslationStructure(page)
        delete page._translationPending
        page._status = 'ready'
        page._hashes = { _slug: page.slug, _contentHash: computeContentHash(page.meta, page.pageContent), fields: computeFieldHashes(sourceData) }
        savePageFile(filePath, page)
        console.log('  🔓 Опубликовано!')
        await warmCache(page.slug)
        await showUsageInfo(true)
        broadcastStatus()
        return true
    }

    // ═════════════════════════════════════════════════════════
    // ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ЯЗЫКОВ (missing-langs)
    // ═════════════════════════════════════════════════════════
    if (scenario === 'missing-langs') {
        const missing = languageCodes.filter(l => {
            const t = page.translations?.[l]
            return !t?.meta || !t?.pageContent || !t.meta.title || !t.pageContent.mainTitle
        })
        console.log(`  🌍 Языки: ${missing.join(', ')}`)

        liveProcessing = { slug: page.slug, scenario, stage: 'translating', langsTotal: missing.length, langsDone: 0 }
        broadcastStatus()

        const newLangData: Record<string, any> = {}
        let failed = false

        for (let li = 0; li < missing.length; li++) {
            const lang = missing[li]
            process.stdout.write(`  → ${lang}...`)
            liveProcessing.currentLang = lang; liveProcessing.langsDone = li
            broadcastStatus()

            try {
                newLangData[lang] = lang === srcLang ? deepClone(sourceData) : {
                    meta: await translateObject(deepClone(sourceData.meta), srcLang, lang),
                    pageContent: await translateObject(deepClone(sourceData.pageContent), srcLang, lang),
                }
                console.log(' ✓')
            } catch (err) {
                console.log(' ✗'); failed = true; break
            }
        }

        liveProcessing = null

        if (failed) {
            console.log('  ↩️ Откат: существующие переводы не затронуты')
            savePageFile(filePath, fullBackup)
            broadcastStatus()
            throw new TranslationError('Missing langs failed')
        }

        ensureTranslationStructure(page)
        for (const [l, d] of Object.entries(newLangData)) page.translations![l] = d
        delete page._translationPending
        page._hashes = { _slug: page.slug, _contentHash: computeContentHash(page.meta, page.pageContent), fields: computeFieldHashes(sourceData) }
        savePageFile(filePath, page)
        console.log('  ✅ Языки добавлены!')
        await warmCache(page.slug)
        broadcastStatus()
        return true
    }

    // ═════════════════════════════════════════════════════════
    // БЕЗ ИЗМЕНЕНИЙ
    // ═════════════════════════════════════════════════════════
    if (scenario === 'unchanged') { console.log('  ⏭️  Без изменений'); return false }

    // ═════════════════════════════════════════════════════════
    // ИНКРЕМЕНТАЛЬНОЕ ОБНОВЛЕНИЕ
    // ═════════════════════════════════════════════════════════
    const currentHashes = computeFieldHashes(sourceData)
    const savedHashes = page._hashes?.fields || {}
    const changes = detectFieldChanges(currentHashes, savedHashes, sourceData)

    if (changes.length === 0) {
        console.log('  ⏭️  Нет изменений полей')
        page._hashes = { _slug: page.slug, _contentHash: computeContentHash(page.meta, page.pageContent), fields: currentHashes }
        savePageFile(filePath, page); return false
    }

    const toTranslate = changes.filter(c => c.type !== 'deleted' && c.needsTranslation)
    const toSync = changes.filter(c => c.type !== 'deleted' && !c.needsTranslation)
    const toDelete = changes.filter(c => c.type === 'deleted')

    console.log(`  📝 Изменения: ${toTranslate.length} перевод, ${toSync.length} sync, ${toDelete.length} удалено`)

    liveProcessing = { slug: page.slug, scenario, stage: 'translating', langsTotal: targets.length, langsDone: 0, fieldsTotal: toTranslate.length, fieldsDone: 0 }
    broadcastStatus()

    ensureTranslationStructure(page)

    // Удаления
    for (const c of toDelete) {
        for (const l of languageCodes) {
            const parts = c.path.split(/\.|\[(\d+)\]/).filter(Boolean)
            let cur: any = page.translations![l]
            for (let i = 0; i < parts.length - 1; i++) { if (!cur || typeof cur !== 'object') break; cur = cur[parts[i]] }
            if (cur && typeof cur === 'object') { const last = parts[parts.length - 1]; if (last in cur) delete cur[last] }
        }
    }
    if (toDelete.length > 0) console.log(`  🗑️  Удалено ${toDelete.length}`)

    // Sync структуры массивов
    for (const l of languageCodes) syncStructure(sourceData, page.translations![l])

    // Sync непереводимых
    for (const c of toSync) syncNonTranslatableField(page, c.path, c.value)
    if (toSync.length > 0) console.log(`  🔗 Synced ${toSync.length}`)

    // Перевод
    if (toTranslate.length > 0) {
        let failed = false
        try {
            for (let li = 0; li < targets.length; li++) {
                const lang = targets[li]
                process.stdout.write(`  → ${lang}: `)
                liveProcessing.currentLang = lang; liveProcessing.langsDone = li; liveProcessing.fieldsDone = 0
                broadcastStatus()

                for (let fi = 0; fi < toTranslate.length; fi++) {
                    const c = toTranslate[fi]
                    const translated = await translateValue(c.value, srcLang, lang)
                    setByPath(page.translations![lang], c.path, translated)
                    process.stdout.write('.')
                    liveProcessing.fieldsDone = fi + 1
                    broadcastStatus()
                }
                console.log(' ✓')
            }
            // Source lang
            for (const c of toTranslate) setByPath(page.translations![srcLang], c.path, deepClone(c.value))
            console.log(`  📝 Переведено ${toTranslate.length} поле(й)`)
        } catch (err) {
            failed = true; console.log(' ✗')
            console.error(`\n  ❌ ${err instanceof TranslationError ? err.message : err}`)
        }

        if (failed) {
            liveProcessing = null
            console.log('  ↩️ Полный откат')
            savePageFile(filePath, fullBackup)
            broadcastStatus()
            throw new TranslationError('Incremental translation failed')
        }
    }

    liveProcessing = null

    // Проверка: файл не изменился во время перевода?
    const mtimeAfter = getFileMtime(filePath)
    if (mtimeAfter !== mtimeBefore && !recentlySaved.has(path.basename(filePath))) {
        console.log('  ⚠️ Файл изменён во время перевода! Пропуск.')
        broadcastStatus()
        return false
    }

    page._hashes = { _slug: page.slug, _contentHash: computeContentHash(page.meta, page.pageContent), fields: currentHashes }
    delete page._translationPending
    savePageFile(filePath, page)
    console.log('  ✅ Сохранено!')
    await warmCache(page.slug)
    broadcastStatus()
    return true
}

// ═══════════════════════════════════════════════════════════════
// ОЧЕРЕДЬ
// ═══════════════════════════════════════════════════════════════

function loadQueue(): QueueState { return readJsonSafe(QUEUE_FILE, { items: [], processing: false, currentFile: null }) }

function saveQueue(q: QueueState): void { writeJson(QUEUE_FILE, q); writeFullStatus() }

function addToQueue(file: string, force = false): boolean {
    const q = loadQueue(), slug = path.basename(file, '.yml')
    const ex = q.items.find(i => i.file === file && (i.status === 'pending' || i.status === 'processing'))
    if (ex) { if (force && !ex.force) { ex.force = true; saveQueue(q) }; return false }
    q.items.push({ file, slug, force, addedAt: new Date().toISOString(), status: 'pending' })
    console.log(`  ➕ Queue: ${slug}${force ? ' (force)' : ''}`)
    saveQueue(q); return true
}

function cleanQueue(q: QueueState): QueueState {
    const ago = Date.now() - 5 * 60 * 1000
    q.items = q.items.filter(i => {
        if (i.status === 'pending' || i.status === 'processing') return true
        if (i.status === 'done') return false
        return new Date(i.addedAt).getTime() > ago
    })
    return q
}

let isProcessing = false

async function processQueue(): Promise<void> {
    if (isProcessing) return
    isProcessing = true
    const t0 = Date.now(); let ok = 0, errs = 0

    try {
        while (true) {
            let q = cleanQueue(loadQueue())
            const next = q.items.find(i => i.status === 'pending')
            if (!next) { q.processing = false; q.currentFile = null; saveQueue(q); break }

            next.status = 'processing'; q.processing = true; q.currentFile = next.file
            saveQueue(q)

            let scenario = 'unknown'
            try { const pg = parse(fs.readFileSync(next.file, 'utf-8')) as PageData; scenario = next.force ? 'new' : (pg.meta && pg.pageContent ? detectScenario(pg) : 'unknown') } catch {}

            try {
                const changed = await processPage(next.file, next.force)
                next.status = 'done'
                if (changed) { ok++; removeFromRetry(next.slug); removeFromFailed(next.slug) }
            } catch (e) {
                next.status = 'error'; next.error = String(e); errs++
                addToRetry(next.file, next.slug, String(e), scenario)
            }

            q = loadQueue()
            const item = q.items.find(i => i.file === next.file && i.status === 'processing')
            if (item) { item.status = next.status; item.error = next.error }
            saveQueue(q)
        }
    } finally {
        isProcessing = false; liveProcessing = null
        saveQueue(cleanQueue(loadQueue()))
        const dur = ((Date.now() - t0) / 1000).toFixed(1)
        if (ok > 0 || errs > 0) {
            console.log(`\n${'═'.repeat(50)}`)
            console.log(`📊 Итог: ✅ ${ok} | ❌ ${errs} | ⏱️ ${dur}s`)
            await showUsageInfo(true)
            console.log('═'.repeat(50))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// RETRY + FIX
// ═══════════════════════════════════════════════════════════════

async function processRetries(): Promise<void> {
    const due = getRetryDue()
    if (due.length === 0) return
    console.log(`\n🔄 Retry: ${due.length} стр.`)

    for (const item of due) {
        const q = loadQueue()
        if (q.items.some(i => i.slug === item.slug && (i.status === 'pending' || i.status === 'processing'))) continue
        if (!fs.existsSync(item.file)) { removeFromRetry(item.slug); continue }
        addToQueue(item.file, false)
    }
    await processQueue()
}

async function fixFailed(): Promise<void> {
    const failed = loadFailed()
    if (failed.items.length === 0) { console.log('\n✅ Нет failed-страниц!\n'); return }

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`🔧 FIX FAILED: ${failed.items.length} стр.`)
    await showUsageInfo(true)
    console.log('═'.repeat(50))

    let fixed = 0, still = 0
    for (const item of [...failed.items]) {
        if (!fs.existsSync(item.file)) { removeFromFailed(item.slug); continue }
        console.log(`\n  🔧 ${item.slug} (было ${item.totalAttempts} попыток)`)
        try {
            const changed = await processPage(item.file, true)
            if (changed) { fixed++; removeFromFailed(item.slug); removeFromRetry(item.slug) }
        } catch (e) { still++; console.error(`  ❌ Всё ещё ошибка: ${e}`) }
    }

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📊 Fix: ✅ ${fixed} | ❌ ${still}`)
    await showUsageInfo(true)
    console.log('═'.repeat(50))
}

// ═══════════════════════════════════════════════════════════════
// КОМАНДЫ
// ═══════════════════════════════════════════════════════════════

async function processAll(force = false): Promise<void> {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.yml'))
    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📁 Файлов: ${files.length} | ${force ? 'FORCE' : 'incremental'}`)
    await showUsageInfo(true)
    console.log('═'.repeat(50))
    if (force) { saveRetry({ items: [] }); saveFailed({ items: [] }) }
    for (const f of files) addToQueue(path.join(CONTENT_DIR, f), force)
    await processQueue()
    console.log('\n🎉 Готово!\n')
}

async function syncLanguages(): Promise<void> {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.yml'))
    console.log(`\n${'═'.repeat(50)}`)
    console.log(`🌍 SYNC LANGUAGES: ${languageCodes.join(', ')}`)
    await showUsageInfo(true)
    console.log('═'.repeat(50))

    let n = 0
    for (const f of files) {
        const fp = path.join(CONTENT_DIR, f), pg = parse(fs.readFileSync(fp, 'utf-8')) as PageData
        if (!pg.meta || !pg.pageContent || !pg.translations) continue
        const miss = languageCodes.filter(l => { const t = pg.translations?.[l]; return !t?.meta || !t?.pageContent || !t.meta.title || !t.pageContent.mainTitle })
        if (miss.length === 0) { console.log(`  ✓ ${f}`); continue }
        addToQueue(fp, false); n++
    }
    if (n > 0) await processQueue()
    console.log(`\n📊 Требуют перевода: ${n}`)
}

async function watch(): Promise<void> {
    console.log(`\n${'═'.repeat(50)}`)
    console.log('👀 WATCH MODE')
    console.log(`📁 ${CONTENT_DIR}`)
    console.log(`🌍 ${languageCodes.join(', ')}`)
    console.log(`🔄 Retry: ${RETRY_INTERVAL / 60000} мин / макс. ${MAX_RETRIES}`)
    await showUsageInfo(true)
    console.log('═'.repeat(50) + '\n')

    saveQueue({ items: [], processing: false, currentFile: null })
    writeFullStatus()

    const debounce = new Map<string, NodeJS.Timeout>()
    const busy = new Set<string>()

    const retryTimer = setInterval(async () => {
        if (isProcessing) return
        const due = getRetryDue()
        if (due.length > 0) { await processRetries(); writeFullStatus(); console.log('\n👀 Watching...') }
        else writeFullStatus() // обновляем countdown
    }, 30_000)

    fs.watch(CONTENT_DIR, async (_, fileName) => {
        if (!fileName?.endsWith('.yml') || recentlySaved.has(fileName) || busy.has(fileName)) return

        const slug = fileName.replace('.yml', '')
        const q = loadQueue()
        if (q.items.some(i => i.slug === slug && (i.status === 'pending' || i.status === 'processing'))) return

        clearTimeout(debounce.get(fileName))
        debounce.set(fileName, setTimeout(async () => {
            debounce.delete(fileName)
            if (recentlySaved.has(fileName) || busy.has(fileName)) return

            const fp = path.join(CONTENT_DIR, fileName)
            if (!fs.existsSync(fp)) {
                console.log(`\n🗑️  Удалён: ${fileName}`)
                removeFromRetry(slug); removeFromFailed(slug); writeFullStatus(); return
            }

            console.log(`\n📝 Изменён: ${fileName}`)
            busy.add(fileName)

            // Ручное изменение сбрасывает retry/failed
            removeFromRetry(slug)
            removeFromFailed(slug)

            addToQueue(fp, false)
            await processQueue()
            busy.delete(fileName)

            // Recheck
            try {
                const pg = parse(fs.readFileSync(fp, 'utf-8')) as PageData
                if (pg._hashes && computeContentHash(pg.meta, pg.pageContent) !== pg._hashes._contentHash) {
                    console.log(`  🔄 Файл изменён во время обработки → повтор`)
                    addToQueue(fp, false); await processQueue()
                }
            } catch {}

            console.log('\n👀 Watching...')
        }, 3000))
    })

    console.log('👀 Watching...\n')
    process.on('SIGINT', () => { clearInterval(retryTimer); console.log('\n👋 Stopped.'); process.exit(0) })
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2)
const hasForce = args.includes('--force')

if (args.includes('--watch')) { watch() }
else if (args.includes('--sync-langs')) { syncLanguages() }
else if (args.includes('--all')) { processAll(hasForce) }
else if (args.includes('--retry')) { processRetries().then(() => console.log('\n🎉 Done.\n')) }
else if (args.includes('--fix-failed')) { fixFailed() }
else if (args.includes('--status')) {
    const q = loadQueue(), r = loadRetry(), f = loadFailed()
    const ic = { pending: '⏳', processing: '🔄', done: '✅', error: '❌' } as const
    console.log(`\n📊 Очередь: ${q.items.length}`)
    q.items.forEach(i => console.log(`  ${ic[i.status]} ${i.slug}`))
    if (r.items.length) { console.log(`\n🔄 Retry: ${r.items.length}`); r.items.forEach(i => { const s = Math.max(0, Math.round((new Date(i.nextRetryAt).getTime() - Date.now()) / 1000)); console.log(`  🔁 ${i.slug} (${i.retryCount}/${MAX_RETRIES}) через ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`) }) }
    if (f.items.length) { console.log(`\n⛔ Failed: ${f.items.length}`); f.items.forEach(i => console.log(`  💀 ${i.slug} (${i.totalAttempts} попыток)`)); console.log(`\n  💡 npx tsx scripts/auto-translate.ts --fix-failed`) }
    showUsageInfo(true)
} else if (args.includes('--usage')) { showUsageInfo(true).then(() => console.log('')) }
else {
    const slug = args.find(a => !a.startsWith('--'))
    if (!slug) {
        console.log(`
📖 Auto-Translate v5 (DeepL)

Команды:
  --watch              Watch + авто-retry каждые 3 мин
  --all                Все страницы (инкрементально)
  --all --force        Все с нуля (сбрасывает retry/failed)
  --sync-langs         Добавить новые языки
  --retry              Ручной retry неудачных
  --fix-failed         Перевести выпавшие страницы
  <slug>               Одна страница
  <slug> --force       Одна страница с нуля
  --status             Полный статус
  --usage              Лимиты DeepL

Retry: каждые ${RETRY_INTERVAL/60000} мин, макс ${MAX_RETRIES} попыток → failed.json → --fix-failed
`); process.exit(1)
    }
    const fp = path.resolve(CONTENT_DIR, `${slug}.yml`)
    if (!fs.existsSync(fp)) { console.error(`❌ Не найдено: ${fp}`); process.exit(1) }
    addToQueue(fp, hasForce); processQueue()
}