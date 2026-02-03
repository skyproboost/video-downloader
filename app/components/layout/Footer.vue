<template>
    <footer class="footer">
        <div class="container">
            <div class="footer__content">
                <!-- Бренд -->
                <div class="footer__brand">
                    <span class="footer__logo">Video Downloader</span>
                    <p class="footer__copyright">
                        © {{ new Date().getFullYear() }} Video Downloader. {{ $t('footer.rights') }}
                    </p>
                </div>

                <!-- Ссылки по группам -->
                <div v-if="footerLinks?.length" class="footer__links">
                    <div
                        v-for="group in footerLinks"
                        :key="group.platformId"
                        class="footer__group"
                    >
                        <NuxtLink
                            v-for="link in group.links"
                            :key="link.slug"
                            :to="localePath(`/${link.slug}`)"
                            class="footer__link"
                        >
                            {{ link.text }}
                        </NuxtLink>
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

.footer__content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

/* Brand */
.footer__brand {
    flex-shrink: 0;
}

.footer__logo {
    display: block;
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--color-primary);
}

.footer__copyright {
    color: var(--color-text-light);
    font-size: var(--text-xs);
}

/* Links */
.footer__links {
    display: flex;
    gap: var(--space-8);
}

.footer__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.footer__link {
    color: var(--color-text-lighter);
    font-size: var(--text-sm);
    transition: color var(--transition-fast);
}

.footer__link:hover {
    color: var(--color-primary);
}

/* Mobile */
@media (max-width: 768px) {
    .footer__content {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .footer__brand {
        margin-bottom: var(--space-6);
    }

    .footer__links {
        display: grid;
        grid-template-columns: repeat(4, auto);
        gap: var(--space-4) var(--space-8);
        justify-content: center;
    }

    .footer__group {
        align-items: flex-start;
    }
}

/* Маленькие экраны - 2 колонки */
@media (max-width: 480px) {
    .footer__links {
        grid-template-columns: repeat(4, auto);
    }
}
</style>