<template>
    <footer class="footer">
        <div class="container __footer-inner">
            <div v-if="groupedLinks?.length" class="footer__links">
                <div
                    v-for="group in groupedLinks"
                    :key="group.platformId"
                    class="footer__group"
                >
                    <h3 class="footer__group-title">{{ group.platformName }}</h3>
                    <ul class="footer__list">
                        <li v-for="link in group.links" :key="link.slug">
                            <NuxtLink
                                :to="localePath(`/${link.slug}`)"
                                class="footer__link"
                            >
                                {{ link.text }}
                            </NuxtLink>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="footer__bottom">
                <p class="footer__description">{{ $t('footer.description') }}</p>
                <p class="footer__copy">
                    © {{ currentYear }} VideoDownloader. {{ $t('footer.rights') }}
                </p>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
interface FooterLink {
    slug: string
    text: string
}

interface GroupedLinks {
    platformId: string
    platformName: string
    links: FooterLink[]
}

const localePath = useLocalePath()
const currentYear = new Date().getFullYear()

const { data: groupedLinks } = await useFetch<GroupedLinks[]>('/api/footer-links', {
    key: 'footer-links',
    default: () => [],
})
</script>

<style scoped>
.__footer-inner {
    padding: var(--space-8) var(--container-padding);
}

.footer {
    background: var(--color-bg-dark);
    color: var(--color-text-inverse);
}

.footer__links {
    display: grid;
    grid-template-columns: repeat(6, auto);
    gap: var(--space-8);
    width: fit-content;
    margin: 0 auto var(--space-5);
    padding-bottom: var(--space-5);
    border-bottom: 1px solid var(--color-border-dark);
    min-width: 100%;
}

.footer__group-title {
    font-size: var(--text-sm);
    font-weight: var(--font-bold);
    color: var(--color-text-inverse);
    margin-bottom: var(--space-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.footer__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.footer__link {
    color: var(--color-text-inverse-muted);
    font-size: var(--text-sm);
    text-decoration: none;
    transition: color var(--transition-fast);
}

.footer__link:hover {
    color: var(--color-text-inverse);
}

.footer__bottom {
    text-align: center;
}

.footer__description {
    color: var(--color-text-inverse-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--space-2);
}

.footer__copy {
    color: var(--color-text-inverse-muted);
    font-size: var(--text-xs);
    opacity: 0.7;
}

@media (max-width: 768px) {
    .footer__links {
        grid-template-columns: repeat(4, auto);
    }
}

@media (max-width: 400px) {
    .footer__links {
        gap: var(--space-6);
    }
}
</style>