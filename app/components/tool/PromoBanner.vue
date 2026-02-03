<template>
    <section class="promo-banner">
        <div class="container">
            <NuxtLink
                :to="link"
                target="_blank"
                external
                class="promo-banner__link"
            >
                <div class="promo-banner__wrapper">
                    <!-- Desktop картинка -->
                    <NuxtPicture
                        src="/images/banner-desktop.png"
                        :alt="$t('promoBanner.alt')"
                        width="880"
                        height="146"
                        sizes="100vw sm:880px"
                        quality="50"
                        loading="eager"
                        :img-attrs="{
                            class: 'promo-banner__image promo-banner__image--desktop',
                            fetchpriority: 'low'
                        }"
                    />
                    <!-- Mobile картинка -->
                    <NuxtPicture
                        src="/images/banner-mobile.png"
                        :alt="$t('promoBanner.alt')"
                        width="640"
                        height="433"
                        sizes="100vw sm:640px"
                        quality="20"
                        loading="eager"
                        :img-attrs="{
                            class: 'promo-banner__image promo-banner__image--mobile',
                            fetchpriority: 'low'
                        }"
                    />

                    <div class="promo-banner__content">
                        <h3 class="promo-banner__title">{{ $t('promoBanner.title') }}</h3>
                        <div class="promo-banner__badge">
                            <svg class="promo-banner__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#E53935"/>
                                <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span class="promo-banner__badge-text">{{ $t('promoBanner.subtitle') }}</span>
                        </div>
                    </div>
                </div>
            </NuxtLink>
        </div>
    </section>
</template>

<script setup lang="ts">
interface Props {
    link?: string
}

withDefaults(defineProps<Props>(), {
    link: 'https://www.youtube.com/premium'
})
</script>

<style scoped>
.promo-banner {
    background: var(--color-bg);
}

.promo-banner .container {
    max-width: var(--container-max);
    margin: 0 auto;
    padding: var(--space-12) var(--container-padding);
}

.promo-banner__link {
    display: block;
    text-decoration: none;
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition: transform var(--transition-base), box-shadow var(--transition-base);
    -webkit-tap-highlight-color: transparent;
}

.promo-banner__link:hover {
    transform: var(--hover-lift);
    box-shadow: var(--hover-shadow);
}

.promo-banner__wrapper {
    position: relative;
    border-radius: var(--radius-xl);
    overflow: hidden;
    background: linear-gradient(135deg, #1a1a3e 0%, #4a1942 50%, #c41e3a 100%);
    aspect-ratio: 880 / 146;
}

.promo-banner__wrapper :deep(.promo-banner__image) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Desktop показываем, mobile скрываем */
.promo-banner__wrapper :deep(.promo-banner__image--desktop) {
    display: block;
}

.promo-banner__wrapper :deep(.promo-banner__image--mobile) {
    display: none;
}

.promo-banner__content {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding-left: var(--space-10);
}

.promo-banner__title {
    font-size: clamp(1.5rem, 3.5vw, 2.25rem);
    font-weight: var(--font-bold);
    color: var(--color-text-inverse);
    margin: 0;
    line-height: var(--leading-none);
    white-space: nowrap;
}

.promo-banner__badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: rgba(0, 0, 0, 0.2);
    padding: 0.7rem var(--space-4);
    border-radius: var(--radius-full);
}

.promo-banner__badge-text {
    color: var(--color-text-inverse);
    font-size: clamp(1rem, 2vw, 1.2rem);
    font-weight: var(--font-medium);
    white-space: nowrap;
}

.promo-banner__icon {
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
}

/* Mobile */
@media (max-width: 767px) {
    .promo-banner .container {
        padding-top: var(--space-6);
        padding-bottom: var(--space-6);
    }

    .promo-banner__wrapper {
        aspect-ratio: 640 / 433;
    }

    /* Mobile показываем, desktop скрываем */
    .promo-banner__wrapper :deep(.promo-banner__image--desktop) {
        display: none;
    }

    .promo-banner__wrapper :deep(.promo-banner__image--mobile) {
        display: block;
    }

    .promo-banner__content {
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        padding: var(--space-6);
    }

    .promo-banner__title {
        font-size: 1.75rem;
    }

    .promo-banner__badge-text {
        font-size: var(--text-base);
    }
}
</style>