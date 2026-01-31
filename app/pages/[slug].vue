<template>
    <div v-if="page && translation" class="tool-page">
        <section class="tool-content">
            <div class="container">
                <h1>{{ translation.pageContent?.h1 }}</h1>
                <p class="subtitle">{{ translation.pageContent?.subtitle }}</p>
                <ToolDownloadForm :platform="page.platform" />
            </div>
        </section>

        <section v-if="translation.pageContent?.intro" class="section intro">
            <div class="container">
                <div class="intro-text">{{ translation.pageContent.intro }}</div>
            </div>
        </section>

        <ToolHowToSteps
            v-if="translation.pageContent?.how_to?.steps?.length"
            :title="translation.pageContent.how_to.title"
            :steps="translation.pageContent.how_to.steps"
        />

        <ToolFeaturesGrid
            v-if="translation.pageContent?.features?.items?.length"
            :title="translation.pageContent.features.title"
            :items="translation.pageContent.features.items"
        />

        <ToolFaqSection
            v-if="translation.pageContent?.faq?.length"
            :items="translation.pageContent.faq"
        />
    </div>

    <div v-else class="not-found">
        <div class="container not-found-content">
            <h1>404</h1>
            <p>{{ $t('errors.pageNotFound') || 'Page Not Found' }}</p>
            <NuxtLink :to="localePath('/')" class="back-home">
                {{ $t('errors.backHome') || 'Back to Home' }}
            </NuxtLink>
        </div>
    </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const config = useRuntimeConfig()
const localePath = useLocalePath()
const slug = route.params.slug as string

const { data: page } = await useFetch(`/api/pages/${slug}`)

const translation = computed(() => {
    if (!page.value) return null
    if (page.value.translations?.[locale.value]) {
        return page.value.translations[locale.value]
    }
    if (page.value.meta && page.value.pageContent) {
        return { meta: page.value.meta, pageContent: page.value.pageContent }
    }
    return null
})

const keywordsArray = computed(() => {
    const kw = translation.value?.meta?.keywords
    if (!kw) return []
    if (Array.isArray(kw)) return kw
    return kw.split(',').map((k: string) => k.trim()).filter(Boolean)
})

const siteUrl = computed(() => config.public.siteUrl || 'https://yoursite.com')
const siteName = 'VideoDownloader'

const ogImageUrl = computed(() => {
    const img = translation.value?.meta?.ogImage
    if (!img) return `${siteUrl.value}/og-default.png`
    return img.startsWith('/') ? `${siteUrl.value}${img}` : img
})

const pageUrl = computed(() => {
    const base = siteUrl.value
    const langPrefix = locale.value === 'en' ? '' : `/${locale.value}`
    return `${base}${langPrefix}/${slug}`
})

const ogLocale = computed(() => {
    const map: Record<string, string> = { en: 'en_US', ru: 'ru_RU', de: 'de_DE' }
    return map[locale.value] || 'en_US'
})

const ogLocaleAlternate = computed(() => {
    const all = ['en_US', 'ru_RU', 'de_DE']
    return all.filter(l => l !== ogLocale.value)
})

useSeoMeta({
    title: () => translation.value?.meta?.title || '',
    description: () => translation.value?.meta?.description || '',
    keywords: () => keywordsArray.value.join(', '),
    author: siteName,
    ogTitle: () => translation.value?.meta?.title || '',
    ogDescription: () => translation.value?.meta?.description || '',
    ogImage: () => ogImageUrl.value,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: () => translation.value?.meta?.title || '',
    ogType: 'website',
    ogUrl: () => pageUrl.value,
    ogSiteName: siteName,
    ogLocale: () => ogLocale.value,
    twitterCard: 'summary_large_image',
    twitterTitle: () => translation.value?.meta?.title || '',
    twitterDescription: () => translation.value?.meta?.description || '',
    twitterImage: () => ogImageUrl.value,
    twitterImageAlt: () => translation.value?.meta?.title || '',
})

useHead({
    htmlAttrs: { lang: locale.value },
    meta: [
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#667eea' },
        { property: 'og:locale:alternate', content: ogLocaleAlternate.value[0] },
        { property: 'og:locale:alternate', content: ogLocaleAlternate.value[1] },
    ],
    link: () => {
        const links: any[] = [{ rel: 'canonical', href: pageUrl.value }]
        if (page.value?.translations) {
            Object.keys(page.value.translations).forEach((lang) => {
                if (lang === 'manual_edit' || lang === 'source_hash') return
                links.push({
                    rel: 'alternate',
                    hreflang: lang,
                    href: `${siteUrl.value}${lang === 'en' ? '' : '/' + lang}/${slug}`,
                })
            })
            links.push({
                rel: 'alternate',
                hreflang: 'x-default',
                href: `${siteUrl.value}/${slug}`,
            })
        }
        return links
    },
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: translation.value?.meta?.title,
                description: translation.value?.meta?.description,
                url: pageUrl.value,
                applicationCategory: 'MultimediaApplication',
                operatingSystem: 'Any',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1250' },
            }),
        },
    ],
})
</script>

<style scoped>
.tool-content {
    padding: 4rem 0;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.tool-content h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.subtitle {
    font-size: 1.25rem;
    opacity: 0.9;
    margin-bottom: 2rem;
}

.section {
    padding: 3rem 0;
}

.intro-text {
    max-width: 800px;
    margin: 0 auto;
    font-size: 1.1rem;
    line-height: 1.8;
    color: #4a5568;
    text-align: center;
}

/* 404 */
.not-found {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.not-found-content {
    text-align: center;
    padding: 4rem 1rem;
}

.not-found h1 {
    font-size: 6rem;
    font-weight: 700;
    color: #667eea;
    margin-bottom: 1rem;
    line-height: 1;
}

.not-found p {
    font-size: 1.5rem;
    color: #4a5568;
    margin-bottom: 2rem;
}

.back-home {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
}

.back-home:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>