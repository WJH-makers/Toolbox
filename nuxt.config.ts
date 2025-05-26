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
            script: [
                {
                    id: 'mathjax-config',
                    type: 'text/javascript',
                    children: `
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']], 
                displayMath: [['$$', '$$'], ['\\[', '\\]']], 
                processEscapes: true
              },
              svg: {
                fontCache: 'global'
              },
              startup: {
                ready: () => {
                  console.log('MathJax (from nuxt.config.ts) is ready.');
                  MathJax.startup.defaultReady();
                }
              }
            };
          `
                },
                {
                    id: 'mathjax-script',
                    type: 'text/javascript',
                    async: true,
                    src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
                }
            ]
        }
    },
    compatibilityDate: '2025-05-15', // 请使用与您项目创建或升级时匹配的日期
    devtools: {enabled: true},
    modules: [
        'nuxt-particles',
        '@nuxt/eslint',
        '@nuxt/ui'
    ],
    css: [
        '~/assets/css/main.css',
    ],
})