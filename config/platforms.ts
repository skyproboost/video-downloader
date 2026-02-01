export interface Platform {
    id: string
    name: string
}

export const platforms: Platform[] = [
    { id: 'youtube', name: 'YouTube' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'vk', name: 'VK' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'vimeo', name: 'Vimeo' },
]

export const platformIds = platforms.map(p => p.id)

export function getPlatformById(id: string): Platform | undefined {
    return platforms.find(p => p.id === id)
}