<template>
  <div class="math-logic-explorer-container">
    <h2 style="text-align: center;">数学与逻辑探索 🧠</h2>
    <p class="page-description">
      欢迎来到数学与逻辑的奇妙世界！这里集合了多种交互式工具和演示，助您探索从基础概念到高等技巧的各种数学原理和逻辑思维。选择一个您感兴趣的主题开始探索吧！
    </p>

    <div class="topic-selector-panel">
      <NuxtLink
          v-for="topic in availableTopics"
          :key="topic.id"
          :to="topic.path"
          class="topic-card-link"
      >
        <div class="topic-card">
          <div class="topic-icon">{{ topic.icon || '📚' }}</div>
          <h4 class="topic-name">{{ topic.name }}</h4>
          <p class="topic-description">{{ topic.description }}</p>
          <span class="topic-status-preview">{{ topic.statusPreview || '点击探索' }}</span>
        </div>
      </NuxtLink>
    </div>

    <div class="explanation-panel general-explanation">
      <h4>开始您的探索之旅</h4>
      <p>
        数学不仅是数字和公式，它是一种思考方式，是理解世界的语言。逻辑则是清晰思考和有效论证的基石。希望这些工具能点燃您对数学与逻辑的热情！</p>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue';

const availableTopics = ref([
  {
    id: 'fourier_transform',
    name: '傅里叶变换初探',
    description: '将信号分解为其频率组成，可视化波形叠加与频谱。',
    icon: '📊',
    path: '/tools/learning/maths/fourier-transform',
    statusPreview: '探索信号奥秘'
  },
  {
    id: 'polynomial_apps',
    name: '多项式函数应用',
    description: '探索求根、插值和曲线拟合，理解数学建模。',
    icon: '📈',
    path: '/tools/learning/maths/polynomial-apps',
    statusPreview: '玩转函数曲线'
  },
  {
    id: 'transcendental_eq',
    name: '超越方程求解',
    description: '了解并尝试数值方法求解复杂的超越方程。',
    icon: '🔢',
    path: '/tools/learning/maths/transcendental-eq',
    statusPreview: '挑战方程求解'
  },
  {
    id: 'lhopital_rule',
    name: '洛必达法则应用',
    description: '学习使用洛必达法则求解不定型极限。',
    icon: '♾️',
    path: '/tools/learning/maths/lhopital-rule',
    statusPreview: '攻克极限难题'
  },
]);

</script>

<style scoped>
.math-logic-explorer-container {
  max-width: 1100px;
  margin: 30px auto;
  padding: 25px;
  font-family: 'Inter', sans-serif;
  background-color: var(--background-color-soft, #fdfdff);
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

.math-logic-explorer-container h2 {
  color: var(--text-color-headings, #2c3e50);
  margin-bottom: 15px;
  font-size: 2rem;
  font-weight: 700;
}

.page-description {
  text-align: center;
  color: var(--text-color-secondary, #555);
  font-size: 1.05em;
  margin-bottom: 30px;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.topic-selector-panel {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* 调整卡片最小宽度 */
  gap: 25px; /* 卡片间距 */
  margin-bottom: 40px;
  padding: 10px 0;
}

.topic-card-link {
  text-decoration: none; /* 移除 NuxtLink 的默认下划线 */
  color: inherit; /* 继承颜色 */
  display: block; /* 使链接占据整个卡片区域 */
  outline: none; /* 移除聚焦时的轮廓，由卡片样式处理 */
}

.topic-card-link:focus-visible .topic-card { /* 键盘聚焦时给卡片一个清晰的指示 */
  box-shadow: 0 0 0 3px var(--color-primary-focus-ring, rgba(0, 123, 255, 0.4));
}


.topic-card {
  background-color: var(--background-color-base, #ffffff);
  border: 1px solid var(--border-color-subtle, #e8e8e8);
  border-radius: 12px; /* 更大的圆角 */
  padding: 25px 20px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%; /* 让所有卡片在grid中等高 */
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04);
}

.topic-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
}

.topic-icon {
  font-size: 3rem; /* 增大图标 */
  margin-bottom: 15px;
  line-height: 1;
  color: var(--color-primary, #007bff);
}

.topic-name {
  font-size: 1.25em;
  font-weight: 600;
  color: var(--text-color-headings, #333);
  margin-bottom: 10px;
}

.topic-description {
  font-size: 0.9em;
  color: var(--text-color-secondary, #666);
  line-height: 1.5;
  flex-grow: 1; /* 使描述区域填充剩余空间，帮助对齐 */
  margin-bottom: 15px;
}

.topic-status-preview {
  font-size: 0.8em;
  color: var(--color-primary, #007bff);
  font-weight: 500;
  padding: 5px 10px;
  background-color: var(--color-primary-light, #e3f2fd);
  border-radius: 15px; /* 胶囊形状 */
  display: inline-block;
}


.explanation-panel.general-explanation {
  margin-top: 30px;
  padding: 25px;
  background-color: var(--info-background-soft, #eef2f7);
  border-radius: 12px;
  font-size: 1em;
  line-height: 1.7;
  color: var(--info-text, #2c3e50);
  border: 1px solid var(--info-border, #d0dae7);
  text-align: center;
}

.explanation-panel.general-explanation h4 {
  margin-top: 0;
  color: var(--info-header, #0056b3);
  font-size: 1.3em;
  margin-bottom: 12px;
}

/* 移除了 .example-display-area 和内部的占位符样式，因为内容现在在独立页面 */
</style>