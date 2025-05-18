import {ref, computed, readonly} from 'vue';
import {useRouter} from '#imports'; // Nuxt 3 auto-imports useRouter
import axios from 'axios'; // 确保已安装: npm install axios

export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    // 你可以根据你的 User Prisma model 和API返回调整
}

// --- 模块作用域内的响应式状态 ---
const user = ref<AuthenticatedUser | null>(null);
const isLoadingAuth = ref(false); // 用于全局认证相关操作的加载状态
const authStatusResolved = ref(false); // 新增或重命名: 标记初始认证检查是否已完成
const error = ref(false)
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

if (typeof window !== 'undefined') {
    _loadUserFromStorage();
}

export function useAuth() {
    const router = useRouter();
    const isLoggedIn = computed(() => !!user.value);
    const fetchCurrentUser = async (isInitialCheck = false) => {
        try {
            const response = await axios.get('/api/user/me'); // 假设此API获取当前用户信息
            if (response.data) { // 假设API直接返回用户对象或在其`user`字段中
                const userData = response.data.user || response.data;
                if (userData && typeof userData.id === 'string') { // 基本的用户数据校验
                    user.value = userData as AuthenticatedUser;
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('user', JSON.stringify(user.value));
                    }
                } else {
                    // 如果API成功但没有返回有效的用户数据，视为未登录
                    throw new Error('未能从API获取有效的用户信息结构。');
                }
            } else {
                throw new Error('API响应为空，未能获取用户信息。');
            }
        } catch (error: any) {
            console.warn("useAuth: Failed to fetch current user or user not authenticated:", error.message);
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('user'); // 获取失败，清除可能存在的旧缓存
            }
            user.value = null; // 确保用户状态被清除
        } finally {
            if (isInitialCheck) {
                // isLoadingAuth.value = false; // 如果 fetchCurrentUser 控制自己的加载状态
                authStatusResolved.value = true; // 标记初始认证检查已完成
            }
        }
    };

    // 登录函数
    const login = async (loginIdentifier: string, passwordVal: string) => {
        isLoadingAuth.value = true;
        error.value = null; // 清除之前的错误（如果error是useAuth的一部分）
        try {
            const response = await axios.post('/api/auth/login', {loginIdentifier, password: passwordVal});

            if (response.data?.success && response.data.user) {
                user.value = response.data.user as AuthenticatedUser;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(user.value));
                }
                authStatusResolved.value = true; // 登录成功也意味着认证状态已解析
                return {success: true, message: response.data.message || '登录成功！'};
            } else {
                throw new Error(response.data?.message || '登录凭据无效或服务器响应不完整。');
            }
        } catch (error: any) {
            console.error("useAuth: Login failed:", error);
            user.value = null;
            if (typeof localStorage !== 'undefined') localStorage.removeItem('user');
            // error.value = error.response?.data?.message || error.message || '登录失败，请重试。'; // 如果error是useAuth的一部分
            return {success: false, error: error.response?.data?.message || error.message || '登录失败，请重试。'};
        } finally {
            isLoadingAuth.value = false;
        }
    };

    // 登出函数
    const logout = async (redirectToLogin = true) => {
        isLoadingAuth.value = true;
        const oldUser = user.value; // 记录旧用户状态以便UI可以立即响应
        user.value = null; // 立即清除前端用户状态，提供快速的UI反馈

        try {
            await axios.post('/api/auth/logout');
            console.log('useAuth: Logout API call potentially successful.');
        } catch (error) {
            console.error("useAuth: Logout API call failed:", error);
            // 即便API调用失败，前端也应继续执行登出操作，但可能需要恢复user.value如果登出完全失败
            // user.value = oldUser; // 如果需要回滚，但这通常不必要，因为主要目的是客户端登出
        } finally {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('user');
            }
            // authToken 的清除由后端通过设置过期cookie完成
            isLoadingAuth.value = false;
            authStatusResolved.value = true; // 登出后认证状态也是明确的（未登录）
            if (redirectToLogin) {
                router.push('/login');
            }
        }
        return {success: true, message: '已成功退出登录。'};
    };

    // 账户成功删除后的清理操作
    const handleSuccessfulAccountDeletion = () => {
        logout(true); // 调用logout并跳转
    };

    // 初始化认证状态 (通常在 app.vue 的 onMounted 中调用一次)
    const initializeAuthState = async () => {
        // 确保只在客户端执行，并且只执行一次（通过 authStatusResolved 控制）
        if (typeof window !== 'undefined' && !authStatusResolved.value) {
            isLoadingAuth.value = true; // 开始时设置加载状态
            await fetchCurrentUser(true); // 传入true标记为初始检查, fetchCurrentUser内部会设置authStatusResolved
            // isLoadingAuth.value = false; // fetchCurrentUser 内部的finally会处理
        } else if (typeof window !== 'undefined' && authStatusResolved.value) {
            // 如果已经初始化过，什么都不做或根据逻辑选择是否刷新
            console.log("useAuth: Auth state already resolved.");
        }
    };

    // 返回给组件使用的接口
    return {
        user: readonly(user),
        isLoggedIn,
        isLoadingAuth: readonly(isLoadingAuth),
        authStatusResolved: readonly(authStatusResolved), // **导出这个状态**
        login,
        logout,
        fetchCurrentUser,
        initializeAuthState,
        handleSuccessfulAccountDeletion,
    };
}