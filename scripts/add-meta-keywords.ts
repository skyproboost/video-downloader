import fs from 'node:fs'
import path from 'node:path'

/**
 * Добавляет home.meta.keywords во все файлы локализации
 *
 * npx tsx scripts/add-meta-keywords.ts
 * npx tsx scripts/add-meta-keywords.ts --dry
 */

const LOCALES_DIR = path.resolve(process.cwd(), 'i18n/locales')
const dry = process.argv.includes('--dry')

const keywords: Record<string, string> = {
    ar: 'تنزيل الفيديو',
    bn: 'ভিডিও ডাউনলোডার',
    cs: 'stahovač videa',
    de: 'Video-Downloader',
    el: 'πρόγραμμα λήψης βίντεο',
    en: 'video downloader',
    es: 'descargador de vídeos',
    fa: 'دانلود کننده ویدیو',
    fr: 'téléchargeur de vidéos',
    ha: 'mai saukar bidiyo',
    hi: 'वीडियो डाउनलोडर',
    hu: 'videó letöltő',
    id: 'pengunduh video',
    ig: 'nbudata vidiyo',
    it: 'scaricatore di video',
    ja: '動画ダウンローダー',
    jv: 'pangunduh video',
    ko: '비디오 다운로더',
    ms: 'pemuat turun video',
    my: 'ဗီဒီယိုဒေါင်းလုဒ်',
    nl: 'video-downloader',
    pa: 'ਵੀਡੀਓ ਡਾਊਨਲੋਡਰ',
    pl: 'pobieracz wideo',
    pt: 'baixador de vídeos',
    ro: 'descărcător de videoclipuri',
    ru: 'загрузчик видео',
    su: 'pangunduh video',
    sv: 'videonedladdare',
    th: 'ตัวดาวน์โหลดวิดีโอ',
    tl: 'tagapag-download ng video',
    tr: 'video indirici',
    uk: 'завантажувач відео',
    ur: 'ویڈیو ڈاؤنلوڈر',
    uz: 'video yuklovchi',
    vi: 'trình tải video',
    zh: '视频下载器',
    zu: 'umsizi wokulanda ividiyo',
}

async function main() {
    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'))
    let updated = 0

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`🌐 Add home.meta.keywords${dry ? ' (DRY RUN)' : ''}`)
    console.log('═'.repeat(50))

    for (const file of files) {
        const lang = file.replace('.json', '')
        const fp = path.join(LOCALES_DIR, file)
        const data = JSON.parse(fs.readFileSync(fp, 'utf-8'))

        const kw = keywords[lang]
        if (!kw) {
            console.log(`  ⚠️  ${lang}: нет перевода, пропускаю`)
            continue
        }

        if (!data.home) data.home = {}
        if (!data.home.meta) data.home.meta = {}

        if (data.home.meta.keywords) {
            console.log(`  ✅ ${lang}: уже есть keywords`)
            continue
        }

        data.home.meta.keywords = kw

        console.log(`  📝 ${lang}: "${kw}"`)

        if (!dry) {
            fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
        }
        updated++
    }

    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📊 Итог: ${updated} файлов обновлено${dry ? ' (DRY RUN)' : ''}`)
    console.log('═'.repeat(50) + '\n')
}

main().catch(console.error)