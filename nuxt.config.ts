// nuxt.config.ts
export default defineNuxtConfig({
    app: {
        head: {
            link: [
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
                }
                // KaTeX CSS 链接已从此移除，将由下面的插件加载
            ],
            script: [
                // KaTeX JavaScript 脚本已从此移除，将由下面的插件加载
            ]
        }
    },
    vue: {
        compilerOptions: {
            // 如果之前有 MathJax 相关的 isCustomElement 配置，现在可以移除或注释掉
        }
    },
    compatibilityDate: '2025-05-15',
    devtools: {enabled: true},
    modules: [
        'nuxt-particles',
        '@nuxt/eslint',
        '@nuxt/ui',
        '@nuxt/fonts' // 您已添加 @nuxt/fonts 模块
    ],
    fonts: { // 您已有的字体配置
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
        '~/assets/css/main.css',
    ]
});