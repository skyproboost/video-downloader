<template>
    <div v-if="page && translation" class="tool-page">
        <section class="tool-content">
            <div class="container">
                <component :is="mainTitleTag" class="main-title">{{translation.pageContent?.mainTitle}}</component>
                <p class="subtitle" v-text="translation.pageContent?.subtitle"></p>
                <ToolDownloadForm/>
                <p class="intro-text" v-text="translation.pageContent?.intro"></p>
            </div>
        </section>

        <section v-if="page.platform" class="platforms-section">
            <div class="container">
                <HomePlatformGrid :current-platform="page.platform"/>
            </div>
        </section>

        <ToolHowToSteps
            v-if="hasValidSteps"
            :title="translation.pageContent.how_to?.title"
            :steps="translation.pageContent.how_to?.steps"
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

    <div v-else class="error-block">
        <div class="container error-content">
            <h1 class="error-code" v-text="errorCode"></h1>
            <p class="error-message" v-text="$t(`errors.${errorCode}.title`)"></p>
            <p class="error-description" v-text="$t(`errors.${errorCode}.description`)"></p>
            <NuxtLink :to="localePath('/')" class="back-home">{{$t('errors.backHome')}}</NuxtLink>
        </div>
    </div>
</template>

<script setup lang="ts">
const route = useRoute()
const {locale} = useI18n()
const config = useRuntimeConfig()
const localePath = useLocalePath()
const slug = route.params.slug as string

const {data: page, error: fetchError} = await useFetch(`/api/pages/${slug}`)

const hasValidSteps = computed(() => {
    return translation.value?.pageContent?.how_to?.steps?.some(s => s.title)
})

const mainTitleTag = computed(() => hasValidSteps.value ? 'h2' : 'h1')

const translation = computed(() => {
    if (!page.value) return null
    if (page.value.translations?.[locale.value]) {
        return page.value.translations[locale.value]
    }
    if (page.value.meta && page.value.pageContent) {
        return {meta: page.value.meta, pageContent: page.value.pageContent}
    }
    return null
})

// Определяем код ошибки
const errorCode = computed(() => {
    if (fetchError.value) {
        const status = fetchError.value.statusCode
        return status === 404 || status === 500 ? status : 500
    }
    if (!page.value) return 404
    return 500
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
    const map: Record<string, string> = {en: 'en_US', ru: 'ru_RU', de: 'de_DE'}
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
    htmlAttrs: {lang: locale.value},
    meta: [
        {name: 'format-detection', content: 'telephone=no'},
        {name: 'theme-color', content: '#667eea'},
        {property: 'og:locale:alternate', content: ogLocaleAlternate.value[0]},
        {property: 'og:locale:alternate', content: ogLocaleAlternate.value[1]},
    ],
    link: () => {
        const links: any[] = [{rel: 'canonical', href: pageUrl.value}]

        if (page.value?.translations) {
            const validLangs = ['en', 'ru', 'de']

            Object.keys(page.value.translations)
                .filter(lang => validLangs.includes(lang))
                .forEach((lang) => {
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
                offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
                aggregateRating: {'@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1250'},
            }),
        },
    ],
})
</script>

<style scoped>
.tool-content {
    padding: 3rem 0;
    text-align: center;
    background: linear-gradient(135deg, #0e1814, #0c675b);
    color: white;
}

.tool-content h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.main-title {
    font-size: 3rem;
}

.subtitle {
    font-size: 1.5rem;
    opacity: 0.9;
    margin-bottom: 1rem;
}

.section {
    padding: 3rem 0;
}

.platforms-section {
    padding: 4rem 0;
    background: var(--color-bg);
}

.intro-text {
    max-width: 800px;
    margin: 0 auto;
    font-size: 1rem;
    line-height: 1.5;
    color: #81aba5;
    text-align: center;
    margin-top: 1rem;
}

/* Error block */
.error-block {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.error-content {
    text-align: center;
    padding: 4rem 1rem;
}

.error-code {
    font-size: clamp(5rem, 15vw, 7rem);
    font-weight: 700;
    background: #7b1c1c;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 0.9;
}

.error-message {
    font-size: 1.5rem;
    font-weight: 600;
    color: #7b1c1c;
}

.error-description {
    font-size: 1rem;
    color: #7b1c1c;
    margin-bottom: 0.5rem;
    max-width: 400px;
    margin-inline: auto;
    line-height: 1.3;
}

.back-home {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: #3b3b3b;
    color: white;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    transition: background-color .3s ease-in-out;
}

.back-home:hover {
    background: #1c1c1c;
}
</style>