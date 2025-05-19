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

interface Tool {
  id: string;
  name: string;
  icon?: string;
  usage: number;
  description?: string;
  path?: string;
}

export interface Domain {
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

</script>

<style scoped>
.quadrant-card-container {
  display: flex;
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
</style>