export default defineEventHandler(async (event) => {
    // Защита от внешних запросов
    const secFetch = getRequestHeader(event, 'sec-fetch-site')
    const isExternal = secFetch === 'cross-site' || secFetch === 'same-site'

    if (isExternal && process.env.NODE_ENV === 'production') {
        throw createError({ status: 403, message: 'Forbidden' })
    }

    const slug = event.context.params?.slug

    if (!slug) {
        throw createError({ status: 400, message: 'Slug required' })
    }

    const page = await queryCollection(event, 'pages')
        .where('slug', '=', slug)
        .first()

    if (!page) {
        throw createError({ status: 404, message: 'Page not found' })
    }

    return page
})