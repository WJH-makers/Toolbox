<template>
  <div class="todo-page-container">
    <h2 style="text-align: center;">我的待办事项</h2>

    <form class="add-todo-form" @submit.prevent="handleAddItem">
      <div class="form-item">
        <label for="todo-title">待办标题</label>
        <input
            id="todo-title"
            v-model="newItemTitle"
            :disabled="isLoading"
            placeholder="给待办事项起个名字..."
            type="text"
        />
      </div>

      <div class="form-item">
        <label for="todo-content">详细内容 (可选)</label>
        <textarea
            id="todo-content"
            v-model="newItemContent"
            :maxlength="maxContentChars"
            placeholder="添加详细描述 (支持 Markdown, 链接, Emoji 😊❤️😍😘👌)..."
            :disabled="isLoading"
            rows="5"
        />
        <div v-if="maxContentChars > 0" class="char-counter">
          {{ currentContentLength }} / {{ maxContentChars }}
        </div>
      </div>

      <div class="form-item">
        <label for="todo-image">附加图片 (可选)</label>
        <input
            id="todo-image"
            ref="imageInputRef"
            :disabled="isLoading"
            accept="image/*"
            type="file"
            @change="handleImageSelected"
        >
        <div v-if="newItemImageBase64" class="image-preview-container">
          <img :src="newItemImageBase64" alt="图片预览" class="image-preview">
          <button :disabled="isLoading" class="remove-image-button" type="button" @click="removeSelectedImage">×
          </button>
        </div>
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
      <button :disabled="isLoading || !newItemTitle.trim()" type="submit">
        {{ isLoading ? '添加中...' : '添加' }}
      </button>
    </form>

    <div v-if="error" class="error-alert">
      <strong>错误</strong>
      <p>{{ error }}</p>
      <button class="close-alert-button" @click="error = null">×</button>
    </div>

    <h3>进行中 ({{ activeTodos.length }})</h3>
    <div v-if="isLoading && !todos.length" class="loading-spinner">加载中...</div>
    <ul v-if="activeTodos.length" class="todo-items-list">
      <li v-for="item in activeTodos" :key="item.id" class="todo-item">
        <div class="todo-item-prefix">
          <input :checked="item.completed" type="checkbox" @change="() => handleToggleComplete(item)">
        </div>
        <div class="todo-item-main-content">
          <span :class="{ 'completed-text': item.completed }" class="todo-title-in-list">{{ item.title }}</span>
          <div v-if="item.endDate && !item.completed && new Date(item.endDate as string | Date) < new Date()"
               class="todo-tag todo-tag-error small-expired-tag">
            已过期
          </div>
        </div>
        <div class="todo-item-suffix">
          <button class="action-button button-more" title="查看详情" @click="showTodoModal(item)">详情</button>
          <button
              :aria-pressed="!!item.important"
              :class="{ 'is-important': item.important }"
              :title="item.important ? '取消重要' : '标记为重要'"
              class="action-button button-toggle-important"
              @click="() => handleToggleImportant(item)"
          >
            <span class="icon">{{ item.important ? '★' : '☆' }}</span>
          </button>
          <button
              class="action-button button-delete"
              title="删除此待办事项"
              @click="() => confirmDeleteItem(item.id)"
          >
            <span class="icon">🗑️</span>
          </button>
        </div>
      </li>
    </ul>
    <div v-if="!isLoading && !activeTodos.length && !expiredTodos.length && !completedTodos.length && !error"
         class="empty-state">
      太棒了，当前没有进行中的待办事项！
    </div>


    <template v-if="expiredTodos.length > 0">
      <h3 class="expired-title">已过期未完成 ({{ expiredTodos.length }})</h3>
      <ul class="todo-items-list">
        <li v-for="item in expiredTodos" :key="item.id" class="todo-item">
          <div class="todo-item-prefix">
            <input :checked="item.completed" type="checkbox" @change="() => handleToggleComplete(item)">
          </div>
          <div class="todo-item-main-content">
            <span class="todo-title-in-list expired-text">{{ item.title }}</span>
          </div>
          <div class="todo-item-suffix">
            <button class="action-button button-more" title="查看详情" @click="showTodoModal(item)">详情</button>
            <button
                :aria-pressed="!!item.important"
                :class="{ 'is-important': item.important }"
                :title="item.important ? '取消重要' : '标记为重要'"
                class="action-button button-toggle-important"
                @click="() => handleToggleImportant(item)"
            >
              <span class="icon">{{ item.important ? '★' : '☆' }}</span>
            </button>
            <button
                class="action-button button-delete"
                title="删除此待办事项"
                @click="() => confirmDeleteItem(item.id)"
            >
              <span class="icon">🗑️</span>
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
          <div class="todo-item-main-content">
            <span class="todo-title-in-list completed-text">{{ item.title }}</span>
          </div>
          <div class="todo-item-suffix">
            <button class="action-button button-more" title="查看详情" @click="showTodoModal(item)">详情</button>
            <button
                :aria-pressed="!!item.important"
                :class="{ 'is-important': item.important }"
                :title="item.important ? '取消重要' : '标记为重要'"
                class="action-button button-toggle-important"
                @click="() => handleToggleImportant(item)"
            >
              <span class="icon">{{ item.important ? '★' : '☆' }}</span>
            </button>
            <button
                class="action-button button-delete"
                title="删除此待办事项"
                @click="() => confirmDeleteItem(item.id)"
            >
              <span class="icon">🗑️</span>
            </button>
          </div>
        </li>
      </ul>
    </template>

    <div v-if="isModalVisible" class="modal-overlay" @click.self="closeTodoModal">
      <div class="modal-content">
        <button class="modal-close-button" @click="closeTodoModal">×</button>
        <h3 class="modal-title">{{ selectedTodoItem?.title }}</h3>

        <div v-if="renderedContentHtml" class="modal-section">
          <h4>详细内容:</h4>
          <div class="modal-text-content markdown-body" v-html="renderedContentHtml"></div>
        </div>
        <div v-else-if="selectedTodoItem?.content" class="modal-section">
          <h4>详细内容:</h4>
          <p class="modal-text-content">{{ selectedTodoItem?.content }}</p>
        </div>


        <div v-if="selectedTodoItem?.image" class="modal-section">
          <h4>附件图片:</h4>
          <img :src="selectedTodoItem?.image" alt="待办图片" class="modal-image">
        </div>
        <div v-if="selectedTodoItem?.startDate || selectedTodoItem?.endDate" class="modal-section modal-dates">
            <span v-if="selectedTodoItem?.startDate" class="todo-tag todo-tag-info">
              开始: {{ formatDate(selectedTodoItem?.startDate, 'yyyy-MM-dd HH:mm') }}
            </span>
          <span v-if="selectedTodoItem?.endDate"
                :class="!selectedTodoItem?.completed && selectedTodoItem?.endDate && new Date(selectedTodoItem?.endDate as string | Date) < new Date() ? 'todo-tag-error' : 'todo-tag-info'"
                class="todo-tag">
              结束: {{ formatDate(selectedTodoItem?.endDate, 'yyyy-MM-dd HH:mm') }}
              <span
                  v-if="!selectedTodoItem?.completed && selectedTodoItem?.endDate && new Date(selectedTodoItem?.endDate as string | Date) < new Date()"> (已过期)</span>
            </span>
        </div>
        <div v-if="selectedTodoItem" class="modal-section">
            <span :class="{'is-important-tag': selectedTodoItem.important}" class="todo-tag">
                {{ selectedTodoItem.important ? '重要事项' : '普通事项' }}
            </span>
          <span :class="selectedTodoItem.completed ? 'completed-status-tag' : 'active-status-tag'" class="todo-tag">
                {{ selectedTodoItem.completed ? '已完成' : '进行中' }}
            </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed, type Ref} from 'vue';
