<template>
  <div class="recipe-page-container">
    <h2 class="page-title">查找食谱</h2>

    <form class="search-recipe-form" @submit.prevent="handleNewSearch">
      <div class="form-item">
        <label for="search-query">搜索菜名</label>
        <input
            id="search-query"
            v-model="searchQuery"
            :disabled="isLoadingSearch"
            placeholder="例如: 鸡肉, 鱼面..."
            type="text"
        />
      </div>
      <button :disabled="isLoadingSearch || !searchQuery.trim()" class="button-primary" type="submit">
        <span v-if="isLoadingSearch && currentPage === 1 && !searchResults.length" class="button-spinner"></span>
        {{ isLoadingSearch && currentPage === 1 && !searchResults.length ? '搜索中...' : '搜索' }}
      </button>
    </form>

    <div v-if="searchError" class="error-alert">
      <span class="error-icon">⚠️</span>
      <div>
        <strong>搜索错误</strong>
        <p>{{ searchError }}</p>
      </div>
      <button class="close-alert-button" @click="searchError = null">&times;</button>
    </div>

    <div v-if="isLoadingSearch && searchResults.length === 0 && currentPage === 1" class="skeleton-results-grid">
      <div v-for="n in limitPerPage" :key="`sk-res-${n}`" class="skeleton-recipe-item">
        <div class="skeleton-image"></div>
        <div class="skeleton-text-title"></div>
        <div class="skeleton-text-button"></div>
      </div>
    </div>

    <div v-if="!isLoadingSearch && searchResults.length === 0 && lastSearchAttempted && !searchError"
         class="empty-state">
      <span class="empty-state-icon">😕</span>
      <p>没有找到相关的食谱“{{ searchQuery }}”。</p>
      <p>请尝试其他关键词或检查拼写。</p>
    </div>

    <div v-if="searchResults.length > 0" class="search-results-container">
      <h3>搜索结果 (找到 {{ totalMeals }} 条相关食谱)</h3>
      <ul class="recipe-items-list summary-list">
        <li
            v-for="mealSummary in searchResults"
            :key="mealSummary.id"
            class="recipe-item summary-item"
            tabindex="0"
            @click="showMealDetails(mealSummary.id)"
            @keydown.enter="showMealDetails(mealSummary.id)"
        >
          <img
              v-if="mealSummary.imageUrl"
              :alt="mealSummary.name"
              :src="mealSummary.imageUrl + '/preview'"
              class="summary-image"
              loading="lazy"
          />
          <div v-else class="summary-image-placeholder">
            <span>{{ mealSummary.name ? mealSummary.name.substring(0, 1) : '?' }}</span>
          </div>
          <div class="recipe-item-content summary-content">
            <h4>{{ mealSummary.name }}</h4>
          </div>
          <button class="action-button button-view-details">查看详情</button>
        </li>
      </ul>

      <div v-if="totalPages > 1" class="pagination-controls">
        <button :disabled="currentPage === 1 || isLoadingSearch"
                class="page-button prev-button action-button"
                @click="changePage(currentPage - 1)">
          <span v-if="isLoadingSearch && changingPageTo === currentPage - 1" class="button-spinner"></span>
          上一页
        </button>
        <template v-for="(page, index) in pageNumbersToDisplay" :key="`page-${page}-${index}`">
          <button v-if="typeof page === 'number'"
                  :class="['page-button', 'action-button', { 'active': page === currentPage }]"
                  :disabled="isLoadingSearch || page === currentPage"
                  @click="changePage(page)">
            <span v-if="isLoadingSearch && changingPageTo === page" class="button-spinner"></span>
            {{ page }}
          </button>
          <span v-else class="page-ellipsis">{{ page }}</span>
        </template>
        <button :disabled="currentPage === totalPages || isLoadingSearch"
                class="page-button next-button action-button"
                @click="changePage(currentPage + 1)">
          <span v-if="isLoadingSearch && changingPageTo === currentPage + 1" class="button-spinner"></span>
          下一页
        </button>
      </div>
      <div v-if="totalPages > 0" class="pagination-info">
        第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
      </div>

    </div>

    <div v-if="detailsError" class="error-alert">
      <span class="error-icon">⚠️</span>
      <div>
        <strong>加载详情错误</strong>
        <p>{{ detailsError }}</p>
      </div>
      <button class="close-alert-button" @click="detailsError = null">&times;</button>
    </div>

    <div v-if="isLoadingDetails" class="skeleton-detail-view">
      <div class="skeleton-detail-translate-button"></div>
      <div class="skeleton-detail-title"></div>
      <div class="skeleton-detail-image"></div>
      <div class="skeleton-detail-tags">
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
      </div>
      <div class="skeleton-section-title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-section-title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
    </div>

    <div v-if="selectedMealDetails && !isLoadingDetails" class="recipe-detail-view">
      <div class="translate-button-container">
        <button
            :disabled="isTranslatingDetails || selectedMealDetails._isTranslated"
            class="action-button button-translate"
            @click="translateCurrentRecipeDetails">
          <span v-if="isTranslatingDetails" class="button-spinner"></span>
          {{
            isTranslatingDetails ? '翻译中...' : (selectedMealDetails._isTranslated ? '已翻译 (中文)' : '将详情翻译成中文')
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
              v-if="selectedMealDetails.imageUrl"
              :alt="selectedMealDetails.name"
              :src="selectedMealDetails.imageUrl"
              class="detail-image"
              loading="lazy"
          />
          <div v-else class="detail-image-placeholder">
            <span>{{ selectedMealDetails.name || "食谱图片" }}</span>
          </div>

          <div class="recipe-meta-tags">
            <span v-if="selectedMealDetails.category" class="recipe-tag recipe-tag-category">
              <span class="tag-icon">🏷️</span> <strong>分类:</strong> {{ selectedMealDetails.category }}
            </span>
            <span v-if="selectedMealDetails.area" class="recipe-tag recipe-tag-area">
             <span class="tag-icon">🌍</span> <strong>地区:</strong> {{ selectedMealDetails.area }}
            </span>
            <span v-if="selectedMealDetails.tags && selectedMealDetails.tags.length" class="recipe-tag recipe-tag-tags">
              <span class="tag-icon">🔖</span> <strong>标签:</strong> {{ selectedMealDetails.tags.join(', ') }}
            </span>
          </div>

          <div v-if="selectedMealDetails.ingredients && selectedMealDetails.ingredients.length" class="recipe-section">
            <h4><span class="section-icon">🥕</span> 食材清单</h4>
            <ul class="ingredients-list">
              <li v-for="(ingredient, index) in selectedMealDetails.ingredients" :key="`ing-${index}`">
                <span class="ingredient-name">{{ ingredient.name }}</span> - <span
                  class="ingredient-measure">{{ ingredient.measure }}</span>
              </li>
            </ul>
          </div>

          <div v-if="selectedMealDetails.instructions" class="recipe-section">
            <h4><span class="section-icon">📜</span> 制作步骤</h4>
            <pre class="instructions-text">{{ selectedMealDetails.instructions }}</pre>
          </div>

          <div v-if="selectedMealDetails.youtubeUrl" class="recipe-section link-section">
            <h4><span class="section-icon">📺</span> 教学视频</h4>
            <a :href="selectedMealDetails.youtubeUrl" class="external-link" rel="noopener noreferrer" target="_blank">
              观看 YouTube 视频 <span class="external-link-icon">↗️</span>
            </a>
          </div>
          <div v-if="selectedMealDetails.sourceUrl" class="recipe-section link-section">
            <h4><span class="section-icon">🔗</span> 原始来源</h4>
            <a :href="selectedMealDetails.sourceUrl" class="external-link" rel="noopener noreferrer" target="_blank">
              查看原始食谱链接 <span class="external-link-icon">↗️</span>
            </a>
          </div>
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
const lastSearchAttempted = ref(false); // 标记是否已尝试过搜索

const currentPage = ref(1);
const totalMeals = ref(0);
const totalPages = ref(0);
const limitPerPage = ref(4);
const changingPageTo = ref(null); // 记录正在切换的目标页码，用于分页按钮的spinner显示

const selectedMealDetails = ref(null);
const isLoadingDetails = ref(false);
const detailsError = ref(null); // 修正：添加const声明

const isTranslatingDetails = ref(false);
const translationError = ref(null);

async function fetchPageData() {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    totalMeals.value = 0;
    totalPages.value = 0;
    currentPage.value = 1; // 如果搜索查询为空，重置到第一页
    selectedMealDetails.value = null;
    // lastSearchAttempted 应该由调用方（如 handleNewSearch）管理
    return;
  }

  isLoadingSearch.value = true;
  searchError.value = null;

  try {
    // 修正：移除API URL中的HTML标签
    const response = await $fetch(`/api/recipes/search?s=${encodeURIComponent(searchQuery.value.trim())}&page=${currentPage.value}&limit=${limitPerPage.value}`);
    searchResults.value = response.meals || [];
    totalMeals.value = response.totalMeals || 0;
    totalPages.value = response.totalPages || 0;

    // 如果API返回的总结果数为0，确保重置分页状态
    if (totalMeals.value === 0) {
      currentPage.value = 1;
      totalPages.value = 0; // 总页数也应为0
    } else if (totalPages.value > 0 && currentPage.value > totalPages.value) {
      // 如果当前页码超出新的总页数范围 (且总页数大于0)
      // 例如，用户在第5页，但新的搜索结果只有3页
      // 跳转到最后一页通常是合理的行为
      currentPage.value = totalPages.value;
      // 注意：这里可能需要重新调用 fetchPageData 来获取最后一页的正确数据，
      // 或者接受当前 searchResults 可能为空（如果API对超出页码返回空meals）
      // 为简单起见，这里仅调整页码，依赖用户或后续操作刷新数据。
      // 但更好的做法是，如果页码调整了，就再获取一次数据。
      // 不过，当前逻辑是先获取数据再调整，所以searchResults已经是新页码（可能无效）的数据了。
      // 如果API对无效页码返回空meals，则searchResults会是[]，这可以接受。
    }
  } catch (error) {
    searchError.value = error.data?.message || error.statusMessage || '获取食谱数据失败';
    searchResults.value = [];
    totalMeals.value = 0;
    totalPages.value = 0;
    currentPage.value = 1; // 错误发生时，重置到第一页可能是个安全的选择
  } finally {
    isLoadingSearch.value = false;
    changingPageTo.value = null; // 重置目标页码标记
  }
}

async function handleNewSearch() {
  currentPage.value = 1; // 开始新的搜索总是从第一页开始
  lastSearchAttempted.value = true; // 标记已尝试搜索
  searchResults.value = []; // 立即清空旧结果，以便骨架屏能正确显示
  selectedMealDetails.value = null; // 清空可能存在的旧详情
  translationError.value = null;  // 清空可能存在的旧翻译错误
  await fetchPageData();
}

async function changePage(newPage) {
  if (newPage < 1 || newPage > totalPages.value || newPage === currentPage.value || isLoadingSearch.value) {
    return; // 无效页码、当前页或正在加载时，不执行操作
  }
  changingPageTo.value = newPage; // 记录目标页码
  currentPage.value = newPage;
  selectedMealDetails.value = null; // 翻页时清空详情视图
  translationError.value = null; // 清空翻译错误

  await fetchPageData();

  // 翻页后滚动到搜索结果区域的顶部
  const resultsContainer = document.querySelector('.search-results-container');
  if (resultsContainer) {
    resultsContainer.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
}

const pageNumbersToDisplay = computed(() => {
  const pages = [];
  if (totalPages.value === 0) {
    return pages;
  }

  const current = currentPage.value;
  const total = totalPages.value;
  const maxVisibleButtons = 5; // 包括省略号在内，期望显示的最大“按钮位”数量
                               // 例如，我们希望看到类似 1 ... 4 5 6 ... 10 这样的结构

  if (total <= maxVisibleButtons + 2) { // 如果总页数不多，直接显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  // 显示第一页
  pages.push(1);

  // 计算中间区域的起始和结束页码
  // pagesAroundCurrent 指的是当前页码两边应该有多少个数字按钮
  // maxVisibleButtons = 5 -> 1 (首页) + ... + P-1 + P + P+1 + ... + N (尾页)
  // 我们需要决定 P-1, P, P+1 这个核心区域
  const pagesAroundCurrent = 1; // 当前页左右各显示1个页码 (核心是3个按钮: C-1, C, C+1)
  // 如果maxVisibleButtons是5，则首尾各1，省略号各1，中间1个。
  // 所以 P-1, P, P+1 这个窗口是3个，那么pagesAroundCurrent应该是1。

  let rangeStart = Math.max(2, current - pagesAroundCurrent);
  let rangeEnd = Math.min(total - 1, current + pagesAroundCurrent);

  // 处理省略号和中间页码
  if (current - pagesAroundCurrent > 2) { // 第一个省略号 (1 ... x)
    pages.push('...');
  } else { // 如果当前页靠近第一页，则不需要第一个省略号，直接列出页码
    rangeStart = 2;
  }

  if (current + pagesAroundCurrent < total - 1) { // 判断是否需要第二个省略号 (x ... N)
    // 此时rangeEnd可能需要调整，保证中间区域的数字是连续的
  } else {
    rangeEnd = total - 1;
  }

  // 确保中间显示的页码窗口大小，并调整
  // 例如，如果 maxVisibleButtons = 5, 期望效果 1 ... c-1 c c+1 ... N
  // 中间实际数字按钮目标数量是3 (c-1,c,c+1)
  const centralButtonCount = 3;
  if (rangeEnd - rangeStart + 1 < centralButtonCount && total > maxVisibleButtons) {
    if (current < centralButtonCount) { // 靠近开头
      rangeEnd = Math.min(total - 1, centralButtonCount + 1); // 1, 2, 3, 4 ... N
    } else if (current > total - centralButtonCount) { // 靠近结尾
      rangeStart = Math.max(2, total - centralButtonCount); // 1 ... N-3, N-2, N-1, N
    }
  }


  for (let i = rangeStart; i <= rangeEnd; i++) {
    if (i > 1 && i < total) { // 确保不重复添加首尾页
      pages.push(i);
    }
  }

  // 补齐省略号和尾页
  // 检查最后一个数字按钮和total-1之间的关系
  const lastPushedNumber = pages.filter(p => typeof p === 'number').pop();
  if (lastPushedNumber < total - 1) {
    pages.push('...');
  }


  // 显示最后一页
  pages.push(total);

  // 去重，因为首尾页可能在range中被计算
  // 并且保证省略号不相邻
  const finalPages = [];
  let lastItem = null;
  for (const p of pages) {
    if (p === '...' && lastItem === '...') {
      continue;
    }
    if (typeof p === 'number' && typeof lastItem === 'number' && p <= lastItem) {
      continue; // 避免页码重复或乱序（虽然理论上前面逻辑应避免，但作为保险）
    }
    finalPages.push(p);
    lastItem = p;
  }

  return finalPages;
});


async function showMealDetails(mealId) {
  if (!mealId) return;
  selectedMealDetails.value = null;
  isLoadingDetails.value = true;
  detailsError.value = null;
  translationError.value = null;

  const detailViewElement = document.querySelector('.recipe-detail-view');
  if (detailViewElement) {
    detailViewElement.scrollIntoView({behavior: 'smooth', block: 'start'});
  } else {
    const searchResultsContainer = document.querySelector('.search-results-container');
    if (searchResultsContainer) {
      searchResultsContainer.scrollIntoView({behavior: 'smooth', block: 'end'});
    }
  }

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
  if (!selectedMealDetails.value || selectedMealDetails.value._isTranslated || isTranslatingDetails.value) {
    return;
  }

  isTranslatingDetails.value = true;
  translationError.value = null;

  const detailsToTranslate = {...selectedMealDetails.value};
  delete detailsToTranslate._isTranslated;

  try {
    const translatedData = await $fetch('/api/recipes/translate-recipe-details', {
      method: 'POST',
      body: detailsToTranslate
    });
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
:root {
  --primary-color: #007bff;
  --primary-hover-color: #0056b3;
  --secondary-color: #6c757d;
  --light-gray-color: #f8f9fa;
  --medium-gray-color: #e9ecef;
  --dark-gray-color: #343a40;
  --success-color: #28a745;
  --error-color: #dc3545;
  --error-text-color: #721c24;
  --error-bg-color: #f8d7da;
  --error-border-color: #f5c6cb;
  --font-family-sans-serif: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  --border-radius: 0.3rem;
  --box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  --box-shadow-lg: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  --button-text-color: black;
}

.recipe-page-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: var(--font-family-sans-serif);
  background-color: #fff;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-lg);
}

.page-title {
  text-align: center;
  color: var(--dark-gray-color);
  margin-bottom: 2rem;
  font-weight: 300;
  font-size: 2.5rem;
}

.search-recipe-form {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--medium-gray-color);
  border-radius: var(--border-radius);
  background-color: var(--light-gray-color);
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.search-recipe-form .form-item {
  flex-grow: 1;
}

.search-recipe-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: var(--secondary-color);
}

.search-recipe-form input[type="text"] {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ced4da;
  border-radius: var(--border-radius);
  box-sizing: border-box;
  font-size: 1rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.search-recipe-form input[type="text"]:focus {
  border-color: var(--primary-color);
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.button-primary {
  background-color: var(--primary-color);
  color: var(--button-text-color);
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease, color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: calc(1.5rem + 2 * 0.75rem + 2px);
}

.button-primary:hover:not(:disabled) {
  background-color: var(--primary-hover-color);
  color: white;
}

.button-primary:disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
}

.button-spinner {
  width: 1em;
  height: 1em;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  /* Default spinner colors, can be overridden by more specific button states */
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--primary-color);
}

/* Spinner color for .button-primary */
.button-primary .button-spinner {
  border-color: rgba(0, 0, 0, 0.1); /* Assuming --button-text-color is black */
  border-top-color: var(--button-text-color);
}

.button-primary:hover:not(:disabled) .button-spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

.button-primary:disabled .button-spinner {
  border-color: rgba(102, 102, 102, 0.2); /* #666 */
  border-top-color: #666;
}


/* Spinner color for .page-button (action-button) default state */
.page-button:not(.active):not(:disabled) .button-spinner {
  border-color: rgba(0, 123, 255, 0.2); /* Based on --primary-color for text */
  border-top-color: var(--primary-color);
}

/* Spinner for hovered non-active page-button (inherits from .action-button:hover:not(:disabled) if text turns white) */
/* If page-button hover doesn't change text to white, this rule might need adjustment or rely on a generic action-button:hover rule */
.page-button:not(.active):hover:not(:disabled) .button-spinner {
  border-color: rgba(0, 0, 0, 0.1); /* if hover bg is medium-gray and text primary-color */
  border-top-color: var(--primary-color);
}


/* Spinner color for .page-button.active */
.page-button.active .button-spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

/* Spinner color for .button-translate */
.button-translate .button-spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

.button-translate:disabled .button-spinner {
  border-color: rgba(102, 102, 102, 0.2);
  border-top-color: #666;
}


@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-alert {
  background-color: var(--error-bg-color);
  color: var(--error-text-color);
  padding: 1rem 1.5rem;
  border: 1px solid var(--error-border-color);
  border-radius: var(--border-radius);
  margin-bottom: 1.5rem;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.error-alert .error-icon {
  font-size: 1.5rem;
  margin-top: 0.1em;
}

.error-alert strong {
  font-weight: bold;
}

.error-alert p {
  margin: 0.25rem 0 0;
}

.close-alert-button {
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--error-text-color);
  opacity: 0.7;
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

.close-alert-button:hover {
  opacity: 1;
}


h3 {
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
  font-size: 1.75em;
  color: var(--dark-gray-color);
  font-weight: 400;
}

h3 .icon {
  margin-right: 0.5rem;
  color: var(--primary-color);
}

.recipe-items-list {
  list-style-type: none;
  padding: 0;
}

.summary-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.recipe-item {
  border: 1px solid var(--medium-gray-color);
  border-radius: var(--border-radius);
  background-color: #fff;
  box-shadow: var(--box-shadow);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.recipe-item:hover {
  box-shadow: var(--box-shadow-lg);
  transform: translateY(-3px);
}

.summary-item {
  cursor: pointer;
}

.summary-item:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}


.summary-image, .summary-image-placeholder {
  width: 100%;
  height: 180px;
  object-fit: cover;
  background-color: var(--light-gray-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--secondary-color);
  font-size: 2rem;
  font-weight: bold;
  border-bottom: 1px solid var(--medium-gray-color);
}

.summary-image-placeholder span {
  border: 2px dashed var(--medium-gray-color);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}


.summary-content {
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.summary-content h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.2em;
  color: var(--primary-hover-color);
  font-weight: 600;
  line-height: 1.3;
}

.button-view-details {
  background-color: var(--light-gray-color);
  color: var(--primary-color);
  padding: 0.75rem 1rem;
  border: none;
  border-top: 1px solid var(--medium-gray-color);
  cursor: pointer;
  width: 100%;
  font-size: 0.9rem;
  text-align: center;
  font-weight: 500;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.button-view-details:hover {
  background-color: var(--medium-gray-color);
  color: var(--primary-hover-color);
}

.recipe-detail-view {
  margin-top: 2.5rem;
  padding: 2rem;
  border: 1px solid var(--medium-gray-color);
  border-radius: var(--border-radius);
  background-color: #fff;
  box-shadow: var(--box-shadow);
}

.full-details {
  padding: 0;
}

.detail-image, .detail-image-placeholder {
  width: 100%;
  max-height: 450px;
  object-fit: cover;
  border-radius: var(--border-radius);
  margin-bottom: 1.5rem;
  background-color: var(--light-gray-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--secondary-color);
  font-size: 1.5rem;
  text-align: center;
  padding: 2rem;
  box-sizing: border-box;
  min-height: 200px;
}

.detail-image-placeholder span {
  max-width: 80%;
}


.recipe-meta-tags {
  margin-bottom: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.recipe-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.9em;
  border-radius: var(--border-radius);
  border: 1px solid transparent;
}

.recipe-tag strong {
  margin-right: 0.25rem;
  font-weight: 600;
}

.tag-icon {
  font-size: 0.9em;
}

.recipe-tag-category {
  background-color: #e0f2f7;
  color: #007bff;
  border-color: #b3e0ff;
}

.recipe-tag-area {
  background-color: #e6e0f7;
  color: #5a4fcf;
  border-color: #c4b3ff;
}

.recipe-tag-tags {
  background-color: #e8f7e0;
  color: #2c721c;
  border-color: #b3ffb6;
}

.recipe-section {
  margin-bottom: 2rem;
}

.recipe-section h4 {
  font-size: 1.4em;
  color: var(--dark-gray-color);
  margin-bottom: 0.75rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--medium-gray-color);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-icon {
  font-size: 1.1em;
}

.ingredients-list {
  list-style-type: none;
  padding-left: 0.5rem;
}

.ingredients-list li {
  margin-bottom: 0.6rem;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.6;
}

.ingredients-list li::before {
  content: "🍳";
  position: absolute;
  left: 0;
  top: 1px;
  color: var(--primary-color);
  font-size: 0.9em;
}

.ingredient-name {
  font-weight: 500;
}

.ingredient-measure {
  color: var(--secondary-color);
  font-style: italic;
}


.instructions-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: var(--light-gray-color);
  padding: 1rem 1.25rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--medium-gray-color);
  font-family: var(--font-family-sans-serif);
  line-height: 1.7;
  color: #495057;
  font-size: 1rem;
}

.link-section a.external-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.2s ease;
}

.link-section a.external-link:hover {
  color: var(--primary-hover-color);
  text-decoration: underline;
}

.external-link-icon {
  font-size: 0.9em;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--secondary-color);
  background-color: var(--light-gray-color);
  border: 1px dashed var(--medium-gray-color);
  border-radius: var(--border-radius);
  margin-top: 2rem;
}

.empty-state-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
  color: var(--medium-gray-color);
}

