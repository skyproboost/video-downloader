// ═══════════════════════════════════════════════════════════════
// Общие утилиты для /api/download и /api/download-check.
// Импорт: import { ... } from '../utils/allowed-hosts'
// ═══════════════════════════════════════════════════════════════

// ── Константы ──

export const DL_MAX_URL_LENGTH = 4096
export const DL_MAX_FILE_SIZE = 500 * 1024 * 1024         // 500 MB
export const DL_FETCH_TIMEOUT = 15_000                     // 15 сек на HEAD / начало GET
export const DL_STREAM_TIMEOUT = 5 * 60_000                // 5 мин на весь стрим
export const DL_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// ── Белый список CDN-доменов ──

export const ALLOWED_HOSTS = [
    // YouTube / Google
    'googlevideo.com', 'youtube.com', 'youtu.be', 'ytimg.com',
    'ggpht.com', 'googleusercontent.com', 'gvt1.com',
    // Instagram / Facebook / Meta
    'instagram.com', 'cdninstagram.com', 'fbcdn.net',
    'fbsbx.com', 'fbcdn.com', 'facebook.com',
    // TikTok / ByteDance
    'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'tiktok.com',
    'musical.ly', 'ibyteimg.com', 'ibytedtos.com', 'byteoversea.com', 'bytecdn.cn',
    // Twitter / X
    'twimg.com', 'video.twimg.com', 'abs.twimg.com', 'pbs.twimg.com',
    // VK / Mail.ru
    'vk.com', 'vk.me', 'vkuservideo.net', 'vkuseraudio.net',
    'userapi.com', 'mycdn.me',
    // Одноклассники
    'ok.ru', 'odnoklassniki.ru',
    // Vimeo
    'vimeo.com', 'vimeocdn.com',
    // Dailymotion
    'dailymotion.com', 'dmcdn.net',
    // Twitch
    'twitch.tv', 'ttvnw.net', 'jtvnw.net',
    // Reddit
    'redd.it', 'redditmedia.com', 'redditstatic.com',
    // Pinterest
    'pinterest.com', 'pinimg.com',
    // Snapchat
    'snapchat.com', 'sc-cdn.net',
    // Likee / Bigo
    'likee.video', 'like-video.com', 'bigo.tv', 'bigovideo.net',
    // SoundCloud
    'soundcloud.com', 'sndcdn.com',
    // Spotify
    'spotify.com', 'spotifycdn.com',
    // Yandex
    'yandex.net', 'yandex.ru',
    // Rutube
    'rutube.ru', 'rframeprx.ru',
    // Bilibili
    'bilibili.com', 'bilivideo.com', 'bilivideo.cn', 'hdslb.com',
    // Общие CDN
    'akamaized.net', 'cloudfront.net', 'fastly.net', 'cdn77.org',
    'edgecastcdn.net', 'limelight.com', 'llnwd.net', 'stackpathdns.com',
    'googleapis.com', 'gstatic.com',
]

// ── Приватные диапазоны IP (защита от SSRF) ──

const PRIVATE_IP_PREFIXES = [
    '10.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
    '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.', '192.168.', '127.', '0.',
    '169.254.',
]

function isPrivateIP(ip: string): boolean {
    if (ip === '::1' || ip === 'localhost') return true
    return PRIVATE_IP_PREFIXES.some(p => ip.startsWith(p))
}

// ── MIME → расширение ──

export const MIME_MAP: Record<string, string> = {
    // Видео
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
    'video/x-flv': 'flv',
    'video/3gpp': '3gp',
    'video/3gpp2': '3g2',
    'video/mp2t': 'ts',
    'video/ogg': 'ogv',
    'video/x-ms-wmv': 'wmv',
    // Аудио
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/vorbis': 'ogg',
    'audio/webm': 'weba',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'audio/x-ms-wma': 'wma',
    // Фоллбэк
    'application/octet-stream': 'mp4',
    'binary/octet-stream': 'mp4',
}

// ── Валидация URL ──

export type UrlCheckResult =
    | { ok: true }
    | { ok: false; reason: string }

export function validateUpstreamUrl(raw: unknown): UrlCheckResult {
    if (!raw || typeof raw !== 'string') {
        return { ok: false, reason: 'missing_url' }
    }

    if (raw.length > DL_MAX_URL_LENGTH) {
        return { ok: false, reason: 'url_too_long' }
    }

    let parsed: URL
    try {
        parsed = new URL(raw)
    } catch {
        return { ok: false, reason: 'invalid_url' }
    }

    if (parsed.protocol !== 'https:') {
        return { ok: false, reason: 'not_https' }
    }

    if (parsed.username || parsed.password) {
        return { ok: false, reason: 'credentials_in_url' }
    }

    const host = parsed.hostname.toLowerCase()
    const allowed = ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`))
    if (!allowed) {
        return { ok: false, reason: 'domain_not_allowed' }
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
        if (isPrivateIP(host)) {
            return { ok: false, reason: 'private_ip' }
        }
    }

    return { ok: true }
}

// ── Определение расширения файла ──

export function guessFileExt(contentType: string | null, url: string): string {
    if (contentType) {
        const base = contentType.split(';')[0].trim().toLowerCase()
        if (MIME_MAP[base]) return MIME_MAP[base]
    }
    try {
        const path = new URL(url).pathname
        const m = path.match(/\.([a-zA-Z0-9]{2,5})$/)
        if (m) return m[1].toLowerCase()
    } catch {}
    return 'mp4'
}

// ── Санитизация имени файла ──

export function sanitizeFilename(raw: string | undefined | null, fallback = 'video'): string {
    if (!raw) return fallback
    return raw
        .replace(/[^\w\s\-().а-яА-ЯёЁ]/g, '')
        .trim()
        .slice(0, 120) || fallback
}

// ── Fetch с таймаутом ──

export function fetchWithTimeout(
    url: string,
    opts: RequestInit & { timeout?: number } = {},
): { promise: Promise<Response>; abort: () => void } {
    const timeout = opts.timeout ?? DL_FETCH_TIMEOUT
    const controller = new AbortController()

    const timer = setTimeout(() => controller.abort(), timeout)

    const promise = fetch(url, {
        ...opts,
        signal: controller.signal,
        headers: {
            'User-Agent': DL_USER_AGENT,
            ...(opts.headers || {}),
        },
    }).finally(() => clearTimeout(timer))

    return { promise, abort: () => controller.abort() }
}