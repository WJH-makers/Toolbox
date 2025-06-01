// composables/useTodos.js
import {ref} from 'vue';

// Helper function to process date fields from API response
function processTodoDates(todo) {
    return {
        ...todo,
        startDate: todo.startDate ? new Date(todo.startDate) : null,
        endDate: todo.endDate ? new Date(todo.endDate) : null,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
    };
}

export function useTodos() {
    const todos = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    const fetchTodos = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            // Assuming $fetch is globally available (e.g., via Nuxt)
            const response = await $fetch('/api/todos', {method: 'GET'});
            if (response.success && response.todos) {
                todos.value = response.todos.map(processTodoDates);
            } else {
                throw new Error(response.error || '获取待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '获取待办事项时发生未知错误';
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
                const newTodo = processTodoDates(response.todo);
                todos.value.unshift(newTodo); // Add to the beginning of the list
                return newTodo;
            } else {
                throw new Error(response.error || '添加待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '添加待办事项时发生未知错误';
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

            // Consolidate date processing for updates
            ['startDate', 'endDate'].forEach(dateKey => {
                if (Object.prototype.hasOwnProperty.call(bodyToSend, dateKey)) {
                    if (bodyToSend[dateKey]) {
                        const dateVal = bodyToSend[dateKey];
                        if (dateVal instanceof Date) {
                            bodyToSend[dateKey] = dateVal.toISOString();
                        } else if (typeof dateVal === 'string') {
                            const parsedDate = new Date(dateVal);
                            if (!isNaN(parsedDate.getTime())) {
                                bodyToSend[dateKey] = parsedDate.toISOString();
                            } else {
                                bodyToSend[dateKey] = null;
                            }
                        }
                    } else {
                        bodyToSend[dateKey] = null; // Ensure falsy values become null for API
                    }
                }
            });


            const response = await $fetch(`/api/todos/${id}`, {
                method: 'PUT',
                body: bodyToSend,
            });

            if (response.success && response.todo) {
                const updatedItemFromServer = processTodoDates(response.todo);
                const index = todos.value.findIndex(t => t.id === id);
                if (index !== -1) {
                    todos.value[index] = updatedItemFromServer; // Reactive update
                }
                return updatedItemFromServer;
            } else {
                throw new Error(response.error || '更新待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '更新待办事项时发生未知错误';
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
                // --- MODIFICATION START for deleteTodo ---
                todos.value = todos.value.filter(t => t.id !== id); // Remove item locally
                // --- MODIFICATION END for deleteTodo ---
                return true;
            } else {
                throw new Error(response.error || '删除待办事项失败');
            }
        } catch (e) {
            error.value = e.message || '删除待办事项时发生未知错误';
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const toggleComplete = async (todo) => {
        if (!todo || typeof todo.id === 'undefined') {
            error.value = "无效的待办事项";
            return null;
        }
        return await updateTodo(todo.id, {completed: !todo.completed});
    };

    const toggleImportant = async (todo) => {
        if (!todo || typeof todo.id === 'undefined') {
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