<template>
    <div class="download-form">
        <div class="input-wrapper">
            <span class="input-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M12.6666 16.6667V14.6667M14.6666 12.6667H16.6666M3.71658 7.95972L2.30237 9.37393C0.740271 10.936 0.741283 13.4684 2.30338 15.0305C3.86548 16.5926 6.39743 16.593 7.95952 15.0309L9.37418 13.6165M2.66663 4.66675H0.666626M4.66663 0.666748V2.66675M7.95959 3.71719L9.37381 2.30298C10.9359 0.740881 13.4683 0.740428 15.0304 2.30253C16.5925 3.86462 16.592 6.39755 15.0299 7.95965L13.6158 9.37382"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </span>
            <input
                v-model="url"
                type="url"
                :placeholder="$t('form.placeholder')"
                class="url-input"
                @keyup.enter="handleDownload"
                @input="clearError"
            />
            <button
                class="download-btn"
                :disabled="isButtonDisabled"
                @click="handleDownload"
            >
                <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span v-if="loading" class="spinner" />
                <span class="btn-text">{{ loading ? $t('form.loading') : $t('form.download') }}</span>
            </button>
        </div>

        <Transition name="fade">
            <p v-if="error" class="error-message">{{ error }}</p>
        </Transition>

        <Transition name="fade">
            <div v-if="showSkeleton || videoData" class="result-card">

                <Transition name="fade">
                    <div v-if="saving" class="saving-overlay">
                        <div class="saving-spinner" />
                    </div>
                </Transition>

                <div class="result-preview">
                    <div v-if="showSkeleton" class="shimmer-block" />
                    <img
                        v-else-if="videoData?.thumbnail"
                        :src="videoData.thumbnail"
                        :alt="videoData.title || 'Video thumbnail'"
                        class="preview-image"
                    />
                    <div v-else class="preview-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </div>
                </div>

                <div class="result-info">
                    <template v-if="showSkeleton">
                        <div class="shimmer-line wide" />
                        <div class="shimmer-line narrow" />
                        <div class="shimmer-btn" />
                    </template>
                    <template v-else-if="videoData">
                        <p v-if="videoData.title" class="result-title">{{ videoData.title }}</p>
                        <div class="result-meta">
                            <span v-if="videoData.duration" class="meta-tag">
                                ⏱ {{ formatDuration(videoData.duration) }}
                            </span>
                            <span v-if="videoData.ext" class="meta-tag">
                                {{ videoData.ext.toUpperCase() }}
                            </span>
                            <span v-if="videoData.main_resolution" class="meta-tag">
                                {{ String(videoData.main_resolution).toUpperCase() + 'p' }}
                            </span>
                        </div>
                        <button
                            class="save-btn"
                            :disabled="saving"
                            @click="handleSave"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                 stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            {{ $t('form.saveFile') }}
                        </button>
                    </template>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
interface VideoResponse {
    url: string
    title?: string
    duration?: number
    thumbnail?: string
    ext?: string
    main_resolution?: string | number
    http_headers?: Record<string, string>
}

const { t } = useI18n()
const config = useRuntimeConfig()

const url = ref('')
const isCooldown = ref(false)
const loading = ref(false)
const saving = ref(false)
const showSkeleton = ref(false)
const error = ref('')
const videoData = ref<VideoResponse | null>(null)

const URL_MIN_LENGTH = 10
const URL_MAX_LENGTH = 2048
const MIN_COOLDOWN = 2000
const MAX_SUBMITS = 5
const SUBMIT_WINDOW = 60_000
const SKELETON_DELAY = 400
const MIN_BTN_DISABLED = 1000
const SAVE_RESET_DELAY = 2500