import {useTodos} from '~/composables/useTodos';
import type {TodoItem} from '~/types/todo'; // 确保此类型定义已更新，包含 title, content?, image?
import {format as formatDateFns} from 'date-fns';
import {marked} from 'marked'; // 导入 marked
import DOMPurify from 'dompurify'; // 导入 DOMPurify

// 配置 marked (可选，但推荐用于 GitHub Flavored Markdown 和换行)
marked.setOptions({
  breaks: true, // 将 GFM 的换行符 (一个换行) 渲染为 <br>
  gfm: true,    // 启用 GitHub Flavored Markdown
  // renderer: new marked.Renderer(), // 可以自定义渲染器
});


interface UseTodosReturnType {
  todos: Ref<TodoItem[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  fetchTodos: () => Promise<void>;
  addTodo: (
      title: string,
      content: string | null,
      important?: boolean,
      startDate?: string | Date | null,
      endDate?: string | Date | null,
      image?: string | null
  ) => Promise<TodoItem | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleComplete: (item: TodoItem) => Promise<TodoItem | null>;
  toggleImportant: (item: TodoItem) => Promise<TodoItem | null>;
  updateTodo: (id: string, updates: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>>) => Promise<TodoItem | null>;
}

const {
  todos,
  isLoading,
  error,
  fetchTodos,
  addTodo,
  deleteTodo,
  toggleComplete: toggleCompleteInComposable,
  toggleImportant: toggleImportantInComposable
} = useTodos() as UseTodosReturnType;

const newItemTitle = ref('');
const newItemContent = ref('');
const newItemStartDate = ref<string | null>(null);
const newItemEndDate = ref<string | null>(null);
const newItemImageBase64 = ref<string | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);

