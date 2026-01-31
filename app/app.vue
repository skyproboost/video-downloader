<template>
    <div class="app-wrapper">
        <LayoutHeader />
        <main class="main-content">
            <NuxtPage />
        </main>
        <LayoutFooter />
    </div>
</template>

<style>
html, body, #__nuxt {
    height: 100%;
}

.app-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

/* ═══════════════════════════════════════════
   RESET
   ═══════════════════════════════════════════ */
*,
*::before,
*::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

/* ═══════════════════════════════════════════
   CSS VARIABLES
   ═══════════════════════════════════════════ */
:root {
    /* Fonts - System Stack (максимальная производительность) */
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;

    /* Colors */
    --color-primary: #667eea;
    --color-primary-dark: #764ba2;
    --color-primary-rgb: 102, 126, 234;
    --color-success: #48bb78;
    --color-error: #e53e3e;
    --color-warning: #ecc94b;

    /* Text */
    --color-text: #1a202c;
    --color-text-muted: #4a5568;
    --color-text-light: #718096;
    --color-text-inverse: #ffffff;

    /* Backgrounds */
    --color-bg: #f7fafc;
    --color-bg-white: #ffffff;
    --color-bg-dark: #1a202c;
    --color-bg-elevated: #ffffff;

    /* Borders */
    --color-border: #e2e8f0;
    --color-border-dark: #2d3748;

    /* Shadows */
    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
    --shadow-primary: 0 4px 14px rgba(var(--color-primary-rgb), 0.4);

    /* Radius */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;

    /* Spacing */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-10: 2.5rem;
    --space-12: 3rem;
    --space-16: 4rem;

    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-base: 0.2s ease;
    --transition-slow: 0.3s ease;

    /* Z-index */
    --z-dropdown: 50;
    --z-sticky: 100;
    --z-modal: 200;
    --z-toast: 300;
}

/* ═══════════════════════════════════════════
   BASE
   ═══════════════════════════════════════════ */
html {
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    scroll-behavior: smooth;
    text-size-adjust: 100%;
    tab-size: 4;
}

body {
    background: var(--color-bg);
    color: var(--color-text);
    min-height: 100vh;
    min-height: 100dvh; /* Dynamic viewport height for mobile */
}

/* ═══════════════════════════════════════════
   TYPOGRAPHY
   ═══════════════════════════════════════════ */
h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.25;
    text-wrap: balance;
}

p {
    text-wrap: pretty;
}

a {
    color: inherit;
    text-decoration: none;
}

strong, b {
    font-weight: 600;
}

small {
    font-size: 0.875em;
}

code, kbd, samp, pre {
    font-family: var(--font-mono);
    font-size: 0.9em;
}

/* ═══════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════ */
.container {
    width: 100%;
    max-width: 1100px;
    margin-inline: auto;
    padding-inline: var(--space-6);
}

/* ═══════════════════════════════════════════
   MEDIA
   ═══════════════════════════════════════════ */
img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
    height: auto;
}

img {
    content-visibility: auto;
}

/* ═══════════════════════════════════════════
   FORMS
   ═══════════════════════════════════════════ */
input, button, textarea, select {
    font: inherit;
    color: inherit;
}

button {
    cursor: pointer;
    border: none;
    background: none;
}

button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

/* ═══════════════════════════════════════════
   ACCESSIBILITY
   ═══════════════════════════════════════════ */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}

/* Skip link */
.skip-link {
    position: absolute;
    top: -100%;
    left: var(--space-4);
    z-index: var(--z-toast);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-dark);
    color: var(--color-text-inverse);
    border-radius: var(--radius-md);
    transition: top var(--transition-fast);
}

.skip-link:focus {
    top: var(--space-4);
}

/* ═══════════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}

/* ═══════════════════════════════════════════
   SELECTION
   ═══════════════════════════════════════════ */
::selection {
    background: var(--color-primary);
    color: var(--color-text-inverse);
}

/* ═══════════════════════════════════════════
   SCROLLBAR (optional, webkit only)
   ═══════════════════════════════════════════ */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--color-bg);
}

::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-light);
}

/* ═══════════════════════════════════════════
   PRINT
   ═══════════════════════════════════════════ */
@media print {
    .no-print,
    header,
    footer,
    nav {
        display: none !important;
    }

    body {
        background: white;
        color: black;
    }

    a[href]::after {
        content: ' (' attr(href) ')';
    }
}
</style>