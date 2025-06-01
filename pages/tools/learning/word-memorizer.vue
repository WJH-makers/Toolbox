<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <div class="word-memorize-page">
      <h1 class="page-title">英语单词高效记忆</h1>

      <div class="component-wrapper">
        <WordMemorizeComponent :word-list="activeWordList" @word-reviewed="handleWordReviewed"/>
      </div>

      <div class="controls-section">
        <p v-if="fetchError" class="error-message">错误: {{ fetchError }}</p>
        <p>当前列表: <strong>{{ currentListName }}</strong> ({{ activeWordList.length }} 词)</p>

        <button
            :disabled="isLoadingWords && currentLoadingList === 'local-/data/translated-words.json'"
            class="load-button"
            @click="loadWordsFromLocalFile('/data/translated-words.json', '我的本地单词本')"
        >
          {{
            isLoadingWords && currentLoadingList === 'local-/data/translated-words.json' ? '加载中...' : '加载本地单词本'
          }}
        </button>

        <button
            :disabled="isLoadingWords && currentLoadingList === 'api-common'"
            class="load-button"
            @click="loadWordsViaAPI('common', '常用单词表 (API)')"
        >
          {{ isLoadingWords && currentLoadingList === 'api-common' ? '加载中...' : '加载常用单词 (API)' }}
        </button>

        <button
            :disabled="isLoadingWords && currentLoadingList === 'api-cet4'"
            class="load-button"
            @click="loadWordsViaAPI('cet4', '大学英语四级 (API)')"
        >
          {{ isLoadingWords && currentLoadingList === 'api-cet4' ? '加载中...' : '加载四级单词 (API)' }}
        </button>

      </div>

      <div class="learning-strategy-section">
        <h2 class="strategy-title">高效记忆法：艾宾浩斯遗忘曲线与间隔重复</h2>
        <div class="strategy-content">
          <p>
            您是否感觉刚背过的单词很快就忘了？这其实是正常现象，德国心理学家赫尔曼·艾宾浩斯通过实验发现了著名的“遗忘曲线”。</p>

          <h3>什么是艾宾浩斯遗忘曲线？</h3>
          <p>
            艾宾浩斯遗忘曲线揭示了人类大脑对新信息的遗忘规律：遗忘在学习之后立即开始，最初的遗忘速度非常快，随后逐渐减慢。例如，学习新单词后：</p>
          <ul>
            <li>20分钟后，可能已忘记约42%</li>
            <li>1小时后，忘记约56%</li>
            <li>1天后，忘记约74%</li>
            <li>1周后，忘记约77%</li>
            <li>1个月后，忘记约79%</li>
          </ul>
          <p>（注意：具体百分比因个体差异和材料性质而异，但趋势是普遍的。）</p>

          <h3>如何对抗遗忘，提高记忆效率？—— 间隔重复系统 (SRS)</h3>
          <p>对抗遗忘曲线最有效的方法之一就是<strong>间隔重复 (Spaced Repetition)</strong>。其核心思想是：在您即将忘记某个信息点时，及时进行复习。通过在恰当的时间点进行多次复习，可以显著延长记忆保持时间，并将短期记忆转化为长期记忆。
          </p>

          <h4>间隔重复的关键原则：</h4>
          <ol>
            <li><strong>首次复习要及时：</strong> 学习新单词后，应在几小时内或当天进行第一次复习。</li>
            <li><strong>复习间隔逐渐拉长：</strong> 如果您能成功回忆起单词，下一次复习的间隔就可以适当延长。例如：第1天、第2天、第4天、第7天、第15天、第30天...
            </li>
            <li><strong>主动回忆是核心：</strong> 在复习时，尽量主动回忆单词的含义或拼写，而不是仅仅被动地看答案。本工具的“显示答案”功能就是为了辅助您进行主动回忆后的验证。
            </li>
            <li><strong>个性化调整：</strong> 每个人的记忆曲线和对不同单词的掌握程度都不同。理想的间隔重复系统会根据您的记忆表现（例如，您标记“我认识”或“不认识”）来动态调整每个单词的复习计划。
            </li>
            <li><strong>持之以恒：</strong> 语言学习没有捷径，规律性地使用间隔重复方法进行复习，才能达到最佳效果。</li>
          </ol>

          <h4>使用本工具的建议：</h4>
          <ul>
            <li><strong>选择模式：</strong> 根据您的需求，选择“英译中”或“中译英”模式进行练习。</li>
            <li><strong>主动回忆：</strong> 看到提示后，先努力回忆答案，再点击“显示答案”。</li>
            <li><strong>标记反馈：</strong> 诚实地标记您对单词的掌握程度（“我认识”/“不认识”）。虽然本示例工具尚未实现完整的SRS调度，但这个习惯对未来的学习系统非常有益。
            </li>
            <li><strong>定期复习：</strong> 即使没有复杂的调度算法，您也可以根据艾宾浩斯曲线的原理，有意识地在学习后的第1天、第2天、第4天等时间点回来复习这些单词。
            </li>
          </ul>
          <p>通过科学的方法和不懈的努力，您一定能更高效地掌握英语单词！</p>
        </div>
      </div>
    </div>
  </ContentCard>
