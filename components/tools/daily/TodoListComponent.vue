<template>
  <div class="todo-page-container">
    <h2 style="text-align: center;">我的待办事项</h2>

    <form class="add-todo-form" @submit.prevent="handleAddItem">
      <div class="form-item">
        <label for="todo-content">待办内容</label>
        <textarea
            id="todo-content"
            v-model="newItemContent"
            placeholder="添加新的待办事项内容..."
            rows="3"
            :disabled="isLoading"
        />
      </div>
      <div class="form-grid">
        <div class="form-item">
          <label for="todo-start-date">开始时间 (可选)</label>
          <input
              id="todo-start-date"
              v-model="newItemStartDate"
              type="datetime-local"
              :disabled="isLoading"
          >
        </div>
        <div class="form-item">
          <label for="todo-end-date">结束时间 (可选)</label>
          <input
              id="todo-end-date"
              v-model="newItemEndDate"
              type="datetime-local"
              :disabled="isLoading"
          >
        </div>
      </div>
      <button :disabled="isLoading || !newItemContent.trim()" type="submit">
        {{ isLoading ? '添加中...' : '添加' }}
      </button>
    </form>

    <div v-if="error" class="error-alert">
      <strong>错误</strong>
      <p>{{ error }}</p>
      <button class="close-alert-button" @click="error = null">×</button>
    </div>

    <h3>进行中 ({{ activeTodos.length }})</h3>
    <div
        v-if="isLoading && !activeTodos.length && !expiredTodos.length && !completedTodos.length"
        class="loading-spinner">
      加载中...
    </div>
    <ul v-if="activeTodos.length" class="todo-items-list">
      <li v-for="item in activeTodos" :key="item.id" class="todo-item">
        <div class="todo-item-prefix">
          <input :checked="item.completed" type="checkbox" @change="() => handleToggleComplete(item)">
        </div>
        <div class="todo-item-content">
          <span :class="{ 'completed-text': item.completed }">{{ item.content }}</span>
          <div v-if="item.startDate || item.endDate" class="todo-item-description">
            <span v-if="item.startDate" class="todo-tag todo-tag-info">
              起: {{ formatDate(item.startDate, 'yyyy-MM-dd HH:mm') }}
            </span>
            <span
                v-if="item.endDate"
                :class="!item.completed && item.endDate && new Date(item.endDate) < now ? 'todo-tag-error' : 'todo-tag-info'"
                class="todo-tag"
            >
              止: {{ formatDate(item.endDate, 'yyyy-MM-dd HH:mm') }}
              <span v-if="!item.completed && item.endDate && new Date(item.endDate) < now"> (已过期)</span>
            </span>
          </div>
        </div>
        <div class="todo-item-suffix">
          <button
              :aria-pressed="!!item.important"
              :class="{ 'is-important': item.important }"
              :title="item.important ? '取消重要' : '标记为重要'"
              class="action-button button-toggle-important"
              @click="() => handleToggleImportant(item)"
          >
            <span class="icon">{{ item.important ? '★' : '☆' }}</span>
            <span class="text">{{ item.important ? '重要' : '一般' }}</span>
          </button>
          <button
              class="action-button button-delete"
              title="删除此待办事项"
              @click="() => confirmDeleteItem(item.id)"
          >
            <span class="icon">🗑️</span>
            <span class="text">删除</span>
          </button>
        </div>
      </li>
    </ul>
    <div
        v-if="!isLoading && !activeTodos.length && !expiredTodos.length && !completedTodos.length && !error"
        class="empty-state"
    >
      太棒了，当前没有进行中的待办事项！
    </div>

    <template v-if="expiredTodos.length > 0">
      <h3 class="expired-title">已过期未完成 ({{ expiredTodos.length }})</h3>
      <ul class="todo-items-list">
        <li v-for="item in expiredTodos" :key="item.id" class="todo-item">
          <div class="todo-item-prefix">
            <input :checked="item.completed" type="checkbox" @change="() => handleToggleComplete(item)">
          </div>
          <div class="todo-item-content">
            <span class="expired-text">{{ item.content }}</span>
            <div v-if="item.startDate || item.endDate" class="todo-item-description">
              <span v-if="item.startDate" class="todo-tag todo-tag-info">
                起: {{ formatDate(item.startDate, 'yyyy-MM-dd HH:mm') }}
              </span>
              <span v-if="item.endDate" class="todo-tag todo-tag-error">
                已于 {{ formatDate(item.endDate, 'yyyy-MM-dd HH:mm') }} 过期
              </span>
            </div>
          </div>
          <div class="todo-item-suffix">
            <button
                :aria-pressed="!!item.important"
                :class="{ 'is-important': item.important }"
                :title="item.important ? '取消重要' : '标记为重要'"
                class="action-button button-toggle-important"
                @click="() => handleToggleImportant(item)"
            >
              <span class="icon">{{ item.important ? '★' : '☆' }}</span>
              <span class="text">{{ item.important ? '重要' : '一般' }}</span>
            </button>
            <button
                class="action-button button-delete"
                title="删除此待办事项"
                @click="() => confirmDeleteItem(item.id)"
            >
              <span class="icon">🗑️</span>
              <span class="text">删除</span>
            </button>
          </div>
        </li>
      </ul>
    </template>

    <template v-if="completedTodos.length > 0">
      <h3 class="completed-title">已完成 ({{ completedTodos.length }})</h3>
      <ul class="todo-items-list">
        <li v-for="item in completedTodos" :key="item.id" class="todo-item">
          <div class="todo-item-prefix">
            <input :checked="item.completed" type="checkbox" @change="() => handleToggleComplete(item)">
          </div>
          <div class="todo-item-content">
            <span class="completed-text">{{ item.content }}</span>
            <div v-if="item.startDate || item.endDate" class="todo-item-description">
              <span v-if="item.startDate" class="todo-tag todo-tag-info">
                起: {{ formatDate(item.startDate, 'yyyy-MM-dd HH:mm') }}
              </span>
              <span v-if="item.endDate" class="todo-tag todo-tag-info">
                止: {{ formatDate(item.endDate, 'yyyy-MM-dd HH:mm') }}
              </span>
            </div>
          </div>
          <div class="todo-item-suffix">
            <button
                :aria-pressed="!!item.important"
                :class="{ 'is-important': item.important }"
                :title="item.important ? '取消重要' : '标记为重要'"
                class="action-button button-toggle-important"
                @click="() => handleToggleImportant(item)"
            >
              <span class="icon">{{ item.important ? '★' : '☆' }}</span>
              <span class="text">{{ item.important ? '重要' : '一般' }}</span>
            </button>
            <button
                class="action-button button-delete"
                title="删除此待办事项"
                @click="() => confirmDeleteItem(item.id)"
            >
              <span class="icon">🗑️</span>
              <span class="text">删除</span>
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed, type Ref} from 'vue';
import {useTodos} from '~/composables/useTodos'; // 确保路径正确
import type {TodoItem} from '~/types/todo'; // 确保路径正确
import {format as formatDateFns} from 'date-fns';

