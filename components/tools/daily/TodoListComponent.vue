<template>
  <n-space vertical :size="24">
    <n-h2 style="text-align: center;">我的待办事项</n-h2>

    <n-form class="add-todo-form" @submit.prevent="handleAddItem">
      <n-form-item-row label="待办内容">
        <n-input
            v-model:value="newItemContent"
            type="textarea"
            placeholder="添加新的待办事项内容..."
            :autosize="{ minRows: 3 }"
            :disabled="isLoading"
        />
      </n-form-item-row>
      <n-grid :cols="2" :x-gap="12">
        <n-form-item-gi label="开始时间 (可选)">
          <n-date-picker
              v-model:formatted-value="newItemStartDate"
              type="datetime"
              clearable
              format="yyyy-MM-dd HH:mm"
              value-format="yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
              style="width: 100%;"
              :disabled="isLoading"
          />
        </n-form-item-gi>
        <n-form-item-gi label="结束时间 (可选)">
          <n-date-picker
              v-model:formatted-value="newItemEndDate"
              type="datetime"
              clearable
              format="yyyy-MM-dd HH:mm"
              value-format="yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
              style="width: 100%;"
              :disabled="isLoading"
          />
        </n-form-item-gi>
      </n-grid>
      <n-button type="primary" attr-type="submit" :loading="isLoading" :disabled="!newItemContent.trim()">
        {{ isLoading ? '添加中...' : '添加' }}
      </n-button>
    </n-form>

    <n-alert v-if="error" title="错误" type="error" closable @close="error = null">
      {{ error }}
    </n-alert>

    <n-h3>进行中 ({{ activeTodos.length }})</n-h3>
    <n-spin :show="isLoading && !activeTodos.length && !expiredTodos.length && !completedTodos.length">
      <n-list v-if="activeTodos.length" bordered class="todo-items-list">
        <n-list-item v-for="item in activeTodos" :key="item.id">
          <template #prefix>
            <n-checkbox :checked="item.completed" @update:checked="() => handleToggleComplete(item)"/>
          </template>
          <template #suffix>
            <n-space>
              <n-button
                  size="small"
                  :type="item.important ? 'warning' : 'default'"
                  ghost
                  @click="() => handleToggleImportant(item)"
              >
                <template #icon>
                  <n-icon>
                    <StarIcon/>
                  </n-icon>
                </template>
                {{ item.important ? '重要' : '一般' }}
              </n-button>
              <n-button size="small" type="error" ghost @click="() => confirmDeleteItem(item.id)">
                <template #icon>
                  <n-icon>
                    <DeleteIcon/>
                  </n-icon>
                </template>
                删除
              </n-button>
            </n-space>
          </template>
          <n-thing style="cursor: pointer;" @click="() => handleToggleComplete(item)">
            <template #header>
              <span :class="{ 'completed-text': item.completed }">{{ item.content }}</span>
            </template>
            <template #description>
              <n-space v-if="item.startDate || item.endDate" vertical size="small">
                <n-tag v-if="item.startDate" size="small" type="info">
                  起: {{ formatDate(item.startDate, 'yyyy-MM-dd HH:mm') }}
                </n-tag>
                <n-tag
                    v-if="item.endDate"
                    size="small"
                    :type="!item.completed && item.endDate && new Date(item.endDate) < now ? 'error' : 'info'"
                >
                  止: {{ formatDate(item.endDate, 'yyyy-MM-dd HH:mm') }}
                  <span v-if="!item.completed && item.endDate && new Date(item.endDate) < now"> (已过期)</span>
                </n-tag>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
      <n-empty
          v-if="!isLoading && !activeTodos.length && !expiredTodos.length && !completedTodos.length && !error"
          description="太棒了，当前没有进行中的待办事项！"
      />
    </n-spin>

    <template v-if="expiredTodos.length > 0">
      <n-h3 class="expired-title">已过期未完成 ({{ expiredTodos.length }})</n-h3>
      <n-list bordered class="todo-items-list">
        <n-list-item v-for="item in expiredTodos" :key="item.id">
          <template #prefix>
            <n-checkbox :checked="item.completed" @update:checked="() => handleToggleComplete(item)"/>
          </template>
          <template #suffix>
            <n-space>
              <n-button
