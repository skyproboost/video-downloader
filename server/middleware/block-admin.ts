export default defineEventHandler((event) => {
    if (process.env.NODE_ENV !== 'production') return

    const url = getRequestURL(event).pathname
    if (url.startsWith('/admin')) {
        throw createError({ statusCode: 404, message: 'Not found' })
    }
})