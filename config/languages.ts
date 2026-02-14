export interface Language {
    code: string
    iso: string
    name: string
    country: string // ISO 3166-1 alpha-2 для флага
}

export const languages: Language[] = [
    { code: 'en', iso: 'en-US', name: 'English', country: 'gb' },
    { code: 'ru', iso: 'ru-RU', name: 'Русский', country: 'ru' },
    { code: 'de', iso: 'de-DE', name: 'Deutsch', country: 'de' },
    // { code: 'es', iso: 'es-ES', name: 'Español', country: 'es' },
    // { code: 'fr', iso: 'fr-FR', name: 'Français', country: 'fr' },
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