<template>
  <div class="todo-list-container">
    <h2>我的待办事项</h2>

    <form class="add-todo-form" @submit.prevent="handleAddItem">
      <input
          v-model="newItemContent"
          type="text"
          placeholder="添加新的待办..."
          :disabled="isLoading"
      >
      <button type="submit" :disabled="isLoading || !newItemContent.trim()">
        {{ isLoading ? '添加中...' : '添加' }}
      </button>
    </form>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="isLoading && !todos.length" class="loading-message">加载中...</div>

    <ul v-if="todos.length" class="todo-items-list">
      <li
          v-for="item in todos"
          :key="item.id"
          :class="{ completed: item.completed, important: item.important }"
          class="todo-item"
      >
        <div class="todo-content" @click="handleToggleComplete(item)">
          <input
              type="checkbox"
              :checked="item.completed"
              class="todo-checkbox"
              @change="handleToggleComplete(item)"
          >
          <span class="item-text">{{ item.content }}</span>
        </div>
        <div class="todo-actions">
          <button
              :class="['importance-toggle', item.important ? 'is-important' : 'is-general']"
              title="标记重要/一般"
              @click="handleToggleImportant(item)"
          >
            <span v-if="item.important">重要</span>
            <span v-else>一般</span>
          </button>
          <button class="delete-button" title="删除" @click="handleDeleteItem(item.id)">
            🗑️
          </button>
        </div>
      </li>
    </ul>
    <div v-if="!isLoading && !todos.length && !error" class="empty-message">
      太棒了，没有待办事项！或者添加一个？
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'; // 修改：导入 Ref 类型
import { useTodos } from '~/composables/useTodos';
import type { TodoItem } from '~/types/todo';   // 确保 '~/types/todo.ts' 文件存在且正确导出了 TodoItem

interface UseTodosReturnType {
  todos: Ref<TodoItem[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  fetchTodos: () => Promise<void>;
  addTodo: (content: string, important?: boolean) => Promise<TodoItem | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleComplete: (item: TodoItem) => Promise<TodoItem | null>;
  toggleImportant: (item: TodoItem) => Promise<TodoItem | null>;
}

const {
  todos,
  isLoading,
  error,
  fetchTodos,
  addTodo,
  deleteTodo,
  toggleComplete,
  toggleImportant
} = useTodos() as UseTodosReturnType; // 修改：在这里添加类型断言

const newItemContent = ref('');

onMounted(() => {
  fetchTodos();
});

const handleAddItem = async () => {
  if (!newItemContent.value.trim()) return;
  const added = await addTodo(newItemContent.value.trim()); // 确保传递 trim 后的内容
  if (added) {
    newItemContent.value = ''; // 清空输入框
  }
};

const handleDeleteItem = async (id: string) => {
  if (confirm('确定要删除这个待办事项吗？')) {
    await deleteTodo(id);
  }
};

const handleToggleComplete = async (item: TodoItem) => {
  await toggleComplete(item);
};

const handleToggleImportant = async (item: TodoItem) => {
  await toggleImportant(item);
};
</script>

<style scoped>
.todo-list-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1.5rem;
  background-color: var(--content-box-background);
  border-radius: 8px;
  box-shadow: var(--shadow-elevation-medium, 0 4px 12px rgba(0, 0, 0, 0.1));
}

.todo-list-container h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--color-text);
}

.add-todo-form {
  display: flex;
  margin-bottom: 1.5rem;
}

.add-todo-form input[type="text"] {
  flex-grow: 1;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px 0 0 4px;
  font-size: 1rem;
}

.add-todo-form button {
  padding: 0.75rem 1rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.add-todo-form button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.add-todo-form button:disabled {
  background-color: #ccc; /* 考虑也使用CSS变量，例如 --button-disabled-bg */
  cursor: not-allowed;
}

.error-message {
  color: var(--error-text-color); /* 使用变量 */
  background-color: var(--error-bg); /* 使用变量 */
  border: 1px solid var(--error-border-color); /* 使用变量 */
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  text-align: center;
}

.loading-message, .empty-message {
  text-align: center;
  color: var(--color-text-muted);
  padding: 1rem;
}

.todo-items-list {
  list-style-type: none;
  padding: 0;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--color-border-light);
  transition: background-color 0.2s;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background-color: var(--color-background-mute);
}

.todo-item.completed .item-text {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.todo-item.important .item-text {
  font-weight: bold;
}

.todo-item.important .importance-toggle.is-important {
  background-color: var(--color-warning);
  color: white; /* 通常与亮色背景搭配，暗色主题可能需要调整文字颜色 */
}


.todo-content {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-grow: 1;
}

.todo-checkbox {
  margin-right: 0.75rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.item-text {
  font-size: 1rem;
  color: var(--color-text);
}

.todo-actions button {
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  margin-left: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: background-color 0.2s, border-color 0.2s;
}

.importance-toggle {
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.importance-toggle:hover {
  background-color: var(--color-background-mute);
}


.delete-button {
  color: var(--color-danger); /* 使用 --color-danger 替代 --error-text-color，如果定义了的话 */
  font-size: 1.2rem;
}

.delete-button:hover {
  background-color: var(--color-danger-soft-bg); /* 使用 --color-danger-soft-bg 替代 --error-bg，如果定义了的话 */
}
</style>