.empty-state p {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}


.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  line-height: 1.4;
  position: relative;
}

.translate-button-container {
  margin-bottom: 1.5rem;
  text-align: right;
}

.button-translate {
  background-color: #17a2b8; /* Teal */
  color: white;
}

.button-translate:hover:not(:disabled) {
  background-color: #138496;
}

.button-translate:disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
}

.translation-error-text {
  display: block;
  color: var(--error-color);
  font-size: 0.9em;
  margin-top: 0.5rem;
  text-align: right;
}

/* Skeleton Loader Styles */
@keyframes pulse-bg {
  0% {
    background-color: #f0f0f0;
  }
  50% {
    background-color: #e0e0e0;
  }
  100% {
    background-color: #f0f0f0;
  }
}

.skeleton-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.skeleton-recipe-item {
  border: 1px solid var(--medium-gray-color);
  border-radius: var(--border-radius);
  background-color: #fff;
  padding: 1rem;
  box-sizing: border-box;
}

.skeleton-image {
  width: 100%;
  height: 160px;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  border-radius: var(--border-radius);
  margin-bottom: 0.75rem;
}

.skeleton-text-title {
  width: 80%;
  height: 1.2em;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  margin-bottom: 0.5rem;
  border-radius: calc(var(--border-radius) / 2);
}