const isModalVisible = ref(false);
const selectedTodoItem = ref<TodoItem | null>(null);

// --- 新增：字数限制相关 ---
const maxContentChars = ref(1000); // 详细内容的最大字符数
const currentContentLength = computed(() => newItemContent.value?.length || 0);
// -------------------------

onMounted(() => {
  fetchTodos();
});

const renderedContentHtml = computed(() => {
  if (selectedTodoItem.value?.content) {
    const rawHtml = marked.parse(selectedTodoItem.value.content);
    return DOMPurify.sanitize(rawHtml, {USE_PROFILES: {html: true}}); // 允许基本的 HTML 标签
  }
  return '';
});
// ---------------------------

const activeTodos = computed(() => {
  const currentTime = new Date().getTime();
  return todos.value
      .filter(todo => !todo.completed && (!todo.endDate || new Date(todo.endDate as string | Date).getTime() >= currentTime))
      .sort((a, b) => {
        const aImp = a.important ? 0 : 1;
        const bImp = b.important ? 0 : 1;
        if (aImp !== bImp) return aImp - bImp;
        const aEnd = a.endDate ? new Date(a.endDate as string | Date).getTime() : Infinity;
        const bEnd = b.endDate ? new Date(b.endDate as string | Date).getTime() : Infinity;
        if (aEnd !== bEnd) return aEnd - bEnd;
        const aStart = a.startDate ? new Date(a.startDate as string | Date).getTime() : Infinity;
        const bStart = b.startDate ? new Date(b.startDate as string | Date).getTime() : Infinity;
        return aStart - bStart;
      });
});

const expiredTodos = computed(() => {
  const currentTime = new Date().getTime();
  return todos.value
      .filter(todo => !todo.completed && todo.endDate && new Date(todo.endDate as string | Date).getTime() < currentTime)
      .sort((a, b) => {
        const aImp = a.important ? 0 : 1;
        const bImp = b.important ? 0 : 1;
        if (aImp !== bImp) return aImp - bImp;
        const bEndTime = b.endDate ? new Date(b.endDate as string | Date).getTime() : 0;
        const aEndTime = a.endDate ? new Date(a.endDate as string | Date).getTime() : 0;
        return bEndTime - aEndTime;
      });
});

