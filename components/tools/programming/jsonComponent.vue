<template>
  <div class="json-formatter-container">
    <h2 style="text-align: center;">JSON 格式化/校验器</h2>

    <div class="formatter-grid">
      <div class="panel input-panel">
        <div class="form-item">
          <label for="json-input">输入 JSON 数据 (或查看本组件源码作为示例):</label>
          <textarea
              id="json-input"
              v-model="jsonInput"
              :class="{ 'has-error': !!errorMessage }"
              placeholder="在此处粘贴或输入有效的JSON字符串..."
              rows="18"
              @input="handleInput"
          />
        </div>
      </div>

      <div class="panel output-panel">
        <div class="form-item">
          <label for="json-output">格式化结果:</label>
          <textarea
              id="json-output"
              v-model="jsonOutput"
              :class="{ 'has-error': !!errorMessage }"
              placeholder="格式化后的JSON将显示在此处..."
              readonly
              rows="18"
          />
        </div>
      </div>
    </div>

    <div class="actions-toolbar">
      <button class="action-button format-button" title="格式化输入的JSON" @click="formatJson">
        <span class="icon">🎨</span>
        <span class="text">格式化</span>
      </button>
      <button
          :disabled="!jsonOutput || !!errorMessage"
          class="action-button copy-button"
          title="复制格式化后的结果"
          @click="copyOutputToClipboard"
      >
        <span class="icon">📋</span>
        <span class="text">复制结果</span>
      </button>
      <button class="action-button clear-button" title="清空输入和输出内容" @click="clearAll">
        <span class="icon">💨</span>
        <span class="text">全部清空</span>
      </button>
    </div>

    <div v-if="successMessage" class="alert success-alert">
      <span>{{ successMessage }}</span>
      <button aria-label="关闭成功消息" class="close-alert-button" @click="successMessage = ''">×</button>
    </div>
    <div v-if="errorMessage" class="alert error-alert">
      <span><strong>错误:</strong> {{ errorMessage }}</span>
      <button aria-label="关闭错误消息" class="close-alert-button" @click="clearError">×</button>
    </div>

  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue';


const defaultComponentSource = `{"name":"示例产品","id":1001,"isAvailable":true,"price":29.99,"tags":["电子产品","小工具"],"dimensions":{"height":5,"width":10,"unit":"cm"},"description":null}`.trim();

const jsonInput = ref<string>(defaultComponentSource);
const jsonOutput = ref<string>('');
const errorMessage = ref<string | null>(null);
const successMessage = ref<string>('');

const clearError = (): void => {
  errorMessage.value = null;
};

const clearSuccess = (): void => {
  successMessage.value = '';
};

const handleInput = (): void => {
  clearError();
  clearSuccess();
  jsonOutput.value = '';
};


const formatJson = (): void => {
  clearError();
  clearSuccess();

  const trimmedInput = jsonInput.value.trim();
  if (!trimmedInput) {
    errorMessage.value = '输入内容不能为空。';
    jsonOutput.value = '';
    return;
  }

  try {
    const parsedJson = JSON.parse(trimmedInput);
    jsonOutput.value = JSON.stringify(parsedJson, null, 2); // 使用2个空格进行缩进
    successMessage.value = 'JSON格式化成功！';
  } catch (e: unknown) { // 使用 unknown 类型，并在需要时进行类型断言或检查
    jsonOutput.value = ''; // 发生错误时清空输出
    if (e instanceof Error) {
      errorMessage.value = `JSON格式无效: ${e.message}. 请确保输入的是合法的JSON字符串。`;
    } else {
      errorMessage.value = '发生未知错误导致JSON格式化失败。';
    }
  }
};

/**
 * 将输出框中格式化后的JSON复制到剪贴板。
 */
const copyOutputToClipboard = async (): Promise<void> => {
  clearError();
  clearSuccess();

  if (!jsonOutput.value || errorMessage.value) {
    errorMessage.value = '没有可复制的内容，或者当前内容存在格式错误。';
    return;
  }

  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    successMessage.value = '已成功复制到剪贴板！';
  } catch (err) {
    errorMessage.value = '复制失败。您的浏览器可能不支持此功能或未授予权限。请尝试手动复制。';
  }
};

const clearAll = (): void => {
  jsonInput.value = ''; // 清空输入框
  jsonOutput.value = ''; // 清空输出框
  clearError();
  clearSuccess();
};
</script>

<style scoped>
.json-formatter-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}

.formatter-grid {
  display: grid;
  grid-template-columns: 1fr; /* 移动设备上单列 */
  gap: 20px;
  margin-bottom: 20px;
}

