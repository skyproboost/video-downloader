<template>
    <div class="platform-grid-wrapper">
        <div class="platform-grid">
            <NuxtLink
                v-for="platform in filteredPlatforms"
                :key="platform.id"
                :to="localePath(`/${platform.id}`)"
                :prefetch="false"
                :class="['platform-grid__card', `platform-grid__card--${platform.id}`]"
            >
                <ToolPlatformIcon :platform="platform.id" class="platform-grid__icon" />
                <span class="platform-grid__name">{{ platform.name }}</span>
            </NuxtLink>
        </div>
    </div>
</template>

<script setup lang="ts">
import { platforms } from '@/../config/platforms'

const props = defineProps<{
    currentPlatform?: string
}>()

const localePath = useLocalePath()

const filteredPlatforms = computed(() => {
    return platforms.filter(p => p.id !== 'other' && p.id !== props.currentPlatform)
})
</script>

<style scoped>
.platform-grid-wrapper {
    text-align: center;
    margin-bottom: var(--space-6);
}

.platform-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-3);
    max-width: 36rem;
    margin: 0 auto;
}

.platform-grid__card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    color: var(--color-text-inverse);
    text-decoration: none;
    font-weight: var(--font-semibold);
    font-size: var(--text-sm);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    width: calc((100% - var(--space-4) * 2) / 3);
    min-width: 10rem;
    -webkit-tap-highlight-color: transparent;
}

.platform-grid__card:hover {
    transform: var(--hover-lift);
    box-shadow: var(--hover-shadow);
}

/* Platform colors */
.platform-grid__card--youtube {
    background: #FF0000;
}

.platform-grid__card--instagram {
    background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
}

.platform-grid__card--tiktok {
    background: #000000;
}

.platform-grid__card--vk {
    background: #0077FF;
}

.platform-grid__card--facebook {
    background: #1877F2;
}

.platform-grid__card--vimeo {
    background: #1AB7EA;
}

.platform-grid__icon {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
}

.platform-grid__name {
    white-space: nowrap;
}

/* Tablet */
@media (max-width: 640px) {
    .platform-grid {
        gap: var(--space-3);
    }

    .platform-grid__card {
        padding: var(--space-3) var(--space-4);
        font-size: var(--text-xs);
        width: calc((100% - var(--space-3)) / 2);
        min-width: 8rem;
    }

    .platform-grid__icon {
        width: 1.25rem;
        height: 1.25rem;
    }
}

/* Mobile small */
@media (max-width: 360px) {
    .platform-grid {
        gap: var(--space-2);
    }

    .platform-grid__card {
        padding: var(--space-2) var(--space-3);
        width: calc((100% - var(--space-2)) / 2);
        min-width: 7rem;
    }
}
</style>