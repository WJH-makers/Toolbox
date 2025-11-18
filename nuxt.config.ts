// nuxt.config.ts
export default defineNuxtConfig({
    app: {
        head: { link: [] }
    },
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    modules: [
        'nuxt-particles',
        '@nuxt/eslint',
        '@nuxt/ui',
        '@nuxt/fonts'
    ],
    fonts: {
        providers: {
            google: false,
            bunny: false,
            fontshare: false,
            fontsource: false,
            adobe: false,
        },
        families: [
            { name: 'Roboto Local', src: '/fonts/Roboto-Bold.ttf', weight: '700', style: 'normal' },
            { name: 'Roboto Local', src: '/fonts/Roboto-Light.ttf', weight: '300', style: 'normal' }
        ]
    },
    css: [
        '~/assets/css/main.css',
        'katex/dist/katex.min.css'
    ],

});