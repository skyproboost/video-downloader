<template>
    <div class="home">
        <section class="main-section">
            <div class="container">
                <h1 class="main-section__title">{{ $t('home.title') }}</h1>
                <p class="main-section__subtitle">{{ $t('home.subtitle') }}</p>
                <ToolDownloadForm />
                <HomePlatformGrid class="main-section__platforms" />
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
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const localePath = useLocalePath()

const siteUrl = computed(() => config.public.siteUrl || 'https://yoursite.com')
const canonicalUrl = computed(() => `${siteUrl.value}${localePath('/')}`)

useSeoMeta({
    title: t('home.meta.title'),
    description: t('home.meta.description'),
    ogTitle: t('home.meta.title'),
    ogDescription: t('home.meta.description'),
    ogUrl: canonicalUrl.value,
    twitterCard: 'summary_large_image',
})

useHead({
    htmlAttrs: { lang: locale.value },
    link: [{ rel: 'canonical', href: canonicalUrl.value }],
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