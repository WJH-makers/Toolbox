<template>
  <div class="todo-list-container">
    <h2>我的待办事项</h2>

    <form class="add-todo-form" @submit.prevent="handleAddItem">
      <textarea
          v-model="newItemContent"
          placeholder="添加新的待办事项内容..."
          :disabled="isLoading"
          class="todo-input-content"
          rows="3"
      ></textarea>
      <div class="date-inputs-container">
        <div class="date-input-group">
          <label for="newItemStartDate">开始时间 (可选)</label>
          <input
              id="newItemStartDate"
              type="datetime-local"
              v-model="newItemStartDate"
              :disabled="isLoading"
              class="todo-input-datetime"
          />
        </div>
        <div class="date-input-group">
          <label for="newItemEndDate">结束时间 (可选)</label>
          <input
              id="newItemEndDate"
              type="datetime-local"
              v-model="newItemEndDate"
              :disabled="isLoading"
              class="todo-input-datetime"
          />
        </div>
      </div>
      <button type="submit" :disabled="isLoading || !newItemContent.trim()">
        {{ isLoading ? '添加中...' : '添加' }}
      </button>
    </form>

    <div v-if="error" class="error-message">{{ error }}</div>

    <h3>进行中 ({{ activeTodos.length }})</h3>
    <div v-if="isLoading && !activeTodos.length && !expiredTodos.length && !completedTodos.length"
         class="loading-message">加载中...
    </div>
    <ul v-if="activeTodos.length" class="todo-items-list active-todos">
      <li
          v-for="item in activeTodos"
          :key="item.id"
          :class="{ completed: item.completed, important: item.important }"
          class="todo-item"
      >
        <div class="todo-main">
          <div class="todo-content" @click="handleToggleComplete(item)">
            <input
                type="checkbox"
                :checked="item.completed"
                class="todo-checkbox"
                @change.stop="handleToggleComplete(item)"
            >
            <span class="item-text">{{ item.content }}</span>
          </div>
          <div class="todo-dates">
            <span v-if="item.startDate" class="date-chip">起: {{ formatDate(item.startDate) }}</span>
            <span v-if="item.endDate" class="date-chip end-date"
                  :class="{'is-past-due': !item.completed && item.endDate && new Date(item.endDate) < now}">
              止: {{ formatDate(item.endDate) }}
            </span>
          </div>
        </div>
        <div class="todo-actions">
          <button
              :class="['importance-toggle', item.important ? 'is-important' : 'is-general']"
              title="标记重要/一般"
              @click="handleToggleImportant(item)"
          >
            <span v-if="item.important">🌟 重要</span>
            <span v-else>⚪ 一般</span>
          </button>
          <button class="delete-button" title="删除" @click="handleDeleteItem(item.id)">
            🗑️
          </button>
        </div>
      </li>
    </ul>
    <div v-if="!isLoading && !activeTodos.length && !expiredTodos.length && !completedTodos.length && !error"
         class="empty-message">
      太棒了，当前没有待办事项！
    </div>

    <template v-if="expiredTodos.length > 0">
      <h3 class="expired-title">已过期未完成 ({{ expiredTodos.length }})</h3>
      <ul class="todo-items-list expired-todos">
        <li
            v-for="item in expiredTodos"
            :key="item.id"
            :class="{ important: item.important, expired: true }"
            class="todo-item"
        >
          <div class="todo-main">
            <div class="todo-content" @click="handleToggleComplete(item)">
              <input
                  type="checkbox"
                  :checked="item.completed"
                  class="todo-checkbox"
                  @change.stop="handleToggleComplete(item)"
              >
              <span class="item-text">{{ item.content }}</span>
            </div>
            <div class="todo-dates">
              <span v-if="item.startDate" class="date-chip">起: {{ formatDate(item.startDate) }}</span>
              <span v-if="item.endDate" class="date-chip end-date is-past-due">
                已于 {{ formatDate(item.endDate) }} 过期
                </span>
            </div>
          </div>
          <div class="todo-actions">
            <button
                :class="['importance-toggle', item.important ? 'is-important' : 'is-general']"
                title="标记重要/一般"
                @click="handleToggleImportant(item)"
            >
              <span v-if="item.important">🌟 重要</span>
              <span v-else>⚪ 一般</span>
            </button>
            <button class="delete-button" title="删除" @click="handleDeleteItem(item.id)">
              🗑️
            </button>
          </div>
        </li>
      </ul>
    </template>

    <template v-if="completedTodos.length > 0">
      <h3 class="completed-title">已完成 ({{ completedTodos.length }})</h3>
      <ul class="todo-items-list completed-todos">
        <li
            v-for="item in completedTodos"
            :key="item.id"
            :class="{ completed: true, important: item.important }"
            class="todo-item"
        >
          <div class="todo-main">
            <div class="todo-content" @click="handleToggleComplete(item)">
              <input
                  type="checkbox"
                  :checked="item.completed"
                  class="todo-checkbox"
                  @change.stop="handleToggleComplete(item)"
              >
              <span class="item-text">{{ item.content }}</span>
            </div>
            <div class="todo-dates">
              <span v-if="item.startDate" class="date-chip">起: {{ formatDate(item.startDate) }}</span>
              <span v-if="item.endDate" class="date-chip end-date">
                  止: {{ formatDate(item.endDate) }}
                </span>
            </div>
          </div>
          <div class="todo-actions">
            <button
                :class="['importance-toggle', item.important ? 'is-important' : 'is-general']"
                title="标记重要/一般"
                @click="handleToggleImportant(item)"
            >
              <span v-if="item.important">🌟 重要</span>
              <span v-else>⚪ 一般</span>
            </button>
            <button class="delete-button" title="删除" @click="handleDeleteItem(item.id)">
              🗑️
            </button>
          </div>
        </li>
      </ul>
    </template>

  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed, type Ref} from 'vue';
