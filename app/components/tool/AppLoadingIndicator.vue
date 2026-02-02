<template>
    <div
        class="loading-indicator"
        :class="{
            'is-loading': isLoading,
            'is-finishing': isFinishing
        }"
    />
</template>

<script setup lang="ts">
const nuxtApp = useNuxtApp()
const isLoading = ref(false)
const isFinishing = ref(false)

const THROTTLE = 100

let throttleTimeout: NodeJS.Timeout | null = null
let finishTimeout: NodeJS.Timeout | null = null

const start = () => {
    if (throttleTimeout) return

    throttleTimeout = setTimeout(() => {
        isFinishing.value = false
        isLoading.value = true
        throttleTimeout = null
    }, THROTTLE)
}

const finish = () => {
    if (throttleTimeout) {
        clearTimeout(throttleTimeout)
        throttleTimeout = null
        return
    }

    isFinishing.value = true

    finishTimeout = setTimeout(() => {
        isLoading.value = false
        isFinishing.value = false
    }, 500)
}

nuxtApp.hook('page:start', start)
nuxtApp.hook('page:finish', finish)

onBeforeUnmount(() => {
    if (throttleTimeout) clearTimeout(throttleTimeout)
    if (finishTimeout) clearTimeout(finishTimeout)
})
</script>

<style scoped>
.loading-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 7px;
    background: #0c564c;
    z-index: 999999;
    pointer-events: none;
    transform: scaleX(0);
    transform-origin: left;
    opacity: 0;
    transition: opacity 0.2s;
}

.loading-indicator.is-loading {
    opacity: 1;
    animation: loading 2s ease-out forwards;
}

.loading-indicator.is-finishing {
    animation: none;
    transform: scaleX(1);
    opacity: 0;
    transition: opacity 0.3s, transform 0.1s;
}

@keyframes loading {
    0% {
        transform: scaleX(0);
    }
    50% {
        transform: scaleX(0.6);
    }
    100% {
        transform: scaleX(0.95);
    }
}
</style>