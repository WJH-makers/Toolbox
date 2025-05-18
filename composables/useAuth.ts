import {ref, computed, readonly} from 'vue';
import {useRouter} from '#imports'; // Nuxt 3 auto-imports useRouter
import axios, {type AxiosResponse, type AxiosError} from 'axios';
import type {ApiResponse} from '~/types/api'; // 从共享文件导入
export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    createdAt?: Date | string; // Prisma Date can be string after JSON serialization
    updatedAt?: Date | string;
}


// --- 模块作用域内的响应式状态 ---
const user = ref<AuthenticatedUser | null>(null);
const isLoadingAuth = ref(false); // 用于全局认证相关操作的加载状态
const authStatusResolved = ref(false); // 标记初始认证检查是否已完成

// --- 模块首次加载时执行的辅助函数 (仅客户端) ---
const _loadUserFromStorage = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                user.value = JSON.parse(storedUser);
            } catch (e) {
                console.error("useAuth: Failed to parse stored user data:", e);
                localStorage.removeItem('user'); // 清理损坏的数据
            }
        }
    }
};

// 确保这个初始化仅在客户端首次导入模块时执行
if (typeof window !== 'undefined') {
    _loadUserFromStorage();
}

export function useAuth() {
    const router = useRouter();

    const isLoggedIn = computed(() => !!user.value);

    const fetchCurrentUser = async (isInitialCheck = false): Promise<void> => {
        // isLoadingAuth 的管理主要由 initializeAuthState 和 login/logout 控制
        // 如果此函数可能被独立调用并希望有加载指示，则可以在此处管理一个独立的加载状态或接受一个回调
        if (isInitialCheck && !isLoadingAuth.value) { // 仅在初始检查且非其他操作进行中时设置
            isLoadingAuth.value = true;
        }
        try {
            // 浏览器会自动发送 httpOnly auth_token cookie
            const response: AxiosResponse<ApiResponse<{ user: AuthenticatedUser }>> =
                await axios.get('/api/user/me');

            if (response.data?.success && response.data.data?.user) {
                const userData = response.data.data.user;
                if (userData && typeof userData.id === 'string') {
                    user.value = userData;
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('user', JSON.stringify(user.value));
                    }
                } else {
                    throw new Error('未能从API (/api/user/me) 获取有效的用户信息结构。');
                }
            } else {
                // API 调用成功但业务逻辑失败，或数据结构不符
                throw new Error(response.data?.message || '获取当前用户信息失败 (/api/user/me)。');
            }
        } catch (error: any) {
            console.warn("useAuth: Failed to fetch current user or user not authenticated:", (error as AxiosError)?.response?.data || error.message);
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('user');
            }
            user.value = null; // 确保用户状态被清除
        } finally {
            if (isInitialCheck) {
                authStatusResolved.value = true;
                isLoadingAuth.value = false; // 初始检查完成后，无论结果如何，都重置isLoadingAuth
            }
        }
    };

    const login = async (loginIdentifier: string, passwordVal: string): Promise<ApiResponse<{
        user: AuthenticatedUser
    }>> => {
        isLoadingAuth.value = true;
        let apiError: string | null = null;
        try {
            const response: AxiosResponse<ApiResponse<{ user: AuthenticatedUser }>> = await axios.post(
                '/api/auth/login',
                {loginIdentifier, password: passwordVal}
            );

            if (response.data?.success && response.data.data?.user) {
                user.value = response.data.data.user;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(user.value));
                }
                authStatusResolved.value = true; // 登录成功也意味着认证状态已解析
                return {
                    success: true,
                    message: response.data.message || '登录成功！',
                    data: response.data.data // response.data.data 就是 { user: AuthenticatedUser }
                };
            } else {
                apiError = response.data?.message || '登录凭据无效或服务器响应不完整。';
                throw new Error(apiError);
            }
        } catch (error: any) {
            console.error("useAuth: Login failed:", error);
            user.value = null;
            if (typeof localStorage !== 'undefined') localStorage.removeItem('user');

            const finalErrorMessage = apiError || (error as AxiosError<ApiResponse>)?.response?.data?.message || error.message || '登录失败，请重试。';
            return {success: false, error: finalErrorMessage};
        } finally {
            isLoadingAuth.value = false;
        }
    };

    const logout = async (redirectToLogin = true): Promise<ApiResponse> => {
        isLoadingAuth.value = true;
        const previousUser = user.value; // 用于可能的错误回滚（尽管通常不必要）
        user.value = null; // 立即清除前端用户状态，提供快速的UI反馈
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('user');
        }

        try {
            await axios.post('/api/auth/logout'); // 后端清除 httpOnly cookie
            console.log('useAuth: Logout API call processed.');
        } catch (error: any) {
            console.error("useAuth: Logout API call failed:", error);
            // 即便API调用失败，前端也应继续执行登出操作。
            // 可以考虑是否需要恢复 previousUser，但通常客户端登出应被视为最终状态。
        } finally {
            isLoadingAuth.value = false;
            authStatusResolved.value = true; // 登出后认证状态也是明确的（未登录）
            if (redirectToLogin) {
                try {
                    await router.push('/login');
                } catch (routerError) {
                    console.error("useAuth: Failed to redirect after logout", routerError);
                    // 如果在非Vue组件上下文（如某些测试环境）或路由未准备好时调用，push可能会失败
                    if (typeof window !== 'undefined') window.location.pathname = '/login';
                }
            }
        }
        return {success: true, message: '已成功退出登录。'};
    };

    const handleSuccessfulAccountDeletion = (): void => {
        logout(true);
    };

    const initializeAuthState = async (): Promise<void> => {
        if (typeof window !== 'undefined' && !authStatusResolved.value) {
            // isLoadingAuth 会在 fetchCurrentUser (当 isInitialCheck=true 时) 的 finally 块中被正确设置
            await fetchCurrentUser(true);
        } else if (typeof window !== 'undefined' && authStatusResolved.value) {
            // console.log("useAuth: Auth state already resolved or being resolved.");
        }
    };

    return {
        user: readonly(user),
        isLoggedIn,
        isLoadingAuth: readonly(isLoadingAuth),
        authStatusResolved: readonly(authStatusResolved),
        login,
        logout,
        fetchCurrentUser,
        initializeAuthState,
        handleSuccessfulAccountDeletion,
    };
}