<template>
    <div class="download-form">
        <div class="input-wrapper">
            <span class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
            </span>
            <input
                v-model="url"
                type="url"
                :placeholder="$t('form.placeholder')"
                class="url-input"
                @keyup.enter="handleDownload"
            />
            <button
                class="download-btn"
                :disabled="!url || isLoading"
                @click="handleDownload"
            >
                <span v-if="isLoading" class="spinner"/>
                <template v-else>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span class="btn-text">{{ $t('form.download') }}</span>
                </template>
            </button>
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <div v-if="result" class="result">
            <p>✅ {{ $t('form.success') || 'Video ready for download!' }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
const {t} = useI18n()

const url = ref('')
const isLoading = ref(false)
const result = ref(false)
const error = ref('')

const handleDownload = async () => {
    if (!url.value) return

    error.value = ''
    isLoading.value = true
    result.value = false

    // Простая валидация URL
    try {
        const urlObj = new URL(url.value)
        if (!urlObj.protocol.startsWith('http')) {
            throw new Error('Invalid protocol')
        }
    } catch {
        error.value = t('form.errorInvalidUrl') || 'Ссылка недействительна. Попробуйте еще раз.'
        isLoading.value = false
        return
    }

    // Имитация запроса (потом заменишь на реальный API)
    await new Promise((r) => setTimeout(r, 1500))

    // Временно показываем ошибку для демо
    error.value = t('form.errorInvalidUrl') || 'Ссылка недействительна. Попробуйте еще раз.'
    isLoading.value = false
}
</script>

<style scoped>
.download-form {
    max-width: 600px;
    margin: 0 auto;
}

.input-wrapper {
    display: flex;
    align-items: center;
    background: white;
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    border: 2px solid transparent;
    transition: border-color var(--transition-fast);
}

.input-wrapper:focus-within {
    border-color: white;
}

.input-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: var(--space-4);
    color: var(--color-text-light);
}

.url-input {
    flex: 1;
    font-family: monospace;
    letter-spacing: -0.5px;
    padding: var(--space-4) var(--space-3);
    border: none;
    font-size: var(--text-base);
    outline: none;
    background: transparent;
    min-width: 0;
    font-weight: bold;
}

.url-input::placeholder {
    color: var(--color-text-light);
    font-family: var(--font-sans);
}

.download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-6);
    background: #2ba546;
    color: white;
    border: none;
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition-fast);
    white-space: nowrap;
}

.download-btn:hover:not(:disabled) {
    background: #16ad37;
}

.download-btn:disabled {
    background: #4c716c;
    cursor: not-allowed;
}

.spinner {
    display: inline-block;
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.error-message {
    margin-top: var(--space-3);
    color: var(--color-error);
    font-size: var(--text-sm);
    text-align: center;
}

.result {
    margin-top: var(--space-4);
    padding: var(--space-4);
    background: rgba(72, 187, 120, 0.1);
    border-radius: var(--radius-md);
    color: var(--color-success);
    text-align: center;
}

/* Mobile */
@media (max-width: 540px) {
    .input-wrapper {
        flex-direction: column;
        border-radius: var(--radius-md);
    }

    .input-icon {
        display: none;
    }

    .url-input {
        width: 100%;
        padding: var(--space-4);
        text-align: center;
        border-bottom: 1px solid var(--color-border);
    }

    .download-btn {
        width: 100%;
        padding: var(--space-4);
        border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }
}
</style>