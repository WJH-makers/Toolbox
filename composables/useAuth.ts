import {ref, computed, readonly} from 'vue';
import {useRouter} from '#imports'; // Nuxt 3 auto-imports useRouter
import axios, {type AxiosResponse, type AxiosError} from 'axios';

export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
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

    const fetchCurrentUser = async (isInitialCheck = false) => {
        // isLoadingAuth 的管理移至 initializeAuthState 或调用方 (如 login)
        try {
            const response: AxiosResponse<{
                user: AuthenticatedUser
            } | AuthenticatedUser> = await axios.get('/api/user/me');

            if (response.data) {
                const userData = response.data.user || response.data;
                if (userData && typeof userData.id === 'string') {
                    user.value = userData as AuthenticatedUser;
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('user', JSON.stringify(user.value));
                    }
                } else {
                    throw new Error('未能从API获取有效的用户信息结构。');
                }
            } else {
                throw new Error('API响应为空，未能获取用户信息。');
            }
        } catch (error: any) {
            console.warn("useAuth: Failed to fetch current user or user not authenticated:", error.message);
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('user');
            }
            user.value = null;
        } finally {
            if (isInitialCheck) {
                authStatusResolved.value = true;
            }
        }
    };

    const login = async (loginIdentifier: string, passwordVal: string): Promise<ApiResponse<{
        user: AuthenticatedUser
    }>> => {
        isLoadingAuth.value = true;
        let loginError: string | null = null;
        try {
            const response: AxiosResponse<ApiResponse<{ user: AuthenticatedUser }>> = await axios.post(
                '/api/auth/login',
                {loginIdentifier, password: passwordVal}
            );

            if (response.data?.success && response.data.user) {
                user.value = response.data.user as AuthenticatedUser;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(user.value));
                }
                authStatusResolved.value = true;
                return {success: true, message: response.data.message || '登录成功！', data: {user: response.data.user}};
            } else {
                loginError = response.data?.message || '登录凭据无效或服务器响应不完整。';
                throw new Error(loginError);
            }
        } catch (error: any) {
            console.error("useAuth: Login failed:", error);
            user.value = null;
            if (typeof localStorage !== 'undefined') localStorage.removeItem('user');
            loginError = loginError || (error as AxiosError<ApiResponse>)?.response?.data?.message || error.message || '登录失败，请重试。';
            return {success: false, error: loginError};
        } finally {
            isLoadingAuth.value = false;
        }
    };

    const logout = async (redirectToLogin = true) => {
        isLoadingAuth.value = true;
        user.value = null; // Optimistically update UI
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('user');
        }

        try {
            await axios.post('/api/auth/logout');
            console.log('useAuth: Logout API call processed.');
        } catch (error) {
            console.error("useAuth: Logout API call failed:", error);
        } finally {
            isLoadingAuth.value = false;
            authStatusResolved.value = true;
            if (redirectToLogin) {
                router.push('/login');
            }
        }
        return {success: true, message: '已成功退出登录。'};
    };

    const handleSuccessfulAccountDeletion = () => {
        logout(true);
    };

    const initializeAuthState = async () => {
        if (typeof window !== 'undefined' && !authStatusResolved.value) {
            isLoadingAuth.value = true;
            await fetchCurrentUser(true);
            // isLoadingAuth is set to false within the finally block of fetchCurrentUser when isInitialCheck is true
            // However, to ensure it's always reset after initializeAuthState as a whole:
            isLoadingAuth.value = false;
        } else if (typeof window !== 'undefined' && authStatusResolved.value) {
            // console.log("useAuth: Auth state already resolved or being resolved.");
        }
    };

    return {
        user: readonly(user),
        isLoggedIn,
        isLoadingAuth: readonly(isLoadingAuth),
        authStatusResolved: readonly(authStatusResolved), // **已添加**
        login,
        logout,
        fetchCurrentUser,
        initializeAuthState, // **已修正导出的函数名**
        handleSuccessfulAccountDeletion,
    };
}