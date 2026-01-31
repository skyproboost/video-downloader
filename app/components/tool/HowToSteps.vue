<template>
    <section class="how-to">
        <div class="container">
            <h2>{{ title }}</h2>
            <div class="steps">
                <div v-for="(step, i) in steps" :key="i" class="step">
                    <div class="step-num">{{ i + 1 }}</div>
                    <div v-if="step.image" class="step-image-wrapper">
                        <NuxtPicture
                            :src="step.image"
                            :alt="step.imageAlt || step.title"
                            :img-attrs="{ class: 'step-image' }"
                            sizes="xs:280px sm:280px md:280px"
                            format="avif,webp"
                            quality="80"
                            width="280"
                            height="180"
                            loading="eager"
                        />
                    </div>
                    <h3>{{ step.title }}</h3>
                    <p>{{ step.description }}</p>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
defineProps<{
    title: string
    steps: { title: string; description: string; image?: string }[]
}>()
</script>

<style scoped>
.how-to {
    padding: 4rem 0;
    background: #f7fafc;
}

.how-to h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 3rem;
}

.steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 2rem;
    max-width: 900px;
    margin: 0 auto;
}

.step {
    text-align: center;
}

.step-num {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 auto 1rem;
}

.step-image-wrapper {
    width: 100%;
    max-width: 280px;
    margin: 0 auto 1rem;
    aspect-ratio: 280 / 180;
    background: #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}

.step :deep(.step-image) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.step h3 {
    margin-bottom: 0.5rem;
}

.step p {
    color: #718096;
    font-size: 0.95rem;
}
</style>