.skeleton-text-button {
  width: 100%;
  height: 38px;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  margin-top: 1rem;
  border-radius: var(--border-radius);
}

.skeleton-detail-view {
  margin-top: 2.5rem;
  padding: 2rem;
  border: 1px solid var(--medium-gray-color);
  border-radius: var(--border-radius);
  background-color: #fff;
  box-shadow: var(--box-shadow);
}

.skeleton-detail-translate-button {
  width: 200px;
  height: 40px;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  margin-bottom: 1.5rem;
  border-radius: var(--border-radius);
  float: right;
  clear: both;
}

.skeleton-detail-title {
  width: 70%;
  height: 2em;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  margin-bottom: 1rem;
  border-radius: var(--border-radius);
  clear: both;
}

.skeleton-detail-image {
  width: 100%;
  height: 300px;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  margin-bottom: 1.5rem;
  border-radius: var(--border-radius);
}

.skeleton-detail-tags {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.skeleton-tag {
  width: 100px;
  height: 2.2em;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  border-radius: var(--border-radius);
}

.skeleton-section-title {
  width: 40%;
  height: 1.5em;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  margin-bottom: 0.75rem;
  border-radius: var(--border-radius);
}

.skeleton-line {
  width: 90%;
  height: 1em;
  background-color: #eee;
  animation: pulse-bg 1.5s infinite ease-in-out;
  margin-bottom: 0.5rem;
  border-radius: calc(var(--border-radius) / 2);
}

.skeleton-line.short {
  width: 60%;
}

/* Pagination Styles */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 2rem;
  margin-bottom: 1rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.page-button, .page-ellipsis {
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  min-width: 38px;
  text-align: center;
  line-height: 1.4; /* Consistent line height */
}

.page-button {
  background-color: var(--light-gray-color);
  color: var(--primary-color); /* Default text color for page buttons */
  border: 1px solid var(--medium-gray-color);
  /* Inherits .action-button transitions if action-button class is also applied */
}

.page-button:hover:not(:disabled):not(.active) {
  background-color: var(--medium-gray-color);
  /* color: var(--primary-hover-color); /* Optionally change text color on hover */
}

.page-button.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  font-weight: bold;
}

