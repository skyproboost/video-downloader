<template>
    <ToolAppLoadingIndicator />
    <div class="app-wrapper">
        <LayoutHeader/>
        <main class="main-content">
            <NuxtPage/>
        </main>
        <LayoutFooter/>
    </div>
</template>
<style>
/* ═══════════════════════════════════════════
   APP LAYOUT
   ═══════════════════════════════════════════ */
html, body, #__nuxt {
    height: 100%;
    min-width: 20rem;
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
    /* ─── Fonts ─── */
    --font-sans: -math, sans-serif;
    --font-mono: monospace;

    /* ─── Primary ─── */
    --color-primary: #6b95e5;
    --color-primary-dark: #764ba2;
    --color-primary-rgb: 102, 126, 234;

    /* ─── Accent (Hero gradient) ─── */
    --color-accent-dark: #0e1814;
    --color-accent: #0c675b;
    --color-accent-light: #81aba5;
    --gradient-hero: linear-gradient(135deg, var(--color-accent-dark), var(--color-accent));

    /* ─── Status ─── */
    --color-success: #48bb78;
    --color-error: #e53e3e;
    --color-warning: #ecc94b;
    --color-error-dark: #7b1c1c;

    /* ─── Text ─── */
    --color-text: #1a202c;
    --color-text-muted: #4a5568;
    --color-text-light: #718096;
    --color-text-lighter: #a0aec0;
    --color-text-inverse: #ffffff;
    --color-text-inverse-muted: rgba(255, 255, 255, 0.45);
    --color-text-inverse-muted: rgba(255, 255, 255, 0.45);

    /* ─── Backgrounds ─── */
    --color-bg: #f7fafc;
    --color-bg-white: #ffffff;
    --color-bg-dark: #1a202c;
    --color-bg-button: #3b3b3b;
    --color-bg-button-hover: #1c1c1c;

    /* ─── Borders ─── */
    --color-border: #e2e8f0;
    --color-border-light: #e1f3ff;
    --color-border-dark: #2d3748;

    /* ─── Shadows ─── */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 8px 30px rgba(0, 0, 0, 0.15);
    --shadow-primary: 0 4px 14px rgba(var(--color-primary-rgb), 0.4);

    /* ─── Hover Effects ─── */
    --hover-lift: translateY(-3px);
    --hover-shadow: var(--shadow-xl);

    /* ─── Radius ─── */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;

    /* ─── Spacing ─── */
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

    /* ─── Font Sizes (Base Scale) ─── */
    --text-xs: 0.75rem;      /* 12px */
    --text-sm: 0.875rem;     /* 14px */
    --text-base: 1rem;       /* 16px */
    --text-lg: 1.125rem;     /* 18px */
    --text-xl: 1.25rem;      /* 20px */
    --text-2xl: 1.5rem;      /* 24px */
    --text-3xl: 2rem;        /* 32px */
    --text-4xl: 2.5rem;      /* 40px */
    --text-5xl: 3rem;        /* 48px */
    --text-5xl: 3rem;        /* 48px */

    /* ─── Typography Scale (Mobile First) ─── */
    /* Main (главная секция) */
    --fs-main-title: var(--text-2xl);
    --fs-main-subtitle: var(--text-lg);

    /* Section */
    --fs-section-title: var(--text-2xl);
    --fs-section-text: var(--text-base);

    /* Card */
    --fs-card-title: var(--text-lg);
    --fs-card-text: var(--text-sm);

    /* ─── Section Padding (Mobile First) ─── */
    --section-py: var(--space-6);           /* 1.5rem на мобилке */

    /* ─── Font Weights ─── */
    --font-normal: 400;
    --font-medium: 500;
    --font-semibold: 600;
    --font-bold: 700;

    /* ─── Line Heights ─── */
    --leading-none: 1;
    --leading-tight: 1.25;
    --leading-snug: 1.3;
    --leading-normal: 1.5;
    --leading-relaxed: 1.6;
    --leading-loose: 1.7;

    /* ─── Transitions ─── */
    --transition-fast: 150ms ease;
    --transition-base: 200ms ease;
    --transition-slow: 300ms ease-in-out;

    /* ─── Z-index ─── */
    --z-dropdown: 50;
    --z-sticky: 100;
    --z-modal: 200;
    --z-toast: 300;

    /* ─── Container ─── */
    --container-max: 55rem;
    --container-sm: 32rem;
    --container-xs: 25rem;
    --container-padding: var(--space-6);

    /* ─── Section Padding ─── */
    --section-padding: var(--space-12);
    --section-padding-lg: var(--space-12);     /* 3rem */
    --section-padding-sm: var(--space-6);      /* 1.5rem */
}

