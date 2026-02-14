// public/admin/status.js — v5
// Collapsible panel: queue, retry, failed + live progress + commands popup
(function() {
    const STATUS_URL = '/admin/status.json'
    const REFRESH = 2000
    const PUB_WAIT = 5000

    let publishedAt = 0
    // Запоминаем какие секции открыты (in-memory)
    const expanded = { queue: false, retry: false, failed: true }

    // ═══════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('ts-css')) return
        const el = document.createElement('style')
        el.id = 'ts-css'
        el.textContent = `
@keyframes ts-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes ts-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes ts-spin { to{transform:rotate(360deg)} }

:root {
    --ts-bg: #1e293b;
    --ts-bg2: #0f172a;
    --ts-border: #334155;
    --ts-text: #e2e8f0;
    --ts-muted: #94a3b8;
    --ts-green: #22c55e;
    --ts-yellow: #f59e0b;
    --ts-red: #ef4444;
    --ts-orange: #f97316;
    --ts-blue: #3b82f6;
    --ts-cyan: #06b6d4;
}

/* ── Панель ── */
.ts-panel {
    position: fixed;
    bottom: 16px;
    right: 16px;
    width: 360px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: var(--ts-text);
    background: var(--ts-bg);
    border: 1px solid var(--ts-border);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,.35);
    animation: ts-in .25s;
    line-height: 1.5;
}
.ts-panel::-webkit-scrollbar { width: 4px; }
.ts-panel::-webkit-scrollbar-thumb { background: var(--ts-border); border-radius: 2px; }

/* ── Header ── */
.ts-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--ts-border);
    position: sticky;
    top: 0;
    background: var(--ts-bg);
    z-index: 1;
    border-radius: 12px 12px 0 0;
}
.ts-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.ts-dot-idle { background: var(--ts-green); }
.ts-dot-translating { background: var(--ts-yellow); animation: ts-pulse 1s infinite; }
.ts-dot-error { background: var(--ts-red); }
.ts-dot-warning { background: var(--ts-orange); animation: ts-pulse 1.5s infinite; }
.ts-msg { flex: 1; font-weight: 500; font-size: 13px; }
.ts-help {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--ts-muted);
    background: none;
    color: var(--ts-muted);
    font-size: 12px; font-weight: 700;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all .15s;
}
.ts-help:hover { border-color: var(--ts-text); color: var(--ts-text); }

/* ── Progress bar ── */
.ts-progress-wrap {
    padding: 0 14px 10px;
}
.ts-progress-text {
    font-size: 11px;
    color: var(--ts-muted);
    margin-bottom: 4px;
}
.ts-progress-bar {
    height: 3px;
    background: var(--ts-border);
    border-radius: 2px;
    overflow: hidden;
}
.ts-progress-fill {
    height: 100%;
    background: var(--ts-cyan);
    border-radius: 2px;
    transition: width .3s;
}

/* ── Collapsible section ── */
.ts-section {
    border-top: 1px solid var(--ts-border);
}
.ts-section-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: none;
    border: none;
    color: var(--ts-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: background .15s;
}
.ts-section-btn:hover { background: rgba(255,255,255,.04); }
.ts-chevron {
    font-size: 10px;
    transition: transform .2s;
    color: var(--ts-muted);
    flex-shrink: 0;
}
.ts-chevron-open { transform: rotate(90deg); }
.ts-badge {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 10px;
    font-weight: 600;
}
.ts-badge-yellow { background: rgba(245,158,11,.15); color: var(--ts-yellow); }
.ts-badge-red { background: rgba(239,68,68,.15); color: var(--ts-red); }
.ts-badge-green { background: rgba(34,197,94,.15); color: var(--ts-green); }
.ts-section-extra {
    margin-left: auto;
    font-weight: 400;
    color: var(--ts-muted);
    font-size: 11px;
}
.ts-section-body {
    overflow: hidden;
    transition: max-height .25s ease, padding .25s;
}
.ts-section-body-closed { max-height: 0; padding: 0 14px; }
.ts-section-body-open { max-height: 600px; padding: 4px 14px 10px; }

/* ── Items ── */
.ts-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    font-size: 12px;
}
.ts-item + .ts-item { border-top: 1px solid rgba(255,255,255,.04); }
.ts-slug {
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 11px;
    color: var(--ts-cyan);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ts-meta {
    font-size: 11px;
    color: var(--ts-muted);
    white-space: nowrap;
}

/* ── CMD hint ── */
.ts-cmd-box {
    margin-top: 6px;
    padding: 6px 8px;
    background: var(--ts-bg2);
    border-radius: 6px;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 11px;
    color: var(--ts-cyan);
    cursor: pointer;
    transition: background .15s;
    word-break: break-all;
}
.ts-cmd-box:hover { background: #1a2332; }
.ts-cmd-label {
    font-family: -apple-system, sans-serif;
    font-size: 11px;
    color: var(--ts-muted);
    margin-top: 6px;
    margin-bottom: 2px;
}
.ts-empty {
    font-size: 11px;
    color: var(--ts-muted);
    padding: 4px 0;
    font-style: italic;
}

/* ── Popup overlay ── */
.ts-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.55);
    z-index: 10001;
    display: flex; align-items: center; justify-content: center;
    animation: ts-in .15s;
}
.ts-popup {
    background: var(--ts-bg);
    border: 1px solid var(--ts-border);
    border-radius: 14px;
    padding: 20px 22px;
    width: 90%; max-width: 580px;
    max-height: 80vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,.5);
    color: var(--ts-text);
    line-height: 1.6;
}
.ts-popup::-webkit-scrollbar { width: 4px; }
.ts-popup::-webkit-scrollbar-thumb { background: var(--ts-border); border-radius: 2px; }
.ts-popup-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
}
.ts-popup-title { font-size: 16px; font-weight: 700; }
.ts-popup-close {
    width: 28px; height: 28px; border-radius: 6px;
    border: none; background: var(--ts-border); color: var(--ts-muted);
    font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s;
}
.ts-popup-close:hover { background: #475569; color: var(--ts-text); }
.ts-grp { margin-bottom: 14px; }
.ts-grp-title {
    font-size: 11px; font-weight: 700; color: var(--ts-muted);
    text-transform: uppercase; letter-spacing: .5px;
    margin-bottom: 6px;
}
.ts-row {
    display: flex; gap: 10px; padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,.05);
    align-items: flex-start;
}
.ts-row:last-child { border-bottom: none; }
.ts-code {
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 11px;
    background: var(--ts-bg2);
    padding: 3px 8px; border-radius: 5px;
    color: var(--ts-cyan);
    white-space: nowrap;
    cursor: pointer;
    transition: background .15s;
    flex-shrink: 0;
}
.ts-code:hover { background: #1a2332; }
.ts-desc { font-size: 12px; color: #cbd5e1; }
.ts-scenarios { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--ts-border); }
.ts-sc-row { display: flex; gap: 6px; padding: 3px 0; font-size: 12px; }
.ts-sc-name { color: var(--ts-cyan); font-weight: 500; min-width: 100px; }
.ts-sc-desc { color: var(--ts-muted); }
.ts-popup-foot {
    margin-top: 12px; padding-top: 10px;
    border-top: 1px solid var(--ts-border);
    font-size: 11px; color: #64748b;
}

/* ── Toast ── */
.ts-toast {
    position: fixed; top: 16px; right: 16px;
    background: var(--ts-green); color: white;
    padding: 8px 14px; border-radius: 8px;
    font-size: 12px; z-index: 10002;
    animation: ts-in .2s;
    box-shadow: 0 4px 12px rgba(0,0,0,.2);
}
`
        document.head.appendChild(el)
    }

    // ═══════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════

    function fmt(sec) {
        if (sec == null) return '—'
        const m = Math.floor(sec / 60), s = sec % 60
        return m + ':' + String(s).padStart(2, '0')
    }

    function esc(s) {
        const d = document.createElement('div'); d.textContent = s; return d.innerHTML
    }

    function copy(text) {
        navigator.clipboard.writeText(text).then(() => {
            const t = document.createElement('div')
            t.className = 'ts-toast'
            t.textContent = '✓ Скопировано'
            document.body.appendChild(t)
            setTimeout(() => t.remove(), 1500)
        })
    }
    window.__tsCopy = copy

    function toggle(key) {
        expanded[key] = !expanded[key]
        const body = document.getElementById('ts-body-' + key)
        const chev = document.getElementById('ts-chev-' + key)
        if (body) body.className = 'ts-section-body ' + (expanded[key] ? 'ts-section-body-open' : 'ts-section-body-closed')
        if (chev) chev.className = 'ts-chevron ' + (expanded[key] ? 'ts-chevron-open' : '')
    }
    window.__tsToggle = toggle

    // ═══════════════════════════════════════════════
    // POPUP
    // ═══════════════════════════════════════════════

    function showPopup() {
        if (document.getElementById('ts-overlay')) return
        const C = 'npx tsx scripts/auto-translate.ts'
        const ov = document.createElement('div')
        ov.id = 'ts-overlay'; ov.className = 'ts-overlay'
        ov.addEventListener('click', e => { if (e.target === ov) ov.remove() })
        ov.innerHTML = `<div class="ts-popup">
            <div class="ts-popup-head">
                <div class="ts-popup-title">🔤 Auto-Translate v5</div>
                <button class="ts-popup-close" onclick="this.closest('.ts-overlay').remove()">✕</button>
            </div>
            <div class="ts-grp">
                <div class="ts-grp-title">📋 Основные</div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --watch')">--watch</code><div class="ts-desc">Авто-перевод при сохранении + retry каждые 3 мин</div></div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --all')">--all</code><div class="ts-desc">Все страницы (только изменённые поля)</div></div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --all --force')">--all --force</code><div class="ts-desc">Все с нуля. Сбрасывает retry и failed</div></div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --sync-langs')">--sync-langs</code><div class="ts-desc">Добавить новые языки в существующие страницы</div></div>
            </div>
            <div class="ts-grp">
                <div class="ts-grp-title">🔧 Исправление</div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --retry')">--retry</code><div class="ts-desc">Ручной повтор неудачных (не ждать таймер)</div></div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --fix-failed')">--fix-failed</code><div class="ts-desc">Перевести страницы исчерпавшие все попытки</div></div>
            </div>
            <div class="ts-grp">
                <div class="ts-grp-title">📊 Информация</div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --status')">--status</code><div class="ts-desc">Полный статус в терминале</div></div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} --usage')">--usage</code><div class="ts-desc">Лимиты DeepL API</div></div>
            </div>
            <div class="ts-grp">
                <div class="ts-grp-title">📄 Одна страница</div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} youtube-downloader')">slug</code><div class="ts-desc">Инкрементальный перевод</div></div>
                <div class="ts-row"><code class="ts-code" onclick="__tsCopy('${C} youtube-downloader --force')">slug --force</code><div class="ts-desc">Полный перевод с нуля</div></div>
            </div>
            <div class="ts-scenarios">
                <div class="ts-grp-title">🎯 Сценарии</div>
                <div class="ts-sc-row"><span>🆕</span><span class="ts-sc-name">new</span><span class="ts-sc-desc">Новая → полный перевод</span></div>
                <div class="ts-sc-row"><span>📋</span><span class="ts-sc-name">duplicated</span><span class="ts-sc-desc">Дубликат → полный перевод</span></div>
                <div class="ts-sc-row"><span>🔧</span><span class="ts-sc-name">corrupted</span><span class="ts-sc-desc">Битые → полный перевод</span></div>
                <div class="ts-sc-row"><span>🌍</span><span class="ts-sc-name">missing-langs</span><span class="ts-sc-desc">Новый язык → только он</span></div>
                <div class="ts-sc-row"><span>📝</span><span class="ts-sc-name">incremental</span><span class="ts-sc-desc">Изменения → только они</span></div>
                <div class="ts-sc-row"><span>⏭️</span><span class="ts-sc-name">unchanged</span><span class="ts-sc-desc">Без изменений → пропуск</span></div>
            </div>
            <div class="ts-popup-foot">
                Retry: 3 мин × 20 попыток. После → failed.json → <code class="ts-code" onclick="__tsCopy('${C} --fix-failed')" style="font-size:10px">--fix-failed</code><br>
                При ошибке — полный откат, файл не изменяется. Клик по команде = копировать.
            </div>
        </div>`
        document.body.appendChild(ov)
    }
    window.__tsShowPopup = showPopup

    // ═══════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════

    function buildSection(key, icon, title, badge, badgeClass, extra, bodyHtml) {
        const isOpen = expanded[key]
        return `<div class="ts-section">
            <button class="ts-section-btn" onclick="__tsToggle('${key}')">
                <span id="ts-chev-${key}" class="ts-chevron ${isOpen ? 'ts-chevron-open' : ''}">▶</span>
                <span>${icon} ${title}</span>
                ${badge ? `<span class="ts-badge ${badgeClass}">${badge}</span>` : ''}
                ${extra ? `<span class="ts-section-extra">${extra}</span>` : ''}
            </button>
            <div id="ts-body-${key}" class="ts-section-body ${isOpen ? 'ts-section-body-open' : 'ts-section-body-closed'}">
                ${bodyHtml}
            </div>
        </div>`
    }

    function render(data) {
        injectStyles()
        let panel = document.getElementById('ts-panel')
        if (!panel) {
            panel = document.createElement('div')
            panel.id = 'ts-panel'
            panel.className = 'ts-panel'
            document.body.appendChild(panel)
        }

        const hasRetry = data.retry?.count > 0
        const hasFailed = data.failed?.count > 0
        const isTranslating = data.status === 'translating'

        // Effective status для dot
        let dotClass = 'ts-dot-' + data.status
        if (data.status === 'idle' && hasFailed) dotClass = 'ts-dot-error'
        else if (data.status === 'idle' && hasRetry) dotClass = 'ts-dot-warning'

        let html = ''

        // ── Header ──
        html += `<div class="ts-header">
            <span class="ts-dot ${dotClass}"></span>
            <span class="ts-msg">${esc(data.message)}</span>
            <button class="ts-help" onclick="__tsShowPopup()" title="Команды">?</button>
        </div>`

        // ── Progress bar (если идёт перевод) ──
        if (data.processing) {
            const p = data.processing
            let pct = 0, text = ''

            if (p.langsTotal > 0) {
                const langPart = p.langsDone / p.langsTotal
                let fieldPart = 0
                if (p.fieldsTotal && p.fieldsTotal > 0) {
                    fieldPart = (p.fieldsDone || 0) / p.fieldsTotal / p.langsTotal
                }
                pct = Math.round((langPart + fieldPart) * 100)
            }

            text = `${p.scenario} · ${p.currentLang || '...'}`
            if (p.fieldsTotal) text += ` · поле ${p.fieldsDone || 0}/${p.fieldsTotal}`
            text += ` · язык ${(p.langsDone || 0) + 1}/${p.langsTotal}`

            html += `<div class="ts-progress-wrap">
                <div class="ts-progress-text">${esc(text)}</div>
                <div class="ts-progress-bar"><div class="ts-progress-fill" style="width:${pct}%"></div></div>
            </div>`
        }

        // ── Queue section ──
        const queueItems = data.queue?.items || []
        const queuePending = data.queue?.pending || 0
        if (queuePending > 0 || isTranslating) {
            let body = ''
            if (queueItems.length > 0) {
                for (const i of queueItems) {
                    body += `<div class="ts-item"><span>⏳</span><span class="ts-slug">${esc(i.slug)}</span><span class="ts-meta">в очереди</span></div>`
                }
            } else {
                body = '<div class="ts-empty">Очередь пуста</div>'
            }
            html += buildSection('queue', '📋', 'Очередь', queuePending || null, 'ts-badge-yellow', null, body)
        }

        // ── Retry section ──
        if (hasRetry) {
            const countdown = fmt(data.retry.nextRetryIn)
            let body = ''
            for (const i of data.retry.items) {
                body += `<div class="ts-item">
                    <span>🔁</span>
                    <span class="ts-slug">${esc(i.slug)}</span>
                    <span class="ts-meta">${i.retryCount}/${i.maxRetries}</span>
                </div>`
            }
            html += buildSection('retry', '🔄', 'Retry', data.retry.count, 'ts-badge-yellow', 'через ' + countdown, body)
        }

        // ── Failed section ──
        if (hasFailed) {
            let body = ''
            for (const i of data.failed.items) {
                body += `<div class="ts-item">
                    <span>⛔</span>
                    <span class="ts-slug">${esc(i.slug)}</span>
                    <span class="ts-meta">${i.totalAttempts} попыток</span>
                </div>`
            }
            body += `<div class="ts-cmd-label">💡 Исправить:</div>`
            body += `<div class="ts-cmd-box" onclick="__tsCopy('${data.failed.fixCommand || 'npx tsx scripts/auto-translate.ts --fix-failed'}')">${esc(data.failed.fixCommand || '--fix-failed')}</div>`

            html += buildSection('failed', '⛔', 'Не переведены', data.failed.count, 'ts-badge-red', null, body)
        }

        panel.innerHTML = html
    }

    // ═══════════════════════════════════════════════
    // LOAD + WATCH
    // ═══════════════════════════════════════════════

    async function load() {
        try {
            const res = await fetch(STATUS_URL + '?t=' + Date.now())
            if (!res.ok) return
            const data = await res.json()

            const timeSince = Date.now() - publishedAt
            if (timeSince < PUB_WAIT) {
                const idle = data.status === 'idle'
                const noIssues = !data.retry?.count && !data.failed?.count
                if (idle && noIssues) return
                publishedAt = 0
            }

            render(data)
        } catch {
            const panel = document.getElementById('ts-panel')
            if (panel) panel.remove()
        }
    }

    function showTranslatingNow() {
        publishedAt = Date.now()
        render({
            status: 'translating', message: 'Запуск перевода...',
            queue: { pending: 0, items: [] },
            retry: { count: 0, items: [] },
            failed: { count: 0, items: [] },
        })
    }

    function watchPublish() {
        document.addEventListener('click', e => {
            const mi = e.target.closest?.('[role="menuitem"]')
            if (mi && /опубликовать|publish now|publish and/i.test(mi.textContent || '')) {
                setTimeout(showTranslatingNow, 300)
            }
        }, true)
    }

    function init() {
        injectStyles()
        load()
        watchPublish()
        setInterval(load, REFRESH)
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
    else init()
})()