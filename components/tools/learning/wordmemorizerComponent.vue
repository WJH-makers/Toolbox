<template>
  <div class="word-memorize-component-container">
    <div v-if="authCheckLoading" class="loading-message">检查用户状态...</div>

    <div v-if="!authCheckLoading && selectedLoadMode === 'api' && !currentUserId"
         class="auth-placeholder component-level-auth-error">
      <p class="error-message">此单词列表需要登录才能追踪进度。请先<a href="/login">登录</a>，或选择其他列表。</p>
    </div>

    <div v-if="!authCheckLoading" class="list-selection-area">
      <p>选择词书进行学习:</p>
      <button
          v-for="list in availableLists"
          :key="list.id"
          :class="{ 'active-list-button': isActiveList(list) }"
          :disabled="isLoadingWords && currentLoadingListIdentifier === list.identifier"
          class="load-button"
          @click="selectListToLoad(list)"
      >
        {{ isLoadingWords && currentLoadingListIdentifier === list.identifier ? '加载中...' : list.displayName }}
        <span v-if="list.mode === 'api' && currentUserId"> (个性化)</span>
      </button>
    </div>

    <div v-if="currentActiveListSource" class="main-memorize-ui">
      <p v-if="fetchError" class="error-message component-error">错误: {{ fetchError }}</p>
      <p v-if="isLoadingWords && !fetchError" class="loading-message">正在加载 "{{ currentInternalListName }}"...</p>

      <div v-if="!isLoadingWords && (!shuffledList || shuffledList.length === 0) && !fetchError" class="no-words">
        <p>列表 "{{ currentInternalListName }}" 中暂无单词可供学习，或已全部学完！</p>
        <p v-if="selectedLoadMode === 'api' && currentUserId && currentActiveListSource" class="reset-option-for-empty">
          您可以尝试
          <button :disabled="isResetting" class="inline-reset-button" @click="resetCurrentListProgress">
            {{ isResetting ? '重置中...' : '重置本列表进度' }}
          </button>
          ，看看是否有已记住的单词。
        </p>
      </div>

      <template v-if="!isLoadingWords && shuffledList && shuffledList.length > 0 && currentWord">
        <div class="controls-bar">
          <div class="mode-switcher">
            <button :class="{ active: currentMode === 'en-to-cn' }" class="mode-button" @click="setMode('en-to-cn')">
              英译中
            </button>
            <button :class="{ active: currentMode === 'cn-to-en' }" class="mode-button" @click="setMode('cn-to-en')">
              中译英
            </button>
          </div>
          <div class="progress-info">进度: {{ reviewedCountInSession + 1 }} / {{ shuffledList.length }}</div>
        </div>

        <div class="flashcard-area">
          <div :class="{ flipped: showAnswer }" class="flashcard">
            <div class="card-face card-front">
              <p class="prompt-text">{{ displayPrompt }}</p>
              <p v-if="currentMode === 'en-to-cn' && currentWord.phonetic_us" class="phonetic">US:
                [{{ currentWord.phonetic_us }}]</p>
              <p v-if="currentMode === 'en-to-cn' && currentWord.phonetic_uk" class="phonetic">UK:
                [{{ currentWord.phonetic_uk }}]</p>
            </div>
            <div class="card-face card-back">
              <p class="answer-text">{{ displayAnswer }}</p>
              <p v-if="currentWord.example_en && currentMode === 'en-to-cn'" class="example-sentence">例句:
                {{ currentWord.example_en }}</p>
              <p v-if="currentWord.example_cn && currentMode === 'en-to-cn' && currentWord.example_en"
                 class="example-sentence chinese-example">翻译: {{ currentWord.example_cn }}</p>
              <p v-if="currentWord.example_en && currentMode === 'cn-to-en'" class="example-sentence">原词:
                {{ currentWord.english }}</p>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button :disabled="!currentWord" class="action-button" @click="toggleAnswer">
            {{ showAnswer ? '隐藏答案' : '显示答案' }}
          </button>
          <button v-if="currentWord && showAnswer" class="action-button know-button" @click="handleMarkWord(true)">
            我认识
          </button>
          <button v-if="currentWord && showAnswer" class="action-button unknown-button" @click="handleMarkWord(false)">
            不认识
          </button>
          <button v-if="!showAnswer && currentWord" class="action-button next-button" @click="loadNextWordUIAction">跳过
            / 下一个
          </button>
        </div>
      </template>

      <div v-if="!isLoadingWords && !currentWord && shuffledList.length > 0 && !fetchError" class="all-done-message">
        <p>太棒了！您已完成 "{{ currentInternalListName }}" 列表的学习！🎉</p>
        <p v-if="selectedLoadMode === 'api' && currentUserId && currentActiveListSource">
          <button :disabled="isResetting" class="inline-reset-button" @click="resetCurrentListProgress">
            {{ isResetting ? '重置中...' : '再学一遍 (重置进度)' }}
          </button>
        </p>
      </div>

      <div
          v-if="!isLoadingWords && selectedLoadMode === 'api' && currentUserId && currentActiveListSource && shuffledList.length > 0 && currentWord"
          class="component-controls-bottom">
        <button :disabled="isResetting" class="action-button reset-button-bottom" @click="resetCurrentListProgress">
          {{ isResetting ? '重置中...' : `重置 "${currentInternalListName}" 进度` }}
        </button>
      </div>
    </div>
    <div v-else-if="!authCheckLoading && !currentActiveListSource" class="info-message">
      请从上方选择一个单词列表开始学习。
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, type PropType, ref, watch, onMounted} from 'vue';
import type {Word} from '~/types/word';