/* ═══════════════════════════════════════════
   BASE
   ═══════════════════════════════════════════ */
html {
    font-family: var(--font-sans);
    font-size: 90%;
    line-height: var(--leading-normal);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
}

body {
    background: var(--color-bg);
    color: var(--color-text);
    min-height: 100vh;
    min-height: 100dvh;
}

/* ═══════════════════════════════════════════
   TYPOGRAPHY
   ═══════════════════════════════════════════ */
h1, h2, h3, h4, h5, h6 {
    font-weight: var(--font-semibold);
    line-height: var(--leading-tight);
    text-wrap: balance;
}

p {
    text-wrap: pretty;
}

a {
    text-decoration: none;
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
    max-width: var(--container-max);
    margin-inline: auto;
    padding-inline: var(--container-padding);
}

/* ═══════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════ */

/* Main Section Base */
.main-section {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--gradient-hero);
    color: var(--color-text-inverse);
    padding: var(--section-py) 0;
}

.main-section__title {
    font-size: var(--fs-main-title);
    font-weight: var(--font-bold);
    margin-bottom: var(--space-3);
}

.main-section__subtitle {
    font-size: var(--fs-main-subtitle);
    opacity: 0.9;
    margin-bottom: var(--space-6);
    max-width: var(--container-sm);
    margin-inline: auto;
}

/* Section Base */
.section {
    padding: var(--section-py) 0;
}

.section--white {
    background: var(--color-bg-white);
}

.section--alt {
    background: var(--color-bg);
}

.section__title {
    text-align: center;
    font-size: var(--fs-section-title);
    font-weight: var(--font-bold);
    color: var(--color-text);
    margin-bottom: var(--space-4);
}

/* Card Base */
.card {
    text-align: center;
    padding: var(--space-6);
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-light);
}

.card__icon {
    display: inline-block;
    font-size: var(--text-3xl);
    margin-bottom: var(--space-2);
}

.card__title {
    font-size: var(--fs-card-title);
    font-weight: var(--font-semibold);
    color: var(--color-text);
    margin-bottom: var(--space-2);
}

.card__text {
    color: var(--color-text-muted);
    font-size: var(--fs-card-text);
    line-height: var(--leading-relaxed);
}

/* Button Base */
.btn {
    display: inline-block;
    padding: var(--space-3) var(--space-8);
    background: var(--color-bg-button);
    color: var(--color-text-inverse);
    border-radius: var(--radius-md);
    font-weight: var(--font-semibold);
    text-decoration: none;
    transition: background-color var(--transition-slow);
}

.btn:hover {
    background: var(--color-bg-button-hover);
}

/* Grid Base */
.grid-auto {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space-4);
    max-width: var(--container-max);
    margin: 0 auto;
}

/* Text utilities */
.text-center { text-align: center; }
.text-muted { color: var(--color-text-muted); }
.text-light { color: var(--color-text-light); }

/* ═══════════════════════════════════════════
   RESPONSIVE - Typography Scale (Tablet+)
   ═══════════════════════════════════════════ */
@media (min-width: 768px) {
    :root {
        /* Section padding - больше на десктопе */
        --section-py: var(--space-12);         /* 1.5rem → 3rem */

        /* Main - больше на десктопе */
        --fs-main-title: var(--text-4xl);      /* 1.5rem → 2.5rem */
        --fs-main-subtitle: var(--text-xl);    /* 1.125rem → 1.25rem */

        /* Section - больше на десктопе */
        --fs-section-title: var(--text-3xl);   /* 1.5rem → 2rem */
        --fs-section-text: var(--text-lg);     /* 1rem → 1.125rem */
    }
}

/* ═══════════════════════════════════════════
   MEDIA
   ═══════════════════════════════════════════ */
img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
    height: auto;
}

/* ═══════════════════════════════════════════
   FORMS
   ═══════════════════════════════════════════ */
input, button, textarea, select {
    font: inherit;
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
   SELECTION & SCROLLBAR
   ═══════════════════════════════════════════ */
::selection {
    background: var(--color-primary);
    color: var(--color-text-inverse);
}

::-webkit-scrollbar {
    width: 0.5rem;
    height: 0.5rem;
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
    .no-print, header, footer, nav {
        display: none !important;
    }

    body {
        background: white;
        color: black;
    }
}
</style>