<template>
    <section class="features">
        <div class="container">
            <h2>{{ title }}</h2>
            <div class="grid">
                <div v-for="(item, i) in items" :key="i" class="card">
                    <div class="icon">{{ item.icon || '✨' }}</div>
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
    padding-bottom: 3rem;
}

.features h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 1rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.card {
    background: white;
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: transform 0.2s;
}

.card:hover {
    transform: translateY(-4px);
}

.icon {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.card :deep(.card-image) {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 8px;
}

.card h3 {
    margin-bottom: 0.5rem;
}

.card p {
    color: #718096;
    font-size: 0.95rem;
}
</style>