<template>
    <section class="features">
        <div class="container">
            <h2 class="section__title">{{ title }}</h2>
            <div class="features__grid">
                <div v-for="(item, i) in items" :key="i" class="features__card">
                    <div class="features__icon">{{ item.icon || '⚡' }}</div>
                    <h3 class="features__title">{{ item.title }}</h3>
                    <p class="features__text">{{ item.description }}</p>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
defineProps<{
    title: string
    items: { icon?: string; image?: string; title: string; description: string }[]
}>()
</script>

<style scoped>
.features {
    padding-bottom: var(--section-padding-lg);
}

.features__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
    max-width: var(--container-max);
    margin: 0 auto;
}

.features__card {
    background: var(--color-bg-white);
    padding: var(--space-6);
    border-radius: var(--radius-xl);
    text-align: center;
    border: 1px solid var(--color-border);
}

.features__icon {
    font-size: var(--text-3xl);
    line-height: var(--leading-none);
    margin-bottom: var(--space-2);
}

.features__card :deep(.card-image) {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: var(--radius-md);
}

.features__title {
    font-size: var(--fs-card-title);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-2);
}

.features__text {
    color: var(--color-text-light);
    font-size: var(--fs-card-text);
    line-height: var(--leading-relaxed);
}

@media (max-width: 600px) {
    .features__grid {
        grid-template-columns: 1fr;
    }
}

@media (min-width: 768px) {
    .features {
        padding-bottom: var(--section-padding-lg);
    }
}
</style>