size="small" :type="item.important ? 'warning' : 'default'" ghost
                        @click="() => handleToggleImportant(item)">
                <template #icon>
                  <n-icon>
                    <StarIcon/>
                  </n-icon>
                </template>
                {{ item.important ? '重要' : '一般' }}
              </n-button>
              <n-button size="small" type="error" ghost @click="() => confirmDeleteItem(item.id)">
                <template #icon>
                  <n-icon>
                    <DeleteIcon/>
                  </n-icon>
                </template>
                删除
              </n-button>
            </n-space>
          </template>
          <n-thing style="cursor: pointer;" @click="() => handleToggleComplete(item)">
            <template #header>
              <span class="expired-text">{{ item.content }}</span>
            </template>
            <template #description>
              <n-space v-if="item.startDate || item.endDate" vertical size="small">
                <n-tag v-if="item.startDate" size="small" type="info">
                  起: {{ formatDate(item.startDate, 'yyyy-MM-dd HH:mm') }}
                </n-tag>
                <n-tag v-if="item.endDate" size="small" type="error">
                  已于 {{ formatDate(item.endDate, 'yyyy-MM-dd HH:mm') }} 过期
                </n-tag>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </template>

    <template v-if="completedTodos.length > 0">
      <n-h3 class="completed-title">已完成 ({{ completedTodos.length }})</n-h3>
      <n-list bordered class="todo-items-list">
        <n-list-item v-for="item in completedTodos" :key="item.id">
          <template #prefix>
            <n-checkbox :checked="item.completed" @update:checked="() => handleToggleComplete(item)"/>
          </template>
          <template #suffix>
            <n-space>
              <n-button
size="small" :type="item.important ? 'warning' : 'default'" ghost
                        @click="() => handleToggleImportant(item)">
                <template #icon>
                  <n-icon>
                    <StarIcon/>
                  </n-icon>
                </template>
                {{ item.important ? '重要' : '一般' }}
              </n-button>
              <n-button size="small" type="error" ghost @click="() => confirmDeleteItem(item.id)">
                <template #icon>
                  <n-icon>
                    <DeleteIcon/>
                  </n-icon>
                </template>
                删除
              </n-button>
            </n-space>
          </template>
          <n-thing style="cursor: pointer;" @click="() => handleToggleComplete(item)">
            <template #header>
              <span class="completed-text">{{ item.content }}</span>
            </template>
            <template #description>
              <n-space v-if="item.startDate || item.endDate" vertical size="small">
                <n-tag v-if="item.startDate" size="small" type="info">
                  起: {{ formatDate(item.startDate, 'yyyy-MM-dd HH:mm') }}
                </n-tag>
                <n-tag v-if="item.endDate" size="small" type="info">
                  止: {{ formatDate(item.endDate, 'yyyy-MM-dd HH:mm') }}
                </n-tag>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </template>
  </n-space>
</template>

<script setup lang="ts">
import {ref, onMounted, computed, type Ref} from 'vue';
import {useTodos} from '~/composables/useTodos';
import type {TodoItem} from '~/types/todo';
import {
  NSpace,
  NForm,
  NFormItemRow,
  NFormItemGi,
  NInput,
  NDatePicker,
  NButton,
  NAlert,
  NH2,
  NH3,
  NList,
  NListItem,
  NCheckbox,
  NThing,
  NTag,
  NIcon,
  NSpin,
  NEmpty,
  NGrid,
  useDialog // 导入 Naive UI 组件 和 useDialog
} from 'naive-ui';
// 建议从 @vicons/ionicons5 或其他图标库导入图标
import {StarOutline as StarIcon, TrashOutline as DeleteIcon} from '@vicons/ionicons5'; // 示例图标
import {format as formatDateFns} from 'date-fns'; // 使用 date-fns 进行日期格式化

// interface UseTodosReturnType (保持不变)
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
const newItemStartDate = ref<string | null>(null); // Naive date-picker v-model:formatted-value
const newItemEndDate = ref<string | null>(null);   // Naive date-picker v-model:formatted-value

const dialog = useDialog(); // Naive UI Hook for dialogs

onMounted(() => {
  fetchTodos();
});

const now = new Date();
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

// computed properties (activeTodos, expiredTodos, completedTodos) 保持不变
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
          const dateA = a.updatedAt || a.createdAt;
          const dateB = b.updatedAt || b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
);


const handleAddItem = async () => {
  if (!newItemContent.value.trim()) return;

  // Naive UI's date picker v-model:formatted-value gives string as per value-format
  // Ensure they are valid dates if provided
  const startDateValue = newItemStartDate.value ? new Date(newItemStartDate.value) : null;
  const endDateValue = newItemEndDate.value ? new Date(newItemEndDate.value) : null;


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
  dialog.warning({ // 使用 Naive UI 的 dialog
    title: '确认删除',
    content: '确定要删除这个待办事项吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteTodo(id);
    },
  });
};

const handleToggleComplete = async (item: TodoItem) => {
  await toggleComplete(item);
};

const handleToggleImportant = async (item: TodoItem) => {
  await toggleImportant(item);
};

// 使用 date-fns 进行日期格式化，Naive UI 内部也使用它
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
.add-todo-form .n-button {
  margin-top: 8px;
  width: 100%;
}
.todo-items-list {
  background-color: #F7F7F9;
}
.completed-text {
  text-decoration: line-through;
  color: #aaa;
}
.expired-text {
  color: red;
}
.expired-title .n-h3,
:deep(.expired-title .n-text) {
  color: red !important;
}
.completed-title .n-h3,
:deep(.completed-title .n-text) {
  color: green !important;
}

.n-list-item .n-thing .n-thing-header {
  margin-bottom: 4px; /* 微调 n-thing 内部间距 */
}
</style>