import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
    collections: {
        pages: defineCollection({
            type: 'data',
            source: 'pages/*.yml',
            schema: z.object({
                slug: z.string(),
                platform: z.string(),
                source_lang: z.string().default('en'),

                meta: z.object({
                    title: z.string(),
                    description: z.string(),
                    keywords: z.string().optional(),
                    ogImage: z.string().optional(),
                    ogImageAlt: z.string().optional(),
                }),

                pageContent: z.object({
                    h1: z.string(),
                    subtitle: z.string(),
                    intro: z.string(),

                    how_to: z.object({
                        title: z.string(),
                        steps: z.array(z.object({
                            title: z.string(),
                            description: z.string(),
                            image: z.string().optional(),
                            imageAlt: z.string().optional(),
                        })),
                    }),

                    features: z.object({
                        title: z.string(),
                        items: z.array(z.object({
                            icon: z.string(),
                            image: z.string().optional(),
                            imageAlt: z.string().optional(),
                            title: z.string(),
                            description: z.string(),
                        })),
                    }),

                    faq: z.array(z.object({
                        question: z.string(),
                        answer: z.string(),
                    })).optional(),
                }),

                translations: z.record(z.string(), z.object({
                    meta: z.object({
                        title: z.string(),
                        description: z.string(),
                        keywords: z.string().optional(),
                        ogImage: z.string().optional(),
                        ogImageAlt: z.string().optional(),
                    }),
                    pageContent: z.object({
                        h1: z.string(),
                        subtitle: z.string(),
                        intro: z.string(),
                        how_to: z.object({
                            title: z.string(),
                            steps: z.array(z.object({
                                title: z.string(),
                                description: z.string(),
                                image: z.string().optional(),
                                imageAlt: z.string().optional(),
                            })),
                        }),
                        features: z.object({
                            title: z.string(),
                            items: z.array(z.object({
                                icon: z.string(),
                                image: z.string().optional(),
                                imageAlt: z.string().optional(),
                                title: z.string(),
                                description: z.string(),
                            })),
                        }),
                        faq: z.array(z.object({
                            question: z.string(),
                            answer: z.string(),
                        })).optional(),
                    }),
                })).optional(),
            }),
        }),
    },
})