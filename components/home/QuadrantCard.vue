<template>
  <div class="quadrant-card-container">
    <div class="small-frosted-glass">
      <h3 class="quadrant-title">{{ title }}</h3>
      <div class="quadrant-content">
        <div v-if="isLoading" class="loading-placeholder"><p>加载中...</p></div>
        <DomainSection v-else-if="domainData && domainData.tools.length > 0" :domain="domainData"/>
        <div v-else class="info-message"><p>暂无{{ title }}工具</p></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {PropType} from 'vue';

// 从 toolbox.vue 复制过来的接口定义，理想情况下可以放到共享的 types 文件中
interface Tool {
  id: string;
  name: string;
  icon?: string;
  usage: number;
  description?: string;
  path?: string;
}

export interface Domain { // 导出Domain接口，以便toolbox.vue可以导入并确保类型一致
  id: string;
  name: string;
  description?: string;
  icon?: string;
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

// Nuxt 3 会自动从 components/ 目录导入 DomainSection (如果存在)
// import DomainSection from './DomainSection.vue'; // 或者更具体的路径
</script>

<style scoped>
/* .quadrant-card-container 确保组件在Grid布局中正确占据位置 */
.quadrant-card-container {
  display: flex; /* 使内部 .small-frosted-glass 能够撑满 */
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
  min-height: 280px; /* 与 toolbox.vue 中一致或根据内容调整 */
  color: var(--color-text); /* 确保文字颜色继承 */
}

.quadrant-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 1.25rem 0; /* 调整 margin-top 为 0 */
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--glass-border-color, rgba(255, 255, 255, 0.1));
  text-align: left;
}

.quadrant-content {
  flex-grow: 1; /* 使内容区域填满剩余空间 */
  display: flex; /* 用于居中 loading/info message */
  flex-direction: column; /* 确保 DomainSection 能正常布局 */
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
</style>