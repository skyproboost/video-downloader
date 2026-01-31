<template>
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-brand">
                    <span class="logo">📥 VideoDownloader</span>
                    <p>{{ $t('footer.description') }}</p>
                </div>

                <div class="footer-links">
                    <h4>{{ $t('footer.tools') }}</h4>
                    <NuxtLink :to="localePath('/youtube-downloader')">YouTube Downloader</NuxtLink>
                </div>
            </div>

            <div class="footer-bottom">
                <p>© {{ new Date().getFullYear() }} VideoDownloader. {{ $t('footer.rights') }}</p>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
</script>

<style scoped>
.footer {
    background: #1a202c;
    color: white;
    padding: 3rem 0 1.5rem;
    margin-top: auto; /* Толкает футер вниз */
}

.footer-content {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.footer-brand .logo {
    font-size: 1.25rem;
    font-weight: 700;
}

.footer-brand p {
    margin-top: 0.5rem;
    color: #a0aec0;
    font-size: 0.9rem;
}

.footer-links h4 {
    margin-bottom: 1rem;
}

.footer-links a {
    display: block;
    color: #a0aec0;
    text-decoration: none;
    margin-bottom: 0.5rem;
}

.footer-links a:hover {
    color: white;
}

.footer-bottom {
    border-top: 1px solid #2d3748;
    padding-top: 1.5rem;
    text-align: center;
    color: #718096;
    font-size: 0.875rem;
}
</style>