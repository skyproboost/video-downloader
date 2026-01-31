// Глобальный статус переводов
(function() {
    const STATUS_URL = '/admin/status.json'
    const REFRESH_INTERVAL = 2000
    const PUBLISH_WAIT_TIME = 5000 // Ждём 5 сек после публикации

    let currentStatus = null
    let publishedAt = 0 // Время последней публикации

    function addStyles() {
        if (document.getElementById('ts-styles')) return

        const style = document.createElement('style')
        style.id = 'ts-styles'
        style.textContent = `
            @keyframes ts-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .ts-banner {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s;
            }
            .ts-banner-idle {
                background: #22c55e;
                color: white;
            }
            .ts-banner-translating {
                background: #eab308;
                color: #1e293b;
            }
            .ts-banner-error {
                background: #ef4444;
                color: white;
            }
            .ts-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: currentColor;
            }
            .ts-banner-translating .ts-dot {
                animation: ts-pulse 1s infinite;
            }
        `
        document.head.appendChild(style)
    }

    async function loadStatus() {
        try {
            const res = await fetch(STATUS_URL + '?t=' + Date.now())
            if (res.ok) {
                const data = await res.json()
                currentStatus = data

                const timeSincePublish = Date.now() - publishedAt
                const isWaiting = timeSincePublish < PUBLISH_WAIT_TIME

                // Если недавно нажали "Опубликовать"
                if (isWaiting) {
                    // idle игнорируем — ждём реального статуса
                    if (data.status === 'idle') {
                        return
                    }
                    // translating или error — сразу показываем и сбрасываем ожидание
                    publishedAt = 0
                }

                updateBanner(data)
            }
        } catch {
            updateBanner(null)
        }
    }

    function updateBanner(data) {
        addStyles()

        let banner = document.getElementById('ts-banner')

        if (!data) {
            if (banner) banner.remove()
            return
        }

        if (!banner) {
            banner = document.createElement('div')
            banner.id = 'ts-banner'
            banner.className = 'ts-banner'
            document.body.appendChild(banner)
        }

        banner.className = `ts-banner ts-banner-${data.status}`

        const icons = {
            idle: '✓',
            translating: '⏳',
            error: '✗'
        }

        banner.innerHTML = `
            <span class="ts-dot"></span>
            <span>${icons[data.status] || ''} ${data.message}</span>
        `
    }

    // Показать "Идёт перевод" сразу при публикации
    function showTranslatingNow() {
        publishedAt = Date.now()
        updateBanner({
            status: 'translating',
            message: 'Запуск перевода...'
        })
    }

    // Проверяем, является ли элемент пунктом меню публикации
    function isPublishMenuItem(element) {
        const menuItem = element.closest('[role="menuitem"]')
        if (!menuItem) return false

        const text = menuItem.textContent || ''
        return /опубликовать|publish now|publish and/i.test(text)
    }

    // Отслеживаем клики по пунктам меню публикации
    function watchPublishButton() {
        document.addEventListener('click', (e) => {
            if (isPublishMenuItem(e.target)) {
                setTimeout(showTranslatingNow, 300)
            }
        }, true)
    }

    function init() {
        addStyles()
        loadStatus()
        watchPublishButton()
        setInterval(loadStatus, REFRESH_INTERVAL)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init)
    } else {
        init()
    }
})()