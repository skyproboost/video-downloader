<template>
    <section class="faq">
        <div class="container">
            <h2 class="section__title">{{ $t('faq.title') }}</h2>
            <div class="faq__list">
                <div
                    v-for="(item, i) in items"
                    :key="i"
                    class="faq__item"
                    :class="{ 'is-open': activeIndex === i }"
                >
                    <button class="faq__question" @click="toggle(i)">
                        <span>{{ item.question }}</span>
                        <svg
                            class="faq__icon"
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
                    <div class="faq__answer-wrapper">
                        <div class="faq__answer">
                            <p class="faq__answer-content">{{ item.answer }}</p>
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
    padding-bottom: var(--section-padding-sm);
    background: var(--color-bg);
}

.faq__list {
    max-width: var(--container-max);
    margin: 0 auto;
}

.faq__item {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-2);
    border: 1px solid transparent;
    transition: border-color var(--transition-slow);
}

.faq__item.is-open {
    border-color: var(--color-accent);
}

.faq__question {
    width: 100%;
    padding: var(--space-5);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    text-align: left;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
}

.faq__question:hover .faq__icon {
    color: var(--color-accent);
}

.faq__icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    color: var(--color-text-light);
    transition: transform var(--transition-slow), color var(--transition-slow);
}

.faq__item.is-open .faq__icon {
    transform: rotate(180deg);
    color: var(--color-accent);
}

.faq__answer-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--transition-slow);
}

.faq__item.is-open .faq__answer-wrapper {
    grid-template-rows: 1fr;
}

.faq__answer {
    overflow: hidden;
}

.faq__answer-content {
    padding: 0 var(--space-5) var(--space-5);
    color: var(--color-text-light);
    line-height: var(--leading-loose);
}

@media (min-width: 768px) {
    .faq {
        padding-bottom: var(--section-padding-lg);
    }
}
</style>