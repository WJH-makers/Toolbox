// composables/useUserProfile.js
import {ref} from 'vue';
import axios from 'axios'; // 导入 axios 实例
const getAuthToken = () => { // 移除了返回类型 : string | null
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('authToken');
    }
    return null;
};
// 创建包含认证头和其他默认设置的函数
const createApiHeaders = () => { // 移除了返回类型 : Record<string, string>
    const token = getAuthToken();
    const headers = { // 移除了 headers 的类型 Record<string, string>
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export function useUserProfile() {
    const isLoading = ref(false); // 原为: Ref<boolean>
    const error = ref(null);      // 原为: Ref<string | null>
    const successMessage = ref(null); // 原为: Ref<string | null> = ref(''); 建议改为null保持一致

    // 清除之前的提示信息
    const clearMessages = () => { // 移除了返回类型 : void
        error.value = null;
        successMessage.value = null;
    };

    // 更新用户名
    const updateUsername = async (newUsername) => { // 移除了 newUsername: string 和 Promise<ApiResponse>
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.put( // 移除了 response 的类型 AxiosResponse<ApiResponse>
                '/api/user/profile/username',
                {username: newUsername},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "用户名更新成功！";
                return {success: true, message: successMessage.value, data: response.data.data};
            } else {
                throw new Error(response.data?.message || '更新用户名失败。'); // 使用可选链 ?.message
            }
        } catch (e) { // 原为 e: any
            // const axiosError = e as AxiosError<ApiResponse>; // 类型断言在JS中移除
            // 在JS中，可以直接访问 e.response?.data?.message，或者用 axios.isAxiosError(e) 判断
            let errorMessage = '更新用户名时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e.message) {
                errorMessage = e.message;
            }
            error.value = errorMessage;
            console.error("Update username API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    // 更新邮箱
    const updateEmail = async (newEmail) => { // 移除了 newEmail: string 和 Promise<ApiResponse>
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.put( // 移除了 response 的类型
                '/api/user/profile/email',
                {email: newEmail},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "邮箱更新请求已处理。";
                return {success: true, message: successMessage.value, data: response.data.data};
            } else {
                throw new Error(response.data?.message || '更新邮箱失败。');
            }
        } catch (e) { // 原为 e: any
            let errorMessage = '更新邮箱时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e.message) {
                errorMessage = e.message;
            }
            error.value = errorMessage;
            console.error("Update email API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    // 修改密码
    const changePassword = async (currentPassword, newPassword) => { // 移除了参数类型和 Promise<ApiResponse>
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.put( // 移除了 response 的类型
                '/api/user/profile/password',
                {currentPassword, newPassword},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "密码修改成功！";
                return {success: true, message: successMessage.value, data: response.data.data}; // 确保返回data字段
            } else {
                throw new Error(response.data?.message || '密码修改失败。');
            }
        } catch (e) { // 原为 e: any
            let errorMessage = '密码修改时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e.message) {
                errorMessage = e.message;
            }
            error.value = errorMessage;
            console.error("Change password API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    // 注销账户 (API 调用部分)
    const deleteUserAccountAPI = async () => { // 移除了 Promise<ApiResponse>
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.delete( // 移除了 response 的类型
                '/api/user/me',
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "账户已成功注销。";
                return {success: true, message: successMessage.value};
            } else {
                throw new Error(response.data?.message || '注销账户失败。');
            }
        } catch (e) { // 原为 e: any
            let errorMessage = '注销账户时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e.message) {
                errorMessage = e.message;
            }
            error.value = errorMessage;
            console.error("Delete account API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        successMessage,
        updateUsername,
        updateEmail,
        changePassword,
        deleteUserAccountAPI,
        clearMessages,
    };
}