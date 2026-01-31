<template>
    <div class="platform-grid">
        <NuxtLink
            v-for="platform in platforms"
            :key="platform.slug"
            :to="localePath(`/${platform.slug}`)"
            class="platform-card"
        >
            <span class="platform-icon">{{ platform.icon }}</span>
            <span class="platform-name">{{ platform.name }}</span>
        </NuxtLink>
    </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

const platforms = [
    { slug: 'youtube-downloader', icon: '📹', name: 'YouTube' },
]
</script>

<style scoped>
.platform-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    max-width: 600px;
    margin: 0 auto;
}

.platform-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    padding: 1.5rem 2rem;
    border-radius: 1rem;
    text-decoration: none;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    transition: transform 0.2s, background 0.2s;
    min-width: 140px;
}

.platform-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.25);
}

.platform-icon {
    font-size: 2.5rem;
}

.platform-name {
    font-weight: 600;
}
</style>