<template>
    <div class="error-page">
        <div class="error-container">
            <div class="error-code">{{ error?.statusCode || 500 }}</div>

            <h1 class="error-title">{{ errorTitle }}</h1>
            <p class="error-description">{{ errorDescription }}</p>

            <div class="error-actions">
                <a href="/" class="error-link error-link--primary" @click.prevent="handleBack">
                    {{ t('errors.backHome') }}
                </a>
                <a
                    v-if="error?.statusCode === 500"
                    href="#"
                    class="error-link error-link--secondary"
                    @click.prevent="handleRetry"
                >
                    {{ t('errors.retry') }}
                </a>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()

const errorTitle = computed(() => {
    const code = props.error?.statusCode
    if (code === 404) return t('errors.404.title')
    return t('errors.500.title')
})

const errorDescription = computed(() => {
    const code = props.error?.statusCode
    if (code === 404) return t('errors.404.description')
    return t('errors.500.description')
})



const handleBack = () => {
    clearError({ redirect: '/' })
}

const handleRetry = () => {
    clearError()
    window.location.reload()
}

useSeoMeta({
    title: () => `${props.error?.statusCode || 500} - ${errorTitle.value}`,
    robots: 'noindex, nofollow',
})
</script>

<style scoped>
.error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    background: var(--color-bg);
}

.error-container {
    text-align: center;
    max-width: 500px;
}

.error-code {
    font-size: clamp(6rem, 20vw, 10rem);
    font-weight: 800;
    line-height: var(--leading-none);
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: 0.9;
    margin-bottom: var(--space-4);
}

.error-title {
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: var(--font-bold);
    color: var(--color-text);
}

.error-description {
    font-size: var(--text-base);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-1);
    line-height: var(--leading-relaxed);
}

.error-actions {
    display: flex;
    gap: var(--space-6);
    justify-content: center;
    flex-wrap: wrap;
}

.error-link {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    transition: color var(--transition-base);
}

.error-link--primary {
    color: var(--color-primary);
}

.error-link--primary:hover {
    color: var(--color-primary-dark);
}

.error-link--secondary {
    color: var(--color-text-light);
}

.error-link--secondary:hover {
    color: var(--color-text);
}

@media (max-width: 480px) {
    .error-actions {
        flex-direction: column;
        gap: var(--space-3);
    }
}
</style>