</template>

<script lang="ts" setup>
import {onMounted, ref} from 'vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';
import WordMemorizeComponent from '~/components/tools/learning/wordmemorizerComponent.vue';
import type {Word} from '~/types/word';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '英语单词记忆 - 万能工具箱',
  meta: [
    {name: 'description', content: '使用科学的记忆方法，高效背诵英语单词，支持英汉互译。'}
  ]
});

const activeWordList = ref<Word[]>([]);
const currentListName = ref<string>("无");
const isLoadingWords = ref(false);
const fetchError = ref<string | null>(null);
const currentLoadingList = ref<string | null>(null);

// 客户端内存缓存
const wordListCache = new Map<string, Word[]>();

/**
 * 从服务器API加载单词列表
 * @param listIdentifier API能够识别的列表标识符 (例如 'common', 'cet4')
 * @param displayName 在UI上显示的列表名称
 */
async function loadWordsViaAPI(listIdentifier: string, displayName: string) {
  const cacheKey = `api-${listIdentifier}`;
  if (wordListCache.has(cacheKey)) {
    activeWordList.value = wordListCache.get(cacheKey)!;
    currentListName.value = displayName;
    fetchError.value = null; // 清除可能存在的旧错误
    isLoadingWords.value = false; // 确保即使从缓存加载也重置加载状态
    currentLoadingList.value = null;
    console.log(`[Cache] 从缓存加载 '${displayName}'`);
    return;
  }

  if (isLoadingWords.value && currentLoadingList.value === cacheKey) return; // 防止重复点击同一个加载中的API

  isLoadingWords.value = true;
  currentLoadingList.value = cacheKey;
  fetchError.value = null;
  currentListName.value = `加载中 (${displayName})...`;
  activeWordList.value = [];

  try {
    const words = await $fetch<Word[]>(`/api/words?source=json&list=${listIdentifier}`);
    activeWordList.value = words;
    currentListName.value = displayName;
    if (words && words.length > 0) { //只缓存非空结果
      wordListCache.set(cacheKey, words);
    }
  } catch (error: any) {
    const errorMessage = error.data?.statusMessage || error.data?.message || error.message || `无法加载 '${displayName}' 单词列表。`;
    console.error(`Error fetching API list '${listIdentifier}':`, error);
    fetchError.value = errorMessage;
    currentListName.value = `加载 "${displayName}" 失败`;
    activeWordList.value = [];
  } finally {
    isLoadingWords.value = false;
    if (currentLoadingList.value === cacheKey) { // 仅当当前加载的是这个列表时才清除
      currentLoadingList.value = null;
    }
  }
}

/**
 * 从 public 目录下的本地 JSON 文件加载单词列表
 * @param filePath public目录下的文件路径 (例如 '/data/translated-words.json')
 * @param displayName 在UI上显示的列表名称
 */
async function loadWordsFromLocalFile(filePath: string, displayName: string) {
  const cacheKey = `local-${filePath}`;
  if (wordListCache.has(cacheKey)) {
    activeWordList.value = wordListCache.get(cacheKey)!;
    currentListName.value = displayName;
    fetchError.value = null; // 清除可能存在的旧错误
    isLoadingWords.value = false; // 确保即使从缓存加载也重置加载状态
    currentLoadingList.value = null;
    console.log(`[Cache] 从缓存加载 '${displayName}'`);
    return;
  }

  if (isLoadingWords.value && currentLoadingList.value === cacheKey) return; // 防止重复点击同一个加载中的文件

  isLoadingWords.value = true;
  currentLoadingList.value = cacheKey;
  fetchError.value = null;
  currentListName.value = `加载中 (${displayName})...`;
  activeWordList.value = [];

  try {
    const words = await $fetch<Word[]>(filePath);
    activeWordList.value = words;
    currentListName.value = displayName;
    if (words && words.length > 0) { //只缓存非空结果
      wordListCache.set(cacheKey, words);
    }
  } catch (error: any) {
    const errorMessage = error.message || `无法从 "${filePath}" 加载单词列表。请检查文件是否存在于 public 目录且格式正确。`;
    console.error(`Error fetching local file '${filePath}':`, error);
    fetchError.value = errorMessage;
    currentListName.value = `加载 "${displayName}" 失败`;
    activeWordList.value = [];
  } finally {
    isLoadingWords.value = false;
    if (currentLoadingList.value === cacheKey) { // 仅当当前加载的是这个文件时才清除
      currentLoadingList.value = null;
    }
  }
}