const completedTodos = computed(() =>
    todos.value
        .filter(todo => todo.completed)
        .sort((a, b) => {
          const dateA = a.updatedAt || a.createdAt;
          const dateB = b.updatedAt || b.createdAt;
          return new Date(dateB as string | Date).getTime() - new Date(dateA as string | Date).getTime();
        })
);

const handleImageSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = "图片文件过大，请选择小于 5MB 的图片。";
      if (imageInputRef.value) imageInputRef.value.value = '';
      newItemImageBase64.value = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      newItemImageBase64.value = e.target?.result as string;
      error.value = null;
    };
    reader.onerror = () => {
      error.value = "读取图片文件失败。";
      newItemImageBase64.value = null;
    }
    reader.readAsDataURL(file);
  } else {
    newItemImageBase64.value = null;
  }
};

const removeSelectedImage = () => {
  newItemImageBase64.value = null;
  if (imageInputRef.value) imageInputRef.value.value = '';
};

const handleAddItem = async () => {
  if (!newItemTitle.value.trim()) {
    error.value = "待办标题不能为空";
    return;
  }
  if (newItemContent.value && newItemContent.value.length > maxContentChars.value) {
    error.value = `详细内容不能超过 ${maxContentChars.value} 个字符。`;
    return;
  }

  const currentTime = new Date();
  let startDateValue: Date | null = null;
  if (newItemStartDate.value) {
    startDateValue = new Date(newItemStartDate.value);
    if (isNaN(startDateValue.getTime())) {
      error.value = "无效的开始时间格式";
      return;
    }
    if (startDateValue.getTime() <= currentTime.getTime()) {
      error.value = "开始时间必须晚于当前时间";
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
    if (endDateValue.getTime() <= currentTime.getTime()) {
      error.value = "结束时间必须晚于当前时间";
      return;
    }
  }

  if (startDateValue && endDateValue && startDateValue.getTime() >= endDateValue.getTime()) {
    error.value = "结束时间必须晚于开始时间";
    return;
  }

  error.value = null;
  const added = await addTodo(
      newItemTitle.value.trim(),
      newItemContent.value.trim() || null, // 如果内容为空字符串，也发送 null
      false,
      startDateValue,
      endDateValue,
      newItemImageBase64.value
  );

  if (added) {
    newItemTitle.value = '';
    newItemContent.value = '';
    newItemStartDate.value = null;
    newItemEndDate.value = null;
    removeSelectedImage();
  }
};

const confirmDeleteItem = (id: string) => {
  if (window.confirm('确定要删除这个待办事项吗？')) {
    deleteTodo(id);
  }
};

const handleToggleComplete = async (item: TodoItem) => {
  await toggleCompleteInComposable(item);
};

const handleToggleImportant = async (item: TodoItem) => {
  await toggleImportantInComposable(item);
};

const formatDate = (dateInput: string | Date | null | undefined, formatString: string = 'yyyy-MM-dd HH:mm'): string => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput as string | Date);
    if (isNaN(date.getTime())) return '无效日期';
    return formatDateFns(date, formatString);
  } catch (e) {
    return '日期格式化错误';
  }
};

const showTodoModal = (item: TodoItem) => {
  selectedTodoItem.value = item;
  isModalVisible.value = true;
};

const closeTodoModal = () => {
  isModalVisible.value = false;
  selectedTodoItem.value = null;
};

</script>

<style scoped>
.todo-page-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 30px 40px;
  font-family: 'Georgia', 'Times New Roman', Times, serif;
  background-color: #fdfaf2;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
  color: #4a3b31;
}

h2 {
  font-family: 'Lucida Calligraphy', 'Brush Script MT', cursive;
  color: #5a4a42;
  text-align: center;
  margin-bottom: 30px;
  font-size: 2.5em;
  font-weight: normal;
}

h3 {
  margin-top: 30px;
  margin-bottom: 15px;
  border-bottom: 1px solid #d3c1b0;
  padding-bottom: 8px;
  color: #5a4a42;
  font-size: 1.6em;
  font-weight: normal;
}

