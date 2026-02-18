export interface Language {
    code: string
    iso: string
    name: string
    country: string
    dir?: 'rtl' | 'ltr'
}

export const languages: Language[] = [
    { code: 'en', iso: 'en-US', name: 'English', country: 'gb' },
    { code: 'ru', iso: 'ru-RU', name: 'Русский', country: 'ru' },
    { code: 'de', iso: 'de-DE', name: 'Deutsch', country: 'de' },
    { code: 'es', iso: 'es-ES', name: 'Español', country: 'es' },


    // { code: 'zh', iso: 'zh-CN', name: '中文', country: 'cn' },
    // { code: 'hi', iso: 'hi-IN', name: 'हिन्दी', country: 'in' },
    // { code: 'bn', iso: 'bn-BD', name: 'বাংলা', country: 'bd' },
    { code: 'pt', iso: 'pt-PT', name: 'Português', country: 'pt' },
    { code: 'ja', iso: 'ja-JP', name: '日本語', country: 'jp' },
    // { code: 'pa', iso: 'pa-IN', name: 'ਪੰਜਾਬੀ', country: 'in' },


    { code: 'jv', iso: 'jv-ID', name: 'Basa Jawa', country: 'id' },
    { code: 'tr', iso: 'tr-TR', name: 'Türkçe', country: 'tr' },
    { code: 'ko', iso: 'ko-KR', name: '한국어', country: 'kr' },
    // { code: 'fr', iso: 'fr-FR', name: 'Français', country: 'fr' },
    // { code: 'vi', iso: 'vi-VN', name: 'Tiếng Việt', country: 'vn' },
    // { code: 'ur', iso: 'ur-PK', name: 'اردو', country: 'pk', dir: 'rtl' },
    // { code: 'fa', iso: 'fa-IR', name: 'فارسی', country: 'ir', dir: 'rtl' },
    // { code: 'ar', iso: 'ar-SA', name: 'العربية', country: 'sa', dir: 'rtl' },
    { code: 'id', iso: 'id-ID', name: 'Bahasa Indonesia', country: 'id' },
    // { code: 'pl', iso: 'pl-PL', name: 'Polski', country: 'pl' },
    // { code: 'my', iso: 'my-MM', name: 'မြန်မာဘာသာ', country: 'mm' },
    // { code: 'uk', iso: 'uk-UA', name: 'Українська', country: 'ua' },
    // { code: 'it', iso: 'it-IT', name: 'Italiano', country: 'it' },
    // { code: 'su', iso: 'su-ID', name: 'Basa Sunda', country: 'id' },
    // { code: 'tl', iso: 'tl-PH', name: 'Tagalog', country: 'ph' },
    // { code: 'uz', iso: 'uz-UZ', name: 'Oʻzbekcha', country: 'uz' },
    // { code: 'ig', iso: 'ig-NG', name: 'Igbo', country: 'ng' },
    // { code: 'ro', iso: 'ro-RO', name: 'Română', country: 'ro' },
    // { code: 'nl', iso: 'nl-NL', name: 'Nederlands', country: 'nl' },
    // { code: 'ha', iso: 'ha-NG', name: 'Hausa', country: 'ng' },
    // { code: 'th', iso: 'th-TH', name: 'ภาษาไทย', country: 'th' },
    // { code: 'ms', iso: 'ms-MY', name: 'Bahasa Melayu', country: 'my' },
    // { code: 'hu', iso: 'hu-HU', name: 'Magyar', country: 'hu' },
    // { code: 'el', iso: 'el-GR', name: 'Ελληνικά', country: 'gr' },
    // { code: 'cs', iso: 'cs-CZ', name: 'Čeština', country: 'cz' },
    // { code: 'sv', iso: 'sv-SE', name: 'Svenska', country: 'se' },
    // { code: 'zu', iso: 'zu-ZA', name: 'isiZulu', country: 'za' },
]

export const defaultLanguage = 'en'

export const languageCodes = languages.map(l => l.code)

/**
 * URL флага по коду страны
 * Размеры: w20, w40, w80, w160, w320
 */
export function getFlagUrl(country: string, width = 40): string {
    return `https://flagcdn.com/w${width}/${country}.png`
}