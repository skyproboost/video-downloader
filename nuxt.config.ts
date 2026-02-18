import {languages, defaultLanguage} from './config/languages'
import cssPurge from 'vite-plugin-purgecss'
import { resolve } from 'node:path'
import { cp } from 'node:fs/promises'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const isProduction = process.env.NODE_ENV === 'production'

const staticCacheHeaders = {
    'Cache-Control': 'public, max-age=31536000, s-maxage=86400, stale-while-revalidate=86400'
}

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: {enabled: !isProduction},

    future: {
        compatibilityVersion: 4,
    },

    css: ['@/assets/css/global.css'],

    // ═══════════════════════════════════════════
    // МОДУЛИ
    // ═══════════════════════════════════════════
    modules: [
        '@nuxtjs/i18n',
        '@nuxtjs/sitemap',
        '@nuxtjs/robots',
        '@nuxt/image',
        'nuxt-security',
        'nuxt-delay-hydration'
    ],

    // ═══════════════════════════════════════════
    // DELAY HYDRATION — ускоряет первую отрисовку
    // ═══════════════════════════════════════════
    delayHydration: {
        mode: 'init',
        debug: !isProduction,
    },

    // ═══════════════════════════════════════════
    // ИЗОБРАЖЕНИЯ
    // ═══════════════════════════════════════════
    image: {
        quality: 80,
        format: ['avif', 'webp'],
        screens: {
            xs: 320,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
            '2xl': 1536,
        },
        densities: [1, 2],
        provider: 'ipx',
        ipx: {
            maxAge: 60 * 60 * 24 * 365,
        }
    },

    // ═══════════════════════════════════════════
    // APP HEAD — глобальные мета-теги
    // ═══════════════════════════════════════════
    app: {
        head: {
            htmlAttrs: {lang: defaultLanguage},
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
            meta: [
                {name: 'format-detection', content: 'telephone=no'},
                {name: 'mobile-web-app-capable', content: 'yes'},
                {name: 'apple-mobile-web-app-capable', content: 'yes'},
                {name: 'apple-mobile-web-app-status-bar-style', content: 'default'},
                {name: 'theme-color', content: '#ffffff'},
                {name: 'robots', content: 'index, follow, max-image-preview:large'},
                {name: 'msapplication-TileColor', content: '#ffffff'},
                // og:type лучше задавать на уровне страниц через useSeoMeta
            ],
            link: [
                {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'},
                {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
            ],
        },
    },

    // ═══════════════════════════════════════════
    // i18n — мультиязычность
    // ═══════════════════════════════════════════
    i18n: {
        locales: languages.map(lang => ({
            code: lang.code,
            iso: lang.iso,
            file: `${lang.code}.json`,
            name: lang.name,
        })),
        defaultLocale: defaultLanguage,
        strategy: 'prefix_except_default',
        langDir: '../i18n/locales',
        lazy: true,
        baseUrl: siteUrl,
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: 'i18n_locale',
            fallbackLocale: defaultLanguage,
        },
    },

    // ═══════════════════════════════════════════
    // SITEMAP
    // ═══════════════════════════════════════════
    sitemap: {
        sources: ['/api/__sitemap__/urls'],
        exclude: ['/admin/**', '/api/**'],
        cacheMaxAgeSeconds: 3600
    },

    // ═══════════════════════════════════════════
    // ROBOTS
    // ═══════════════════════════════════════════
    robots: {
        groups: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin'],
            },
        ],
    },

    // ═══════════════════════════════════════════
    // SECURITY — защита и заголовки
    // ═══════════════════════════════════════════
    security: {
        hidePoweredBy: true,
        removeLoggers: isProduction,
        headers: {
            crossOriginResourcePolicy: 'same-origin',
            crossOriginOpenerPolicy: 'same-origin',
            crossOriginEmbedderPolicy: isProduction ? 'credentialless' : false,
            contentSecurityPolicy: isProduction ? {
                'default-src': ["'none'"],
                'script-src': ["'self'", "'nonce-{{nonce}}'", 'https:'],
                'script-src-attr': ["'self'"],
                'style-src': ["'self'", "'nonce-{{nonce}}'"],
                'img-src': ["'self'", 'data:', 'https:'],
                'font-src': ["'self'"],
                'connect-src': ["'self'"],
                'object-src': ["'none'"],
                'frame-src': ["'self'", 'https:'],
                'worker-src': ["'self'"],
                'base-uri': ["'self'"],
                'manifest-src': ["'self'"],
                'upgrade-insecure-requests': true,
            } : false,
            originAgentCluster: '?1',
            referrerPolicy: 'strict-origin-when-cross-origin',
            strictTransportSecurity: {
                maxAge: 31536000,
                includeSubdomains: true,
                preload: true,
            },
            xContentTypeOptions: 'nosniff',
            xDNSPrefetchControl: 'off',
            xDownloadOptions: 'noopen',
            xFrameOptions: 'DENY',
            xPermittedCrossDomainPolicies: 'none',
            xXSSProtection: '1; mode=block',
            permissionsPolicy: {
                accelerometer: [],
                autoplay: [],
                camera: [],
                'display-capture': [],
                'encrypted-media': [],
                fullscreen: ['self'],
                geolocation: [],
                gyroscope: [],
                magnetometer: [],
                microphone: [],
                midi: [],
                payment: [],
                'picture-in-picture': ['self'],
                'publickey-credentials-get': [],
                'screen-wake-lock': [],
                usb: [],
                'xr-spatial-tracking': [],
            },
        },
        requestSizeLimiter: {
            enabled: isProduction,
            maxRequestSizeInBytes: 2 * 1024 * 1024, // 2MB (было неверно 100MB)
            maxUploadFileRequestInBytes: 0,
        },
        rateLimiter: {
            tokensPerInterval: 500,
            interval: 'minute',
            headers: true,
            skip: ['/ws', '/_ipx/**'],
        },
        nonce: true,
        sri: true,
        ssg: {
            hashScripts: true,
            hashStyles: true,
            meta: true,
        },
        xssValidator: {
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script', 'style'],
            css: false,
            escapeHtml: true,
        },
        corsHandler: {
            origin: isProduction ? siteUrl : '*',
            methods: ['GET', 'HEAD', 'POST'],
        },
        allowedMethodsRestricter: {
            methods: ['GET', 'POST'],
            throwError: true,
        },
        csrf: false,
    },

    // ═══════════════════════════════════════════
    // RUNTIME CONFIG
    // ═══════════════════════════════════════════
    runtimeConfig: {
        public: {
            siteUrl,
            languages,
            defaultLanguage,
        },
    },

    experimental: {
        payloadExtraction: true,
        renderJsonPayloads: true,
        sharedPrerenderData: true,
        treeshakeClientOnly: true,
        asyncContext: true,
        typedPages: true,
    },

    hooks: {
        async 'nitro:build:public-assets'() {
            const src = resolve(__dirname, 'content/pages')
            const dest = resolve(__dirname, '.output/content/pages')

            try {
                await cp(src, dest, { recursive: true })
                console.log('✅ content/pages скопированы в .output')
            } catch (e) {
                console.error('❌ Ошибка копирования content/pages:', e)
            }
        }
    },

    // ═══════════════════════════════════════════
    // NITRO — серверные настройки и кэширование
    // ═══════════════════════════════════════════

    nitro: {
        compressPublicAssets: true,
        routeRules: {
            '/__sitemap__/**': { isr: false, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600' } },

            // API — без ISR, скрыт от поисковиков
            '/api/**': {
                headers: {'X-Robots-Tag': 'noindex, nofollow'},
                isr: false,
            },

            // Статика — долгий кэш, БЕЗ ISR/SSR
            '/_ipx/**': {headers: staticCacheHeaders, isr: false},
            '/_nuxt/**': {headers: staticCacheHeaders, isr: false},

            // Админка — без кэша, без индексации
            '/admin/**': {
                prerender: false,
                robots: false,
                isr: false,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            },

            // Главная — пререндер при билде
            '/': {prerender: true},

            // ВСЕ ОСТАЛЬНЫЕ СТРАНИЦЫ — ISR (кэш на 1 час)
            '/**': {isr: 3600},
        },
    },

    // ═══════════════════════════════════════════
    // SITE
    // ═══════════════════════════════════════════
    site: {
        url: siteUrl,
    },

    // ═══════════════════════════════════════════
    // VITE — сборка
    // ═══════════════════════════════════════════
    vite: {
        plugins: [
            cssPurge({
                safelist: [/^image-/, /^error-/, /side-color-/],
            }),
        ],
    }
})