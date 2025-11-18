const CDN_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';

class MathJaxBootstrap {
    constructor() {
        this.loadingPromise = null;
    }

    /**
     * MathJax 配置
     */
    get config() {
        return {
            loader: { load: ['[tex]/ams', '[tex]/bm'] },
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                packages: { '[+]': ['ams'] },
                macros: {
                    // 定义常用宏为空，防止渲染报错
                    ctex: [''], geometry: [''], maketitle: [''],
                    songti: [''], heiti: [''], kaishu: [''], definecolor: [''], lstset: ['']
                }
            },
            options: {
                ignoreHtmlClass: 'tex2jax_ignore',
                // 只处理我们渲染区中的公式元素
                // .mjx-container 是 MessageRenderer 外层容器类
                processHtmlClass: 'mjx-container|mjx-process',
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            },
            startup: {
                typeset: false // 禁用自动渲染，由 Vue 组件手动调用
            }
        };
    }

    /**
     * 初始化加载
     */
    load() {
        if (typeof window === 'undefined') return Promise.resolve(null);
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = new Promise((resolve, reject) => {
            if (window.MathJax && window.MathJax.typesetPromise) {
                return resolve(window.MathJax);
            }

            window.MathJax = this.config;

            const script = document.createElement('script');
            script.src = CDN_URL;
            script.async = true;
            script.onload = () => {
                // 轮询直到 MathJax 核心对象就绪
                const timer = setInterval(() => {
                    if (window.MathJax && window.MathJax.typesetPromise) {
                        clearInterval(timer);
                        resolve(window.MathJax);
                    }
                }, 50);

                // 15秒超时保护
                setTimeout(() => {
                    clearInterval(timer);
                    resolve(window.MathJax); // 尽力而为
                }, 15000);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });

        return this.loadingPromise;
    }

    /**
     * 执行渲染
     */
    async typeset(el) {
        if (!el) return;
        const mj = await this.load();
        if (mj && mj.typesetPromise) {
            mj.typesetClear([el]);
            await mj.typesetPromise([el]);
        }
    }

    /**
     * 清理渲染
     */
    async clear(el) {
        if (!el) return;
        const mj = await this.load();
        if (mj && mj.typesetClear) {
            mj.typesetClear([el]);
        }
    }
}

export const mathJaxService = new MathJaxBootstrap();