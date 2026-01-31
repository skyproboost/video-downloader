import { useCompression } from 'h3-compression'

export default defineEventHandler((event) => {
    useCompression(event, {
        encoding: 'gzip',        // или 'br' для brotli
        threshold: 1024,         // сжимать > 1KB
    })
})