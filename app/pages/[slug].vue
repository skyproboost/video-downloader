<template>
    <div class="tool-page">
        <section class="main-section tool-main">
            <div class="container">
                <div class="tool-main-content">
                    <component :is="mainTitleTag" class="tool-main__title">
                        {{ translation.pageContent?.mainTitle }}
                    </component>
                    <p v-if="translation.pageContent?.subtitle" class="tool-main__subtitle">
                        {{ translation.pageContent.subtitle }}
                    </p>
                </div>
                <ToolDownloadForm />
                <p v-if="translation.pageContent?.intro" class="tool-main__intro">
                    {{ translation.pageContent.intro }}
                </p>
            </div>
        </section>

        <ToolPromoBanner link="https://www.youtube.com/premium" />

        <section v-if="page.platform" class="platforms-section">
            <div class="container">
                <LazyHomePlatformGrid :current-platform="page.platform" />
            </div>
        </section>

        <ToolHowToSteps
            v-if="showHowTo"
            :title="translation.pageContent.how_to?.title"
            :steps="translation.pageContent.how_to?.steps"
        />

        <ToolFeaturesGrid
            v-if="showFeatures"
            :title="translation.pageContent.features?.title"
            :items="translation.pageContent.features?.items"
        />

        <ToolFaqSection
            v-if="translation.pageContent?.faq?.length"
            :items="translation.pageContent.faq"
        />
    </div>
</template>

<script setup lang="ts">
import { languages, defaultLanguage } from '@/../config/languages'

interface PageMeta {
    title: string
    description: string
    keywords?: string
    ogImage?: string
}

interface PageContent {
    mainTitle?: string
    subtitle?: string
    intro?: string
    how_to?: {
        title?: string
        steps?: Array<{ title: string; description: string }>
    }
    features?: {
        title?: string
        items?: Array<{ icon?: string; title: string; description: string }>
    }
    faq?: Array<{ question: string; answer: string }>
}

interface PageData {
    slug: string
    platform: string
    meta: PageMeta
    pageContent: PageContent
    translations?: Record<string, { meta: PageMeta; pageContent: PageContent }>
}

const route = useRoute()
const { locale } = useI18n()
const config = useRuntimeConfig()

const slug = route.params.slug as string
const siteUrl = config.public.siteUrl as string || 'localhost:3000'
const siteName = 'VideoDownloader'

// Игнорируем запросы к файлам
if (/^(_|api)|\.(js|json|css|map|ico|png|jpg|svg|webp|txt|xml)$/i.test(slug)) {
    throw createError({ statusCode: 404, message: 'Not found', fatal: true })
}

// Загрузка данных
const { data: page, error: fetchError } = await useAsyncData<PageData>(
    `page-${slug}`,
    () => $fetch(`/api/pages/${slug}`),
    { getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] as PageData | undefined }
)

// 404 если страница не найдена — Nuxt покажет error.vue
if (fetchError.value || !page.value) {
    throw createError({
        statusCode: fetchError.value?.statusCode || 404,
        message: 'Page not found',
        fatal: true,
    })
}

// Перевод для текущего языка
const translation = computed(() => {
    return page.value!.translations?.[locale.value]
        ?? { meta: page.value!.meta, pageContent: page.value!.pageContent }
})

// Условия отображения блоков
const showHowTo = computed(() => {
    const howTo = translation.value?.pageContent?.how_to
    if (!howTo) return false
    return !!howTo.title?.trim() || howTo.steps?.some(s => s.title?.trim())
})

const showFeatures = computed(() => {
    const features = translation.value?.pageContent?.features
    if (!features) return false
    return !!features.title?.trim() && (features.items?.length ?? 0) > 0
})

const mainTitleTag = computed(() => showHowTo.value ? 'h2' : 'h1')

// SEO
const pageUrl = computed(() => {
    const prefix = locale.value === defaultLanguage ? '' : `/${locale.value}`
    return `${siteUrl}${prefix}/${slug}`
})

const ogImageUrl = computed(() => {
    const img = translation.value?.meta?.ogImage
    if (!img) return `${siteUrl}/og-default.png`
    return img.startsWith('/') ? `${siteUrl}${img}` : img
})

const keywords = computed(() => {
    const kw = translation.value?.meta?.keywords
    if (!kw) return ''
    return Array.isArray(kw) ? kw.join(', ') : kw
})

const localeMap: Record<string, string> = Object.fromEntries(
    languages.map(l => [l.code, l.iso.replace('-', '_')])
)

useSeoMeta({
    title: () => translation.value?.meta?.title || '',
    description: () => translation.value?.meta?.description || '',
    keywords: () => keywords.value,
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
    ogLocale: () => localeMap[locale.value] || 'en_US',
    twitterCard: 'summary_large_image',
    twitterTitle: () => translation.value?.meta?.title || '',
    twitterDescription: () => translation.value?.meta?.description || '',
    twitterImage: () => ogImageUrl.value,
    twitterImageAlt: () => translation.value?.meta?.title || '',
})

useHead({
    htmlAttrs: { lang: locale.value },
    link: () => {
        const links: Array<{ rel: string; href: string; hreflang?: string }> = [
            { rel: 'canonical', href: pageUrl.value },
        ]
        for (const lang of languages) {
            const prefix = lang.code === defaultLanguage ? '' : `/${lang.code}`
            links.push({ rel: 'alternate', hreflang: lang.code, href: `${siteUrl}${prefix}/${slug}` })
        }
        links.push({ rel: 'alternate', hreflang: 'x-default', href: `${siteUrl}/${slug}` })
        return links
    },
    script: () => {
        const scripts: Array<{ type: string; innerHTML: string }> = [{
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
            }),
        }]

        const faq = translation.value?.pageContent?.faq
        if (faq?.length) {
            scripts.push({
                type: 'application/ld+json',
                innerHTML: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: faq.map(item => ({
                        '@type': 'Question',
                        name: item.question,
                        acceptedAnswer: { '@type': 'Answer', text: item.answer },
                    })),
                }),
            })
        }
        return scripts
    },
})
</script>

<style scoped>
.tool-main-content {
    margin-bottom: var(--space-4);
}

.tool-main__title {
    font-size: var(--text-5xl);
}

.tool-main__subtitle {
    font-size: var(--text-2xl);
}

.tool-main__intro {
    margin-top: var(--space-4);
    font-size: 0.9rem;
    color: var(--color-text-inverse-muted);
}

.platforms-section {
    padding-bottom: var(--section-padding-lg);
    background: var(--color-bg);
}

@media (max-width: 767px) {
    .tool-main__title {
        font-size: var(--text-2xl);
    }
    .tool-main__subtitle {
        font-size: var(--text-base);
    }
}
</style>