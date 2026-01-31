export interface Platform {
    id: string
    name: string
}

export const platforms: Platform[] = [
    { id: 'youtube', name: 'YouTube' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'vk', name: 'VK Video' },
]

export const platformIds = platforms.map(p => p.id)

export function getPlatformById(id: string): Platform | undefined {
    return platforms.find(p => p.id === id)
}