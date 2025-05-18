import {ref} from 'vue';
import type {Ref} from 'vue';
import axios, {type AxiosResponse, type AxiosError} from 'axios'; // 导入 axios 及相关类型

// 定义API响应的通用结构
export interface ApiResponse<T = any> { // 使用 any 作为默认泛型，可以根据需要具体化
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

// 占位符：获取认证令牌的函数
// 在实际应用中，这应该从你的 useAuth composable 或其他安全存储中获取
const getAuthToken = (): string | null => {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('authToken');
    }
    return null;
};

// 创建包含认证头和其他默认设置的函数
const createApiHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export function useUserProfile() {
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);
    const successMessage: Ref<string | null> = ref('');

    // 清除之前的提示信息
    const clearMessages = (): void => {
        error.value = null;
        successMessage.value = null;
    };

    // 更新用户名
    const updateUsername = async (newUsername: string): Promise<ApiResponse> => {
        clearMessages();
        isLoading.value = true;
        try {
            const response: AxiosResponse<ApiResponse> = await axios.put(
                '/api/user/profile/username', // 你的后端API端点
                {username: newUsername},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "用户名更新成功！";
                return {success: true, message: successMessage.value, data: response.data.data};
            } else {
                throw new Error(response.data.message || '更新用户名失败。');
            }
        } catch (e: any) {
            const axiosError = e as AxiosError<ApiResponse>;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || '更新用户名时发生网络或服务器错误，请重试。';
            error.value = errorMessage;
            console.error("Update username API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    // 更新邮箱
    const updateEmail = async (newEmail: string): Promise<ApiResponse> => {
        clearMessages();
        isLoading.value = true;
        try {
            const response: AxiosResponse<ApiResponse> = await axios.put(
                '/api/user/profile/email', // 你的后端API端点
                {email: newEmail},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "邮箱更新请求已处理。";
                return {success: true, message: successMessage.value, data: response.data.data};
            } else {
                throw new Error(response.data.message || '更新邮箱失败。');
            }
        } catch (e: any) {
            const axiosError = e as AxiosError<ApiResponse>;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || '更新邮箱时发生网络或服务器错误，请重试。';
            error.value = errorMessage;
            console.error("Update email API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    // 修改密码
    const changePassword = async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
        clearMessages();
        isLoading.value = true;
        try {
            const response: AxiosResponse<ApiResponse> = await axios.put(
                '/api/user/profile/password', // 你的后端API端点
                {currentPassword, newPassword},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "密码修改成功！";
                return {success: true, message: successMessage.value};
            } else {
                throw new Error(response.data.message || '密码修改失败。');
            }
        } catch (e: any) {
            const axiosError = e as AxiosError<ApiResponse>;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || '密码修改时发生网络或服务器错误，请重试。';
            error.value = errorMessage;
            console.error("Change password API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    // 注销账户 (API 调用部分)
    const deleteUserAccountAPI = async (): Promise<ApiResponse> => {
        clearMessages();
        isLoading.value = true;
        try {
            const response: AxiosResponse<ApiResponse> = await axios.delete(
                '/api/user/me', // 或者你实际的注销API端点
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                successMessage.value = response.data.message || "账户已成功注销。";
                return {success: true, message: successMessage.value};
            } else {
                throw new Error(response.data.message || '注销账户失败。');
            }
        } catch (e: any) {
            const axiosError = e as AxiosError<ApiResponse>;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || '注销账户时发生网络或服务器错误，请重试。';
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