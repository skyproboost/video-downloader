<template>
    <div class="home">
        <section class="main-section">
            <div class="container">
                <h1 class="main-section__title">{{ $t('home.title') }}</h1>
                <p class="main-section__subtitle">{{ $t('home.subtitle') }}</p>
                <ToolDownloadForm />
                <ToolPlatformGrid class="main-section__platforms" />
            </div>
        </section>

        <section class="about section section--white">
            <div class="container">
                <h2 class="section__title">{{ $t('home.about.title') }}</h2>
                <div class="about__content">
                    <p>{{ $t('home.about.text1') }}</p>
                    <p>{{ $t('home.about.text2') }}</p>
                    <p>{{ $t('home.about.text3') }}</p>
                </div>

                <div class="grid-auto">
                    <div class="card">
                        <span class="card__icon">⚡</span>
                        <h3 class="card__title">{{ $t('home.features.fast.title') }}</h3>
                        <p class="card__text">{{ $t('home.features.fast.text') }}</p>
                    </div>
                    <div class="card">
                        <span class="card__icon">🔒</span>
                        <h3 class="card__title">{{ $t('home.features.safe.title') }}</h3>
                        <p class="card__text">{{ $t('home.features.safe.text') }}</p>
                    </div>
                    <div class="card">
                        <span class="card__icon">💯</span>
                        <h3 class="card__title">{{ $t('home.features.free.title') }}</h3>
                        <p class="card__text">{{ $t('home.features.free.text') }}</p>
                    </div>
                    <div class="card">
                        <span class="card__icon">🌐</span>
                        <h3 class="card__title">{{ $t('home.features.platforms.title') }}</h3>
                        <p class="card__text">{{ $t('home.features.platforms.text') }}</p>
                    </div>
                    <div class="card">
                        <span class="card__icon">📲</span>
                        <h3 class="card__title">{{ $t('home.features.noInstall.title') }}</h3>
                        <p class="card__text">{{ $t('home.features.noInstall.text') }}</p>
                    </div>
                    <div class="card">
                        <span class="card__icon">🎬</span>
                        <h3 class="card__title">{{ $t('home.features.quality.title') }}</h3>
                        <p class="card__text">{{ $t('home.features.quality.text') }}</p>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { languages, defaultLanguage } from '@/../config/languages'

const { t, locale } = useI18n()
const config = useRuntimeConfig()

const siteUrl = (config.public.siteUrl as string || 'https://yoursite.com').replace(/\/$/, '')
const siteName = 'aDownloader'

const localeMap: Record<string, string> = Object.fromEntries(
    languages.map(l => [l.code, l.iso.replace('-', '_')])
)

const pageUrl = computed(() => {
    const prefix = locale.value === defaultLanguage ? '' : `/${locale.value}`
    return `${siteUrl}${prefix}/`
})

const ogImageUrl = `${siteUrl}/images/main.png`

useSeoMeta({
    title: () => t('home.meta.title'),
    description: () => t('home.meta.description'),
    keywords: () => t('home.meta.keywords', ''),
    author: siteName,

    // Open Graph
    ogTitle: () => t('home.meta.title'),
    ogDescription: () => t('home.meta.description'),
    ogImage: ogImageUrl,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: () => t('home.meta.title'),
    ogType: 'website',
    ogUrl: () => pageUrl.value,
    ogSiteName: siteName,
    ogLocale: () => localeMap[locale.value] || 'en_US',

    // Twitter
    twitterCard: 'summary_large_image',
    twitterTitle: () => t('home.meta.title'),
    twitterDescription: () => t('home.meta.description'),
    twitterImage: ogImageUrl,
    twitterImageAlt: () => t('home.meta.title'),
})

useHead({
    htmlAttrs: { lang: locale.value },
    link: () => {
        const links: Array<{ rel: string; href: string; hreflang?: string }> = [
            { rel: 'canonical', href: pageUrl.value },
        ]

        // hreflang для всех языков
        for (const lang of languages) {
            const prefix = lang.code === defaultLanguage ? '' : `/${lang.code}`
            links.push({
                rel: 'alternate',
                hreflang: lang.iso,
                href: `${siteUrl}${prefix}/`,
            })
        }

        // x-default → дефолтный язык
        links.push({
            rel: 'alternate',
            hreflang: 'x-default',
            href: `${siteUrl}/`,
        })

        return links
    },
    script: () => {
        return [
            // WebSite schema — помогает с sitelinks в поиске
            {
                type: 'application/ld+json',
                innerHTML: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: siteName,
                    url: siteUrl,
                    description: t('home.meta.description'),
                    inLanguage: locale.value,
                    potentialAction: {
                        '@type': 'SearchAction',
                        target: {
                            '@type': 'EntryPoint',
                            urlTemplate: `${siteUrl}/?url={search_term_string}`,
                        },
                        'query-input': 'required name=search_term_string',
                    },
                }),
            },
            // WebApplication schema
            {
                type: 'application/ld+json',
                innerHTML: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'WebApplication',
                    name: siteName,
                    description: t('home.meta.description'),
                    url: pageUrl.value,
                    applicationCategory: 'MultimediaApplication',
                    operatingSystem: 'Any',
                    browserRequirements: 'Requires JavaScript',
                    offers: {
                        '@type': 'Offer',
                        price: '0',
                        priceCurrency: 'USD',
                    },
                }),
            },
        ]
    },
})
</script>

<style scoped>
.home {
    flex: 1;
    display: flex;
    flex-direction: column;
}

/* About Content */
.about__content {
    max-width: var(--container-max);
    margin: 0 auto var(--space-6);
    text-align: center;
}

.about__content p {
    color: var(--color-text-muted);
    font-size: var(--fs-section-text);
    line-height: var(--leading-loose);
    margin-bottom: var(--space-2);
}

.about__content p:last-child {
    margin-bottom: 0;
}

@media (min-width: 768px) {
    .about__content {
        margin-bottom: var(--space-12);
    }
}
</style>