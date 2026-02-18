<template>
    <header class="header">
        <div class="container header__inner">
            <NuxtLink :to="localePath('/')" class="header__logo">
                <NuxtPicture
                    src="/images/logo.png"
                    alt="Video Downloader"
                    width="70"
                    height="70"
                    sizes="100vw sm:70px"
                    quality="50"
                    loading="eager"
                    preload
                    :img-attrs="{
                        class: 'header__logo-img',
                        fetchpriority: 'high'
                    }"
                />
                <span class="header__logo-text">aDownloader</span>
            </NuxtLink>

            <div class="lang" ref="langRef">
                <button class="lang__toggle" @click="isOpen = !isOpen">
                    <img
                        v-if="currentLang"
                        :src="getFlagUrl(currentLang.country, 40)"
                        :alt="currentLang.name"
                        class="lang__toggle-flag"
                        width="20"
                        height="15"
                    />
                    <span class="lang__code">{{ currentLang?.code.toUpperCase() }}</span>
                    <svg
                        class="lang__chevron"
                        :class="{ 'lang__chevron--open': isOpen }"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                    >
                        <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>

                <div
                    class="lang__dropdown"
                    :class="{ 'lang__dropdown--open': isOpen }"
                >
                    <div class="lang__search-wrap">
                        <div class="lang__search-box">
                            <svg
                                class="lang__search-icon"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                ref="searchInput"
                                v-model="search"
                                type="text"
                                class="lang__search"
                                :placeholder="$t('header.search')"
                                @keydown.esc="isOpen = false"
                            />
                        </div>
                    </div>

                    <div
                        class="lang__grid"
                        :class="`lang__grid--cols-${columns}`"
                    >
                        <div v-if="!filteredLangs.length" class="lang__empty">
                            {{ $t('header.noResults', 'No results') }}
                        </div>
                        <NuxtLink
                            v-for="lang in filteredLangs"
                            :key="lang.code"
                            :to="switchLocalePath(lang.code)"
                            class="lang__option"
                            :class="{ 'lang__option--active': lang.code === currentLang?.code }"
                            @click.prevent="switchLang(lang.code)"
                        >
                            <img
                                :src="getFlagUrl(lang.country, 40)"
                                :alt="lang.name"
                                class="lang__option-flag"
                                width="20"
                                height="15"
                                loading="lazy"
                            />
                            <span class="lang__option-name">{{ lang.name }}</span>
                            <span class="lang__option-code">{{ lang.code.toUpperCase() }}</span>
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { languages, getFlagUrl } from '@/../config/languages'

const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const { locale } = useI18n()
const router = useRouter()

const isOpen = ref(false)
const search = ref('')
const langRef = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const currentLang = computed(() =>
    languages.find(l => l.code === locale.value)
)

const filteredLangs = computed(() => {
    const q = search.value.toLowerCase().trim()
    if (!q) return languages
    return languages.filter(l =>
        l.name.toLowerCase().includes(q)
        || l.code.toLowerCase().includes(q)
        || l.iso.toLowerCase().includes(q)
    )
})

const columns = computed(() => {
    const count = filteredLangs.value.length
    if (count >= 9) return 3
    if (count >= 6) return 2
    return 1
})

function switchLang(code: string) {
    isOpen.value = false
    search.value = ''
    if (code !== locale.value) {
        router.push(switchLocalePath(code))
    }
}

watch(isOpen, (val) => {
    if (val) {
        nextTick(() => searchInput.value?.focus())
    } else {
        search.value = ''
    }
})

function onClickOutside(e: MouseEvent) {
    if (langRef.value && !langRef.value.contains(e.target as Node)) {
        isOpen.value = false
    }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.header {
    background: var(--color-bg-white);
    border-bottom: 1px solid var(--color-border);
}

.header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) var(--container-padding);
    gap: var(--space-8);
}

.header__logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    text-decoration: none;
}

.header__logo :deep(.header__logo-img) {
    width: 70px;
    height: 70px;
    object-fit: contain;
}

.header__logo-text {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    color: var(--color-text);
}

/* ── Language Selector ── */
.lang {
    position: relative;
}

.lang__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--color-bg-light, #f5f5f5);
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text);
    font-size: var(--text-sm);
    font-weight: var(--font-semibold, 600);
    line-height: 1;
}

.lang__toggle:hover {
    background: var(--color-bg-hover, #ebebeb);
    border-color: var(--color-border-hover, #ccc);
}

.lang__toggle-flag {
    width: 20px;
    height: 15px;
    object-fit: cover;
    border-radius: 2px;
    flex-shrink: 0;
}

.lang__code {
    letter-spacing: 0.03em;
    line-height: 1;
}

.lang__chevron {
    transition: transform 0.2s ease;
    opacity: 0.5;
    display: flex;
    align-items: center;
}

.lang__chevron--open {
    transform: rotate(180deg);
}

/* ── Dropdown ── */
.lang__dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 220px;
    background: var(--color-bg-dark, #1e1e2e);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    z-index: 1000;

    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-6px);
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
}

.lang__dropdown--open {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}

/* ── Search ── */
.lang__search-wrap {
    padding: 10px 10px 6px;
}

.lang__search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0 10px;
    transition: border-color 0.2s, background 0.2s;
}

.lang__search-box:focus-within {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.09);
}

.lang__search-icon {
    color: rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
}

.lang__search {
    flex: 1;
    padding: 8px 0;
    background: none;
    border: none;
    color: #fff;
    font-size: 13px;
    outline: none;
    min-width: 0;
}

.lang__search::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.lang__search:focus {
    outline: none;
}

/* ── Grid ── */
.lang__grid {
    display: grid;
    gap: 4px;
    padding: 4px 6px 6px;
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

.lang__grid--cols-1 {
    grid-template-columns: 1fr;
}

.lang__grid--cols-2 {
    grid-template-columns: 1fr 1fr;
}

.lang__grid--cols-3 {
    grid-template-columns: 1fr 1fr 1fr;
}

.lang__grid::-webkit-scrollbar {
    width: 5px;
}

.lang__grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    margin: 4px 0;
}

.lang__grid::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 10px;
}

.lang__grid::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.22);
}

.lang__empty {
    padding: 12px;
    text-align: center;
    color: rgba(255, 255, 255, 0.35);
    font-size: 13px;
    grid-column: 1 / -1;
}

.lang__option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    background: none;
    border: none;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.75);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    text-decoration: none;
}

.lang__option:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.lang__option--active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.lang__option-flag {
    width: 20px;
    height: 15px;
    object-fit: cover;
    border-radius: 2px;
    flex-shrink: 0;
}

.lang__option-name {
    flex: 1;
    text-align: left;
}

.lang__option-code {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 6px;
    border-radius: 4px;
}

/* ── Responsive ── */
@media (max-width: 640px) {
    .header__logo-text {
        font-size: var(--text-base);
    }

    .lang__toggle {
        padding: 6px 10px;
    }

    .lang__grid--cols-3 {
        grid-template-columns: 1fr 1fr;
    }
}

@media (max-width: 380px) {
    .lang__grid--cols-3,
    .lang__grid--cols-2 {
        grid-template-columns: 1fr;
    }
}
</style>