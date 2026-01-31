// app/plugins/seo.ts
export default defineNuxtPlugin(() => {
    const route = useRoute()
    const { public: { siteUrl } } = useRuntimeConfig()

    useHead({
        link: [
            {
                rel: 'canonical',
                href: computed(() => `${siteUrl}${route.path}`),
            },
        ],
    })
})