// 定义可选的词书列表
interface AvailableList {
  id: string; // 用于按钮的key和内部标识
  identifier: string; // API的source参数或本地文件路径
  mode: 'api' | 'local';
  displayName: string;
  requiresAuth?: boolean; // 标记此列表是否需要登录
}

const availableLists = ref<AvailableList[]>([
  {id: 'common-api', identifier: 'common', mode: 'api', displayName: '常用单词', requiresAuth: true},
  {id: 'cet4-api', identifier: 'cet4', mode: 'api', displayName: '大学英语四级', requiresAuth: true},
  {id: 'local-custom', identifier: '/data/translated-words.json', mode: 'local', displayName: '本地单词本'},
  // 您可以添加更多列表配置
]);

// 用户状态
const currentUserId = ref<string | null>(null);
const authCheckLoading = ref(true);

// 当前选定的列表配置
const selectedListSource = ref<string | null>(null);
const selectedLoadMode = ref<'api' | 'local' | null>(null);
const selectedDisplayName = ref<string>("未选择");

// 内部状态
const internalWordList = ref<Word[]>([]);
const currentInternalListName = ref<string>("未选择"); // 组件内部显示的列表名
const isLoadingWords = ref(false);
const fetchError = ref<string | null>(null);
const isResetting = ref(false);
const currentLoadingListIdentifier = ref<string | null>(null); // 跟踪当前正在加载的列表的identifier

const currentWord = ref<Word | null>(null);
const currentMode = ref<'en-to-cn' | 'cn-to-en'>('en-to-cn');
const showAnswer = ref(false);
const reviewedCountInSession = ref(0);
const shuffledList = ref<Word[]>([]);

const wordListCache = new Map<string, Word[]>();

// Computed property for :key binding to ensure component re-renders when essential props change
const componentKey = computed(() => `<span class="math-inline">\{selectedListSource\.value\}\-</span>{selectedLoadMode.value}-${currentUserId.value}`);

const currentActiveListSource = computed(() => selectedListSource.value); // 用于模板中判断


function generateCacheKey(identifier: string, mode: 'api' | 'local', userId: string | null): string {
  if (mode === 'api' && userId) {
    return `user-<span class="math-inline">\{userId\}\-api\-</span>{identifier}`;
  } else if (mode === 'local') {
    return `local-${identifier}`;
  }
  return `guest-api-${identifier}`; // API列表但无用户ID（访客模式）
}

