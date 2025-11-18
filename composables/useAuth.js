// composables/useAuth.js
import {ref, computed, readonly} from 'vue';
import {useRouter} from '#imports';
import axios from 'axios';

const user = ref(null);
const isLoadingAuth = ref(false);
const authStatusResolved = ref(false);

const _clearUserSession = () => {
    user.value = null;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('user');
    }
};

const _setUserSession = (userData) => {
    if (userData && typeof userData.id === 'string' && userData.username && userData.email) {
        user.value = userData;
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user.value));
        }
        return true;
    } else {
        _clearUserSession(); // 如果数据无效，也清除会话
        return false;
    }
};

const _loadUserFromStorage = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.id) {
                    user.value = parsedUser;
                } else {
                    localStorage.removeItem('user');
                }
            } catch (e) {
                console.error('Failed to parse user from localStorage', e);
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
    const isLoggedIn = computed(() => !!user.value && !!user.value.id);

    const fetchCurrentUser = async (isInitialCheck = false) => {
        if (isInitialCheck) {
            isLoadingAuth.value = true;
        }
        try {
            const response = await axios.get('/api/user/me');
            if (response.data?.success && response.data.data?.user) {
                if (!_setUserSession(response.data.data.user) && isInitialCheck) {
                    // 如果设置用户数据失败（因为结构问题），并且是初始检查，确保状态是未登录
                    _clearUserSession();
                }
            } else {
                // API 调用逻辑上不成功或数据缺失
                if (isInitialCheck) { // 如果是初始检查，则清除任何现有用户状态
                    _clearUserSession();
                }
            }
        } catch (error) {
            _clearUserSession();
        } finally {
            if (isInitialCheck) {
                authStatusResolved.value = true;
                isLoadingAuth.value = false;
            }
        }
    };

    const login = async (loginIdentifier, passwordVal) => {
        // TODO: Implement password encryption before sending to the server in a production environment.
        isLoadingAuth.value = true;
        authStatusResolved.value = false; // 开始登录时，可以认为状态暂时未解析完成
        let apiError = null;
        try {
            const response = await axios.post(
                '/api/auth/login',
                {loginIdentifier, password: passwordVal}
            );

            if (response.data?.success && response.data.data?.user) {
                _setUserSession(response.data.data.user);
                return {
                    success: true,
                    message: response.data.message || '登录成功！',
                    data: response.data.data
                };
            } else {
                apiError = response.data?.message || '登录凭据无效或服务器响应不完整。';
                throw new Error(apiError);
            }
        } catch (error) {
            _clearUserSession();
            const finalErrorMessage = apiError || (axios.isAxiosError(error) && error.response?.data?.message) || error.message || '登录失败，请重试。';
            return {success: false, error: finalErrorMessage};
        } finally {
            isLoadingAuth.value = false;
            authStatusResolved.value = true; // 无论登录成功或失败，认证状态的“尝试”已完成
        }
    };

    const logout = async (redirectToLogin = true) => {
        isLoadingAuth.value = true;
        const wasLoggedIn = isLoggedIn.value; // 记录登出前的状态
        _clearUserSession();
        authStatusResolved.value = false;

        try {
            await axios.post('/api/auth/logout');
        } catch (error) {
            console.error("[useAuth] Logout API call failed:", error?.message);
        } finally {
            isLoadingAuth.value = false;
            authStatusResolved.value = true;
            if (redirectToLogin && wasLoggedIn) {
                try {
                    await router.push('/login');
                } catch (routerError) { // eslint-disable-line no-unused-vars
                    if (typeof window !== 'undefined') window.location.pathname = '/login';
                }
            }
        }
        return {success: true, message: '已成功退出登录。'};
    };

    const handleSuccessfulAccountDeletion = () => {
        logout(true);
    };

    const initializeAuthState = async () => {
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
        fetchCurrentUser, // 暴露出来以便在其他地方按需刷新用户信息
        initializeAuthState,
        handleSuccessfulAccountDeletion,
    };
}