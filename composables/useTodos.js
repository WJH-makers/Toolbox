// composables/useTodos.js
import {ref} from 'vue';

function processTodoDates(todo) {
    const processedTodo = {...todo};
    if (todo.startDate) {
        processedTodo.startDate = new Date(todo.startDate);
    } else {
        processedTodo.startDate = null;
    }
    if (todo.endDate) {
        processedTodo.endDate = new Date(todo.endDate);
    } else {
        processedTodo.endDate = null;
    }
    processedTodo.createdAt = new Date(todo.createdAt);
    processedTodo.updatedAt = new Date(todo.updatedAt);
    return processedTodo;
}
export function useTodos() {
    const todos = ref([]); // This will hold objects of type TodoItem (including title, image, etc.)
    const isLoading = ref(false);
    const error = ref(null);
    const fetchTodos = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await $fetch('/api/todos', {method: 'GET'});
            if (response.success && Array.isArray(response.todos)) {
                todos.value = response.todos.map(processTodoDates);
            } else {
                error.value = response.error || '获取待办事项失败';
            }
        } catch (e) {
            console.error('[useTodos] fetchTodos Error:', e);
            error.value = e.data?.error || e.message || '获取待办事项时发生未知错误';
        } finally {
            isLoading.value = false;
        }
    };

    const addTodo = async (
        title,          // string, required
        content,        // string | null, optional
        important = false, // boolean, defaults to false
        startDate = null,  // Date | string | null, optional
        endDate = null,    // Date | string | null, optional
        image = null       // string | null, optional (Base64 or URL)
    ) => {
        isLoading.value = true;
        error.value = null;
        try {
            const bodyToApi = {
                title: title,
                important: important,
            };

            if (content === null || (typeof content === 'string' && content.trim() === '')) {
                bodyToApi.content = null;
            } else if (typeof content === 'string') {
                bodyToApi.content = content;
            } else {
                bodyToApi.content = null;
            }

            if (image === null || (typeof image === 'string' && image.trim() === '')) {
                bodyToApi.image = null;
            } else if (typeof image === 'string') {
                bodyToApi.image = image;
            } else {
                bodyToApi.image = null;
            }

            if (startDate) {
                bodyToApi.startDate = (startDate instanceof Date) ? startDate.toISOString() : new Date(startDate).toISOString();
            } else {
                bodyToApi.startDate = null;
            }
            if (endDate) {
                bodyToApi.endDate = (endDate instanceof Date) ? endDate.toISOString() : new Date(endDate).toISOString();
            } else {
                bodyToApi.endDate = null;
            }
            console.log('[useTodos] Sending body to POST /api/todos:', bodyToApi);

            const response = await $fetch('/api/todos', {
                method: 'POST',
                body: bodyToApi,
            });

            if (response.success && response.todo) {
                const newTodo = processTodoDates(response.todo);
                todos.value.unshift(newTodo);
                return newTodo;
            } else {
                error.value = response.error || '添加待办事项失败';
                console.error('[useTodos] addTodo failed response:', response);
                return null;
            }
        } catch (e) {
            console.error('[useTodos] addTodo Error:', e);
            error.value = e.data?.error || e.message || '添加待办事项时发生未知错误';
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const updateTodo = async (id, updates) => {
        isLoading.value = true;
        error.value = null;
        try {
            // Clone updates to avoid mutating original object, especially if it's reactive
            const bodyToSend = {...updates};

            // Ensure date fields are ISO strings or null
            ['startDate', 'endDate'].forEach(dateKey => {
                if (Object.prototype.hasOwnProperty.call(bodyToSend, dateKey)) {
                    const dateVal = bodyToSend[dateKey];
                    if (dateVal === null) {
                        bodyToSend[dateKey] = null;
                    } else if (dateVal) { // If truthy (not null, not empty string etc.)
                        const parsedDate = new Date(dateVal); // Handles Date objects and valid date strings
                        if (!isNaN(parsedDate.getTime())) {
                            bodyToSend[dateKey] = parsedDate.toISOString();
                        } else {
                            console.warn(`[useTodos] Invalid date string for ${dateKey} in update:`, dateVal);
                            bodyToSend[dateKey] = undefined;
                        }
                    } else {
                        bodyToSend[dateKey] = null;
                    }
                }
            });

            if (Object.prototype.hasOwnProperty.call(bodyToSend, 'content') && bodyToSend.content === '') {
                bodyToSend.content = null;
            }
            if (Object.prototype.hasOwnProperty.call(bodyToSend, 'image') && bodyToSend.image === '') {
                bodyToSend.image = null;
            }

            console.log(`[useTodos] Sending body to PUT /api/todos/${id}:`, bodyToSend);

            const response = await $fetch(`/api/todos/${id}`, {
                method: 'PUT',
                body: bodyToSend,
            });

            if (response.success && response.todo) {
                const updatedItemFromServer = processTodoDates(response.todo);
                const index = todos.value.findIndex(t => t.id === id);
                if (index !== -1) {
                    todos.value.splice(index, 1, updatedItemFromServer); // Ensures reactivity
                }
                return updatedItemFromServer;
            } else {
                error.value = response.error || '更新待办事项失败';
                console.error('[useTodos] updateTodo failed response:', response);
                return null;
            }
        } catch (e) {
            console.error('[useTodos] updateTodo Error:', e);
            error.value = e.data?.error || e.message || '更新待办事项时发生未知错误';
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
                todos.value = todos.value.filter(t => t.id !== id);
                return true;
            } else {
                error.value = response.error || '删除待办事项失败';
                return false;
            }
        } catch (e) {
            console.error('[useTodos] deleteTodo Error:', e);
            error.value = e.data?.error || e.message || '删除待办事项时发生未知错误';
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
        // The 'updates' object should match the fields expected by the PUT API and Prisma schema
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