.page-button:disabled {
  background-color: var(--medium-gray-color);
  color: var(--secondary-color);
  cursor: not-allowed;
  opacity: 0.7;
}

.page-ellipsis {
  color: var(--secondary-color);
  padding: 0.5rem 0.25rem;
}

.pagination-info {
  text-align: center;
  color: var(--secondary-color);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}


/* Responsive adjustments */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .search-recipe-form {
    flex-direction: column;
    align-items: stretch;
  }

  .search-recipe-form .button-primary {
    width: 100%;
  }

  .summary-list, .skeleton-results-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .recipe-detail-view, .skeleton-detail-view {
    padding: 1.5rem;
  }

  .detail-image, .detail-image-placeholder, .skeleton-detail-image {
    max-height: 300px;
    min-height: 180px;
  }

  .recipe-meta-tags {
    gap: 0.5rem;
  }

  .recipe-tag {
    padding: 0.3rem 0.6rem;
    font-size: 0.8em;
  }

  .pagination-controls {
    gap: 0.25rem;
  }

  .page-button, .page-ellipsis {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
    min-width: 32px;
  }
}

@media (max-width: 480px) {
  .recipe-page-container {
    margin: 10px;
    padding: 15px;
    box-shadow: none;
    border: 1px solid var(--medium-gray-color);
  }

  .page-title {
    font-size: 1.8rem;
  }

  .summary-list, .skeleton-results-grid {
    grid-template-columns: 1fr;
  }

  .summary-image, .summary-image-placeholder {
    height: 160px;
  }

  .detail-image, .detail-image-placeholder, .skeleton-detail-image {
    max-height: 250px;
    min-height: 150px;
  }

  .recipe-section h4 {
    font-size: 1.2em;
  }

  .ingredients-list li {
    padding-left: 1.2rem;
  }

  .ingredients-list li::before {
    font-size: 0.8em;
  }

  .translate-button-container {
    text-align: center;
  }

  .button-translate {
    width: 100%;
    margin-bottom: 0.5rem;
  }

  .skeleton-detail-translate-button {
    float: none;
    margin-left: auto;
    margin-right: auto;
    width: 90%;
  }

  .action-button {
    padding: 0.7rem 0.8rem;
    font-size: 0.95rem;
  }

  .pagination-controls {
    justify-content: center; /* Center items for small screens */
  }

  /* Hide complex pagination on very small screens, show only prev/next */
  .page-button:not(.prev-button):not(.next-button),
  .page-ellipsis {
    display: none;
  }

  .page-button.prev-button, .page-button.next-button {
    flex-grow: 0; /* Don't let them grow too much */
    padding: 0.5rem 1rem; /* Make prev/next slightly larger */
  }
}

</style>