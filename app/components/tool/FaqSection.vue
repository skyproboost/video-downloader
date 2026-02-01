<template>
    <section class="faq">
        <div class="container">
            <h2 v-text="$t('faq.title')"></h2>
            <div class="faq-list">
                <div
                    v-for="(item, i) in items"
                    :key="i"
                    class="faq-item"
                    :class="{ open: activeIndex === i }"
                >
                    <button class="question" @click="toggle(i)">
                        <span v-text="item.question"></span>
                        <svg
                            class="icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M6 9L12 15L18 9"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
                    <div class="answer-wrapper">
                        <div class="answer">
                            <div class="answer-content" v-text="item.answer"></div>
                        </div>
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
    padding-bottom: 3rem;
    background: #f7fafc;
}

.faq h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 1rem;
}

.faq-list {
    max-width: 700px;
    margin: 0 auto;
}

.faq-item {
    background: white;
    border-radius: 0.75rem;
    margin-bottom: 0.5rem;
    border: 1px solid transparent;
    transition: border-color 0.3s ease;
}

.faq-item.open {
    border-color: #667eea;
}

.question {
    width: 100%;
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    text-align: left;
    color: inherit;
}

.question:hover .icon {
    color: #667eea;
}

.icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    color: #718096;
    transition: transform 0.3s ease, color 0.3s ease;
}

.faq-item.open .icon {
    transform: rotate(180deg);
    color: #667eea;
}

.answer-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease;
}

.faq-item.open .answer-wrapper {
    grid-template-rows: 1fr;
}

.answer {
    overflow: hidden;
}

.answer-content {
    padding: 0 1.25rem 1.25rem;
    color: #718096;
    line-height: 1.7;
}
</style>