async function fetchUserData() {
  authCheckLoading.value = true;
  try {
    const userResponse = await $fetch<{
      success: boolean,
      data?: { user: { id: string } },
      error?: string
    }>('/api/user/me');
    if (userResponse.success && userResponse.data?.user?.id) {
      currentUserId.value = userResponse.data.user.id;
      console.log("[Component] 用户已登录，ID:", currentUserId.value);
    } else {
      console.log("[Component] 用户未登录或获取用户信息失败。");
      currentUserId.value = null;
    }
  } catch (error) {
    console.error("[Component] 检查用户状态时出错:", error);
    currentUserId.value = null;
  } finally {
    authCheckLoading.value = false;
  }
}

async function fetchData() {
  if (!selectedListSource.value || !selectedLoadMode.value) {
    console.warn("[Component] 未选择列表源或加载模式，无法加载数据。");
    internalWordList.value = [];
    initializeSessionList();
    return;
  }

  const cacheKey = generateCacheKey(selectedListSource.value, selectedLoadMode.value, currentUserId.value);
  if (wordListCache.has(cacheKey)) {
    internalWordList.value = wordListCache.get(cacheKey)!;
    currentInternalListName.value = selectedDisplayName.value;
    fetchError.value = null;
    console.log(`[Cache][Component] 从缓存加载 '${selectedDisplayName.value}'`);
    initializeSessionList();
    return;
  }

  isLoadingWords.value = true;
  fetchError.value = null;
  currentInternalListName.value = selectedDisplayName.value; // 显示正确的名字
  currentLoadingListIdentifier.value = selectedListSource.value;
  // emit('listLoadStatus', { isLoading: true, error: null, listName: `加载中 (${selectedDisplayName.value})...`, wordCount: 0 });
  internalWordList.value = [];

  try {
    let words: Word[] = [];
    if (selectedLoadMode.value === 'api') {
      if (!currentUserId.value) { // 再次检查，以防万一
        // 理论上，如果 requiresAuth 为 true，selectListToLoad 会阻止到这里
        console.warn("[Component] API模式需要用户ID，但未提供。将加载为访客模式（如果API支持）。");
        // 可以尝试不带userId请求，或加载公共列表
        // words = await $fetch<Word[]>(`/api/vocabulary/session?source=${selectedListSource.value}`); // 访客API调用示例
        // 为简单起见，如果API列表需要用户ID但没有，则报错
        throw new Error("此API列表需要用户登录。");
      }
      // API调用时不再传递userId_DEMO_ONLY，后端应从event.context.auth.userId获取
      words = await $fetch<Word[]>(`/api/vocabulary/session?source=${selectedListSource.value}`);
    } else { // local
      words = await $fetch<Word[]>(selectedListSource.value); // selectedListSource 是文件路径
    }

    internalWordList.value = words;
    if (words && words.length >= 0) {
      wordListCache.set(cacheKey, words);
    }
  } catch (error: any) {
    const errorMessage = error.data?.statusMessage || error.data?.message || error.message || `无法加载 '${selectedDisplayName.value}' 单词列表。`;
    console.error(`[Component] Error loading list '${selectedDisplayName.value}':`, error);
    fetchError.value = errorMessage;
    internalWordList.value = [];
  } finally {
    isLoadingWords.value = false;
    currentLoadingListIdentifier.value = null;
    initializeSessionList(); // 无论成功失败，都尝试初始化会话列表（可能是空列表）
    // emit('listLoadStatus', { isLoading: false, error: fetchError.value, listName: currentInternalListName.value, wordCount: internalWordList.value.length });
  }
}

function initializeSessionList() {
  if (internalWordList.value && internalWordList.value.length > 0) {
    shuffledList.value = shuffleArray(internalWordList.value);
    currentWordIndex.value = 0;
    reviewedCountInSession.value = 0;
    loadWordByIndex(currentWordIndex.value);
  } else {
    currentWord.value = null;
    shuffledList.value = [];
    reviewedCountInSession.value = 0;
  }
  // fetchError.value = null; // 不在这里清除，fetchData的finally会处理
}

