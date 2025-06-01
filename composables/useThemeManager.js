// composables/useThemeManager.js
import {ref, readonly} from 'vue';

// 在 JavaScript 中，我们通常不导出类型别名，但我们会通过值来约束它。
// export type Theme = 'light' | 'dark'; // TypeScript 类型定义，在JS中移除
const defaultTheme = 'light'; // 'light' | 'dark'
const DARK_THEME_CLASS = 'dark-theme';

// _currentTheme 的初始值类型会从 defaultTheme 推断出来
const _currentTheme = ref(defaultTheme);

export function useThemeManager() {
    const applyTheme = (themeName) => { // 移除了 themeName: Theme 类型注解
        // 此函数只应在客户端执行
        if (typeof document === 'undefined') {
            // 在SSR期间，可以仅更新ref，DOM操作留给客户端的onMounted
            _currentTheme.value = themeName;
            return;
        }

        const htmlEl = document.documentElement;

        if (themeName === 'dark') {
            htmlEl.classList.add(DARK_THEME_CLASS);
            // if (LIGHT_THEME_CLASS) htmlEl.classList.remove(LIGHT_THEME_CLASS); // 原注释保留
        } else {
            htmlEl.classList.remove(DARK_THEME_CLASS);
            // if (LIGHT_THEME_CLASS) htmlEl.classList.add(LIGHT_THEME_CLASS); // 原注释保留
        }
        // 移除 data-theme 属性，如果你的主题系统主要依赖 class
        // 如果你也用 data-theme，则相应地设置它：htmlEl.setAttribute('data-theme', themeName);
        htmlEl.removeAttribute('data-theme');

        _currentTheme.value = themeName;
        try {
            localStorage.setItem('theme', themeName);
        } catch (e) {
            console.warn('LocalStorage is not available for saving theme preference.');
        }
    };

    const toggleTheme = () => {
        const newTheme = _currentTheme.value === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    const initializeTheme = () => {
        // 初始化仅在客户端执行
        if (typeof window === 'undefined' || typeof localStorage === 'undefined' || typeof document === 'undefined') {
            return;
        }

        let initialTheme = defaultTheme; // 类型会从 defaultTheme 推断
        try {
            const savedTheme = localStorage.getItem('theme'); // 移除了 as Theme | null 类型断言
            // 运行时检查值的有效性
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                initialTheme = savedTheme;
            } else {
                // 如果 localStorage 中没有有效主题，检查系统偏好
                const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (systemPrefersDark) {
                    initialTheme = 'dark';
                }
            }
        } catch (e) {
            let systemPrefersDarkOnError = false;
            if (typeof window.matchMedia === 'function') {
                systemPrefersDarkOnError = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            if (systemPrefersDarkOnError) {
                initialTheme = 'dark';
            } else {
                initialTheme = defaultTheme; // 确保出错时有明确的回退
            }
        }
        applyTheme(initialTheme);
    };

    return {
        currentTheme: readonly(_currentTheme),
        applyTheme,
        toggleTheme,
        initializeTheme,
    };
}