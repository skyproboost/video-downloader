<template>
    <div class="platform-grid-wrapper">
        <div class="platform-grid">
            <NuxtLink
                v-for="platform in filteredPlatforms"
                :key="platform.id"
                :to="localePath(`/${platform.id}-downloader`)"
                :class="['platform-card', `platform-${platform.id}`]"
            >
                <ToolPlatformIcon :platform="platform.id" class="card-icon" />
                <span class="card-name">{{ platform.name }}</span>
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
    if (!props.currentPlatform) return platforms
    return platforms.filter(p => p.id !== props.currentPlatform)
})
</script>

<style scoped>
.platform-grid-wrapper {
    text-align: center;
}

.current-platform-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-6);
}

.other-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-light);
    margin-bottom: var(--space-6);
}

.platform-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
    max-width: 36rem;
    margin: 0 auto;
}

.platform-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    color: white;
    text-decoration: none;
    font-weight: 600;
    font-size: var(--text-sm);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.platform-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 10px rgb(0 0 0 / 30%);
}

/* Platform colors */
.platform-youtube {
    background: #FF0000;
}

.platform-instagram {
    background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
}

.platform-tiktok {
    background: #000000;
}

.platform-vk {
    background: #0077FF;
}

.platform-facebook {
    background: #1877F2;
}

.platform-vimeo {
    background: #1AB7EA;
}

.card-icon {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
}

.card-name {
    white-space: nowrap;
}

/* Tablet */
@media (max-width: 640px) {
    .current-platform-title {
        font-size: 1.5rem;
    }

    .other-title {
        font-size: 1rem;
    }

    .platform-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-3);
        max-width: 20rem;
    }

    .platform-card {
        padding: var(--space-3) var(--space-4);
        font-size: var(--text-xs);
    }

    .card-icon {
        width: 1.25rem;
        height: 1.25rem;
    }
}

/* Mobile small */
@media (max-width: 360px) {
    .platform-grid {
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
    }

    .platform-card {
        padding: var(--space-2) var(--space-3);
    }
}
</style>