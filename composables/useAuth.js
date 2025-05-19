// composables/useAuth.js
import {ref, computed, readonly} from 'vue';
import {useRouter} from '#imports'; // Nuxt 3 自动导入 useRouter
import axios from 'axios';

// --- 模块作用域内的响应式状态 ---
const user = ref(null); // 原为: ref<AuthenticatedUser | null>(null)
const isLoadingAuth = ref(false); // 原为: ref<boolean>(false)
const authStatusResolved = ref(false); // 原为: ref<boolean>(false)

// --- 模块首次加载时执行的辅助函数 (仅客户端) ---
const _loadUserFromStorage = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                user.value = parsedUser;
            } catch (e) {
                console.error("[useAuth] _loadUserFromStorage: Failed to parse stored user data:", e);
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

    const fetchCurrentUser = async (isInitialCheck = false) => { // 原为: Promise<void>
        if (isInitialCheck && !isLoadingAuth.value) {
            isLoadingAuth.value = true;
        }
        try {
            const response = await axios.get('/api/user/me'); // 类型由 AxiosResponse<ApiResponse<{ user: AuthenticatedUser }>> 变为 any 或由运行时推断
            if (response.data?.success && response.data.data?.user) {
                const userData = response.data.data.user;
                if (userData && typeof userData.id === 'string') {
                    user.value = userData;
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('user', JSON.stringify(user.value));
                    }
                } else {
                    console.error('[useAuth] fetchCurrentUser: Received success but invalid user data structure from /api/user/me.');
                }
            } else {
                console.warn('[useAuth] fetchCurrentUser: API call to /api/user/me not logically successful or data missing. Keeping existing user state (if any). Response:', response.data);
            }
        } catch (error) { // error 类型为 any
            // console.warn(`[useAuth] fetchCurrentUser ERROR: ${error?.message}`); // Debugging log
            let httpStatus = 0;
            if (axios.isAxiosError(error)) { // Axios 提供了类型守卫
                httpStatus = error.response?.status || 0;
            }
            // 关键：仅当错误是明确的认证失败时，才将用户登出
            if (httpStatus === 401 || httpStatus === 403) {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('user');
                }
                user.value = null;
            } else {
                console.warn(`[useAuth] fetchCurrentUser: Non-authentication error (status ${httpStatus}) occurred. Existing user state (if any) preserved. Error: ${error?.message}`);
            }
        } finally {
            if (isInitialCheck) {
                authStatusResolved.value = true;
                isLoadingAuth.value = false;
            }
        }
    };

    const login = async (loginIdentifier, passwordVal) => { // 原为: loginIdentifier: string, passwordVal: string): Promise<ApiResponse<{ user: AuthenticatedUser }>>
        isLoadingAuth.value = true;
        let apiError = null; // 原为: string | null
        try {
            const response = await axios.post( // 类型由 AxiosResponse<ApiResponse<{ user: AuthenticatedUser }>> 变为 any
                '/api/auth/login',
                {loginIdentifier, password: passwordVal}
            );

            if (response.data?.success && response.data.data?.user) {
                user.value = response.data.data.user;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(user.value));
                }
                authStatusResolved.value = true;
                return {
                    success: true,
                    message: response.data.message || '登录成功！',
                    data: response.data.data
                };
            } else {
                apiError = response.data?.message || '登录凭据无效或服务器响应不完整。';
                // console.error('[useAuth] Login API call not successful or user data missing. Message:', apiError); // Debugging log
                throw new Error(apiError);
            }
        } catch (error) { // error 类型为 any
            user.value = null;
            if (typeof localStorage !== 'undefined') localStorage.removeItem('user');
            const finalErrorMessage = apiError || (axios.isAxiosError(error) && error.response?.data?.message) || error.message || '登录失败，请重试。';
            return {success: false, error: finalErrorMessage};
        } finally {
            isLoadingAuth.value = false;
        }
    };

    const logout = async (redirectToLogin = true) => { // 原为: Promise<ApiResponse>
        isLoadingAuth.value = true;
        user.value = null;
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('user');
        }

        try {
            // console.log('[useAuth] Calling /api/auth/logout API.'); // Debugging log
            await axios.post('/api/auth/logout');
            // console.log('[useAuth] Logout API call processed.'); // Debugging log
        } catch (error) { // error 类型为 any
            console.error("[useAuth] Logout API call failed:", error?.message, error); // 保留这个错误日志比较重要
        } finally {
            isLoadingAuth.value = false;
            authStatusResolved.value = true;
            // console.log(`[useAuth] logout finished. isLoadingAuth: ${isLoadingAuth.value}, authStatusResolved: ${authStatusResolved.value}`); // Debugging log
            if (redirectToLogin) {
                try {
                    // console.log('[useAuth] Redirecting to /login.'); // Debugging log
                    await router.push('/login');
                } catch (routerError) {
                    console.error("[useAuth] Failed to redirect after logout:", routerError); // 保留这个错误日志
                    if (typeof window !== 'undefined') window.location.pathname = '/login';
                }
            }
        }
        return {success: true, message: '已成功退出登录。'};
    };

    const handleSuccessfulAccountDeletion = () => { // 原为: (): void
        logout(true);
    };

    const initializeAuthState = async () => { // 原为: Promise<void>
        if (typeof window !== 'undefined' && !authStatusResolved.value) {
            await fetchCurrentUser(true);
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