function selectListToLoad(list: AvailableList) {
  if (list.requiresAuth && !currentUserId.value) {
    alert("此词书需要登录才能查看个性化进度。请登录或选择其他词书。");
    fetchError.value = "请登录以访问此词书。"; // 设置错误信息
    selectedListSource.value = null; // 清空选择
    selectedLoadMode.value = null;
    selectedDisplayName.value = "无";
    internalWordList.value = [];
    initializeSessionList();
    return;
  }
  console.log(`[Component] 选定列表: ${list.displayName}`);
  selectedListSource.value = list.identifier;
  selectedLoadMode.value = list.mode;
  selectedDisplayName.value = list.displayName;
  fetchData(); // 选择列表后立即获取数据
}

function isActiveList(list: AvailableList): boolean {
  return selectedListSource.value === list.identifier && selectedLoadMode.value === list.mode;
}

// --- 单词卡片交互逻辑 ---
const displayPrompt = computed(() => {
  if (!currentWord.value) return '';
  return currentMode.value === 'en-to-cn' ? currentWord.value.english : currentWord.value.chinese;
});
const displayAnswer = computed(() => {
  if (!currentWord.value) return '';
  return currentMode.value === 'en-to-cn' ? currentWord.value.chinese : currentWord.value.english;
});

function shuffleArray(array: Word[]): Word[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function loadWordByIndex(index: number) {
  if (index >= 0 && index < shuffledList.value.length) {
    currentWord.value = shuffledList.value[index];
    showAnswer.value = false;
  } else {
    currentWord.value = null;
    if (shuffledList.value.length > 0 && reviewedCountInSession.value >= shuffledList.value.length) {
      // emit('allWordsCompletedInSession', { listName: selectedDisplayName.value, listSource: selectedListSource.value! });
      console.log(`[Component] 列表 "${selectedDisplayName.value}" 已完成。`);
    }
  }
}

function setMode(mode: 'en-to-cn' | 'cn-to-en') {
  currentMode.value = mode;
  showAnswer.value = false;
}

function toggleAnswer() {
  if (currentWord.value) {
    showAnswer.value = !showAnswer.value;
  }
}

function advanceToNextWord() {
  if (reviewedCountInSession.value < shuffledList.value.length - 1) {
    reviewedCountInSession.value++;
    currentWordIndex.value = (currentWordIndex.value + 1) % shuffledList.value.length;
    loadWordByIndex(currentWordIndex.value);
  } else {
    if (currentWord.value) {
      reviewedCountInSession.value++;
    }
    loadWordByIndex(shuffledList.value.length);
  }
}

function loadNextWordUIAction() {
  if (currentWord.value) {
    advanceToNextWord();
  }
}

async function handleMarkWord(known: boolean) {
  if (!currentWord.value) return;
  const wordToMark = currentWord.value;
  // emit('wordReviewedOnServer', { wordId: wordToMark.id, known, englishWord: wordToMark.english });

  if (selectedLoadMode.value === 'api' && currentUserId.value) {
    try {
      await $fetch('/api/vocabulary/progress', {
        method: 'POST',
        body: {wordId: wordToMark.id, known: known} // API应从context获取userId
      });
      console.log(`[Component][Progress] 单词 "${wordToMark.english}" 进度已更新 (known: ${known})`);
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || error.data?.message || "更新单词进度失败";
      console.error(`[Component][Progress] 更新单词 "${wordToMark.english}" 进度失败:`, errorMessage);
      fetchError.value = `更新 "${wordToMark.english}" 进度失败: ${errorMessage.substring(0, 100)}`;
    }
  } else {
    console.log(`[Component][Progress] 本地模式或未登录，单词 "${wordToMark.english}" 标记为 (known: ${known}) (未同步服务器)`);
  }
  advanceToNextWord();
}

async function resetCurrentListProgress() {
  if (selectedLoadMode.value !== 'api' || !currentUserId.value || !selectedListSource.value) {
    alert("此列表不支持重置进度（例如本地文件列表或用户未登录）。");
    return;
  }
  if (!confirm(`您确定要重置列表 "${selectedDisplayName.value}" 的学习进度吗？`)) {
    return;
  }
  isResetting.value = true;
  fetchError.value = null;
  // emit('listLoadStatus', {isLoading: true, error: null, listName: `重置中 (${selectedDisplayName.value})...`, wordCount: internalWordList.value.length});

  try {
    await $fetch('/api/vocabulary/progress-reset', {
      method: 'POST',
      body: {listSource: selectedListSource.value} // API应从context获取userId
    });
    alert(`列表 "${selectedDisplayName.value}" 的学习进度已重置！`);
    const cacheKey = generateCacheKey(selectedListSource.value, 'api', currentUserId.value);
    wordListCache.delete(cacheKey);
    await fetchData();
  } catch (error: any) {
    const errorMessage = error.data?.statusMessage || error.data?.message || "重置进度失败";
    console.error(`[Component] 重置 "${selectedDisplayName.value}" 进度失败:`, error);
    fetchError.value = `重置 "${selectedDisplayName.value}" 进度失败: ${errorMessage}`;
    // emit('listLoadStatus', {isLoading: false, error: fetchError.value, listName: selectedDisplayName.value, wordCount: internalWordList.value.length});
  } finally {
    isResetting.value = false;
  }
}

onMounted(async () => {
  await fetchUserData(); // 首先获取用户信息
  // 用户信息获取后，如果未选择列表，可以让用户选择，或者加载一个默认的
  // 这里改为不自动加载列表，等待用户点击按钮
  if (!selectedListSource.value && availableLists.value.length > 0) {
    console.log("[Component] 请选择一个词书开始学习。");
    // 可以默认选中第一个可用的列表，或者什么都不做
    // selectListToLoad(availableLists.value[0]); // 例如，默认加载第一个列表
  }
});

// 监听外部可能改变用户状态的事件，如果userId变化，重新评估是否加载
watch(currentUserId, (newUserId, oldUserId) => {
  if (newUserId !== oldUserId) {
    console.log("[Component] 用户状态变化，可能需要重新加载或调整列表。");
    // 如果当前有选中的API列表，可能需要刷新以获取该用户的进度
    if (selectedLoadMode.value === 'api' && selectedListSource.value) {
      const cacheKey = generateCacheKey(selectedListSource.value, 'api', newUserId);
      const oldCacheKey = generateCacheKey(selectedListSource.value, 'api', oldUserId);
      wordListCache.delete(oldCacheKey); // 清除旧用户的缓存（如果适用）
      wordListCache.delete(cacheKey); // 清除新用户的缓存以强制刷新
      fetchData(); // 重新获取数据
    }
  }
});

</script>

<style scoped>
/* ... (与您之前提供的美化样式一致) ... */
.word-memorize-component-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #f4f7f6;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-height: 400px;
  position: relative; /* For absolute positioning of error/loading messages */
}