const URL_REGEX = /^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+([\/\w\-._~:?#\[\]@!$&'()*+,;=%]*)?$/
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']
const BLOCKED_PATTERNS = [
    /^(\d{1,3}\.){3}\d{1,3}$/,
    /^\[?[0-9a-f:]+\]?$/i,
    /\.(local|internal|test|invalid)$/,
]
const DANGEROUS_PATTERNS = [
    /javascript:/i, /data:/i, /vbscript:/i,
    /<script/i, /%3Cscript/i, /\.\.\//,  /\/\/\//,
]

let submitTimestamps: number[] = []
let skeletonTimer: ReturnType<typeof setTimeout> | null = null
let cooldownStart = 0

async function releaseCooldown() {
    const elapsed = Date.now() - cooldownStart
    if (elapsed < MIN_BTN_DISABLED) {
        await new Promise(r => setTimeout(r, MIN_BTN_DISABLED - elapsed))
    }
    isCooldown.value = false
}

const apiBase = computed(() =>
    (config.public.apiBaseUrl as string) || 'https://api.adownloader.org'
)

const isUrlValid = computed(() => validateUrl(url.value.trim()) === null)
const isButtonDisabled = computed(() => !isUrlValid.value || isCooldown.value || loading.value)

const downloadUrl = computed(() => {
    if (!videoData.value?.url) return ''
    const params = new URLSearchParams({
        url: videoData.value.url,
        filename: videoData.value.title || 'video',
    })
    return `/api/download?${params}`
})

function validateUrl(raw: string): string | null {
    const trimmed = raw.trim()
    if (!trimmed || trimmed.length < URL_MIN_LENGTH) return 'empty'
    if (trimmed.length > URL_MAX_LENGTH) return t('error.invalidUrl')
    if (DANGEROUS_PATTERNS.some(p => p.test(trimmed))) return t('error.invalidUrl')
    if (!URL_REGEX.test(trimmed)) return t('error.invalidUrl')
    try {
        const { hostname, protocol } = new URL(trimmed)
        if (!protocol.startsWith('http')) return t('error.invalidUrl')
        const host = hostname.replace(/^www\./, '')
        if (BLOCKED_HOSTS.includes(host)) return t('error.invalidUrl')
        if (BLOCKED_PATTERNS.some(p => p.test(host))) return t('error.invalidUrl')
        if (!host.includes('.')) return t('error.invalidUrl')
    } catch { return t('error.invalidUrl') }
    return null
}

function checkRateLimit(): string | null {
    const now = Date.now()
    submitTimestamps = submitTimestamps.filter(ts => now - ts < SUBMIT_WINDOW)
    if (submitTimestamps.length >= MAX_SUBMITS) return t('error.tooManyRequests')
    return null
}

function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

function clearError() {
    if (error.value) error.value = ''
}

function cancelSkeletonTimer() {
    if (skeletonTimer) {
        clearTimeout(skeletonTimer)
        skeletonTimer = null
    }
}

function resetToInitial() {
    videoData.value = null
    url.value = ''
    error.value = ''
    saving.value = false
    showSkeleton.value = false
}

async function handleSave() {
    if (saving.value || !videoData.value?.url) return

    saving.value = true
    error.value = ''

    // Проверяем через лёгкий эндпоинт — можно ли проксировать
    let useProxy = false
    let checkReason = ''

    if (downloadUrl.value) {
        try {
            const check = await $fetch<{ proxy: boolean; reason?: string }>('/api/download-check', {
                query: { url: videoData.value.url },
            })
            useProxy = check.proxy === true
            if (!useProxy) checkReason = check.reason || ''
        } catch {
            useProxy = false
        }
    }

    try {
        if (useProxy) {
            // Пробуем через прокси — сначала проверяем что ответ валидный
            const resp = await fetch(downloadUrl.value)

            const ct = resp.headers.get('content-type') || ''
            const isMedia = ct.startsWith('video/') || ct.startsWith('audio/') || ct === 'application/octet-stream'

            if (resp.ok && isMedia) {
                // Прокси отдал медиафайл — скачиваем через blob
                const blob = await resp.blob()
                const blobUrl = URL.createObjectURL(blob)
                const ext = ct.includes('audio') ? 'mp3' : 'mp4'
                const name = videoData.value.title || 'video'
                const a = document.createElement('a')
                a.href = blobUrl
                a.download = `${name}.${ext}`
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                requestAnimationFrame(() => {
                    document.body.removeChild(a)
                    URL.revokeObjectURL(blobUrl)
                })
            } else {
                // Прокси вернул ошибку — фоллбэк на вкладку
                window.open(videoData.value.url, '_blank', 'noopener,noreferrer')
            }
        } else {
            // Домен не в белом списке — открываем напрямую
            window.open(videoData.value.url, '_blank', 'noopener,noreferrer')
        }
    } catch {
        // Сеть упала — фоллбэк на вкладку
        if (videoData.value?.url) {
            window.open(videoData.value.url, '_blank', 'noopener,noreferrer')
        } else {
            saving.value = false
            error.value = t('error.unknown')
            return
        }
    }

    // Ждём чтобы браузер подхватил скачивание, сбрасываем к начальному
    await new Promise(r => setTimeout(r, SAVE_RESET_DELAY))
    resetToInitial()
}

const handleDownload = async () => {
    if (isCooldown.value || !isUrlValid.value || loading.value) return

    const trimmed = url.value.trim()
    url.value = trimmed

    const ratErr = checkRateLimit()
    if (ratErr) { error.value = ratErr; return }

    const valErr = validateUrl(trimmed)
    if (valErr && valErr !== 'empty') { error.value = valErr; return }

    submitTimestamps.push(Date.now())
    videoData.value = null
    isCooldown.value = true
    cooldownStart = Date.now()

    if (error.value) {
        error.value = ''
        await new Promise(r => setTimeout(r, 400))
    }
    await new Promise(r => setTimeout(r, 100))

    loading.value = true

    cancelSkeletonTimer()
    skeletonTimer = setTimeout(() => {
        if (loading.value) {
            showSkeleton.value = true
        }
    }, SKELETON_DELAY)

    const startTime = Date.now()

    try {
        const data = await $fetch<VideoResponse>(`${apiBase.value}/api/get_download_link`, {
            method: 'GET',
            query: { url: trimmed },
        })

        if (!data?.url) {
            cancelSkeletonTimer()
            showSkeleton.value = false
            loading.value = false
            error.value = t('error.notFound')
            await releaseCooldown()
            return
        }

        videoData.value = data
        url.value = ''
    } catch (err: any) {
        cancelSkeletonTimer()
        showSkeleton.value = false
        loading.value = false
        const status = err?.response?.status ?? err?.statusCode
        if (status === 429) {
            error.value = t('error.tooManyRequests')
        } else if (status === 404) {
            error.value = t('error.notFound')
        } else if (status >= 500) {
            error.value = t('error.serverError')
        } else if (err instanceof TypeError) {
            error.value = t('error.network')
        } else {
            error.value = t('error.unknown')
        }
        await releaseCooldown()
        return
    }

    const elapsed = Date.now() - startTime
    if (showSkeleton.value) {
        const minShow = Math.max(MIN_COOLDOWN, 500)
        if (elapsed < minShow) {
            await new Promise(r => setTimeout(r, minShow - elapsed))
        }
    }

    cancelSkeletonTimer()
    showSkeleton.value = false
    loading.value = false
    await releaseCooldown()
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
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.error-message {
    margin-top: var(--space-6);
    color: #ff6565;
    font-size: var(--text-sm);
    font-weight: bold;
    text-align: center;
}

/* Карточка результата */
.result-card {
    margin-top: var(--space-6);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    overflow: hidden;
    position: relative;
}

/* Оверлей при сохранении */
.saving-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    border-radius: var(--radius-lg);
}

.saving-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255, 255, 255, 0.15);
    border-top-color: #2ba546;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}

.result-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 1;
    background: #15393382;
    overflow: hidden;
}