@media (min-width: 768px) {
  /* 中等及以上屏幕双列 */
  .formatter-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.panel {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column; /* 使内部元素垂直排列 */
}

.form-item {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* 使 .form-item 占据 .panel 内所有可用垂直空间 */
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600; /* 加粗标签 */
  font-size: 0.9em;
  color: #333; /* 深色标签文本 */
}

textarea {
  width: 100%;
  flex-grow: 1; /* 使 textarea 填满 .form-item 的高度 */
  padding: 12px; /* 增加内边距 */
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6; /* 改善长文本可读性 */
  resize: vertical;
  min-height: 300px; /* 调整最小高度 */
  background-color: #fdfdfd; /* 文本域背景色 */
  color: #2c3e50; /* 文本颜色 */
}

textarea:focus {
  border-color: #3b82f6; /* 聚焦时边框颜色变为蓝色 */
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); /* 聚焦时添加外发光 */
  outline: none;
}

textarea.has-error {
  border-color: #e53e3e; /* 错误时边框颜色 (更鲜明的红色) */
  background-color: #fff5f5; /* 错误时背景色 */
}

textarea.has-error:focus {
  box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.2); /* 错误时聚焦的外发光 */
}


.actions-toolbar {
  display: flex;
  gap: 12px; /* 按钮间距 */
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px; /* 图标和文字间距 */
  padding: 10px 18px; /* 调整内边距使按钮更舒适 */
  font-size: 0.95rem;
  font-weight: 500;
  border: 1px solid transparent; /* 默认为透明边框 */
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out, transform 0.15s ease-in-out, box-shadow 0.2s ease-in-out;
  white-space: nowrap;
  line-height: 1.5; /* 调整行高 */
  flex-grow: 1; /* 使按钮在工具栏中平均分配空间 */
  min-width: 120px; /* 按钮最小宽度 */
}

@media (min-width: 768px) {
  .action-button {
    flex-grow: 0; /* 在大屏幕上，按钮不拉伸 */
  }
}


.action-button .icon {
  display: inline-flex;
  font-size: 1.1em; /* 图标大小 */
}

/* 悬停和激活状态 */
.action-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* 悬停时更明显的阴影 */
}

.action-button:not(:disabled):active {
  transform: translateY(0px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 键盘焦点 */
.action-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4); /* 与之前建议的焦点样式一致 */
}

/* 禁用状态 */
.action-button:disabled {
  background-color: #e5e7eb !important; /* 更柔和的禁用背景色 (Tailwind Gray 200) */
  color: #9ca3af !important; /* 禁用文字颜色 (Tailwind Gray 400) */
  border-color: #e5e7eb !important;
  cursor: not-allowed;
  opacity: 0.8; /* 轻微透明 */
  transform: none;
  box-shadow: none;
}

/* 特定按钮颜色 */
.format-button {
  background-color: #3b82f6; /* 主蓝色 */
  color: white;
}

.format-button:not(:disabled):hover {
  background-color: #2563eb;
}

.format-button:not(:disabled):active {
  background-color: #1d4ed8;
}

.copy-button {
  background-color: #10b981; /* 绿色 */
  color: white;
}

.copy-button:not(:disabled):hover {
  background-color: #059669;
}

.copy-button:not(:disabled):active {
  background-color: #047857;
}


.clear-button {
  background-color: #6b7280; /* 中性灰色 */
  color: white;
}

.clear-button:not(:disabled):hover {
  background-color: #4b5563;
}

.clear-button:not(:disabled):active {
  background-color: #374151;
}


/* 提示信息框样式 */
.alert {
  display: flex; /* 使用flex布局使内容和关闭按钮对齐 */
  justify-content: space-between; /* 内容在左，按钮在右 */
  align-items: center; /* 垂直居中 */
  padding: 12px 15px; /* 调整内边距 */
  border-radius: 6px; /* 更圆润的边角 */
  margin-bottom: 20px;
  font-size: 0.9em;
  border-width: 1px;
  border-style: solid;
}

.error-alert {
  background-color: #fee2e2; /* 更柔和的红色背景 (Tailwind Red 100) */
  color: #b91c1c; /* 深红色文字 (Tailwind Red 700) */
  border-color: #fca5a5; /* 红色边框 (Tailwind Red 300) */
}

.success-alert {
  background-color: #dcfce7; /* 更柔和的绿色背景 (Tailwind Green 100) */
  color: #166534; /* 深绿色文字 (Tailwind Green 700) */
  border-color: #86efac; /* 绿色边框 (Tailwind Green 300) */
}

.error-alert strong {
  font-weight: 600; /* 加粗错误标题 */
}

.close-alert-button {
  background: none;
  border: none;
  font-size: 1.5em; /* 增大关闭按钮 */
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  padding: 0 0 0 15px; /* 左边距，与文本隔开 */
  opacity: 0.7;
  transition: opacity 0.2s ease-in-out;
}

.close-alert-button:hover {
  opacity: 1;
}

.error-alert .close-alert-button {
  color: #b91c1c;
}

.success-alert .close-alert-button {
  color: #166534;
}

</style>