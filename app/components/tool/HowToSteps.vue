<template>
    <section v-if="blocks?.length" class="how-to">
        <div class="container">
            <h1 v-if="title" class="how-to__title">{{ title }}</h1>

            <div class="how-to__blocks">
                <article
                    v-for="(block, i) in blocks"
                    :key="i"
                    class="how-to-block"
                >
                    <!-- Картинка -->
                    <div v-if="block.image" class="how-to-block__image-wrapper">
                        <NuxtPicture
                            :src="block.image"
                            :alt="block.imageAlt || block.title"
                            :img-attrs="{ class: 'how-to-block__image', fetchpriority: 'low' }"
                            sizes="(max-width: 767px) 100vw, 320px"
                            quality="70"
                            width="320"
                            height="240"
                            loading="lazy"
                            placeholder
                        />
                    </div>

                    <!-- Контент -->
                    <div class="how-to-block__content">
                        <h3 class="how-to-block__title">{{ block.title }}</h3>
                        <div
                            class="how-to-block__text"
                            v-html="renderContent(block.content)"
                        ></div>
                    </div>
                </article>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
interface HowToBlock {
    title: string
    content: string
    image?: string
    imageAlt?: string
}

defineProps<{
    title?: string
    blocks?: HowToBlock[]
}>()

// Парсим текст в HTML (нумерованные/маркированные списки + параграфы)
function renderContent(text: string): string {
    if (!text) return ''

    const lines = text.split('\n').filter(line => line.trim())
    const result: string[] = []
    let inList = false
    let listType: 'ol' | 'ul' | null = null

    for (const line of lines) {
        const trimmed = line.trim()

        // Нумерованный список: 1. text или 1) text
        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
        // Маркированный список: - text или * text или • text
        const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/)

        if (numberedMatch) {
            if (!inList || listType !== 'ol') {
                if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>')
                result.push('<ol>')
                inList = true
                listType = 'ol'
            }
            result.push(`<li>${escapeHtml(numberedMatch[2])}</li>`)
        } else if (bulletMatch) {
            if (!inList || listType !== 'ul') {
                if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>')
                result.push('<ul>')
                inList = true
                listType = 'ul'
            }
            result.push(`<li>${escapeHtml(bulletMatch[1])}</li>`)
        } else {
            // Обычный текст — закрываем список если был
            if (inList) {
                result.push(listType === 'ol' ? '</ol>' : '</ul>')
                inList = false
                listType = null
            }
            result.push(`<p>${escapeHtml(trimmed)}</p>`)
        }
    }

    // Закрываем список в конце если нужно
    if (inList) {
        result.push(listType === 'ol' ? '</ol>' : '</ul>')
    }

    return result.join('')
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
</script>

<style scoped>
.how-to {
    padding: 0 0 var(--section-padding-lg) 0;
    background: var(--color-bg);
}

.how-to__title {
    text-align: center;
    font-size: var(--fs-section-title);
    font-weight: var(--font-bold);
    color: var(--color-text);
    margin-bottom: var(--space-4);
    margin-top: var(--space-12);
}

.how-to__blocks {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.how-to-block {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
    padding: var(--space-4);
    background: var(--color-bg-white);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border);
}

.how-to-block__image-wrapper {
    flex-shrink: 0;
    width: 320px;
    aspect-ratio: 4 / 3;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-bg);
}

.how-to-block :deep(.how-to-block__image) {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.how-to-block__content {
    flex: 1;
    min-width: 0;
}

.how-to-block__title {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    color: var(--color-text);
    margin: 0 0 var(--space-2);
    line-height: var(--leading-snug);
}

.how-to-block__text {
    font-size: var(--text-base);
    color: var(--color-text-muted);
    line-height: var(--leading-relaxed);
}

.how-to-block__text :deep(ol),
.how-to-block__text :deep(ul) {
    margin: 0;
    padding-left: var(--space-5);
}

.how-to-block__text :deep(li:last-child) {
    margin-bottom: 0;
}

.how-to-block__text :deep(p) {
    margin: 0 0 var(--space-3);
}

.how-to-block__text :deep(p:last-child) {
    margin-bottom: 0;
}

.how-to-block__text :deep(a) {
    color: var(--color-primary);
    text-decoration: underline;
}

.how-to-block__text :deep(a:hover) {
    color: var(--color-primary-dark);
}

.how-to-block__text :deep(strong) {
    font-weight: var(--font-semibold);
    color: var(--color-text);
}

/* Mobile */
@media (max-width: 767px) {
    .how-to-block {
        flex-direction: column;
    }

    .how-to-block__image-wrapper {
        width: 100%;
    }

    .how-to-block__title {
        font-size: var(--text-lg);
    }

    .how-to-block__text {
        font-size: var(--text-sm);
    }

    .how-to__title {
        margin-top: var(--space-6);
    }
}
</style>