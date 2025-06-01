<template>
  <div class="recipe-page-container">
    <h2 style="text-align: center;">查找食谱</h2>

    <form class="search-recipe-form" @submit.prevent="handleNewSearch">
      <div class="form-item">
        <label for="search-query">搜索菜名</label>
        <input
            id="search-query"
            v-model="searchQuery"
            :disabled="isLoadingSearch"
            placeholder="例如: 鸡肉, 鱼面..."
            type="text"
        >
      </div>
      <button :disabled="isLoadingSearch || !searchQuery.trim()" type="submit">
        {{ isLoadingSearch && currentPage === 1 ? '搜索中...' : '搜索' }}
      </button>
    </form>

    <div v-if="searchError" class="error-alert">
      <strong>搜索错误</strong>
      <p>{{ searchError }}</p>
      <button class="close-alert-button" @click="searchError = null">×</button>
    </div>

    <div v-if="isLoadingSearch && searchResults.length === 0" class="loading-spinner">
      正在加载搜索结果...
    </div>

    <div v-if="!isLoadingSearch && searchResults.length === 0 && lastSearchAttempted" class="empty-state">
      没有找到相关的食谱，请尝试其他关键词。
    </div>

    <div v-if="searchResults.length > 0" class="search-results-container">
      <h3>搜索结果 (找到 {{ totalMeals }} 条相关食谱)</h3>
      <ul class="recipe-items-list summary-list">
        <li
            v-for="mealSummary in searchResults" :key="mealSummary.id" class="recipe-item summary-item"
            @click="showMealDetails(mealSummary.id)">
          <img
              v-if="mealSummary.imageUrl" :alt="mealSummary.name" :src="mealSummary.imageUrl + '/preview'"
               class="summary-image">
          <div class="recipe-item-content summary-content">
            <h4>{{ mealSummary.name }}</h4>
          </div>
          <button class="action-button button-view-details">查看详情</button>
        </li>
      </ul>
      <div v-if="hasMorePages" class="load-more-container">
        <button :disabled="isLoadingSearch" class="action-button button-load-more" @click="loadMoreResults">
          {{ isLoadingSearch ? '加载中...' : '加载更多食谱' }}
        </button>
      </div>
      <div
          v-if="!isLoadingSearch && searchResults.length > 0 && !hasMorePages && lastSearchAttempted"
           class="empty-state">
        所有相关食谱已加载完毕。
      </div>
    </div>


    <div v-if="detailsError" class="error-alert">
      <strong>加载详情错误</strong>
      <p>{{ detailsError }}</p>
      <button class="close-alert-button" @click="detailsError = null">×</button>
    </div>

    <div v-if="isLoadingDetails" class="loading-spinner">
      正在加载食谱详情...
    </div>

    <div v-if="selectedMealDetails && !isLoadingDetails" class="recipe-detail-view">
      <div class="translate-button-container">
        <button
            :disabled="isTranslatingDetails || selectedMealDetails._isTranslated"
            class="action-button button-translate"
            @click="translateCurrentRecipeDetails">
          {{
            isTranslatingDetails ? '翻译中...' : (selectedMealDetails._isTranslated ? '已翻译' : '将详情翻译成中文')
          }}
        </button>
        <span v-if="translationError" class="translation-error-text">{{ translationError }}</span>
      </div>

      <h3>
        <span class="icon">🍽️</span> {{ selectedMealDetails.name }}
      </h3>
      <div class="recipe-item full-details">
        <div class="recipe-item-content">
          <img
              v-if="selectedMealDetails.imageUrl" :alt="selectedMealDetails.name" :src="selectedMealDetails.imageUrl"
               class="detail-image">

          <div class="recipe-meta-tags">
            <span v-if="selectedMealDetails.category" class="recipe-tag recipe-tag-category">
              <strong>分类:</strong> {{ selectedMealDetails.category }}
            </span>
            <span v-if="selectedMealDetails.area" class="recipe-tag recipe-tag-area">
              <strong>地区:</strong> {{ selectedMealDetails.area }}
            </span>
            <span v-if="selectedMealDetails.tags && selectedMealDetails.tags.length" class="recipe-tag recipe-tag-tags">
              <strong>标签:</strong> {{ selectedMealDetails.tags.join(', ') }}
            </span>
          </div>

          <div v-if="selectedMealDetails.ingredients && selectedMealDetails.ingredients.length" class="recipe-section">
            <h4>食材清单</h4>
            <ul class="ingredients-list">
              <li v-for="(ingredient, index) in selectedMealDetails.ingredients" :key="`ing-${index}`">
                {{ ingredient.name }} - {{ ingredient.measure }}
              </li>
            </ul>
          </div>

          <div v-if="selectedMealDetails.instructions" class="recipe-section">
            <h4>制作步骤</h4>
            <pre class="instructions-text">{{ selectedMealDetails.instructions }}</pre>
          </div>

          <div v-if="selectedMealDetails.youtubeUrl" class="recipe-section"><h4>教学视频</h4> <a
              :href="selectedMealDetails.youtubeUrl" rel="noopener noreferrer" target="_blank">观看 YouTube 视频</a>
          </div>
          <div v-if="selectedMealDetails.sourceUrl" class="recipe-section"><h4>原始来源</h4> <a
              :href="selectedMealDetails.sourceUrl" rel="noopener noreferrer" target="_blank">查看原始食谱链接</a></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed} from 'vue';

