<template>
  <div class="quadrant-card-container">
    <div class="small-frosted-glass">
      <h3 class="quadrant-title">{{ title }}</h3>
      <div class="quadrant-content">
        <div v-if="isLoading" class="loading-placeholder"><p>加载中...</p></div>

        <ul v-else-if="domainData && domainData.tools.length > 0" class="tools-list">
          <li v-for="tool in domainData.tools" :key="tool.id" class="tool-item">
            <NuxtLink :to="tool.path || '#'" class="tool-link">
              <h4>
                <span v-if="tool.icon" class="tool-icon-placeholder"></span> {{ tool.name }}
              </h4>
              <p class="tool-description">{{ tool.description }}</p>

              <div v-if="tool.statusPreview" class="tool-status-preview">
                ✨ {{ tool.statusPreview }} ✨
              </div>
            </NuxtLink>
          </li>
        </ul>
        <div v-else-if="!isLoading" class="info-message"><p>暂无{{ title }}工具</p></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {PropType} from 'vue';

// 定义 Tool 接口，添加 statusPreview 字段
interface Tool {
  id: string;
  name: string;
  icon?: string; // 工具本身也可以有图标
  usage: number;
  description?: string;
  path?: string;
  statusPreview?: string; // <--- 新增的可选字段，用于新颖呈现
}

// Domain 接口现在使用上面更新的 Tool 接口
export interface Domain { // 如果这个 Domain 接口也用在 toolbox.vue, 确保它也被更新或 Tool 类型被正确传递
  id: string;
  name: string;
  description?: string;
  icon?: string; // 这是领域的图标
  tools: Tool[];
}

defineProps({
  title: {
    type: String,
    required: true,
  },
  domainData: {
    type: Object as PropType<Domain | undefined | null>,
    default: null,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.quadrant-card-container {
  display: flex;
  /* 确保它能正确填充父级 Grid 单元格 */
}

.small-frosted-glass {
  width: 100%;
  padding: 1.25rem 1.5rem;
  box-sizing: border-box;
  background-color: var(--glass-bg-small);
  backdrop-filter: blur(12px) saturate(110%);
  -webkit-backdrop-filter: blur(12px) saturate(110%);
  border-radius: var(--glass-border-radius-small, 12px);
  border: 1px solid var(--glass-border-color-light);
  box-shadow: var(--shadow-elevation-medium, 0 6px 15px -5px rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
  min-height: 280px;
  color: var(--color-text);
}

.quadrant-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 1.25rem 0;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--glass-border-color, rgba(255, 255, 255, 0.1));
  text-align: left;
}

.quadrant-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.loading-placeholder,
.info-message {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 1rem;
  padding: 1rem;
}

.info-message p, .loading-placeholder p {
  margin: 0;
}

/* 新增：工具列表和工具项的示例样式 */
.tools-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex-grow: 1; /* 允许列表填充空间 */
}

.tool-item {
  margin-bottom: 1rem;
}

.tool-item:last-child {
  margin-bottom: 0;
}

.tool-link {
  display: block;
  padding: 0.75rem 1rem; /* 增加内边距使卡片感更强 */
  border-radius: var(--glass-border-radius-small, 8px); /* 使用小圆角 */
  text-decoration: none;
  color: var(--color-text);
  background-color: rgba(0, 0, 0, 0.03); /* 非常浅的背景色，或使用 var(--color-background-mute) */
  border: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.05));
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}

.tool-link:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: var(--shadow-elevation-medium, 0 6px 12px rgba(0, 0, 0, 0.1));
}

.tool-link h4 {
  margin: 0 0 0.3em 0;
  color: var(--color-primary); /* 工具名称使用主色 */
  font-size: 1.1em;
  font-weight: 600;
}

.tool-description {
  font-size: 0.85em; /* 描述文字稍小 */
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.4;
}

.tool-status-preview {
  margin-top: 0.75em;
  padding: 0.4em 0.8em;
  background-color: rgba(59, 130, 246, 0.1); /* 假设你有这个变量 */
  color: var(--color-primary);
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 500;
  display: inline-block;
  border: 1px solid rgba(59, 130, 246, 0.3); /* 假设变量 */
}

</style>