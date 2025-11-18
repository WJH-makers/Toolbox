// 文件：middleware/auth.js
import {useAuth} from '~/composables/useAuth'; // Nuxt 3 会自动导入 composables

export default defineNuxtRouteMiddleware((to, from) => { // eslint-disable-line no-unused-vars
    const {isLoggedIn} = useAuth();
    if (!isLoggedIn.value && to.path !== '/login') { // 假设你的登录页路径是 /login
        console.warn(`[Route Middleware: auth] User not logged in. Redirecting from "${to.fullPath}" to "/login".`);
        return navigateTo('/login');
    }
});