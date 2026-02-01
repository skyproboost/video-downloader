<template>
    <section class="features">
        <div class="container">
            <h2>{{ title }}</h2>
            <div class="grid">
                <div v-for="(item, i) in items" :key="i" class="card">
                    <div class="icon">{{ item.icon || '' }}</div>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.description }}</p>
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
    padding-bottom: 4rem;
}

.features h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 1rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 55rem;
    margin: 0 auto;
}

@media (max-width: 600px) {
    .grid {
        grid-template-columns: 1fr;
    }
}

.card {
    background: white;
    padding: 1.5rem;
    border-radius: 1rem;
    text-align: center;
    border: 1px solid #ebebeb;
}

.icon {
    font-size: 2rem;
}

.card :deep(.card-image) {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 8px;
}

.card h3 {
    margin-bottom: var(--space-2);
}

.card p {
    color: #718096;
    font-size: 0.95rem;
}
</style>