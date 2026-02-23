<template>
    <ToolAppLoadingIndicator />
    <div class="app-wrapper">
        <LayoutHeader />
        <main class="main-content">
            <NuxtPage />
        </main>
        <LayoutFooter />
    </div>
</template>

<style>
/* ═══════════════════════════════════════════
   APP LAYOUT (специфично для app.vue)
   ═══════════════════════════════════════════ */
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
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════ */
.container {
    width: 100%;
    max-width: var(--container-max);
    margin-inline: auto;
    padding-inline: var(--container-padding);
}

/* Main Section */
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
    line-height: 1;
}

.main-section__subtitle {
    font-size: var(--fs-main-subtitle);
    opacity: 0.9;
    margin-bottom: var(--space-6);
    max-width: var(--container-sm);
    margin-inline: auto;
}

.main-section__platforms {
    margin-top: var(--space-6);
}

/* Section */
.section {
    padding: var(--section-py) 0;
}

.section--white { background: var(--color-bg-white); }
.section--alt { background: var(--color-bg); }

.section__title {
    text-align: center;
    font-size: var(--fs-section-title);
    font-weight: var(--font-bold);
    color: var(--color-text);
    margin-bottom: var(--space-4);
}

/* Card */
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

/* Button */
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

.btn:hover { background: var(--color-bg-button-hover); }

/* Grid */
.grid-auto {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space-2);
    max-width: var(--container-max);
    margin: 0 auto;
}

/* Utilities */
.text-center { text-align: center; }
.text-muted { color: var(--color-text-muted); }
.text-light { color: var(--color-text-light); }
</style>