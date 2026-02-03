<template>
    <div class="error-page">
        <div class="error-container">
            <div class="error-code">{{ error?.statusCode || 500 }}</div>

            <h1 class="error-title">{{ errorTitle }}</h1>
            <p class="error-description">{{ errorDescription }}</p>

            <div class="error-actions">
                <a href="/" class="error-link error-link--primary" @click.prevent="handleBack">
                    {{ backHomeText }}
                </a>
                <a
                    v-if="error?.statusCode === 500"
                    href="#"
                    class="error-link error-link--secondary"
                    @click.prevent="handleRetry"
                >
                    {{ retryText }}
                </a>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

// Fallback тексты если i18n не загрузился
const fallbacks = {
    backHome: 'Back to Home',
    retry: 'Try again',
    404: { title: 'Page Not Found', description: 'The page you are looking for does not exist.' },
    500: { title: 'Server Error', description: 'Something went wrong. Please try again later.' }
}

// Безопасный доступ к i18n
const i18n = tryUseI18n()
const t = i18n?.t ?? (() => null)

const code = computed(() => props.error?.statusCode || 500)
const is404 = computed(() => code.value === 404)

const errorTitle = computed(() => {
    const key = is404.value ? 'errors.404.title' : 'errors.500.title'
    return t(key) ?? (is404.value ? fallbacks[404].title : fallbacks[500].title)
})

const errorDescription = computed(() => {
    const key = is404.value ? 'errors.404.description' : 'errors.500.description'
    return t(key) ?? (is404.value ? fallbacks[404].description : fallbacks[500].description)
})

const backHomeText = computed(() => t('errors.backHome') ?? fallbacks.backHome)
const retryText = computed(() => t('errors.retry') ?? fallbacks.retry)

const handleBack = () => clearError({ redirect: '/' })
const handleRetry = () => {
    clearError()
    window.location.reload()
}

useSeoMeta({
    title: () => `${code.value} - ${errorTitle.value}`,
    robots: 'noindex, nofollow',
})

function tryUseI18n() {
    try {
        return useI18n()
    } catch {
        return null
    }
}
</script>

<style scoped>
.error-page {
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    background: var(--color-bg);
    font-family: var(--font-sans);
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
    margin: 0;
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
    text-decoration: none;
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