<template>
  <div class="regex-tester-container">
    <h2 style="text-align: center;">正则表达式测试工具 🧪</h2>

    <div class="regex-input-section">
      <div class="form-item regex-pattern-item">
        <label for="regex-pattern">正则表达式:</label>
        <div class="pattern-input-group">
          <span class="regex-delimiter">/</span>
          <input
              id="regex-pattern"
              v-model="regexPattern"
              class="regex-pattern-input"
              placeholder="输入正则表达式..."
              type="text"
              @input="clearResults"
          >
          <span class="regex-delimiter">/</span>
          <div class="flags-container">
            <label v-for="flag in availableFlags" :key="flag.value" :title="flag.title" class="flag-label">
              <input
                  v-model="selectedFlags"
                  :value="flag.value"
                  type="checkbox"
                  @change="performTest"
              > {{ flag.value }}
            </label>
          </div>
        </div>
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
                    <pre class="group-value">{{ group }}</pre>
                  </li>
                </ul>
              </div>
              <div v-if="match.namedGroups && Object.keys(match.namedGroups).length > 0" class="match-groups">
                命名捕获组:
                <ul class="group-list">
                  <li v-for="(value, name) in match.namedGroups" :key="name">
                    {{ name }}:
                    <pre class="group-value">{{ value }}</pre>
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
import {ref, watch} from 'vue';

interface MatchResult {
  fullMatch: string;
  index: number;
  groups: (string | undefined)[];
  namedGroups?: { [key: string]: string };
}

const regexPattern = ref<string>('hello');
const testString = ref<string>('hello world, hello there!');
const selectedFlags = ref<string[]>(['g', 'i']); // Default flags
const matchResults = ref<MatchResult[]>([]);
const regexError = ref<string | null>(null);
const lastTestPerformed = ref<boolean>(false);

const availableFlags = [
  {value: 'g', title: '全局搜索 (Global)'},
  {value: 'i', title: '忽略大小写 (Ignore case)'},
  {value: 'm', title: '多行模式 (Multiline)'},
  {value: 's', title: '点号匹配换行符 (Dot all)'},
  {value: 'u', title: 'Unicode模式 (Unicode)'},
  {value: 'y', title: '粘性搜索 (Sticky)'},
];

let debounceTimer: number | undefined;

const performTestDebounced = () => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    performTest();
  }, 300); // Debounce time in ms
};

const performTest = () => {
  lastTestPerformed.value = true;
  if (!regexPattern.value) {
    regexError.value = '正则表达式不能为空。';
    matchResults.value = [];
    return;
  }

  try {
    const flagsString = selectedFlags.value.join('');
    const regex = new RegExp(regexPattern.value, flagsString);
    regexError.value = null;
    const currentMatches: MatchResult[] = [];

    if (flagsString.includes('g')) {
      let match;
      // Create a new RegExp for each matchAll iteration if it's stateful (e.g. with 'g' flag for lastIndex)
      const globalRegex = new RegExp(regexPattern.value, flagsString);
      while ((match = globalRegex.exec(testString.value)) !== null) {
        currentMatches.push({
          fullMatch: match[0],
          index: match.index,
          groups: match.slice(1),
          namedGroups: match.groups,
        });
        // Prevent infinite loops with zero-width matches with global flag
        if (match.index === globalRegex.lastIndex && globalRegex.lastIndex !== 0) {
          globalRegex.lastIndex++;
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

  } catch (e: any) {
    regexError.value = e.message;
    matchResults.value = [];
  }
};

const clearResults = () => {
  matchResults.value = [];
  regexError.value = null;
  lastTestPerformed.value = false;
};

const clearAll = () => {
  regexPattern.value = '';
  testString.value = '';
  selectedFlags.value = ['g', 'i'];
  clearResults();
};

// Perform initial test on mount or when relevant refs change
onMounted(performTest);
watch([regexPattern, testString, selectedFlags], performTestDebounced, {deep: true});

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

.pattern-input-group {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding-left: 0.5em;
}

.regex-delimiter {
  font-size: 1.2em;
  color: #888;
  padding: 0 0.2em;
}

.regex-pattern-input {
  flex-grow: 1;
  padding: 10px 8px;
  border: none;
  outline: none;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 0.95rem;
  background-color: transparent;
}

.flags-container {
  display: flex;
  align-items: center;
  padding: 0 10px;
  background-color: #f7f7f9;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  border-left: 1px solid #ccc;
}

.flag-label {
  margin-left: 10px;
  font-size: 0.9em;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: normal !important; /* Override higher specificity if any */
}

.flag-label:first-child {
  margin-left: 0;
}

.flag-label input[type="checkbox"] {
  margin-right: 4px;
  cursor: pointer;
}


textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 120px;
}

.actions-toolbar {
  display: flex;
  gap: 10px;
  margin-top: 15px; /* Added margin-top */
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
  background-color: #ccc !important;
  color: #666 !important;
  cursor: not-allowed;
  opacity: 0.7;
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
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px 15px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
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
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 0.95em;
  color: #2c3e50;
  white-space: pre-wrap; /* Allow long matches to wrap */
  word-break: break-all; /* Break long words/matches */
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

.match-details {
  margin-top: 5px;
  font-size: 0.85em;
  color: #777;
}

</style>