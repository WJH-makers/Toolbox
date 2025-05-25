<template>
  <div class="toolbox-page-quadrant-layout">
    <header class="toolbox-header-minimal">
      <h1>万能工具箱</h1>
    </header>
    <div v-if="loadingError" class="global-error-message">
      <p>抱歉，加载工具数据时遇到问题：{{ loadingError.message }}</p>
      <button class="retry-button" @click="fetchAllToolData">重试</button>
    </div>
    <div v-else class="large-frosted-glass-container">
      <QuadrantCard
          title="日常领域"
          :domain-data="dailyLifeDomain"
          :is-loading="isLoadingData"
          class="quadrant"
      />
      <QuadrantCard
          title="学习领域"
          :domain-data="learningDomain"
          :is-loading="isLoadingData"
          class="quadrant"
      />
      <QuadrantCard
          title="金融领域"
          :domain-data="financeDomain"
          :is-loading="isLoadingData"
          class="quadrant"
      />
      <QuadrantCard
          title="编程领域"
          :domain-data="programmingDomain"
          :is-loading="isLoadingData"
          class="quadrant"
      />
    </div>
    <AiAssistantWidget/>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed} from 'vue';
import type {Domain} from '~/components/global/QuadrantCard.vue';
import QuadrantCard from '~/components/global/QuadrantCard.vue';
import {allToolDomainsData} from '~/data/toolRegistry';
import AiAssistantWidget from '~/components/global/AiAssistantWidget.vue'; // <<--- 导入AI助手组件

const allDomains = ref<Domain[]>([]);
const isLoadingData = ref(true);
const loadingError = ref<Error | null>(null);

const fetchAllToolData = async () => {
  isLoadingData.value = true;
  loadingError.value = null;
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    allDomains.value = allToolDomainsData;
  } catch (e: any) {
    loadingError.value = e as Error;
    console.error("Toolbox Quadrant: Failed to process tool data:", e);
  } finally {
    isLoadingData.value = false;
  }
};

onMounted(() => {
  fetchAllToolData();
});

const dailyLifeDomain = computed(() => allDomains.value.find(d => d.id === 'daily_life'));
const financeDomain = computed(() => allDomains.value.find(d => d.id === 'finance'));
const learningDomain = computed(() => allDomains.value.find(d => d.id === 'learning'));
const programmingDomain = computed(() => allDomains.value.find(d => d.id === 'programming'));
</script>

<style scoped>
.toolbox-page-quadrant-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  width: 100%;
  padding: 2rem 1rem;
  box-sizing: border-box;
  color: var(--color-text);
}

.toolbox-header-minimal {
  text-align: center;
  margin-bottom: 2.5rem;
  width: 100%;
}

.toolbox-header-minimal h1 {
  font-size: 2.8rem;
  font-weight: 700;
  color: var(--color-text);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.large-frosted-glass-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 25px;
  width: 100%;
  max-width: 1100px;
  padding: 25px;
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  border-radius: var(--glass-border-radius-large, 16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: var(--shadow-elevation-high, 0 12px 30px -10px rgba(0, 0, 0, 0.2));
}


.global-error-message {
  width: 100%;
  max-width: 600px;
  margin-top: 2rem;
  padding: 1rem 1.5rem;
  text-align: center;
  border-radius: 8px;
  background-color: var(--error-bg);
  color: var(--error-text-color);
  border: 1px solid var(--error-border-color);
}

.global-error-message p {
  margin-bottom: 0.75rem;
}

.retry-button {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #ffffff;
  background-color: var(--color-primary, var(--color-primary));
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
}

.retry-button:hover {
  background-color: var(--color-primary-hover, var(--color-primary-hover));
  transform: translateY(-1px);
}

.retry-button:active {
  transform: translateY(0px);
}

@media (max-width: 900px) {
  .large-frosted-glass-container {
    gap: 20px;
    padding: 20px;
    max-width: calc(100% - 2rem);
  }
}

@media (max-width: 680px) {
  .toolbox-header-minimal h1 {
    font-size: 2.2rem;
  }

  .large-frosted-glass-container {
    gap: 20px;
    padding: 15px;
  }
}
</style>