.add-todo-form {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0d8cd;
  border-radius: 6px;
  background-color: #f9f5ef;
}

.add-todo-form .form-item {
  margin-bottom: 18px;
  position: relative; /* 用于字数统计的定位 */
}

.add-todo-form label {
  display: block;
  margin-bottom: 6px;
  color: #6b5b50;
  font-size: 0.95em;
}

.add-todo-form input[type="text"],
.add-todo-form textarea#todo-content {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #D2B48C;
  border-radius: 4px;
  box-sizing: border-box;
  background-color: #FEFBF0;
  color: #5D4037;
  font-family: 'Georgia', 'Times New Roman', Times, serif;
  font-size: 1em;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
}

.add-todo-form input[type="text"] {
  line-height: 1.5;
}

.add-todo-form textarea#todo-content {
  resize: vertical;
  line-height: 1.7em;
  min-height: 100px; /* 增加最小高度以适应更多内容 */
  background-image: repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(1.7em - 1px),
      #e0d8cd 1.7em
  );
  background-attachment: local;
  padding-bottom: 25px; /* 为绝对定位的计数器留出空间 */
}

.char-counter {
  position: absolute;
  bottom: 8px; /* 调整到底部textarea的padding内 */
  right: 12px; /* 调整到右部textarea的padding内 */
  font-size: 0.75em;
  color: #a08c7d;
  background-color: rgba(254, 251, 240, 0.8); /* 半透明背景，不遮挡横线 */
  padding: 1px 4px;
  border-radius: 3px;
  pointer-events: none; /* 允许点击穿透到 textarea */
}


.add-todo-form input[type="text"]::placeholder,
.add-todo-form textarea#todo-content::placeholder {
  color: #a08c7d;
  font-style: italic;
}

.add-todo-form input[type="text"]:focus,
.add-todo-form textarea#todo-content:focus {
  outline: none;
  border-color: #C0A080;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 5px rgba(192, 160, 128, 0.5);
}

.add-todo-form input[type="datetime-local"],
.add-todo-form input[type="file"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d3c1b0;
  border-radius: 4px;
  box-sizing: border-box;
  background-color: #fff;
  font-family: 'Georgia', 'Times New Roman', Times, serif;
  color: #5D4037;
  font-size: 0.9em;
}

.add-todo-form input[type="file"] {
  padding: 6px 12px;
}

.add-todo-form input[type="file"]::file-selector-button {
  padding: 6px 12px;
  border: 1px solid #c0a080;
  border-radius: 3px;
  background-color: #e0d8cd;
  color: #5D4037;
  cursor: pointer;
  transition: background-color 0.2s;
  font-family: 'Georgia', 'Times New Roman', Times, serif;
}

.add-todo-form input[type="file"]::file-selector-button:hover {
  background-color: #d3c1b0;
}

.image-preview-container {
  margin-top: 10px;
  position: relative;
  display: inline-block;
  border: 1px dashed #d3c1b0;
  padding: 5px;
  border-radius: 4px;
  background-color: #fdfaf2;
}

.image-preview {
  max-width: 180px;
  max-height: 130px;
  border-radius: 3px;
  display: block;
}

.remove-image-button {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #a08c7d;
  color: white;
  border: 2px solid #fdfaf2;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 13px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.remove-image-button:hover {
  background-color: #8a7466;
}