import {useTodos} from '~/composables/useTodos';
import type {TodoItem} from '~/types/todo';

interface UseTodosReturnType {
  todos: Ref<TodoItem[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  fetchTodos: () => Promise<void>;
  addTodo: (content: string, important?: boolean, startDate?: string | Date | null, endDate?: string | Date | null) => Promise<TodoItem | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleComplete: (item: TodoItem) => Promise<TodoItem | null>;
  toggleImportant: (item: TodoItem) => Promise<TodoItem | null>;
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
  toggleComplete,
  toggleImportant
} = useTodos() as UseTodosReturnType;

const newItemContent = ref('');
const newItemStartDate = ref('');
const newItemEndDate = ref('');

onMounted(() => {
  fetchTodos();
});

const now = new Date(); // 'now' and 'todayStart' should be reactive or updated if tasks can span across day changes without page reload
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
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
);

const handleAddItem = async () => {
  if (!newItemContent.value.trim()) return;
  const startDateValue = newItemStartDate.value ? new Date(newItemStartDate.value) : null;
  const endDateValue = newItemEndDate.value ? new Date(newItemEndDate.value) : null;

  if (startDateValue && endDateValue && startDateValue >= endDateValue) {
    error.value = "结束时间必须晚于开始时间";
    return;
  }
  error.value = null;

  const added = await addTodo(newItemContent.value.trim(), false, startDateValue, endDateValue);
  if (added) {
    newItemContent.value = '';
    newItemStartDate.value = '';
    newItemEndDate.value = '';
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

const formatDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '无效日期';
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(/\//g, '-');
};

</script>

<style scoped>
/* 样式与上一版本相同，此处省略以保持简洁 */
.todo-list-container {
  max-width: 700px;
  margin: 2rem auto;
  padding: 1.5rem 2rem;
  background-color: var(--content-box-background, #fff);
  border-radius: 12px;
  box-shadow: var(--shadow-elevation-high, 0 8px 25px rgba(0, 0, 0, 0.1));
}

.todo-list-container h2,
.todo-list-container h3 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--color-text);
}

.todo-list-container h3 {
  margin-top: 2rem;
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border-light);
  padding-bottom: 0.5rem;
}

.expired-title {
  color: var(--color-danger, red);
  border-bottom-color: var(--color-danger, red);
}

.completed-title {
  color: var(--color-success-text, green);
  border-bottom-color: var(--color-success-text, green);
}

.add-todo-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
  align-items: flex-end;
}

.todo-input-content {
  flex: 1 1 100%;
  min-height: 60px;
  padding: 0.75rem;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 0.5rem;
}

.date-inputs-container {
  display: flex;
  gap: 0.75rem;
  flex-grow: 1;
  min-width: 380px;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  flex-basis: 50%;
}

.date-input-group label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.todo-input-datetime {
  padding: 0.65rem;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 6px;
  font-size: 0.9rem;
  background-color: var(--color-input-bg);
  color: var(--color-text);
  flex-grow: 1;
}

.add-todo-form button {
  padding: 0.7rem 1.2rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
  height: fit-content;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.85rem 0.5rem;
  border-bottom: 1px solid var(--color-border-light);
}

.todo-main {
  flex-grow: 1;
  margin-right: 1rem;
}

.todo-content {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0.3em;
}

.item-text {
  line-height: 1.4;
}

.todo-dates {
  font-size: 0.75em;
  color: var(--color-text-muted);
  margin-left: calc(18px + 0.75rem);
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}

.date-chip {
  display: inline-block;
  padding: 0.1em 0.4em;
  border-radius: 3px;
  background-color: var(--color-background-mute);
}

.date-chip.is-past-due,
.todo-item.expired .todo-dates .end-date {
  color: var(--color-danger);
  background-color: var(--color-danger-soft-bg);
  font-weight: bold;
}

.todo-item.expired .item-text {
  color: var(--color-danger);
}

.todo-item.completed .item-text {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.todo-item.completed.expired .item-text,
.todo-item.completed.expired .todo-dates .end-date {
  color: var(--color-text-muted);
  background-color: var(--color-background-mute);
  font-weight: normal;
}

.importance-toggle span {
  display: inline-block;
  padding: 0.2em 0.5em;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  font-size: 0.8rem;
}

.importance-toggle.is-important span {
  background-color: var(--color-warning);
  color: white;
  border-color: var(--color-warning);
}

.todo-actions button {
  padding: 0.2rem 0.4rem;
}

.error-message {
  color: var(--error-text-color);
  background-color: var(--error-bg);
  border: 1px solid var(--error-border-color);
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
</style>