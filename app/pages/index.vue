<template>
    <div class="home">
        <section class="tool-content">
            <div class="container">
                <h1>{{ $t('home.title') }}</h1>
                <p class="tool-content-subtitle">{{ $t('home.subtitle') }}</p>

                <HomePlatformGrid />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

useSeoMeta({
    title: t('home.meta.title'),
    description: t('home.meta.description'),
    ogTitle: t('home.meta.title'),
    ogDescription: t('home.meta.description'),
    twitterCard: 'summary_large_image',
})

useHead({
    htmlAttrs: { lang: locale.value },
    link: [
        {
            rel: 'canonical',
            href: `https://yoursite.com${locale.value === 'en' ? '' : '/' + locale.value}`,
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
    min-height: 60vh;
    display: flex;
    align-items: center;
}

.tool-content h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
}

.tool-content-subtitle {
    font-size: 1.25rem;
    opacity: 0.9;
    margin-bottom: 3rem;
}
</style>