.add-todo-form button[type="submit"] {
  background-color: #7a6a5d;
  color: #fdfaf2;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: auto;
  min-width: 120px;
  display: inline-block;
  font-size: 1em;
  font-family: 'Georgia', 'Times New Roman', Times, serif;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  margin-top: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-todo-form button[type="submit"]:hover {
  background-color: #6b5b50;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.add-todo-form button[type="submit"]:disabled {
  background-color: #c5b8ac;
  cursor: not-allowed;
  box-shadow: none;
}

.error-alert {
  background-color: #f9ebea;
  color: #8c3a36;
  padding: 12px 15px;
  border: 1px solid #ecccC9;
  border-radius: 4px;
  margin-bottom: 20px;
  position: relative;
}

.error-alert strong {
  font-weight: bold;
}

.close-alert-button {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #8c3a36;
  opacity: 0.7;
}

.close-alert-button:hover {
  opacity: 1;
}

.loading-spinner {
  text-align: center;
  padding: 30px;
  font-size: 1.2em;
  color: #a08c7d;
}

.todo-items-list {
  list-style-type: none;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px 10px;
  border-bottom: 1px dashed #e0d8cd;
  transition: background-color 0.2s;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background-color: #f9f5ef;
}

.todo-item-prefix {
  margin-right: 12px;
}

.todo-item-prefix input[type="checkbox"] {
  width: 17px;
  height: 17px;
  cursor: pointer;
  accent-color: #7a6a5d;
  vertical-align: middle;
  border: 1px solid #bcaaa4;
  border-radius: 3px;
}

.todo-item-prefix input[type="checkbox"]:focus {
  outline: 1px solid #a08c7d;
  outline-offset: 1px;
}

.todo-item-main-content {
  flex-grow: 1;
  color: #5D4037;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.todo-title-in-list {
  font-size: 1.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

.todo-title-in-list.completed-text {
  text-decoration: line-through;
  color: #a08c7d;
  font-style: italic;
}

.expired-text {
  color: #a8554e !important;
}

.small-expired-tag {
  font-size: 0.7em !important;
  padding: 1px 4px !important;
  white-space: nowrap;
  flex-shrink: 0;
}

.todo-item-suffix {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  font-size: 0.75em;
  border: 1px solid #d3c1b0;
  border-radius: 4px;
  cursor: pointer;
  background-color: #f9f5ef;
  color: #6b5b50;
  transition: all 0.2s ease;
  white-space: nowrap;
  line-height: 1;
}

.action-button .text {
  display: none;
}

.action-button .icon {
  font-size: 1.3em;
}

.action-button.button-more {
  padding: 4px 8px;
  font-size: 0.8em;
}

.action-button.button-more .text {
  display: inline-block;
  margin-left: 3px;
}

.action-button.button-more .icon {
  display: none;
}

.action-button.button-more:before {
  content: '👁';
  font-size: 1.1em;
  margin-right: 4px;
  font-family: sans-serif;
}

.action-button:hover {
  background-color: #e6e0d9;
  border-color: #c0a080;
  transform: translateY(-1px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action-button:focus-visible {
  outline: 1px solid #a08c7d;
  outline-offset: 1px;
}

.button-toggle-important.is-important {
  background-color: #f9e5ab;
  border-color: #e9d398;
  color: #7a5c0d;
}

.button-toggle-important.is-important .icon {
  color: #e4a800;
}

.expired-title {
  color: #a8554e !important;
  border-bottom-color: #ecccC9;
}

.completed-title {
  color: #5a8b5e !important;
  border-bottom-color: #c9e0cb;
}

.empty-state {
  padding: 30px;
  text-align: center;
  color: #a08c7d;
  background-color: #f9f5ef;
  border: 1px dashed #e0d8cd;
  border-radius: 6px;
  font-style: italic;
  font-size: 1.1em;
  line-height: 1.6;
}

/* --- 模态框样式 --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(74, 59, 49, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
  backdrop-filter: blur(3px);
}

.modal-content {
  background-color: #fdfaf2;
  padding: 25px 35px;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 650px;
  position: relative;
  font-family: 'Georgia', 'Times New Roman', Times, serif;
  color: #4a3b31;
  max-height: 90vh;
  overflow-y: auto;
  border-top: 5px solid #7a6a5d;
}

.modal-close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 26px;
  color: #a08c7d;
  cursor: pointer;
  line-height: 1;
  padding: 5px;
  transition: color 0.2s;
}

.modal-close-button:hover {
  color: #5a4a42;
}

.modal-title {
  font-family: 'Lucida Calligraphy', 'Brush Script MT', cursive;
  color: #5a4a42;
  font-size: 2.2em;
  margin-top: 0;
  margin-bottom: 25px;
  text-align: center;
  font-weight: normal;
  border-bottom: 1px solid #d3c1b0;
  padding-bottom: 15px;
}

.modal-section {
  margin-bottom: 22px;
}

.modal-section h4 {
  font-size: 0.9em;
  color: #6b5b50;
  margin-bottom: 10px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px dotted #d3c1b0;
  padding-bottom: 5px;
  display: inline-block;
}

.modal-text-content { /* 用于 v-html 渲染 Markdown 的容器 */
  font-size: 1em;
  line-height: 1.75;
  white-space: pre-wrap;
  background-color: rgba(249, 245, 239, 0.6);
  padding: 12px 18px;
  border-radius: 4px;
  border: 1px solid #e0d8cd;
  color: #5D4037;
}

/* 为 Markdown 渲染的 HTML 元素添加基础样式 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: #5a4a42; /* 标题颜色 */
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  font-family: 'Georgia', 'Times New Roman', Times, serif; /* 与页面主标题风格协调 */
}

.markdown-body :deep(h1) {
  font-size: 1.8em;
}

.markdown-body :deep(h2) {
  font-size: 1.6em;
}

.markdown-body :deep(h3) {
  font-size: 1.4em;
}

.markdown-body :deep(p) {
  margin-bottom: 1em;
  line-height: 1.75; /* 确保段落行高 */
}

.markdown-body :deep(a) {
  color: #0056b3; /* 链接颜色 - 经典的蓝色 */
  text-decoration: underline;
  transition: color 0.2s;
}

.markdown-body :deep(a:hover) {
  color: #003d80; /* 链接悬停颜色 */
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-left: 25px; /* 列表缩进 */
  margin-bottom: 1em;
  padding-left: 0; /* 移除默认padding，使用margin控制 */
}

.markdown-body :deep(li) {
  margin-bottom: 0.4em;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #d3c1b0; /* 引用块左边框 */
  padding-left: 15px;
  margin-left: 0;
  margin-right: 0;
  color: #7a6a5d; /* 引用文字颜色 */
  font-style: italic;
  background-color: #f9f5ef; /* 引用块背景 */
  padding-top: 8px;
  padding-bottom: 8px;
  border-radius: 0 4px 4px 0;
}

.markdown-body :deep(code) {
  font-family: 'Courier New', Courier, monospace; /*代码字体*/
  background-color: #f0eadd; /* 代码块/行内代码背景 */
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.9em;
  color: #5D4037;
}

.markdown-body :deep(pre) {
  background-color: #f0eadd;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto; /* 代码块横向滚动 */
  border: 1px solid #e0d8cd;
}

.markdown-body :deep(pre code) {
  background-color: transparent; /* pre内的code背景透明 */
  padding: 0;
  border-radius: 0;
  font-size: 0.85em; /* 代码块内字体可以小一点 */
  line-height: 1.5;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px dashed #d3c1b0; /* 分割线样式 */
  margin: 1.5em 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
  border: 1px solid #d3c1b0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #d3c1b0;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background-color: #f0eadd;
  font-weight: bold;
}


.modal-image {
  max-width: 100%;
  height: auto;
  max-height: 350px;
  border-radius: 4px;
  display: block;
  margin-top: 8px;
  border: 1px solid #e0d8cd;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.modal-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.modal-section .todo-tag {
  display: inline-block;
  padding: 5px 12px;
  font-size: 0.88em;
  border-radius: 15px;
  margin-right: 8px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.is-important-tag {
  background-color: #f9e5ab;
  color: #7a5c0d;
}

.completed-status-tag {
  background-color: #d4e9d5;
  color: #426847;
}

.active-status-tag {
  background-color: #e6e0d9;
  color: #5a4a42;
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

</style>