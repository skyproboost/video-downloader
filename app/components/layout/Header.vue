<template>
    <header class="header">
        <div class="container header__inner">
            <NuxtLink :to="localePath('/')" class="header__logo">
                <NuxtPicture
                    src="/images/logo.png"
                    alt="Video Downloader"
                    width="70"
                    height="70"
                    sizes="100vw sm:70px"
                    quality="50"
                    loading="eager"
                    preload
                    :img-attrs="{
                        class: 'header__logo-img',
                        fetchpriority: 'high'
                    }"
                />
                <span class="header__logo-text">Video Downloader</span>
            </NuxtLink>
        </div>
    </header>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
</script>

<style scoped>
.header {
    background: var(--color-bg-white);
    border-bottom: 1px solid var(--color-border);
}

.header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) var(--container-padding);
    gap: var(--space-8);
}

.header__logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    text-decoration: none;
}

.header__logo :deep(.header__logo-img) {
    width: 70px;
    height: 70px;
    object-fit: contain;
}

.header__logo-text {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    color: var(--color-text);
}

@media (max-width: 640px) {
    .header__logo-text {
        font-size: var(--text-base);
    }
}
</style>