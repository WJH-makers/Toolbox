<template>
  <div class="regex-tester-container">
    <h2 style="text-align: center;">正则表达式测试工具 🧪</h2>

    <div class="regex-input-section">
      <div class="form-item">
        <label for="full-regex-literal">正则表达式 (格式: /pattern/flags):</label>
        <input
            id="full-regex-literal"
            v-model="fullRegexLiteral"
            class="full-regex-input"
            placeholder="例如: /(?<year>\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\d|3[01])/gi"
            type="text"
            @input="performTestDebounced"
        >
      </div>

      <div class="form-item">
        <label for="test-string">测试字符串:</label>
        <textarea
            id="test-string"
            v-model="testString"
            placeholder="输入要测试的字符串..."
            rows="8"
            @input="performTestDebounced"
        />
      </div>
      <div class="actions-toolbar">
        <button class="action-button test-button" @click="performTest">
          <span class="icon">🔍</span>
          <span class="text">立即测试</span>
        </button>
        <button class="action-button clear-button" @click="clearAll">
          <span class="icon">💨</span>
          <span class="text">清空全部</span>
        </button>
      </div>
    </div>

    <div v-if="regexError" class="error-alert">
      <strong>正则错误:</strong> {{ regexError }}
    </div>

    <div class="results-section">
      <h3>测试结果:</h3>
      <div v-if="!regexError && lastTestPerformed">
        <div v-if="matchResults.length > 0" class="matches-found">
          <p>找到 {{ matchResults.length }} 个匹配项:</p>
          <ul class="match-list">
            <li v-for="(match, index) in matchResults" :key="index" class="match-item">
              <div class="match-header">
                <strong>匹配项 {{ index + 1 }}:</strong>
                <pre class="match-value">{{ match.fullMatch }}</pre>
              </div>
              <div v-if="match.groups && match.groups.length > 0" class="match-groups">
                捕获组:
                <ul class="group-list">
                  <li v-for="(group, groupIndex) in match.groups" :key="groupIndex">
                    组 {{ groupIndex + 1 }}:
                    <pre class="group-value">{{ group === undefined ? 'undefined' : group }}</pre>
                  </li>
                </ul>
              </div>
              <div v-if="match.namedGroups && Object.keys(match.namedGroups).length > 0" class="match-groups">
                命名捕获组:
                <ul class="group-list">
                  <li v-for="(value, name) in match.namedGroups" :key="name">
                    {{ name }}:
                    <pre class="group-value">{{ value === undefined ? 'undefined' : value }}</pre>
                  </li>
                </ul>
              </div>
              <div class="match-details">
                位置: {{ match.index }}
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="no-matches">
          <p>没有找到匹配项。</p>
        </div>
      </div>
      <div v-else-if="!lastTestPerformed && !regexError" class="empty-state">
        <p>请输入正则表达式和测试字符串以查看结果。</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch, onMounted} from 'vue'; // onMounted import edildi

interface MatchResult {
  fullMatch: string;
  index: number;
  groups: (string | undefined)[];
  namedGroups?: { [key: string]: string | undefined }; // Allow undefined for named groups
}

// 用户提供的日期匹配正则表达式作为默认值
// JavaScript字符串中反斜杠需要转义
const defaultRegexLiteral = '/(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])/g';

const fullRegexLiteral = ref<string>(defaultRegexLiteral);
const testString = ref<string>('会议日期: 2024-07-29, 另一个日期: 2025-01-15.');
const matchResults = ref<MatchResult[]>([]);
const regexError = ref<string | null>(null);
const lastTestPerformed = ref<boolean>(false);

let debounceTimer: number | undefined;

const performTestDebounced = () => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    performTest();
  }, 300);
};

const performTest = () => {
  lastTestPerformed.value = true;
  const literal = fullRegexLiteral.value.trim();

  if (!literal) {
    regexError.value = '正则表达式不能为空。';
    matchResults.value = [];
    return;
  }

  const regexParts = literal.match(/^\/(.*)\/([gimyus]*)$/s);
  if (!regexParts) {
    try {
      const regex = new RegExp(literal);
      regexError.value = null; // 清除之前的错误（如果有的话）
      applyRegex(regex);
    } catch (e: any) {
      regexError.value = `无效的正则表达式字面量格式或模式错误: ${e.message}。请使用 /pattern/flags 格式。`;
      matchResults.value = [];
      return;
    }
    return;
  }

  const pattern = regexParts[1];
  const flags = regexParts[2];

  try {
    const regex = new RegExp(pattern, flags);
    regexError.value = null;
    applyRegex(regex); // 将匹配逻辑提取到单独函数

  } catch (e: any) {
    regexError.value = `正则表达式编译错误: ${e.message}`;
    matchResults.value = [];
  }
};

