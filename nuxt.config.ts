export default defineNuxtConfig({
    app: {
        head: {
            link: [
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
                }
            ]
        }
    },
    compatibilityDate: '2025-05-15',
    devtools: {enabled: true},
    modules: [
        'nuxt-particles',
        // '@nuxtjs/google-fonts',
        '@nuxt/eslint',
        '@nuxt/ui'],
    css: [
        '~/assets/css/main.css', // 引入全局 CSS
    ],
    googleFonts: {
        families: {
        },
        download: false,
        preconnect: false,
        prefetch: false,
        preload: false,
    }
})