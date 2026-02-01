import { defineCollection, defineContentConfig, z } from '@nuxt/content'

const pageContentSchema = z.object({
    mainTitle: z.string(),
    subtitle: z.string().optional(),
    intro: z.string().optional(),

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
            icon: z.string().optional(),
            title: z.string(),
            description: z.string(),
        })),
    }),

    faq: z.array(z.object({
        question: z.string(),
        answer: z.string(),
    })).optional(),
})

export default defineContentConfig({
    collections: {
        pages: defineCollection({
            type: 'data',
            source: 'pages/*.yml',
            schema: z.object({
                slug: z.string(),
                footerLinkText: z.string().optional(),
                platform: z.string(),
                source_lang: z.string().default('en'),

                meta: z.object({
                    title: z.string(),
                    description: z.string(),
                    keywords: z.string().optional(),
                    ogImage: z.string().optional(),
                    ogImageAlt: z.string().optional(),
                }),

                pageContent: pageContentSchema,

                translations: z.record(z.string(), z.object({
                    meta: z.object({
                        title: z.string(),
                        description: z.string(),
                        keywords: z.string().optional(),
                        ogImage: z.string().optional(),
                        ogImageAlt: z.string().optional(),
                    }),
                    pageContent: pageContentSchema,
                })).optional(),
            }),
        }),
    },
})