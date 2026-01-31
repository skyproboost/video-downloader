// Глобальный статус переводов
(function() {
    const STATUS_URL = '/admin/status.json'
    const REFRESH_INTERVAL = 2000

    let currentStatus = null

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

    // Показать "Идёт перевод" сразу при публикации (без ожидания сервера)
    function showTranslatingNow() {
        updateBanner({
            status: 'translating',
            message: 'Запуск перевода...'
        })
    }

    // Отслеживаем кнопку публикации
    function watchPublishButton() {
        document.addEventListener('click', (e) => {
            const target = e.target

            // Кнопка "Опубликовать" или "Publish"
            const isPublishBtn =
                target.closest('[class*="PublishButton"]') ||
                target.closest('button')?.textContent?.match(/публик|publish|save/i)

            if (isPublishBtn) {
                // Небольшая задержка чтобы CMS успела сохранить
                setTimeout(showTranslatingNow, 500)
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