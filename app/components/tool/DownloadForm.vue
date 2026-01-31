<template>
    <div class="download-form">
        <div class="input-wrapper">
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
                <span v-if="isLoading" class="spinner" />
                <span v-else>{{ $t('form.download') }}</span>
            </button>
        </div>
        <p class="hint">{{ $t('form.supported') }}: MP4, MP3, WebM</p>

        <div v-if="result" class="result">
            <p>✅ {{ $t('form.success') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ platform: string }>()

const url = ref('')
const isLoading = ref(false)
const result = ref(false)

const handleDownload = async () => {
    if (!url.value) return
    isLoading.value = true
    result.value = false

    // Имитация запроса (потом заменишь на реальный API)
    await new Promise((r) => setTimeout(r, 1500))

    result.value = true
    isLoading.value = false
}
</script>

<style scoped>
.download-form {
    max-width: 550px;
    margin: 0 auto;
}

.input-wrapper {
    display: flex;
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.url-input {
    flex: 1;
    padding: 1rem 1.25rem;
    border: none;
    font-size: 1rem;
    outline: none;
}

.download-btn {
    padding: 1rem 1.5rem;
    background: #48bb78;
    color: white;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.download-btn:hover:not(:disabled) {
    background: #38a169;
}

.download-btn:disabled {
    background: #a0aec0;
    cursor: not-allowed;
}

.spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.hint {
    margin-top: 1rem;
    font-size: 0.875rem;
    opacity: 0.8;
}

.result {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 0.5rem;
}
</style>