function handleWordReviewed(reviewData: { wordId: string | number; known: boolean }) {
  console.log('Word reviewed in page:', reviewData);
}

onMounted(() => {
  loadWordsFromLocalFile('/data/translated-words.json', '我的本地单词本');
});

</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}

.word-memorize-page {
  padding: 10px;
}

.page-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  color: #2c3e50; /* 深蓝灰色，更现代感 */
  margin-bottom: 2rem; /* 增加与下方内容的间距 */
}

.component-wrapper {
  margin-bottom: 2.5rem; /* 增加与下方控件的间距 */
  padding: 1.5rem; /* 增加内边距 */
  background-color: #ffffff;
  border-radius: 12px; /* 更圆润的边角 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* 更柔和的阴影 */
}

.controls-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.controls-section p {
  margin-bottom: 1rem; /* 增加列表名称与按钮的间距 */
  color: #495057; /* 稍深的灰色 */
  font-size: 1.05em;
}

.error-message {
  color: #e74c3c; /* 更鲜明的红色 */
  background-color: #fdedec; /* 淡红色背景 */
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #f5c6cb;
  font-weight: 500;
  margin-bottom: 1rem;
  display: inline-block; /* 使背景色包裹内容 */
}

/* --- 按钮美化 --- */
.load-button {
  font-family: inherit; /* 继承页面字体 */
  font-size: 1rem;
  font-weight: 500; /* 适中字重 */
  padding: 12px 24px; /* 增大内边距 */
  margin: 8px; /* 按钮间距 */
  border: none;
  border-radius: 8px; /* 更圆润的边角 */
  cursor: pointer;
  transition: background-color 0.25s ease, transform 0.15s ease, box-shadow 0.2s ease;
  background-color: #3498db; /* 主题蓝色 */
  color: white;
  letter-spacing: 0.5px; /* 轻微增加字间距 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 180px; /* 给按钮一个最小宽度，使其更统一 */
  text-align: center;
}

.load-button:hover:not(:disabled) {
  background-color: #2980b9; /* 深一点的蓝色 */
  transform: translateY(-2px); /* 轻微上浮效果 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.load-button:active:not(:disabled) {
  transform: translateY(0px); /* 按下时复位 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.load-button:disabled {
  background-color: #bdc3c7; /* 禁用时的灰色 */
  color: #7f8c8d; /* 禁用时的文字颜色 */
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* --- 按钮美化结束 --- */


.learning-strategy-section {
  margin-top: 2rem;
  padding: 25px; /* 增加内边距 */
  background-color: #f8f9fa; /* 淡雅的背景色 */
  border-radius: 12px; /* 更圆润的边角 */
  border: 1px solid #e9ecef; /* 轻微边框 */
}

.strategy-title {
  font-size: 1.6rem; /* 调整标题大小 */
  font-weight: 600;
  color: #34495e; /* 深蓝灰色 */
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #3498db; /* 主题蓝色下划线 */
  padding-bottom: 0.8rem;
}

.strategy-content h3 {
  font-size: 1.25rem; /* 调整副标题大小 */
  color: #2c3e50;
  margin-top: 1.8rem;
  margin-bottom: 0.8rem;
}

.strategy-content p,
.strategy-content li {
  font-size: 1rem;
  line-height: 1.75; /* 增加行高 */
  color: #34495e; /* 统一内容文字颜色 */
  margin-bottom: 1rem;
}

.strategy-content ul, .strategy-content ol {
  padding-left: 30px; /* 增加列表缩进 */
}

.strategy-content strong {
  color: #2980b9; /* 主题深蓝色强调 */
  font-weight: 600;
}
</style>