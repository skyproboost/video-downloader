<template>
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <!-- Левая часть: бренд -->
                <div class="footer-brand">
                    <div class="logo">
                        <span class="logo-icon">📥</span>
                        <span class="logo-text">Video Downloader</span>
                    </div>
                    <p class="copyright">© {{ new Date().getFullYear() }} Video Downloader. {{ $t('footer.rights') }}</p>
                </div>

                <!-- Правая часть: ссылки по платформам -->
                <div v-if="footerLinks?.length" class="footer-links">
                    <div
                        v-for="group in footerLinks"
                        :key="group.platformId"
                        class="link-group"
                    >
                        <ul class="group-links">
                            <li v-for="link in group.links" :key="link.slug">
                                <NuxtLink :to="localePath(`/${link.slug}`)">
                                    {{ link.text }}
                                </NuxtLink>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
const { locale } = useI18n()
const localePath = useLocalePath()

const { data: footerLinks } = await useFetch('/api/footer-links', {
    query: { locale },
})
</script>

<style scoped>
.footer {
    background: var(--color-bg-dark);
    color: var(--color-text-inverse);
    padding: var(--space-6) 0;
    margin-top: auto;
}

.footer-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-8);
}

/* Бренд */
.footer-brand {
    flex-shrink: 0;
    max-width: 16rem;
}

.logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
}

.logo-icon {
    font-size: var(--text-xl);
}

.logo-text {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-primary);
}

.description {
    color: var(--color-text-lighter);
    font-size: var(--text-sm);
    line-height: 1.5;
    margin-bottom: var(--space-2);
}

.copyright {
    color: var(--color-text-light);
    font-size: var(--text-xs);
}

/* Ссылки */
.footer-links {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-4);
    justify-content: flex-end;
    text-align: right;
}

.link-group {
    min-width: 4rem;
}

.group-links {
    list-style: none;
}

.group-links li {
    margin-bottom: var(--space-1);
}

.group-links li:last-child {
    margin-bottom: 0;
}

.group-links a {
    color: var(--color-text-lighter);
    font-size: var(--text-sm);
    transition: color var(--transition-fast);
}

.group-links a:hover {
    color: var(--color-primary);
}

/* Tablet & Mobile */
@media (max-width: 768px) {
    .footer {
        padding: var(--space-6) 0;
    }

    .footer-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--space-6);
    }

    .footer-brand {
        max-width: 100%;
        order: 2;
    }

    .footer-links {
        order: 1;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-5) var(--space-6);
        width: 100%;
        max-width: 20rem;
    }

    .link-group {
        min-width: unset;
        text-align: center;
    }

    .logo {
        justify-content: center;
    }
}

/* Mobile small */
@media (max-width: 320px) {
    .footer-links {
        grid-template-columns: 1fr;
        gap: var(--space-5);
        max-width: 12rem;
    }
}
</style>