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
    box-shadow: 0 5px 10px #00000063;
    position: relative;
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