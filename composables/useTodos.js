// composables/useTodos.js
import {ref} from 'vue';
export function useTodos() {
    const todos = ref([]); // 原为: Ref<TodoItem[]>
    const isLoading = ref(false); // 原为: Ref<boolean>
    const error = ref(null); // 原为: Ref<string | null>

    const fetchTodos = async () => { // 原为: Promise<void>
        isLoading.value = true;
        error.value = null;
        try {
            // Nuxt 3 的 $fetch 会自动推断响应类型，或者你可以依赖运行时结构
            const response = await $fetch('/api/todos', { // 移除了 <ApiResponse<TodoItem[]>>
                method: 'GET',
            });
            if (response.success && response.todos) {
                todos.value = response.todos;
            } else {
                throw new Error(response.error || '获取待办事项失败');
            }
        } catch (e) { // 原为: e: any
            error.value = e.message || '获取待办事项时发生未知错误';
            console.error("useTodos - fetchTodos error:", e);
        } finally {
            isLoading.value = false;
        }
    };

    const addTodo = async (content, important = false) => { // 移除了参数类型
        if (!content || !content.trim()) { // 增加了对 content 是否存在的检查
            error.value = "内容不能为空";
            return null;
        }
        isLoading.value = true;
        error.value = null;
        try {
            const response = await $fetch('/api/todos', { // 移除了 <ApiResponse<TodoItem>>
                method: 'POST',
                body: {content: content.trim(), important}, // 确保发送 trim 后的内容
            });
            if (response.success && response.todo) {
                await fetchTodos(); // 重新获取整个列表以保证顺序和一致性
                return response.todo;
            } else {
                throw new Error(response.error || '添加待办事项失败');
            }
        } catch (e) { // 原为: e: any
            error.value = e.message || '添加待办事项时发生未知错误';
            console.error("useTodos - addTodo error:", e);
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const updateTodo = async (id, updates) => { // 移除了参数类型
        isLoading.value = true;
        error.value = null;
        try {
            const response = await $fetch(`/api/todos/${id}`, { // 移除了 <ApiResponse<TodoItem>>
                method: 'PUT',
                body: updates,
            });
            if (response.success && response.todo) {
                await fetchTodos(); // 重新获取
                return response.todo;
            } else {
                throw new Error(response.error || '更新待办事项失败');
            }
        } catch (e) { // 原为: e: any
            error.value = e.message || '更新待办事项时发生未知错误';
            console.error("useTodos - updateTodo error:", e);
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteTodo = async (id) => { // 移除了参数类型
        isLoading.value = true;
        error.value = null;
        try {
            const response = await $fetch(`/api/todos/${id}`, { // 移除了 <ApiResponse>
                method: 'DELETE',
            });
            if (response.success) {
                await fetchTodos(); // 重新获取
                return true;
            } else {
                throw new Error(response.error || '删除待办事项失败');
            }
        } catch (e) { // 原为: e: any
            error.value = e.message || '删除待办事项时发生未知错误';
            console.error("useTodos - deleteTodo error:", e);
            return false;
        } finally {
            isLoading.value = false;
        }
    };
    // 辅助函数，用于切换完成状态
    const toggleComplete = async (todo) => {
        if (!todo || typeof todo.id === 'undefined') {
            console.error("useTodos - toggleComplete error: Invalid todo item provided.", todo);
            error.value = "无效的待办事项";
            return null;
        }
        return await updateTodo(todo.id, {completed: !todo.completed});
    };
    // 辅助函数，用于切换重要状态
    const toggleImportant = async (todo) => {
        if (!todo || typeof todo.id === 'undefined') {
            console.error("useTodos - toggleImportant error: Invalid todo item provided.", todo);
            error.value = "无效的待办事项";
            return null;
        }
        return await updateTodo(todo.id, {important: !todo.important});
    };
    return {
        todos,
        isLoading,
        error,
        fetchTodos,
        addTodo,
        updateTodo,
        deleteTodo,
        toggleComplete,
        toggleImportant,
    };
}