const applyRegex = (regex: RegExp) => {
  const currentMatches: MatchResult[] = [];
  const flagsString = regex.flags;

  if (flagsString.includes('g')) {
    let match;
    if (typeof regex.lastIndex === 'number') { // 确保 lastIndex 属性存在
      regex.lastIndex = 0; // 重置 lastIndex 以便从头开始搜索
    }

    while ((match = regex.exec(testString.value)) !== null) {
      currentMatches.push({
        fullMatch: match[0],
        index: match.index,
        groups: match.slice(1), // 捕获组从索引1开始
        namedGroups: match.groups,
      });
      if (match.index === regex.lastIndex && regex.lastIndex !== 0) {
        regex.lastIndex++;
      }
    }
  } else {
    const match = testString.value.match(regex);
    if (match) {
      currentMatches.push({
        fullMatch: match[0],
        index: match.index!,
        groups: match.slice(1),
        namedGroups: match.groups,
      });
    }
  }
  matchResults.value = currentMatches;
};


const clearResults = () => {
  matchResults.value = [];
  regexError.value = null;
  lastTestPerformed.value = false;
};
const clearAll = () => {
  fullRegexLiteral.value = defaultRegexLiteral;
  testString.value = '会议日期: 2024-07-29, 另一个日期: 2025-01-15.';
  clearResults();
  performTest();
};

onMounted(performTest);
watch([fullRegexLiteral, testString], performTestDebounced, {deep: true});

</script>

<style scoped>
.regex-tester-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
}

.regex-input-section, .results-section {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
}

.form-item {
  margin-bottom: 15px;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  font-size: 0.9em;
  color: #333;
}

.full-regex-input { /* 样式化新的单行正则输入框 */
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 0.95rem;
  background-color: #fdfdfd;
}

.full-regex-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  outline: none;
}


textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 120px;
  background-color: #fdfdfd;
}

textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  outline: none;
}

.actions-toolbar {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 15px;
  font-size: 0.95rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.action-button .icon {
  font-size: 1.1em;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.action-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.action-button:focus-visible {
  outline: 2px solid #4a90e2;
  outline-offset: 2px;
}

.action-button:disabled {
  background-color: #e5e7eb !important;
  color: #9ca3af !important;
  border-color: #e5e7eb !important;
  cursor: not-allowed;
  opacity: 0.8;
}

.test-button {
  background-color: #3b82f6;
  color: white;
}

.test-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.clear-button {
  background-color: #6b7280;
  color: white;
}

.clear-button:hover:not(:disabled) {
  background-color: #4b5563;
}


.error-alert {
  background-color: #fee2e2;
  color: #b91c1c;
  padding: 10px 15px;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  margin-top: 15px;
  font-size: 0.9em;
}

.results-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1.1em;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}

.matches-found p, .no-matches p, .empty-state p {
  font-size: 0.95em;
  color: #555;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #777;
  background-color: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 4px;
}

.match-list {
  list-style-type: none;
  padding: 0;
}

.match-item {
  background-color: #f9f9f9;
  border: 1px solid #e9e9e9;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 0.9em;
}

.match-header {
  margin-bottom: 8px;
}

.match-header strong {
  color: #0056b3;
}

pre.match-value, pre.group-value {
  display: inline;
  background-color: #eef2f7;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 0.95em;
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-all;
}

.match-groups {
  margin-top: 5px;
  margin-left: 15px;
  font-size: 0.9em;
}

.group-list {
  list-style-type: disc;
  padding-left: 20px;
  margin-top: 3px;
}

.group-list li {
  word-break: break-all; /* Ensure long group values also wrap */
}

.match-details {
  margin-top: 5px;
  font-size: 0.85em;
  color: #777;
}
</style>