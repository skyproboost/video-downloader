<template>
    <section class="features">
        <div class="container">
            <h2>{{ title }}</h2>
            <div class="grid">
                <div v-for="(item, i) in items" :key="i" class="card">
                    <div v-if="item.image" class="card-image-wrapper">
                        <NuxtPicture
                            :src="item.image"
                            :alt="item.imageAlt || item.title"
                            :img-attrs="{ class: 'card-image' }"
                            sizes="48px"
                            format="avif,webp"
                            quality="80"
                            width="48"
                            height="48"
                            loading="eager"
                            densities="x1 x2"
                        />
                    </div>
                    <div v-else class="icon">{{ item.icon || '✨' }}</div>
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
    padding: 4rem 0;
}

.features h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 3rem;
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

.card-image-wrapper {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    background: #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
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