.list-selection-area {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 600px; /* 调整最大宽度 */
  text-align: center;
}

.list-selection-area p {
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #333;
  font-weight: 500;
}

.load-button { /* 与父组件的按钮样式保持一致或自定义 */
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 10px 18px;
  margin: 5px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.25s ease, transform 0.15s ease, box-shadow 0.2s ease;
  background-color: #3498db;
  color: white;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  text-align: center;
}

.load-button:hover:not(:disabled) {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.load-button.active-list-button {
  background-color: #28a745;
  box-shadow: 0 2px 5px rgba(40, 167, 69, 0.4);
}

.load-button.active-list-button:hover:not(:disabled) {
  background-color: #218838;
}

.load-button:disabled {
  background-color: #bdc3c7;
  color: #7f8c8d;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.main-memorize-ui {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.component-error, .loading-message {
  display: block;
  width: calc(100% - 40px);
  max-width: 500px;
  margin: 0 auto 15px auto;
  padding: 8px 15px;
  border-radius: 6px;
  z-index: 10;
  text-align: center;
}

.auth-placeholder.component-level-auth-error { /* 用于组件内部的认证错误提示 */
  margin: 10px auto 20px auto;
  padding: 15px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  border-radius: 8px;
  max-width: 500px;
}

.auth-placeholder a {
  color: #007bff;
  text-decoration: underline;
}

.component-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.loading-message {
  background-color: #e2e3e5;
  color: #383d41;
  border: 1px solid #d6d8db;
}

.no-words {
  text-align: center;
  color: #777;
  margin-top: 50px;
  padding: 20px;
  width: 100%;
  max-width: 500px;
}

.reset-option-for-empty {
  margin-top: 10px;
  font-size: 0.9em;
}

.inline-reset-button {
  background: none;
  border: none;
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
}

.inline-reset-button:disabled {
  color: #6c757d;
  text-decoration: none;
  cursor: not-allowed;
}


.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 500px;
  margin-bottom: 20px;
}

