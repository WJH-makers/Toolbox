<template>
  <div class="word-memorize-component-container">
    <div v-if="!wordList || wordList.length === 0" class="no-words">
      <p>暂无单词数据，请先加载或选择一个单词列表。</p>
    </div>

    <template v-else>
      <div class="controls-bar">
        <div class="mode-switcher">
          <button
              :class="{ active: currentMode === 'en-to-cn' }"
              aria-label="切换到英译中模式"
              class="mode-button"
              @click="setMode('en-to-cn')"
          >
            英译中
          </button>
          <button
              :class="{ active: currentMode === 'cn-to-en' }"
              aria-label="切换到中译英模式"
              class="mode-button"
              @click="setMode('cn-to-en')"
          >
            中译英
          </button>
        </div>
        <div v-if="currentWord" class="progress-info"> 进度: {{ reviewedCount + 1 }} / {{ shuffledList.length }}
        </div>
      </div>

      <div class="flashcard-area">
        <div v-if="currentWord" :class="{ flipped: showAnswer }" class="flashcard">
          <div class="card-face card-front">
            <p class="prompt-text">{{ displayPrompt }}</p>
            <p v-if="currentMode === 'en-to-cn' && currentWord.phonetic_us" class="phonetic">
              US: [{{ currentWord.phonetic_us }}]
            </p>
            <p v-if="currentMode === 'en-to-cn' && currentWord.phonetic_uk" class="phonetic">
              UK: [{{ currentWord.phonetic_uk }}]
            </p>
          </div>
          <div class="card-face card-back">
            <p class="answer-text">{{ displayAnswer }}</p>
            <p v-if="currentWord.example_en && currentMode === 'en-to-cn'" class="example-sentence">
              例句: {{ currentWord.example_en }}
            </p>
            <p v-if="currentWord.example_cn && currentMode === 'en-to-cn' && currentWord.example_en"
               class="example-sentence chinese-example">
              翻译: {{ currentWord.example_cn }}
            </p>
            <p v-if="currentWord.example_en && currentMode === 'cn-to-en'" class="example-sentence">
              原词: {{ currentWord.english }}
            </p>
          </div>
        </div>
        <div v-else class="all-done-message">
          <p>太棒了！您已完成本组单词的学习！🎉</p>
        </div>
      </div>

      <div class="action-buttons">
        <button :disabled="!currentWord" class="action-button" @click="toggleAnswer">
          {{ showAnswer ? '隐藏答案' : '显示答案' }}
        </button>
        <button v-if="currentWord && showAnswer" class="action-button know-button" @click="markWord(true)">
          我认识
        </button>
        <button v-if="currentWord && showAnswer" class="action-button unknown-button" @click="markWord(false)">
          不认识
        </button>
        <button v-if="!showAnswer && currentWord" :disabled="!currentWord" class="action-button next-button"
                @click="loadNextWord">
          跳过 / 下一个
        </button>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, type PropType, ref, watch} from 'vue';
import type {Word} from '~/types/word';

const props = defineProps({
  wordList: {
    type: Array as PropType<Word[]>,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['wordReviewed']);

const currentWordIndex = ref(0);
const currentWord = ref<Word | null>(null);
const currentMode = ref<'en-to-cn' | 'cn-to-en'>('en-to-cn');
const showAnswer = ref(false);
const reviewedCount = ref(0);
const shuffledList = ref<Word[]>([]);

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

function initializeList() {
  if (props.wordList && props.wordList.length > 0) {
    shuffledList.value = shuffleArray(props.wordList);
    currentWordIndex.value = 0;
    reviewedCount.value = 0;
    loadWordByIndex(currentWordIndex.value);
  } else {
    currentWord.value = null;
    shuffledList.value = [];
  }
}

function loadWordByIndex(index: number) {
  if (index >= 0 && index < shuffledList.value.length) {
    currentWord.value = shuffledList.value[index];
    showAnswer.value = false;
  } else {
    currentWord.value = null;
  }
}

function setMode(mode: 'en-to-cn' | 'cn-to-en') {
  currentMode.value = mode;
  showAnswer.value = false; // 切换模式时也隐藏答案
}

function toggleAnswer() {
  if (currentWord.value) {
    showAnswer.value = !showAnswer.value;
  }
}

function loadNextWord() {
  if (reviewedCount.value < shuffledList.value.length - 1) {
    reviewedCount.value++;
    currentWordIndex.value = (currentWordIndex.value + 1) % shuffledList.value.length; // 简单循环获取下一个词的索引
    loadWordByIndex(currentWordIndex.value);
  } else {
    if (currentWord.value) {
      reviewedCount.value++;
    }
    currentWord.value = null;
  }
}

function markWord(known: boolean) {
  if (currentWord.value) {
    emit('wordReviewed', {wordId: currentWord.value.id, known});
    loadNextWord();
  }
}

watch(() => props.wordList, (newList, oldList) => {
  initializeList();
}, {immediate: true, deep: true});

</script>

<style scoped>
/* 样式部分与您之前提供的相同，此处保持不变 */
.word-memorize-component-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #f4f7f6;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.no-words {
  text-align: center;
  color: #777;
  margin-top: 50px;
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
  height: 250px; /* Fixed height for the card to flip in place */
  perspective: 1000px; /* For 3D flip effect */
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
  backface-visibility: hidden; /* Hide the back of the card face when not visible */
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
  background-color: #e6f7ff; /* Light blue for the back */
  border: 1px solid #b3e0ff;
  color: #005f80;
  transform: rotateY(180deg);
}

.prompt-text {
  font-size: 2.2rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.phonetic {
  font-size: 1rem;
  color: #555;
  margin-top: 5px;
}

.answer-text {
  font-size: 1.8rem;
  font-weight: bold;
  color: #007bff;
}

.example-sentence {
  font-size: 0.9rem;
  color: #444;
  margin-top: 15px;
  font-style: italic;
}

.example-sentence.chinese-example {
  color: #00695c; /* Darker cyan for Chinese example translation */
}

.all-done-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: #007bff;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
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

.action-buttons button:nth-child(1) { /* Show/Hide Answer */
  background-color: #28a745;
  color: white;
}

.action-buttons button:nth-child(1):hover:not(:disabled) {
  background-color: #218838;
}

.know-button {
  background-color: #17a2b8; /* Info Blue */
  color: white;
}

.know-button:hover:not(:disabled) {
  background-color: #138496;
}

.unknown-button {
  background-color: #ffc107; /* Warning Yellow */
  color: #212529;
}

.unknown-button:hover:not(:disabled) {
  background-color: #e0a800;
}

.next-button {
  background-color: #6c757d; /* Secondary Gray */
  color: white;
}

.next-button:hover:not(:disabled) {
  background-color: #5a6268;
}
</style>