const searchQuery = ref('');
const searchResults = ref([]);
const isLoadingSearch = ref(false);
const searchError = ref(null);
const lastSearchAttempted = ref(false);

const currentPage = ref(1);
const totalMeals = ref(0);
const totalPages = ref(0);
const limitPerPage = ref(5);

const selectedMealDetails = ref(null);
const isLoadingDetails = ref(false);
const detailsError = ref(null);

const isTranslatingDetails = ref(false);
const translationError = ref(null);
// fieldTranslationStatus 不再需要，因为失败时直接显示英文，不再有字段级失败提示
// const fieldTranslationStatus = ref({});

const hasMorePages = computed(() => currentPage.value < totalPages.value);

async function fetchRecipeData(isLoadMoreOperation = false) {
  if (isLoadMoreOperation && !searchQuery.value.trim()) {
    return;
  }
  if (!isLoadMoreOperation && !searchQuery.value.trim()) {
    searchResults.value = [];
    totalMeals.value = 0;
    totalPages.value = 0;
    selectedMealDetails.value = null;
    lastSearchAttempted.value = false;
    return;
  }
  isLoadingSearch.value = true;
  searchError.value = null;
  if (!isLoadMoreOperation) {
    selectedMealDetails.value = null;
    // fieldTranslationStatus.value = {}; // 移除
    translationError.value = null;
  }
  try {
    const response = await $fetch(`/api/recipes/search?s=${encodeURIComponent(searchQuery.value.trim())}&page=${currentPage.value}&limit=${limitPerPage.value}`);
    if (isLoadMoreOperation) searchResults.value.push(...(response.meals || [])); else searchResults.value = response.meals || [];
    totalMeals.value = response.totalMeals || 0;
    totalPages.value = response.totalPages || 0;
  } catch (error) {
    searchError.value = error.data?.message || error.statusMessage || '获取食谱数据失败';
    if (!isLoadMoreOperation) {
      searchResults.value = [];
      totalMeals.value = 0;
      totalPages.value = 0;
    } else currentPage.value--;
  } finally {
    isLoadingSearch.value = false;
  }
}

async function handleNewSearch() {
  currentPage.value = 1;
  lastSearchAttempted.value = true;
  await fetchRecipeData(false);
}

async function loadMoreResults() {
  if (!hasMorePages.value || isLoadingSearch.value) return;
  currentPage.value++;
  await fetchRecipeData(true);
}

async function showMealDetails(mealId) {
  if (!mealId) return;
  isLoadingDetails.value = true;
  detailsError.value = null;
  selectedMealDetails.value = null;
  translationError.value = null;
  try {
    const englishDetails = await $fetch(`/api/recipes/detailsById?id=${mealId}`);
    selectedMealDetails.value = {...englishDetails, _isTranslated: false};
  } catch (error) {
    detailsError.value = error.data?.message || error.statusMessage || `获取食谱详情 '${mealId}' 失败`;
  } finally {
    isLoadingDetails.value = false;
  }
}

async function translateCurrentRecipeDetails() {
  // 如果没有选中详情，或者已经翻译过了，或者正在翻译中，则不执行
  if (!selectedMealDetails.value || selectedMealDetails.value._isTranslated || isTranslatingDetails.value) {
    return;
  }

  isTranslatingDetails.value = true;
  translationError.value = null;

  const detailsToTranslate = {...selectedMealDetails.value};
  delete detailsToTranslate._isTranslated; // 发送给后端时不需要这个内部状态

  try {
    const translatedData = await $fetch('/api/recipes/translate-recipe-details', {
      method: 'POST',
      body: detailsToTranslate
    });

    // 更新详情，并标记为已翻译
    selectedMealDetails.value = {...translatedData, _isTranslated: true};

  } catch (error) {
    translationError.value = error.data?.message || error.statusMessage || '翻译失败，请稍后再试。';
    if (selectedMealDetails.value) {
      selectedMealDetails.value._isTranslated = false;
    }
  } finally {
    isTranslatingDetails.value = false;
  }
}

