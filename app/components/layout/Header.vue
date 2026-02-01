<template>
    <header class="header">
        <div class="container header-inner">
            <NuxtLink :to="localePath('/')" class="logo">
                📥 Video Downloader
            </NuxtLink>
        </div>
    </header>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
</script>

<style scoped>
.header {
    background: white;
    border-bottom: 1px solid #e7e7e7;
}

.header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) var(--container-padding);
    gap: 2rem;
}

.logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a202c;
    text-decoration: none;
}

.nav a {
    color: #4a5568;
    text-decoration: none;
    font-weight: 500;
}

.nav a:hover {
    color: #667eea;
}
</style>