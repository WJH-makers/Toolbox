import {ref, computed, readonly} from 'vue';
import {useRouter} from '#imports';
import axios, {type AxiosResponse, type AxiosError} from 'axios';
import type {ApiResponse} from '~/types/api';

export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

const user = ref<AuthenticatedUser | null>(null);
const isLoadingAuth = ref(false);
const authStatusResolved = ref(false);

const _loadUserFromStorage = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                user.value = parsedUser;
            } catch (e) {
                console.error("[useAuth] _loadUserFromStorage: Failed to parse stored user data:", e);
                localStorage.removeItem('user');
            }
        }
    }
};

if (typeof window !== 'undefined') {
    _loadUserFromStorage();
}

export function useAuth() {
    const router = useRouter();
    const isLoggedIn = computed(() => !!user.value);

    const fetchCurrentUser = async (isInitialCheck = false): Promise<void> => {
        if (isInitialCheck && !isLoadingAuth.value) {
            isLoadingAuth.value = true;
        }
        try {
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
                    console.error('[useAuth] Invalid user data structure from /api/user/me. userData:', userData ? JSON.parse(JSON.stringify(userData)) : 'undefined/null');
                    throw new Error('未能从API (/api/user/me) 获取有效的用户信息结构。');
                }
            } else {
                console.error('[useAuth] API call to /api/user/me was not successful or data structure mismatch. Response success:', response.data?.success, 'Response data field:', response.data?.data);
                if (response.data.data?.user) {
                    console.log('[useAuth] Note: response.data.user exists, value:', JSON.parse(JSON.stringify(response.data.data.user)));
                }
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('user');
                }
                user.value = null;
            }
        } catch (error: any) {
            console.warn(`[useAuth] fetchCurrentUser ERROR: ${error?.message}`);
            if (error.isAxiosError) {
                const axiosError = error as AxiosError<ApiResponse>; // 假设 ApiResponse 包含 error 字段
                console.warn(`[useAuth] AxiosError details - Status: ${axiosError.response?.status}, Response Data:`, axiosError.response?.data ? JSON.parse(JSON.stringify(axiosError.response.data)) : 'No response data');
            } else {
                console.warn('[useAuth] Non-Axios error in fetchCurrentUser:', error);
            }

            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('user');
            }
            user.value = null;
        } finally {
            if (isInitialCheck) {
                authStatusResolved.value = true;
                isLoadingAuth.value = false;
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
                authStatusResolved.value = true;
                return {
                    success: true,
                    message: response.data.message || '登录成功！',
                    data: response.data.data
                };
            } else {
                apiError = response.data?.message || '登录凭据无效或服务器响应不完整。';
                console.error('[useAuth] Login API call not successful or user data missing. Message:', apiError);
                throw new Error(apiError);
            }
        } catch (error: any) {
            console.error(`[useAuth] Login failed: ${error?.message}`, error);
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
        user.value = null;
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('user');
        }

        try {
            await axios.post('/api/auth/logout');
        } catch (error: any) {
            console.error("[useAuth] Logout API call failed:", error?.message, error);
        } finally {
            isLoadingAuth.value = false;
            authStatusResolved.value = true;
            if (redirectToLogin) {
                try {
                    await router.push('/login');
                } catch (routerError) {
                    console.error("[useAuth] Failed to redirect after logout:", routerError);
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