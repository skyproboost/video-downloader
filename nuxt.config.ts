import {languages, defaultLanguage} from './config/languages'
import cssPurge from 'vite-plugin-purgecss'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const isProduction = process.env.NODE_ENV === 'production'
const staticCacheHeaders = {
    'Cache-Control': 'public, max-age=31536000, s-maxage=86400, stale-while-revalidate=86400'
}

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: {enabled: true},

    future: {
        compatibilityVersion: 4,
    },

    modules: [
        '@nuxt/content',
        '@nuxtjs/i18n',
        '@nuxtjs/sitemap',
        '@nuxtjs/robots',
        '@nuxt/image',
        'nuxt-delay-hydration',
        'nuxt-security',
    ],

    delayHydration: {
        mode: 'init',
        debug: !isProduction,
    },

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
            maxAge: 60 * 60 * 24 * 365, // 1 год кэша
        },
    },

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
                {name: 'msapplication-TileColor', content: '#ffffff'},
            ],
            link: [
                {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'},
                {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
            ],
        },
    },

    // ===== i18n =====
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

    // ===== Sitemap =====
    sitemap: {
        sources: ['/api/__sitemap__/urls'],
        xslColumns: [
            {label: 'URL', width: '50%'},
            {label: 'Last Modified', select: 'sitemap:lastmod', width: '25%'},
            {label: 'Images', select: 'count(image:image)', width: '15%'},
            {label: 'Priority', select: 'sitemap:priority', width: '10%'},
        ],
    },

    // ===== Robots =====
    robots: {
        groups: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin'],
            },
        ],
    },

    security: {
        hidePoweredBy: true,
        removeLoggers: isProduction,
        nonce: true,
        ssg: {
            hashScripts: true,
            hashStyles: true,
        },
        sri: true,
        headers: {
            crossOriginResourcePolicy: 'same-origin',
            crossOriginOpenerPolicy: 'same-origin',
            crossOriginEmbedderPolicy: isProduction ? 'credentialless' : false,
            contentSecurityPolicy: isProduction ? {
                'default-src': ['\'none\''],
                'script-src': ['\'self\'', '\'nonce-{{nonce}}\'', 'https:'],
                'script-src-attr': ['\'self\''],
                'style-src': ['\'self\'', '\'nonce-{{nonce}}\''],
                'img-src': ['\'self\'', 'data:', 'https:'],
                'font-src': ['\'self\''],
                'connect-src': ["'self'"],
                'connect-src': ['\'self\''],
                'object-src': ['\'none\''],
                'frame-src': ['\'self\'', 'https:'],
                'worker-src': ['\'self\''],
                'base-uri': ['\'self\''],
                'manifest-src': ['\'self\''],
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
            enabled: process.env.NODE_ENV === 'production',
            maxRequestSizeInBytes: 1024 * 1024 * 100,  // 2MB
            maxUploadFileRequestInBytes: 0
        },
        rateLimiter: {
            tokensPerInterval: 500,
            interval: 'minute',
            headers: true,
            skip: [
                '/ws',
                '/_ipx/**'
            ]
        },
        nonce: {
            enabled: true,
            methods: ['script', 'style'],
            useRandomNonce: true
        },
        sri: {
            enabled: true,
            hash: 'sha512'
        },
        ssg: {
            hashScripts: true,
            hashStyles: true,
            meta: true
        },
        xssValidator: {
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script', 'style'],
            css: false,
            escapeHtml: true,
            customRules: {
                allowedTags: ['br', 'p', 'a'],
                allowedAttributes: {
                    a: ['href', 'title']
                }
            }
        },
        corsHandler: {
            origin: isProduction ? siteUrl : '*',
            methods: ['GET', 'HEAD', 'POST'],
        },
        allowedMethodsRestricter: {
            methods: ['GET', 'POST'],
            throwError: true
        },
        csrf: false,
    },

    // ===== Runtime Config =====
    runtimeConfig: {
        public: {
            siteUrl: siteUrl,
            languages: languages,
            defaultLanguage: defaultLanguage,
        },
    },

    experimental: {
        payloadExtraction: false,
    },

    nitro: {
        compressPublicAssets: true,
        routeRules: {
            '/api/**': {
                headers: {
                    'X-Robots-Tag': 'noindex, nofollow'
                }
            },
            '/_ipx/**': {
                headers: staticCacheHeaders
            },
            '/admin/**': {prerender: false},
        },
    },

    site: {
        url: siteUrl,
    },

    vite: {
        plugins: [
            cssPurge({
                safelist: [/^image-/, /^error-/, /side-color-/]
            })
        ]
    },

    hooks: {
        'build:manifest': (manifest) => {
            for (const key in manifest) {
                const entry = manifest[key]
                if (entry.isEntry && entry.css) {
                    entry.css = entry.css.filter((css: string) => !css.startsWith('entry'))
                }
            }
        },
    },
})