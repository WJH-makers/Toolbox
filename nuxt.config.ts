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
                    id: 'mathjax-config', // 确保 ID 唯一
                    type: 'text/javascript',
                    innerHTML: `
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
                          console.log('MathJax (from nuxt.config.ts app.head) is ready.');
                          MathJax.startup.defaultReady();
                        }
                      }
                    };
                  `
                },
                {
                    id: 'mathjax-script', // 确保 ID 唯一
                    type: 'text/javascript',
                    async: true,
                    src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
                }
            ]
        }
    },
    vue: {
        compilerOptions: {
            // isCustomElement: (tag) => tag === 'mathjax-config' // MathJax 3 通常不通过此方式配置，如果不需要可以移除
        }
    },
    compatibilityDate: '2025-05-15',
    devtools: {enabled: true},
    modules: [
        'nuxt-particles',
        '@nuxt/eslint',
        '@nuxt/ui',
        '@nuxt/fonts' // 添加 @nuxt/fonts 模块
    ],
    fonts: {
        families: [
            {
                name: 'Roboto Local',           // 统一的字体家族名称
                src: '/fonts/Roboto-Bold.ttf',  // 路径相对于 public 目录
                weight: '700',                  // 'bold' 通常对应 700
                style: 'normal'
            },
            {
                name: 'Roboto Local',           // 使用相同的字体家族名称
                src: '/fonts/Roboto-Light.ttf', // 路径相对于 public 目录
                weight: '300',                  // 'light' 通常对应 300
                style: 'normal'
            }
        ]
    },
    css: [
        '~/assets/css/main.css',
    ]
});