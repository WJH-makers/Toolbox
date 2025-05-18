module.exports = {
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./nuxt.config.{js,ts}",
        "./app.vue",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require('daisyui'), // 添加 DaisyUI 插件
    ],
    daisyui: {
        themes: ["light", "night"],
        darkTheme: "night",
        base: true, // 应用基础样式 (背景色、前景色)
        styled: true, // 为所有组件应用 DaisyUI 的颜色和设计决策
        utils: true, // 添加响应式和修饰符工具类
        prefix: "", // DaisyUI 类名的前缀 (例如 "dui-input" 而不是 "input")，通常留空
        logs: true, // 构建时在控制台显示 DaisyUI 版本和配置信息
    },
}