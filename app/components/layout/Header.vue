<template>
    <header class="header">
        <div class="container header-inner">
            <NuxtLink :to="localePath('/')" class="logo">
                📥 VideoDownloader
            </NuxtLink>

            <nav class="nav">
                <NuxtLink :to="localePath('/youtube-downloader')">YouTube</NuxtLink>
            </nav>

            <div class="lang-switcher">
                <NuxtLink
                    v-for="loc in locales"
                    :key="loc.code"
                    :to="switchLocalePath(loc.code)"
                    class="lang-btn"
                    :class="{ active: locale === loc.code }"
                >
                    {{ loc.code.toUpperCase() }}
                </NuxtLink>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
</script>

<style scoped>
.header {
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
    gap: 2rem;
}

.logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a202c;
    text-decoration: none;
}

.nav {
    display: flex;
    gap: 1.5rem;
}

.nav a {
    color: #4a5568;
    text-decoration: none;
    font-weight: 500;
}

.nav a:hover {
    color: #667eea;
}

.lang-switcher {
    display: flex;
    gap: 0.5rem;
}

.lang-btn {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4a5568;
    text-decoration: none;
    transition: all 0.2s;
}

.lang-btn:hover {
    background: #edf2f7;
}

.lang-btn.active {
    background: #667eea;
    color: white;
}
</style>