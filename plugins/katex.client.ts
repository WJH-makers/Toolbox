// plugins/katex.client.ts
import {ref} from 'vue';

// 创建一个在插件作用域内可访问的 ref
const _isKatexReady = ref(false);

// 导出响应式 ref，以便组件可以导入和观察
// Nuxt 3 推荐通过 provide/inject 或 useState 进行状态共享，
// 但对于这种客户端特定的、一次性加载状态，直接导出 ref 也是一种简洁可行的方式。
export const isKatexReady = _isKatexReady;


export default defineNuxtPlugin(async () => {
    // 只在客户端执行
    if (process.server) {
        return;
    }

    const KATE_CSS_HREF = 'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css';
    const KATE_CSS_INTEGRITY = 'sha384-odtC+0UGzzFL/6PNoE8rX/SPnDgbaC23OBjpCV2BYVZNHzNEHCDJLTTKQCequSeN';

    const KATE_JS_SRC = 'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js';
    const KATE_JS_INTEGRITY = 'sha384-hIoBPJpTUs74ddycBBOVBpFAjkMLIMpTusY2VKa9XnTzHwJsv8Nn2AaJ2gXh3L6L';

    const KATE_AUTO_RENDER_JS_SRC = 'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/contrib/auto-render.min.js';
    const KATE_AUTO_RENDER_JS_INTEGRITY = 'sha384-+VBxd3r6XgBlJRUWARfkLWKC2FgrXorXSCWTCHYi+4pP43sdB8uLdI60JZYsQvVB';

    const loadCSS = (href: string, integrity?: string): void => {
        if (document.querySelector(`link[href="${href}"]`)) {
            // console.log('[KaTeX Plugin] CSS already seems to be in document:', href);
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        if (integrity) {
            link.integrity = integrity;
        }
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        // console.log('[KaTeX Plugin] CSS appended to head:', href);
    };

    const loadScript = (src: string, integrity?: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                // @ts-ignore
                if (src === KATE_JS_SRC && typeof window.katex !== 'undefined') {
                    console.log('[KaTeX Plugin] KaTeX core already loaded and window.katex defined.');
                    resolve();
                    return;
                }
                // @ts-ignore
                if (src === KATE_AUTO_RENDER_JS_SRC && typeof window.renderMathInElement !== 'undefined') {
                    console.log('[KaTeX Plugin] KaTeX auto-render already loaded and window.renderMathInElement defined.');
                    resolve();
                    return;
                }
                // If script tag exists but global is not set, it might be still loading, or failed.
                // For simplicity, if tag exists we assume it's handled or will be.
                // A more robust check would be to see if it's currently in a 'loading' state.
                console.log('[KaTeX Plugin] Script tag already exists in document (may or may not be fully loaded/executed):', src);
                // Resolve if we assume it's okay, or add more complex state checking.
                // For this case, let's resolve, as component will check window object.
                // It's better to let it try to load again if globals are not set.
                // So, remove this early resolve or make it more robust. For now, we proceed to create script.
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Important for order: katex.min.js before auto-render.min.js
            // script.defer = true; // defer also respects order for multiple defer scripts
            if (integrity) {
                script.integrity = integrity;
            }
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log('[KaTeX Plugin] Script loaded successfully via plugin:', src);
                resolve();
            };
            script.onerror = (eventOrMsg: Event | string) => {
                const errorMsg = typeof eventOrMsg === 'string' ? eventOrMsg : (eventOrMsg.type || 'Unknown script loading error');
                console.error(`[KaTeX Plugin] Failed to load script: ${src}`, errorMsg);
                reject(new Error(`Failed to load script: ${src}. Error: ${errorMsg}`));
            };
            document.head.appendChild(script);
        });
    };

    // 加载 CSS
    loadCSS(KATE_CSS_HREF, KATE_CSS_INTEGRITY);

    try {
        console.log('[KaTeX Plugin] Attempting to load KaTeX JS...');
        await loadScript(KATE_JS_SRC, KATE_JS_INTEGRITY);
        // @ts-ignore
        if (typeof window.katex === 'undefined') {
            throw new Error('[KaTeX Plugin] KaTeX core (window.katex) not defined after loading script.');
        }
        console.log('[KaTeX Plugin] KaTeX core JS confirmed (window.katex is defined).');

        await loadScript(KATE_AUTO_RENDER_JS_SRC, KATE_AUTO_RENDER_JS_INTEGRITY);
        // @ts-ignore
        if (typeof window.renderMathInElement === 'undefined') {
            throw new Error('[KaTeX Plugin] KaTeX auto-render (window.renderMathInElement) not defined after loading script.');
        }
        console.log('[KaTeX Plugin] KaTeX auto-render JS confirmed (window.renderMathInElement is defined).');

        _isKatexReady.value = true;
        console.log('[KaTeX Plugin] KaTeX is now ready! (isKatexReady.value = true)');

    } catch (error) {
        console.error('[KaTeX Plugin] Critical error loading KaTeX scripts:', error);
        _isKatexReady.value = false;
    }
});