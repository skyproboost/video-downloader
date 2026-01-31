import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

export default defineEventHandler(async (event) => {
    const secFetch = getRequestHeader(event, 'sec-fetch-site')
    const isExternal = secFetch === 'cross-site' || secFetch === 'same-site'

    if (isExternal && process.env.NODE_ENV === 'production') {
        throw createError({ status: 403, message: 'Forbidden' })
    }

    const slug = event.context.params?.slug

    if (!slug) {
        throw createError({ status: 400, message: 'Slug required' })
    }

    // Игнорируем системные пути
    if (slug.startsWith('_') || slug.startsWith('.')) {
        throw createError({ status: 404, message: 'Page not found' })
    }

    // В production CWD = .output, в dev CWD = корень проекта
    const cwd = process.cwd()
    const rootDir = cwd.endsWith('.output') ? path.resolve(cwd, '..') : cwd
    const filePath = path.join(rootDir, 'content', 'pages', `${slug}.yml`)

    if (!fs.existsSync(filePath)) {
        throw createError({ status: 404, message: 'Page not found' })
    }

    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const page = parse(content)

        setResponseHeaders(event, {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        })

        return page
    } catch (e) {
        console.error(`Error reading ${slug}.yml:`, e)
        throw createError({ status: 500, message: 'Error reading page' })
    }
})