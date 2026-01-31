<template>
    <section class="faq">
        <div class="container">
            <h2>{{ $t('faq.title') }}</h2>
            <div class="faq-list">
                <div
                    v-for="(item, i) in items"
                    :key="i"
                    class="faq-item"
                    :class="{ open: activeIndex === i }"
                >
                    <button class="question" @click="toggle(i)">
                        <span>{{ item.question }}</span>
                        <span class="icon">{{ activeIndex === i ? '−' : '+' }}</span>
                    </button>
                    <div v-if="activeIndex === i" class="answer">
                        {{ item.answer }}
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
defineProps<{
    items: { question: string; answer: string }[]
}>()

const activeIndex = ref<number | null>(null)
const toggle = (i: number) => {
    activeIndex.value = activeIndex.value === i ? null : i
}
</script>

<style scoped>
.faq {
    padding: 4rem 0;
    background: #f7fafc;
}

.faq h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 3rem;
}

.faq-list {
    max-width: 700px;
    margin: 0 auto;
}

.faq-item {
    background: white;
    border-radius: 0.75rem;
    margin-bottom: 1rem;
    overflow: hidden;
}

.question {
    width: 100%;
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    text-align: left;
}

.icon {
    font-size: 1.5rem;
    color: #667eea;
}

.answer {
    padding: 0 1.25rem 1.25rem;
    color: #718096;
    line-height: 1.7;
}
</style>