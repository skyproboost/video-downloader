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

.nav a {
    color: #4a5568;
    text-decoration: none;
    font-weight: 500;
}

.nav a:hover {
    color: #667eea;
}
</style>