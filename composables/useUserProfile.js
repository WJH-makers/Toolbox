// composables/useUserProfile.js
import {ref} from 'vue';
import axios from 'axios';

const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('authToken');
    }
    return null;
};


const createApiHeaders = () => {
    const token = getAuthToken();
    /** @type {Record<string, string>} */
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};


export function useUserProfile() {
    /** @type {import('vue').Ref<boolean>} */
    const isLoading = ref(false);
    /** @type {import('vue').Ref<string | null>} */
    const error = ref(null); // Corrected: Removed <string | null>
    /** @type {import('vue').Ref<string | null>} */
    const successMessage = ref(null); // Corrected: Removed <string | null>

    const clearMessages = () => {
        error.value = null;
        successMessage.value = null;
    };

    const setClientError = (message) => { // 新增函数
        clearMessages(); // 调用 clearMessages 来确保 successMessage 被清除
        error.value = message;
    };

    const updateUsername = async (newUsername) => {
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.put(
                '/api/user/profile/username',
                {username: newUsername},
                {headers: createApiHeaders()}
            );
            if (response.data && response.data.success) {
                const apiMessage = response.data.message;
                successMessage.value = typeof apiMessage === 'string' ? apiMessage : "用户名更新成功！"; // UI 消息可以有默认值
                return {
                    success: true,
                    message: typeof apiMessage === 'string' ? apiMessage : undefined, // 函数返回值 message 为 string | undefined
                    data: response.data.data
                };
            } else {
                const errorMessage = response.data?.message || '更新用户名失败。';
                error.value = errorMessage;
                return {success: false, error: errorMessage};
            }
        } catch (e) {
            let errorMessage = '更新用户名时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e instanceof Error && e.message) {
                errorMessage = e.message;
            }
            error.value = errorMessage;
            console.error("Update username API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    const updateEmail = async (newEmail) => {
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.put(
                '/api/user/profile/email',
                {email: newEmail},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                const apiMessage = response.data.message;
                successMessage.value = typeof apiMessage === 'string' ? apiMessage : "邮箱更新请求已处理。";

                return {
                    success: true,
                    message: typeof apiMessage === 'string' ? apiMessage : undefined,
                    data: response.data.data
                };
            } else {
                const errorMessage = response.data?.message || '更新邮箱失败。';
                error.value = errorMessage;
                return {success: false, error: errorMessage};
            }
        } catch (e) {
            let errorMessage = '更新邮箱时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e instanceof Error && e.message) {
                errorMessage = e.message;
            }
            error.value = errorMessage;
            console.error("Update email API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.put(
                '/api/user/profile/password',
                {currentPassword, newPassword},
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                const apiMessage = response.data.message;
                successMessage.value = typeof apiMessage === 'string' ? apiMessage : "密码修改成功！";
                return {
                    success: true,
                    message: typeof apiMessage === 'string' ? apiMessage : undefined,
                    data: response.data.data
                };
            } else {
                const errorMessage = response.data?.message || '密码修改失败。';
                error.value = errorMessage;
                return {success: false, error: errorMessage};
            }
        } catch (e) {
            let errorMessage = '密码修改时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e instanceof Error && e.message) {
                errorMessage = e.message;
            }
            error.value = errorMessage;
            console.error("Change password API error:", e);
            return {success: false, error: errorMessage};
        } finally {
            isLoading.value = false;
        }
    };

    const deleteUserAccountAPI = async () => {
        clearMessages();
        isLoading.value = true;
        try {
            const response = await axios.delete(
                '/api/user/me',
                {headers: createApiHeaders()}
            );

            if (response.data && response.data.success) {
                const apiMessage = response.data.message;
                successMessage.value = typeof apiMessage === 'string' ? apiMessage : "账户已成功注销。";
                return {
                    success: true,
                    message: typeof apiMessage === 'string' ? apiMessage : undefined
                };
            } else {
                const errorMessage = response.data?.message || '注销账户失败。';
                error.value = errorMessage;
                return {success: false, error: errorMessage};
            }
        } catch (e) {
            let errorMessage = '注销账户时发生网络或服务器错误，请重试。';
            if (axios.isAxiosError(e) && e.response?.data?.message) {
                errorMessage = e.response.data.message;
            } else if (e instanceof Error && e.message) {
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
        isLoading: readonly(isLoading),
        error: readonly(error),
        successMessage: readonly(successMessage),
        updateUsername,
        updateEmail,
        changePassword,
        deleteUserAccountAPI,
        clearMessages,
        setClientError,
    };
}