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
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed} from 'vue';
// 假设 Domain 和 Tool 类型在 QuadrantCard.vue 中定义，并且 Tool 类型可以扩展
// 例如，Tool 接口可能需要更新为包含 statusPreview?: string;
import type {Domain} from '~/components/home/QuadrantCard.vue';
import QuadrantCard from '~/components/home/QuadrantCard.vue';

const allDomains = ref<Domain[]>([]);
const isLoadingData = ref(true);
const loadingError = ref<Error | null>(null);

const fetchAllToolData = async () => {
  isLoadingData.value = true;
  loadingError.value = null;
  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500)); // 减少延迟以便更快看到效果

    // @ts-expect-error // 临时忽略下一行，因为我们假设 Tool 类型将包含 statusPreview
    allDomains.value = [
      {
        id: 'daily_life', name: '日常领域', description: '提升生活品质与效率', icon: 'ph:house-line-bold',
        tools: [
          {
            id: 'todo',
            name: '待办清单',
            usage: 250, // 可以调整使用频率使其更突出
            description: '您的个人任务管理器，助您高效规划每一天！', // 修改描述
            path: '/tools/daily/todo', // 确保这是你实际的TodoList页面路径
            statusPreview: '查看今日任务' // 新增字段，用于新颖呈现，内容可以动态获取
          },
          {
            id: 'recipe_finder',
            name: '食谱查找',
            usage: 190,
            description: '发现美味食谱，开启烹饪灵感。',
            path: '/tools/daily/recipes'
          },
          {
            id: 'package_tracker',
            name: '快递追踪',
            usage: 170,
            description: '实时追踪您的包裹位置与状态。',
            path: '/tools/daily/tracker'
          },
        ],
      },
      {
        id: 'finance', name: '金融领域', description: '理财规划与金融计算', icon: 'ph:bank-bold',
        tools: [
          {
            id: 'currency_converter',
            name: '汇率转换',
            usage: 280,
            description: '全球货币实时汇率查询与计算。',
            path: '/tools/finance/currency'
          },
          {
            id: 'loan_calculator',
            name: '贷款计算器',
            usage: 210,
            description: '精准计算各类贷款详情与还款计划。',
            path: '/tools/finance/loan'
          },
          {
            id: 'stock_screener',
            name: '股票筛选器',
            usage: 150,
            description: '根据多种指标筛选潜力股票。',
            path: '/tools/finance/stocks'
          },
        ],
      },
      {
        id: 'learning', name: '学习领域', description: '助力知识获取与技能提升', icon: 'ph:student-bold',
        tools: [
          {
            id: 'mind_map',
            name: '思维导图',
            usage: 260,
            description: '构建清晰知识结构，激发创意。',
            path: '/tools/learning/mindmap'
          },
          {
            id: 'online_dictionary',
            name: '在线词典',
            usage: 200,
            description: '多语言词汇即时查询与释义。',
            path: '/tools/learning/dictionary'
          },
          {
            id: 'code_playground',
            name: '代码演练场',
            usage: 180,
            description: '在线练习与测试不同编程语言片段。',
            path: '/tools/learning/playground'
          },
        ],
      },
      {
        id: 'programming', name: '编程领域', description: '开发者实用工具集', icon: 'ph:code-bold',
        tools: [
          {
            id: 'json_formatter',
            name: 'JSON格式化',
            usage: 300,
            description: '美化、校验与转换JSON数据。',
            path: '/tools/programming/json'
          },
          {
            id: 'regex_tester',
            name: '正则测试器',
            usage: 270,
            description: '在线调试与验证正则表达式。',
            path: '/tools/programming/regex'
          },
          {
            id: 'api_client',
            name: 'API客户端',
            usage: 220,
            description: '简单易用的HTTP API接口测试工具。',
            path: '/tools/programming/api-client'
          },
        ],
      },
    ];
  } catch (e: any) { // 显式声明 e 的类型
    loadingError.value = e as Error; // 类型断言
    console.error("Toolbox Quadrant: Failed to fetch tool data:", e);
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
  grid-template-columns: 1fr; /* Changed for 1x4 layout */
  gap: 25px;
  width: 100%;
  max-width: 1100px; /* You might want to adjust max-width for a single column layout if it looks too narrow */
  padding: 25px;
  box-sizing: border-box;
  background-color: var(--glass-bg-large);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  border-radius: var(--glass-border-radius-large, 16px);
  border: 1px solid var(--glass-border-color);
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
    /* grid-template-columns: 1fr; Already 1fr by default now */
    gap: 20px;
    padding: 15px;
  }
}
</style>