interface UseTodosReturnType {
  todos: Ref<TodoItem[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  fetchTodos: () => Promise<void>;
  addTodo: (content: string, important?: boolean, startDate?: string | Date | null, endDate?: string | Date | null) => Promise<TodoItem | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleComplete: (item: TodoItem) => Promise<TodoItem | null>; // 这应该是你调用的 composable 中的函数
  toggleImportant: (item: TodoItem) => Promise<TodoItem | null>; // 这应该是你调用的 composable 中的函数
  updateTodo: (id: string, updates: {
    content?: string;
    completed?: boolean;
    important?: boolean;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
  }) => Promise<TodoItem | null>;
}

const {
  todos,
  isLoading,
  error,
  fetchTodos,
  addTodo,
  deleteTodo,
  toggleComplete: toggleCompleteInComposable, // 重命名以避免与组件内方法冲突 (如果需要)
  toggleImportant: toggleImportantInComposable // 重命名以避免与组件内方法冲突 (如果需要)
} = useTodos() as UseTodosReturnType;

const newItemContent = ref('');
const newItemStartDate = ref<string | null>(null);
const newItemEndDate = ref<string | null>(null);

onMounted(() => {
  fetchTodos();
});

const now = new Date();
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const activeTodos = computed(() =>
    todos.value
        .filter(todo => !todo.completed && (!todo.endDate || new Date(todo.endDate) >= todayStart))
        .sort((a, b) => {
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
          if (aEnd !== bEnd) return aEnd - bEnd;
          const aStart = a.startDate ? new Date(a.startDate).getTime() : Infinity;
          const bStart = b.startDate ? new Date(b.startDate).getTime() : Infinity;
          return aStart - bStart;
        })
);

const expiredTodos = computed(() =>
    todos.value
        .filter(todo => !todo.completed && todo.endDate && new Date(todo.endDate) < todayStart)
        .sort((a, b) => new Date(b.endDate!).getTime() - new Date(a.endDate!).getTime())
);

const completedTodos = computed(() =>
    todos.value
        .filter(todo => todo.completed)
        .sort((a, b) => {
          const dateA = a.updatedAt || a.createdAt; // 确保 TodoItem 类型有这些属性
          const dateB = b.updatedAt || b.createdAt; // 确保 TodoItem 类型有这些属性
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
);

const handleAddItem = async () => {
  if (!newItemContent.value.trim()) return;
  let startDateValue: Date | null = null;
  if (newItemStartDate.value) {
    startDateValue = new Date(newItemStartDate.value);
    if (isNaN(startDateValue.getTime())) {
      error.value = "无效的开始时间格式";
      return;
    }
  }
  let endDateValue: Date | null = null;
  if (newItemEndDate.value) {
    endDateValue = new Date(newItemEndDate.value);
    if (isNaN(endDateValue.getTime())) {
      error.value = "无效的结束时间格式";
      return;
    }
  }
  if (startDateValue && endDateValue && startDateValue.getTime() >= endDateValue.getTime()) {
    error.value = "结束时间必须晚于开始时间";
    return;
  }
  error.value = null;
  const added = await addTodo(newItemContent.value.trim(), false, startDateValue, endDateValue);
  if (added) {
    newItemContent.value = '';
    newItemStartDate.value = null;
    newItemEndDate.value = null;
  }
};

const confirmDeleteItem = (id: string) => {
  if (window.confirm('确定要删除这个待办事项吗？')) {
    deleteTodo(id); // 这个应该也会在 useTodos 中处理乐观更新或数据重载
  }
};

// 组件内的方法，调用从 useTodos 获取的函数
const handleToggleComplete = async (item: TodoItem) => {
  // 直接调用从 useTodos composable 中解构出来的 toggleComplete 函数
  // 它应该负责API调用和对 'todos' ref 内具体条目的响应式更新
  await toggleCompleteInComposable(item);
};

const handleToggleImportant = async (item: TodoItem) => {
  // 直接调用从 useTodos composable 中解构出来的 toggleImportant 函数
  await toggleImportantInComposable(item);
};

const formatDate = (dateInput: string | Date | null | undefined, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '无效日期';
    return formatDateFns(date, formatString);
  } catch (e) {
    return '日期格式化错误';
  }
};
</script>

<style scoped>
.todo-page-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
}

.add-todo-form {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.add-todo-form label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
}

.add-todo-form input[type="datetime-local"],
.add-todo-form textarea {
  width: 100%;
  padding: 8px;
  margin-bottom: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.add-todo-form textarea {
  resize: vertical;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.add-todo-form button[type="submit"] {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
}

.add-todo-form button[type="submit"]:disabled {
  background-color: #ccc;
}

.error-alert {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 20px;
  position: relative;
}

.error-alert strong {
  font-weight: bold;
}

.close-alert-button {
  position: absolute;
  top: 5px;
  right: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #721c24;
}


h3 {
  margin-top: 20px;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.loading-spinner {
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: #555;
}

.todo-items-list {
  list-style-type: none;
  padding: 0;
  background-color: #F7F7F9;
  border: 1px solid #eee;
  border-radius: 4px;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item-prefix {
  margin-right: 12px;
}

.todo-item-prefix input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.todo-item-content {
  flex-grow: 1;
  color: #333333;
}

.todo-item-description {
  font-size: 0.9em;
  color: #555;
  margin-top: 4px;
}

.todo-item-description .todo-tag {
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.8em;
  border-radius: 3px;
  margin-right: 5px;
  margin-top: 3px;
}

.todo-tag-info {
  background-color: #e0f2f7;
  color: #007bff;
  border: 1px solid #b3e0ff;
}

.todo-tag-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* --- STANDARDIZED BUTTON STYLES START --- */
.todo-item-suffix {
  margin-left: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  line-height: 1.4;
}

.action-button .icon {
  display: inline-flex;
  font-size: 1.1em;
  line-height: 1;
}

.action-button .text {
  display: inline-block;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.action-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.action-button:focus-visible {
  outline: 2px solid #4a90e2; /* Replaced var(--color-primary-focus-ring, #4a90e2) */
  outline-offset: 2px;
}

.button-toggle-important {
  background-color: #f7f9fc; /* Replaced var(--button-default-bg, #f7f9fc) */
  color: #5a677d; /* Replaced var(--button-default-text, #5a677d) */
  border-color: #e3e8f0; /* Replaced var(--button-default-border, #e3e8f0) */
}

.button-toggle-important .icon {
  color: #8896aa; /* Replaced var(--button-default-icon, #8896aa) */
}

.button-toggle-important:hover {
  background-color: #ffffff; /* Replaced var(--button-default-bg-hover, #ffffff) */
  border-color: #cbd2dc; /* Replaced var(--button-default-border-hover, #cbd2dc) */
  color: #3c4a5f; /* Replaced var(--button-default-text-hover, #3c4a5f) */
}

.button-toggle-important:hover .icon {
  color: #6c7a8f; /* Replaced var(--button-default-icon-hover, #6c7a8f) */
}

.button-toggle-important.is-important {
  background-color: #fff9e6; /* Replaced var(--button-warning-bg, #fff9e6) */
  color: #8c5c00; /* Replaced var(--button-warning-text, #8c5c00) */
  border-color: #ffe69b; /* Replaced var(--button-warning-border, #ffe69b) */
}

.button-toggle-important.is-important .icon {
  color: #ffc107; /* Replaced var(--button-warning-icon, #ffc107) */
}

.button-toggle-important.is-important:hover {
  background-color: #ffeebb; /* Replaced var(--button-warning-bg-hover, #ffeebb) */
  border-color: #ffd761; /* Replaced var(--button-warning-border-hover, #ffd761) */
}

.button-delete {
  background-color: #fde8e8; /* Replaced var(--button-danger-bg, #fde8e8) */
  color: #c53030; /* Replaced var(--button-danger-text, #c53030) */
  border-color: #f5c6cb; /* Replaced var(--button-danger-border, #f5c6cb) */
}

.button-delete .icon {
  color: #e53e3e; /* Replaced var(--button-danger-icon, #e53e3e) */
}

.button-delete:hover {
  background-color: #f8d7da; /* Replaced var(--button-danger-bg-hover, #f8d7da) */
  color: #9b2c2c; /* Replaced var(--button-danger-text-hover, #9b2c2c) */
  border-color: #f1b0b7; /* Replaced var(--button-danger-border-hover, #f1b0b7) */
  box-shadow: 0 3px 6px rgba(197, 48, 48, 0.15);
}

/* --- STANDARDIZED BUTTON STYLES END --- */

.completed-text {
  text-decoration: line-through;
  color: #000000;
}

.expired-text {
  color: red;
  font-weight: bold;
}

.expired-title {
  color: red !important;
}

.completed-title {
  color: green !important;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #777;
  background-color: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 4px;
}
</style>