.mode-switcher button.mode-button {
  padding: 8px 15px;
  margin-right: 10px;
  border: 1px solid #007bff;
  background-color: white;
  color: #007bff;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.mode-switcher button.mode-button:hover {
  background-color: #0056b3;
  color: white;
}

.mode-switcher button.mode-button.active {
  background-color: #007bff;
  color: white;
  font-weight: bold;
}

.progress-info {
  font-size: 0.9em;
  color: #555;
}

.flashcard-area {
  width: 100%;
  max-width: 500px;
  height: 250px;
  perspective: 1000px;
  margin-bottom: 25px;
}

.flashcard {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.flashcard.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
  border-radius: 10px;
  text-align: center;
}

.card-front {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  color: #333;
}

.card-back {
  background-color: #e6f7ff;
  border: 1px solid #b3e0ff;
  color: #005f80;
  transform: rotateY(180deg);
}

.prompt-text {
  font-size: 2.2rem;
  font-weight: bold;
  margin-bottom: 10px;
  word-break: break-word;
}

.answer-text {
  font-size: 1.8rem;
  font-weight: bold;
  color: #007bff;
  word-break: break-word;
}

.phonetic {
  font-size: 1rem;
  color: #555;
  margin-top: 5px;
}

.example-sentence {
  font-size: 0.9rem;
  color: #444;
  margin-top: 15px;
  font-style: italic;
  max-height: 60px;
  overflow-y: auto;
}

.example-sentence.chinese-example {
  color: #00695c;
}

.all-done-message {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: #007bff;
  padding: 20px;
  box-sizing: border-box;
  width: 100%;
  max-width: 500px;
}

.all-done-message p {
  margin-bottom: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 15px;
}

.action-button {
  padding: 12px 25px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  min-width: 120px;
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.action-buttons button:nth-child(1) {
  background-color: #28a745;
  color: white;
}

.action-buttons button:nth-child(1):hover:not(:disabled) {
  background-color: #218838;
}

.know-button {
  background-color: #17a2b8;
  color: white;
}

.know-button:hover:not(:disabled) {
  background-color: #138496;
}

.unknown-button {
  background-color: #ffc107;
  color: #212529;
}

.unknown-button:hover:not(:disabled) {
  background-color: #e0a800;
}

.next-button {
  background-color: #6c757d;
  color: white;
}

.next-button:hover:not(:disabled) {
  background-color: #5a6268;
}

.component-controls-bottom {
  margin-top: 20px;
  width: 100%;
  max-width: 500px;
  display: flex;
  justify-content: center;
}

.reset-button-bottom {
  background-color: #dc3545;
  color: white;
  padding: 10px 20px;
}

.reset-button-bottom:hover:not(:disabled) {
  background-color: #c82333;
}

.reset-button-bottom:disabled {
  background-color: #efa2a9;
}

.info-message {
  text-align: center;
  margin: 2rem 0;
  color: #6c757d;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
</style>