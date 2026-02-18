import fs from 'node:fs'
import path from 'node:path'

/**
 * Генерация файлов локализации из en.json через DeepL API
 *
 * Использование:
 *   npx tsx scripts/generate-locales.ts           — все недостающие
 *   npx tsx scripts/generate-locales.ts fr it ja   — только указанные
 *   npx tsx scripts/generate-locales.ts --force     — перезаписать все
 */

const DEEPL_API_KEY = '94886d77-fa04-4568-91db-dbda3212f1d9:fx'
const DEEPL_API_URL = 'https://api-free.deepl.com/v2'
const LOCALES_DIR = path.resolve(process.cwd(), 'i18n/locales')
const BATCH_SIZE = 50
const DELAY = 3_000

const TARGET_MAP: Record<string, string> = {
    pt: 'PT-PT', zh: 'ZH-HANS', en: 'EN-US', no: 'NB',
}

// Языки для которых уже есть файлы (en — источник)
const SKIP = new Set(['en'])

// ═══════════════════════════════════════════════════════════════

interface FlatItem { path: string; text: string }

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }

function collect(obj: any, prefix = ''): FlatItem[] {
    const r: FlatItem[] = []
    if (typeof obj === 'string') {
        r.push({ path: prefix, text: obj })
    } else if (Array.isArray(obj)) {
        obj.forEach((item, i) => r.push(...collect(item, `${prefix}[${i}]`)))
    } else if (typeof obj === 'object' && obj !== null) {
        for (const [k, v] of Object.entries(obj))
            r.push(...collect(v, prefix ? `${prefix}.${k}` : k))
    }
    return r
}

function setByPath(obj: any, p: string, val: any): void {
    const parts = p.split(/\.|\[(\d+)\]/).filter(Boolean)
    let c = obj
    for (let i = 0; i < parts.length - 1; i++) {
        const x = parts[i], nx = parts[i + 1]
        if (!(x in c)) c[x] = /^\d+$/.test(nx) ? [] : {}
        c = c[x]
    }
    c[parts[parts.length - 1]] = val
}

function toTarget(lang: string): string {
    return TARGET_MAP[lang.toLowerCase()] || lang.toUpperCase()
}

// Защита {placeholder} переменных от перевода DeepL
// Заменяем {name} → <x id="name"/> перед отправкой, восстанавливаем после
function protectPlaceholders(text: string): { protected: string; has: boolean } {
    const has = /\{[a-zA-Z_]\w*\}/.test(text)
    if (!has) return { protected: text, has: false }
    return {
        protected: text.replace(/\{([a-zA-Z_]\w*)\}/g, '<x id="$1"/>'),
        has: true,
    }
}

function restorePlaceholders(text: string): string {
    return text.replace(/<x\s+id="([a-zA-Z_]\w*)"\/?\s*>/g, '{$1}')
}

async function batchTranslate(texts: string[], to: string): Promise<string[]> {
    const results: string[] = []

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const chunk = texts.slice(i, i + BATCH_SIZE)

        // Защищаем плейсхолдеры
        const processed = chunk.map(t => protectPlaceholders(t))
        const hasXml = processed.some(p => p.has)

        const body: Record<string, any> = {
            text: processed.map(p => p.protected),
            source_lang: 'EN',
            target_lang: toTarget(to),
        }
        // Включаем XML-режим чтобы DeepL не трогал теги
        if (hasXml) {
            body.tag_handling = 'xml'
            body.ignore_tags = ['x']
        }

        const res = await fetch(`${DEEPL_API_URL}/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120_000),
        })

        if (res.status === 429) {
            console.log(`    ⏳ 429 — ждём 30с...`)
            await sleep(30_000)
            i -= BATCH_SIZE // повторить чанк
            continue
        }

        if (!res.ok) {
            const txt = await res.text().catch(() => '')
            throw new Error(`DeepL ${res.status}: ${txt.substring(0, 200)}`)
        }

        const data = await res.json()
        // Восстанавливаем плейсхолдеры
        results.push(...data.translations.map((t: any) => restorePlaceholders(t.text)))

        if (i + BATCH_SIZE < texts.length) await sleep(DELAY)
    }

    return results
}

async function getUsage(): Promise<void> {
    try {
        const r = await fetch(`${DEEPL_API_URL}/usage`, {
            headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}` },
        })
        if (r.ok) {
            const u = await r.json()
            const pct = ((u.character_count / u.character_limit) * 100).toFixed(1)
            const rem = u.character_limit - u.character_count
            console.log(`  📊 DeepL: ${u.character_count.toLocaleString()}/${u.character_limit.toLocaleString()} (${pct}%) | Осталось: ${rem.toLocaleString()}`)
        }
    } catch {}
}

async function main() {
    const args = process.argv.slice(2)
    const force = args.includes('--force')
    const specific = args.filter(a => !a.startsWith('--'))

    // Читаем en.json
    const enPath = path.join(LOCALES_DIR, 'en.json')
    if (!fs.existsSync(enPath)) {
        console.error(`❌ Не найден: ${enPath}`)
        process.exit(1)
    }
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
    const items = collect(enData)

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`🌍 Generate Locales from en.json`)
    console.log(`   ${items.length} строк для перевода`)
    await getUsage()
    console.log('═'.repeat(50))

    // Определяем какие языки нужны
    const { languages } = await import('../config/languages')
    let targets = languages
        .map(l => l.code)
        .filter(c => !SKIP.has(c))

    if (specific.length > 0) {
        targets = targets.filter(c => specific.includes(c))
    }

    if (!force) {
        targets = targets.filter(c => !fs.existsSync(path.join(LOCALES_DIR, `${c}.json`)))
    }

    if (targets.length === 0) {
        console.log('\n✅ Все файлы уже существуют! Используй --force для перезаписи.\n')
        return
    }

    const charsPerLang = items.reduce((s, i) => s + i.text.length, 0)
    const totalChars = charsPerLang * targets.length
    console.log(`\n  📝 ${targets.length} языков × ${charsPerLang.toLocaleString()} символов = ${totalChars.toLocaleString()} символов`)
    console.log(`  ⏱️  ~${Math.ceil(targets.length * Math.ceil(items.length / BATCH_SIZE) * DELAY / 1000)}с`)
    console.log(`  🌍 ${targets.join(', ')}\n`)

    let ok = 0, fail = 0

    for (const lang of targets) {
        process.stdout.write(`  → ${lang}...`)

        try {
            const translated = await batchTranslate(items.map(i => i.text), lang)

            // Собираем обратно в объект
            const result: Record<string, any> = {}
            for (let i = 0; i < items.length; i++) {
                setByPath(result, items[i].path, translated[i])
            }

            const outPath = path.join(LOCALES_DIR, `${lang}.json`)
            fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8')
            console.log(` ✓ (${outPath})`)
            ok++
        } catch (err) {
            console.log(` ✗`)
            console.error(`    ❌ ${err}`)
            fail++
        }
    }

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📊 Итог: ✅ ${ok} | ❌ ${fail}`)
    await getUsage()
    console.log('═'.repeat(50) + '\n')
}

main().catch(console.error)

// npx tsx scripts/generate-locales.ts