</script>

<style scoped>
.recipe-page-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
}

.search-recipe-form {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #f9f9f9;
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.search-recipe-form .form-item {
  flex-grow: 1;
}

.search-recipe-form label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
  color: #333;
}

.search-recipe-form input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
}

.search-recipe-form button[type="submit"] {
  background-color: #007bff;
  color: white;
  padding: 10px 18px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
  height: calc(2.25rem + 2px + 2 * 10px);
}

.search-recipe-form button[type="submit"]:hover {
  background-color: #0056b3;
}

.search-recipe-form button[type="submit"]:disabled {
  background-color: #ccc;
}

.error-alert {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px 15px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 20px;
  position: relative;
}

.error-alert strong {
  font-weight: bold;
}

.close-alert-button {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #721c24;
}

h3 {
  margin-top: 30px;
  margin-bottom: 15px;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
  font-size: 1.5em;
  color: #333;
}

h3 .icon {
  margin-right: 8px;
  color: #007bff;
}

.loading-spinner {
  text-align: center;
  padding: 25px;
  font-size: 18px;
  color: #555;
}

.recipe-items-list {
  list-style-type: none;
  padding: 0;
}

.summary-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.recipe-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}

.recipe-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.summary-item {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  padding: 0;
}

.summary-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.summary-content {
  padding: 12px;
  flex-grow: 1;
}

.summary-content h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.1em;
  color: #0056b3;
}

.button-view-details {
  background-color: #f0f0f0;
  color: #333;
  padding: 8px 12px;
  border: none;
  border-top: 1px solid #e0e0e0;
  border-radius: 0 0 6px 6px;
  cursor: pointer;
  width: 100%;
  font-size: 0.9rem;
  text-align: center;
}

.button-view-details:hover {
  background-color: #e0e0e0;
}

.load-more-container {
  text-align: center;
  margin-top: 20px;
  margin-bottom: 20px;
}

.button-load-more {
  background-color: #007bff;
  color: white;
  padding: 10px 25px;
  font-size: 1rem;
}

.button-load-more:hover {
  background-color: #0056b3;
}

.button-load-more:disabled {
  background-color: #ccc;
}


.recipe-detail-view {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: #fdfdfd;
}

.full-details {
  padding: 0;
}

.recipe-item-content {
  flex-grow: 1;
  color: #333333;
}

.detail-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 16px;
}

.recipe-meta-tags {
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recipe-tag {
  display: inline-block;
  padding: 4px 10px;
  font-size: 0.85em;
  border-radius: 15px;
  margin-right: 6px;
  margin-bottom: 6px;
}

.recipe-tag strong {
  margin-right: 4px;
}

.recipe-tag-category {
  background-color: #e0f2f7;
  color: #007bff;
  border: 1px solid #b3e0ff;
}

.recipe-tag-area {
  background-color: #e2e0f7;
  color: #4a00ff;
  border: 1px solid #b3b0ff;
}

.recipe-tag-tags {
  background-color: #e8f7e0;
  color: #2c721c;
  border: 1px solid #b3ffb6;
}

.recipe-section {
  margin-bottom: 20px;
}

.recipe-section h4 {
  font-size: 1.2em;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee;
}

.ingredients-list {
  list-style-type: disc;
  padding-left: 20px;
}

.ingredients-list li {
  margin-bottom: 5px;
}

.instructions-text {
  white-space: pre-wrap;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #eee;
  font-family: sans-serif;
  line-height: 1.6;
  color: #444;
}

.empty-state {
  padding: 25px;
  text-align: center;
  color: #777;
  background-color: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 4px;
  margin-top: 20px;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  line-height: 1.4;
}

.translate-button-container {
  margin-bottom: 20px;
  text-align: right;
}

.button-translate {
  background-color: #17a2b8;
  color: white;
  padding: 8px 15px; /* 调整按钮大小 */
}

.button-translate:hover {
  background-color: #138496;
}

.button-translate:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.translation-error-text {
  display: block;
  color: red;
  font-size: 0.9em;
  margin-top: 5px;
  text-align: right; /* 与按钮对齐 */
}


</style>