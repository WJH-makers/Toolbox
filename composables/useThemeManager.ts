import {ref, readonly} from 'vue';

export type Theme = 'light' | 'dark';
const defaultTheme: Theme = 'light';
const DARK_THEME_CLASS = 'dark-theme';

const _currentTheme = ref<Theme>(defaultTheme);

export function useThemeManager() {
    const applyTheme = (themeName: Theme) => {
        // 此函数只应在客户端执行
        if (typeof document === 'undefined') {
            // 在SSR期间，可以仅更新ref，DOM操作留给客户端的onMounted
            _currentTheme.value = themeName;
            return;
        }

        const htmlEl = document.documentElement;

        if (themeName === 'dark') {
            htmlEl.classList.add(DARK_THEME_CLASS);
            // if (LIGHT_THEME_CLASS) htmlEl.classList.remove(LIGHT_THEME_CLASS);
        } else {
            htmlEl.classList.remove(DARK_THEME_CLASS);
            // if (LIGHT_THEME_CLASS) htmlEl.classList.add(LIGHT_THEME_CLASS);
        }
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

        let initialTheme: Theme = defaultTheme;
        try {
            const savedTheme = localStorage.getItem('theme') as Theme | null;
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                initialTheme = savedTheme;
            } else {
                const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (systemPrefersDark) {
                    initialTheme = 'dark';
                }
            }
        } catch (e) {
            console.warn('Error initializing theme from localStorage:', e);
            // 出错时也回退到默认主题或系统偏好（如果适用）
            const systemPrefersDarkOnError = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemPrefersDarkOnError) {
                initialTheme = 'dark';
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