.preview-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.preview-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.2);
}

.result-info {
    padding: var(--space-4);
    min-height: 120px;
}

.result-title {
    font-size: var(--text-sm);
    color: var(--color-text-inverse);
    line-height: 1.4;
    margin-bottom: var(--space-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.result-meta {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
}

.meta-tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    font-size: 12px;
    color: var(--color-text-inverse-muted);
    font-weight: 500;
}

.save-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    background: #2ba546;
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition-fast);
    width: 100%;
    text-decoration: none;
}

.save-btn:hover:not(:disabled) {
    background: #16ad37;
}

.save-btn:disabled {
    background: #4c716c;
    cursor: not-allowed;
}

/* Shimmer loader */
.shimmer-block {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        110deg,
        rgba(255, 255, 255, 0.04) 30%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.04) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
}

.shimmer-line {
    border-radius: 7px;
    background: linear-gradient(
        110deg,
        rgba(255, 255, 255, 0.06) 30%,
        rgba(255, 255, 255, 0.12) 50%,
        rgba(255, 255, 255, 0.06) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
}

.shimmer-line.wide {
    width: 80%;
    height: 17px;
    margin-bottom: var(--space-3);
}
.shimmer-line.narrow {
    width: 40%;
    height: 22px;
    margin-bottom: var(--space-4);
}

.shimmer-btn {
    height: 44px;
    border-radius: var(--radius-md);
    background: linear-gradient(
        110deg,
        rgba(43, 165, 70, 0.2) 30%,
        rgba(43, 165, 70, 0.35) 50%,
        rgba(43, 165, 70, 0.2) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

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
        font-size: 16px;
        border-bottom: 1px solid var(--color-border);
    }

    .download-btn {
        width: 100%;
        padding: var(--space-2);
        border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }
}
</style>