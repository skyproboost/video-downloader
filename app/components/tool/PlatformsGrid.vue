<template>
    <section v-if="currentPlatform" class="platforms">
        <div class="container">
            <div class="platforms__hero">
                <h2 class="platforms__title">{{ currentPlatform.name }}</h2>
            </div>

            <div v-if="otherPlatforms.length > 0" class="platforms__other">
                <h3 class="platforms__other-title">{{ otherPlatformsTitle }}</h3>
                <div class="platforms__grid">
                    <NuxtLink
                        v-for="p in otherPlatforms"
                        :key="p.id"
                        :to="localePath(`/${p.id}`)"
                        class="platforms__card"
                    >
                        <span class="platforms__card-name">{{ p.name }}</span>
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
.platforms {
    padding: var(--section-padding-lg) 0;
    background: var(--color-bg);
}

.platforms__hero {
    text-align: center;
    margin-bottom: var(--space-12);
}

.platforms__title {
    font-size: var(--fs-section-title);
    font-weight: var(--font-bold);
    color: var(--color-text);
    margin: 0;
}

/* Other platforms */
.platforms__other {
    text-align: center;
}

.platforms__other-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-light);
    margin-bottom: var(--space-6);
}

.platforms__grid {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    flex-wrap: wrap;
}

.platforms__card {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-6);
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    text-decoration: none;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-base), box-shadow var(--transition-base);
    -webkit-tap-highlight-color: transparent;
}

.platforms__card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.platforms__card-name {
    font-weight: var(--font-semibold);
    color: var(--color-text);
}

@media (max-width: 767px) {
    .platforms {
        padding: var(--section-padding-sm) 0;
    }

    .platforms__hero {
        margin-bottom: var(--space-6);
    }
}
</style>