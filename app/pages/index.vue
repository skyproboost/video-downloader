<template>
    <div class="home">
        <section class="hero">
            <div class="container">
                <h1>{{ $t('home.title') }}</h1>
                <p class="hero-subtitle">{{ $t('home.subtitle') }}</p>

                <HomePlatformGrid />
            </div>
        </section>

        <section class="about">
            <div class="container">
                <h2 class="about-title">{{ $t('home.about.title') }}</h2>
                <div class="about-content">
                    <p>{{ $t('home.about.text1') }}</p>
                    <p>{{ $t('home.about.text2') }}</p>
                    <p>{{ $t('home.about.text3') }}</p>
                </div>

                <div class="features">
                    <div class="feature">
                        <span class="feature-icon">⚡</span>
                        <h3>{{ $t('home.features.fast.title') }}</h3>
                        <p>{{ $t('home.features.fast.text') }}</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🔒</span>
                        <h3>{{ $t('home.features.safe.title') }}</h3>
                        <p>{{ $t('home.features.safe.text') }}</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">💯</span>
                        <h3>{{ $t('home.features.free.title') }}</h3>
                        <p>{{ $t('home.features.free.text') }}</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🌐</span>
                        <h3>{{ $t('home.features.platforms.title') }}</h3>
                        <p>{{ $t('home.features.platforms.text') }}</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">📲</span>
                        <h3>{{ $t('home.features.noInstall.title') }}</h3>
                        <p>{{ $t('home.features.noInstall.text') }}</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🎬</span>
                        <h3>{{ $t('home.features.quality.title') }}</h3>
                        <p>{{ $t('home.features.quality.text') }}</p>
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
    link: [
        { rel: 'canonical', href: canonicalUrl.value },
    ],
})
</script>

<style scoped>
.home {
    flex: 1;
    display: flex;
    flex-direction: column;
}

/* Hero */
.hero {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: linear-gradient(135deg, #0e1814, #0c675b);
    color: var(--color-text-inverse);
    padding: var(--space-12) 0;
}

.hero h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin-bottom: var(--space-3);
}

.hero-subtitle {
    font-size: var(--text-lg);
    opacity: 0.9;
    margin-bottom: var(--space-8);
    max-width: 32rem;
    margin-inline: auto;
}

/* About */
.about {
    padding: var(--space-12) 0;
    background: var(--color-bg-white);
}

.about-title {
    text-align: center;
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-6);
}

.about-content {
    max-width: 55rem;
    margin: 0 auto var(--space-6);
    text-align: center;
}

.about-content p {
    color: var(--color-text-muted);
    font-size: var(--text-base);
    line-height: 1.7;
    margin-bottom: var(--space-4);
}

.about-content p:last-child {
    margin-bottom: 0;
}

/* Features */
.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space-6);
    max-width: 55rem;
    margin: 0 auto;
}

.feature {
    text-align: center;
    padding: var(--space-6);
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    border: 1px solid #e1f3ff;
}

.feature-icon {
    display: inline-block;
    font-size: 2rem;
}

.feature h3 {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-2);
}

.feature p {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: 1.6;
}

/* Tablet+ */
@media (min-width: 768px) {
    .hero {
        padding: var(--space-12) 0 var(--space-12);
    }

    .hero h1 {
        font-size: 2.5rem;
    }

    .hero-subtitle {
        font-size: var(--text-xl);
    }

    .about-title {
        font-size: 2rem;
    }

    .about-content p {
        font-size: var(--text-lg);
    }
}
</style>