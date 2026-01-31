<template>
    <section v-if="currentPlatform" class="platform-section">
        <div class="container">
            <div class="platform-hero">
                <h2 class="platform-name">{{ currentPlatform.name }}</h2>
            </div>

            <!-- Другие платформы -->
            <div v-if="otherPlatforms.length > 0" class="other-platforms">
                <h3 class="other-title">{{ otherPlatformsTitle }}</h3>
                <div class="other-grid">
                    <NuxtLink
                        v-for="p in otherPlatforms"
                        :key="p.id"
                        :to="localePath(`/${p.id}-downloader`)"
                        class="other-card"
                    >
                        <span class="other-name">{{ p.name }}</span>
                    </NuxtLink>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { platforms, getPlatformById } from '@/../config/platforms'

const props = defineProps<{
    platformId: string
}>()

const { locale } = useI18n()
const localePath = useLocalePath()

const currentPlatform = computed(() => getPlatformById(props.platformId))

const otherPlatforms = computed(() => {
    return platforms.filter(p => p.id !== props.platformId)
})

const otherPlatformsTitle = computed(() => {
    const titles: Record<string, string> = {
        en: 'Also available for',
        ru: 'Также доступно для',
        de: 'Auch verfügbar für',
    }
    return titles[locale.value] || titles.en
})
</script>

<style scoped>
.platform-section {
    padding: 4rem 0;
    background: #f8fafc;
}

.platform-hero {
    text-align: center;
    margin-bottom: 3rem;
}

.platform-name {
    font-size: 2rem;
    font-weight: 700;
    color: #1a202c;
    margin: 0;
}

/* Другие платформы */
.other-platforms {
    text-align: center;
}

.other-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #718096;
    margin-bottom: 1.5rem;
}

.other-grid {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.other-card {
    display: flex;
    align-items: center;
    padding: 0.875rem 1.5rem;
    background: white;
    border-radius: 0.75rem;
    text-decoration: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: transform 0.2s, box-shadow 0.2s;
}

.other-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.other-name {
    font-weight: 600;
    color: #2d3748;
}
</style>