import fs from 'node:fs'
import path from 'node:path'

/**
 * Починка сломанных {placeholder} в файлах локализации
 * Сверяет с en.json — если в оригинале есть {seconds}, а в переводе нет или сломан, чинит.
 *
 * npx tsx scripts/fix-locale-placeholders.ts
 * npx tsx scripts/fix-locale-placeholders.ts --dry  (только показать, не сохранять)
 */

const LOCALES_DIR = path.resolve(process.cwd(), 'i18n/locales')
const dry = process.argv.includes('--dry')

interface FlatItem { path: string; text: string }

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

function getByPath(obj: any, p: string): any {
    const parts = p.split(/\.|\[(\d+)\]/).filter(Boolean)
    let c = obj
    for (const x of parts) { if (c == null) return undefined; c = c[x] }
    return c
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

/** Извлечь плейсхолдеры из строки */
function extractPlaceholders(text: string): string[] {
    return [...text.matchAll(/\{([a-zA-Z_]\w*)\}/g)].map(m => m[1])
}

/** Попытаться починить строку с битым плейсхолдером */
function fixText(translated: string, placeholders: string[]): string {
    let fixed = translated

    for (const name of placeholders) {
        // Уже есть корректный — ок
        if (fixed.includes(`{${name}}`)) continue

        // Паттерны сломанных плейсхолдеров от DeepL:
        const patterns = [
            // "Saniyeler}" → потерян {
            new RegExp(`\\b\\S*\\}`, 'g'),
            // "{Секунды}" → переведено имя
            /\{[^}]+\}/g,
            // "{ seconds }" → пробелы внутри
            /\{\s*\w+\s*\}/g,
            // Просто } без {
            /(?<!\{)\}/g,
        ]

        // Стратегия 1: найти одиночную } и заменить предшествующее слово
        const lonely = fixed.match(/(\S*)\}/)
        if (lonely && !fixed.includes(`{${name}}`)) {
            fixed = fixed.replace(lonely[0], `{${name}}`)
            continue
        }

        // Стратегия 2: найти {ПереведённоеСлово} и заменить
        const wrongPlaceholder = fixed.match(/\{([^}]+)\}/)
        if (wrongPlaceholder && !placeholders.includes(wrongPlaceholder[1])) {
            fixed = fixed.replace(wrongPlaceholder[0], `{${name}}`)
            continue
        }

        // Стратегия 3: если вообще нет плейсхолдера — добавить в конце (ручная проверка нужна)
        if (!fixed.includes(`{${name}}`)) {
            // Пробуем найти число-подобное слово рядом с переведённым текстом
            // Если ничего не помогает, просто вставляем
            fixed = fixed.replace(/\.$/, ` {${name}}.`).replace(/([^.])$/, `$1 {${name}}`)
        }
    }

    return fixed
}

async function main() {
    const enPath = path.join(LOCALES_DIR, 'en.json')
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
    const enItems = collect(enData)

    // Собираем строки с плейсхолдерами
    const withPlaceholders = enItems.filter(i => extractPlaceholders(i.text).length > 0)

    if (withPlaceholders.length === 0) {
        console.log('✅ В en.json нет строк с плейсхолдерами')
        return
    }

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`🔧 Fix Placeholders${dry ? ' (DRY RUN)' : ''}`)
    console.log(`   ${withPlaceholders.length} строк с плейсхолдерами в en.json:`)
    for (const item of withPlaceholders) {
        const phs = extractPlaceholders(item.text)
        console.log(`   • ${item.path}: {${phs.join('}, {')}}`)
    }
    console.log('═'.repeat(50))

    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json')
    let totalFixed = 0

    for (const file of files) {
        const lang = file.replace('.json', '')
        const fp = path.join(LOCALES_DIR, file)
        const data = JSON.parse(fs.readFileSync(fp, 'utf-8'))
        let fileFixed = 0

        for (const enItem of withPlaceholders) {
            const placeholders = extractPlaceholders(enItem.text)
            const translated = getByPath(data, enItem.path)

            if (typeof translated !== 'string') continue

            // Проверяем: все ли плейсхолдеры на месте
            const missing = placeholders.filter(p => !translated.includes(`{${p}}`))
            if (missing.length === 0) continue

            const fixed = fixText(translated, placeholders)

            // Проверяем что починили
            const stillMissing = placeholders.filter(p => !fixed.includes(`{${p}}`))

            if (fixed !== translated) {
                console.log(`\n  📝 ${lang} → ${enItem.path}`)
                console.log(`     Было:  ${translated}`)
                console.log(`     Стало: ${fixed}`)
                if (stillMissing.length > 0) {
                    console.log(`     ⚠️  Не удалось вставить: {${stillMissing.join('}, {')}}`)
                }
                setByPath(data, enItem.path, fixed)
                fileFixed++
            } else if (missing.length > 0) {
                console.log(`\n  ⚠️  ${lang} → ${enItem.path}`)
                console.log(`     Текст: ${translated}`)
                console.log(`     Нет: {${missing.join('}, {')}} — нужна ручная правка`)
            }
        }

        if (fileFixed > 0) {
            if (!dry) {
                fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
                console.log(`  💾 ${file}: ${fileFixed} исправлено`)
            } else {
                console.log(`  🔍 ${file}: ${fileFixed} нужно исправить`)
            }
            totalFixed += fileFixed
        }
    }

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📊 Итог: ${totalFixed} исправлений в ${files.length} файлах${dry ? ' (DRY RUN — ничего не сохранено)' : ''}`)
    console.log('═'.repeat(50) + '\n')
}

main().catch(console.error)