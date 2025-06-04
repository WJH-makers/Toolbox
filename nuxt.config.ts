// nuxt.config.ts
export default defineNuxtConfig({
    app: {
        head: {
            link: [
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
                }
            ],
        }
    },
    compatibilityDate: '2025-05-15',
    devtools: {enabled: true},
    modules: [
        'nuxt-particles',
        '@nuxt/eslint',
        '@nuxt/ui',
        '@nuxt/fonts'
    ],
    fonts: {
        families: [
            {
                name: 'Roboto Local',
                src: '/fonts/Roboto-Bold.ttf',
                weight: '700',
                style: 'normal'
            },
            {
                name: 'Roboto Local',
                src: '/fonts/Roboto-Light.ttf',
                weight: '300',
                style: 'normal'
            }
        ]
    },
    css: [
        '~/assets/css/main.css', // 您已有的全局 CSS
        'katex/dist/katex.min.css' // 新增：全局引入 KaTeX CSS
    ]
});