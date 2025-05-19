// composables/useTodos.js
import {ref} from 'vue';

// 隐式的 TodoItem 结构应包含:
// id, content, completed, important, startDate?, endDate?, createdAt, updatedAt, userId

export function useTodos() {
    const todos = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    const fetchTodos = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await $fetch('/api/todos', {method: 'GET'});
            if (response.success && response.todos) {
                todos.value = response.todos.map(todo => ({
                    ...todo,
                    startDate: todo.startDate ? new Date(todo.startDate) : null,
                    endDate: todo.endDate ? new Date(todo.endDate) : null,
                    createdAt: new Date(todo.createdAt),
                    updatedAt: new Date(todo.updatedAt),
                }));
            } else {
                throw new Error(response.error || '获取待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '获取待办事项时发生未知错误';
            console.error("useTodos - fetchTodos error:", e);
        } finally {
            isLoading.value = false;
        }
    };

    const addTodo = async (content, important = false, startDate = null, endDate = null) => {
        if (!content || !content.trim()) {
            error.value = "内容不能为空";
            return null;
        }
        isLoading.value = true;
        error.value = null;
        try {
            const body = {
                content: content.trim(),
                important
            };
            if (startDate) {
                body.startDate = (startDate instanceof Date) ? startDate.toISOString() : startDate;
            }
            if (endDate) {
                body.endDate = (endDate instanceof Date) ? endDate.toISOString() : endDate;
            }

            const response = await $fetch('/api/todos', {
                method: 'POST',
                body,
            });
            if (response.success && response.todo) {
                await fetchTodos(); // 添加操作后通常刷新整个列表以确保排序等正确
                return response.todo;
            } else {
                throw new Error(response.error || '添加待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '添加待办事项时发生未知错误';
            console.error("useTodos - addTodo error:", e);
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const updateTodo = async (id, updates) => {
        isLoading.value = true;
        error.value = null;
        try {
            const bodyToSend = {...updates};

            if (bodyToSend.hasOwnProperty('startDate')) {
                if (bodyToSend.startDate && !(bodyToSend.startDate instanceof Date)) {
                    bodyToSend.startDate = new Date(bodyToSend.startDate);
                    if (isNaN(bodyToSend.startDate.getTime())) {
                        console.warn("UpdateTodo: Invalid startDate provided, sending as null.");
                        bodyToSend.startDate = null;
                    } else {
                        bodyToSend.startDate = bodyToSend.startDate.toISOString();
                    }
                } else if (bodyToSend.startDate instanceof Date) {
                    bodyToSend.startDate = bodyToSend.startDate.toISOString();
                }
            }
            if (bodyToSend.hasOwnProperty('endDate')) {
                if (bodyToSend.endDate && !(bodyToSend.endDate instanceof Date)) {
                    bodyToSend.endDate = new Date(bodyToSend.endDate);
                    if (isNaN(bodyToSend.endDate.getTime())) {
                        console.warn("UpdateTodo: Invalid endDate provided, sending as null.");
                        bodyToSend.endDate = null;
                    } else {
                        bodyToSend.endDate = bodyToSend.endDate.toISOString();
                    }
                } else if (bodyToSend.endDate instanceof Date) {
                    bodyToSend.endDate = bodyToSend.endDate.toISOString();
                }
            }

            const response = await $fetch(`/api/todos/${id}`, {
                method: 'PUT',
                body: bodyToSend,
            });

            if (response.success && response.todo) {
                // --- 修改开始 ---
                // 用服务器返回的已更新项来局部更新本地列表
                const updatedItemFromServer = {
                    ...response.todo,
                    // 确保日期字段是 Date 对象，与 fetchTodos 中处理一致
                    startDate: response.todo.startDate ? new Date(response.todo.startDate) : null,
                    endDate: response.todo.endDate ? new Date(response.todo.endDate) : null,
                    createdAt: new Date(response.todo.createdAt),
                    updatedAt: new Date(response.todo.updatedAt),
                };

                const index = todos.value.findIndex(t => t.id === id);
                if (index !== -1) {
                    todos.value[index] = updatedItemFromServer;
                } else {
                    // 如果在本地列表中找不到该项（理论上不应该发生于更新操作），
                    // 可以选择添加它，或者作为备选方案调用 fetchTodos()
                    // 这里为了保持请求的初衷（不刷新整个列表），我们只在找到时更新
                    // 如果需要更强的鲁棒性，可以考虑在此处添加或重新拉取
                    console.warn(`[useTodos] updateTodo: 更新的待办事项 (id: ${id}) 在本地列表中未找到。列表可能已过时。`);
                    // 为确保数据一致性，如果发生这种情况，可以考虑重新获取全部数据，但这违背了“不刷新”的初衷
                    // await fetchTodos();
                }
                // --- 修改结束 ---
                return updatedItemFromServer; // 返回更新后的项
            } else {
                throw new Error(response.error || '更新待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '更新待办事项时发生未知错误';
            console.error("useTodos - updateTodo error:", e);
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteTodo = async (id) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await $fetch(`/api/todos/${id}`, {
                method: 'DELETE',
            });
            if (response.success) {
                await fetchTodos(); // 删除操作后也通常刷新列表
                return true;
            } else {
                throw new Error(response.error || '删除待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '删除待办事项时发生未知错误';
            console.error("useTodos - deleteTodo error:", e);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const toggleComplete = async (todo) => {
        if (!todo || typeof todo.id === 'undefined') {
            error.value = "无效的待办事项";
            console.error("useTodos - toggleComplete error: Invalid todo item provided.", todo);
            return null;
        }
        return await updateTodo(todo.id, {completed: !todo.completed});
    };

    const toggleImportant = async (todo) => {
        if (!todo || typeof todo.id === 'undefined') {
            error.value = "无效的待办事项";
            console.error("useTodos - toggleImportant error: Invalid todo item provided.", todo);
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