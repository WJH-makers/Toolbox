<template>
  <div class="regex-tester-container">
    <h2 style="text-align: center;">正则表达式测试工具 🧪</h2>

    <div class="regex-input-section card">
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

    <div class="results-section card">
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

    <div class="usage-guide-section card">
      <h3>正则表达式使用说明 📖</h3>
      <details open>
        <summary class="guide-summary">点击展开/折叠说明</summary>

        <h4>基本概念</h4>
        <p>正则表达式（Regular
          Expression）是一种强大的文本处理工具，它使用一种特殊的字符串序列来描述、匹配一系列符合某个句法规则的字符串。</p>

        <h4>格式</h4>
        <p>在本工具中，请输入完整的正则表达式字面量，格式为 <code>/pattern/flags</code>。</p>
        <ul>
          <li><strong>pattern</strong>: 您的正则表达式主体。</li>
          <li><strong>flags</strong> (可选): 修饰符，用于改变匹配行为。例如：
            <ul>
              <li><code>g</code>: 全局搜索，查找所有匹配项而非仅第一个。</li>
              <li><code>i</code>: 忽略大小写。</li>
              <li><code>m</code>: 多行模式，使 <code>^</code> 和 <code>$</code> 匹配每一行的开始和结束。</li>
              <li><code>s</code>: "dotall" 模式，使元字符 <code>.</code> 匹配换行符。</li>
              <li><code>u</code>: Unicode 模式，将模式视为Unicode码点序列。</li>
            </ul>
          </li>
        </ul>
        <p>示例: <code>/hello\s+world/gi</code> 会全局、不区分大小写地匹配 "hello" 和 "world" 之间有一个或多个空白字符的文本。
        </p>

        <h4>常用元字符</h4>
        <p>元字符是具有特殊含义的字符：</p>
        <ul>
          <li><code>.</code> : 匹配除换行符外的任意单个字符 (除非使用 <code>s</code> 标志)。</li>
          <li><code>\d</code> : 匹配任意数字 (等同于 <code>[0-9]</code>)。</li>
          <li><code>\D</code> : 匹配任意非数字字符。</li>
          <li><code>\w</code> : 匹配任意字母、数字或下划线 (等同于 <code>[a-zA-Z0-9_]</code>)。</li>
          <li><code>\W</code> : 匹配任意非字母、数字、下划线字符。</li>
          <li><code>\s</code> : 匹配任意空白字符 (包括空格、制表符、换行符等)。</li>
          <li><code>\S</code> : 匹配任意非空白字符。</li>
          <li><code>^</code> : 匹配输入的开始位置 (在多行模式 <code>m</code>下，也匹配行首)。</li>
          <li><code>$</code> : 匹配输入的结束位置 (在多行模式 <code>m</code>下，也匹配行尾)。</li>
          <li><code>[...]</code> : 字符集，匹配方括号中的任意一个字符。例如 <code>[abc]</code> 匹配 "a" 或 "b" 或 "c"。
          </li>
          <li><code>[^...]</code> : 否定字符集，匹配任何不在方括号中的字符。例如 <code>[^abc]</code> 匹配任何不是
            "a"、"b"、"c" 的字符。
          </li>
          <li><code>(...)</code> : 捕获组，将括号内的子表达式匹配的文本捕获起来，以便后续引用或提取。</li>
          <li><code>(?:...)</code> : 非捕获组，匹配但不捕获。</li>
          <li><code>(?&lt;name&gt;...)</code> : 命名捕获组 (ES2018+)，将捕获的组命名。</li>
          <li><code>|</code> : 或操作符。例如 <code>cat|dog</code> 匹配 "cat" 或 "dog"。</li>
        </ul>

        <h4>量词</h4>
        <p>量词用于指定前面字符或组出现的次数：</p>
        <ul>
          <li><code>*</code> : 匹配前一个元素零次或多次。例如 <code>a*</code> 匹配零个或多个 "a"。</li>
          <li><code>+</code> : 匹配前一个元素一次或多次。例如 <code>a+</code> 匹配一个或多个 "a"。</li>
          <li><code>?</code> : 匹配前一个元素零次或一次。例如 <code>a?</code> 匹配零个或一个 "a"。也用于使量词变为非贪婪模式
            (例如 <code>*?</code>, <code>+?</code>)。
          </li>
          <li><code>{n}</code> : 匹配前一个元素恰好 n 次。例如 <code>a{3}</code> 匹配 "aaa"。</li>
          <li><code>{n,}</code> : 匹配前一个元素至少 n 次。例如 <code>a{2,}</code> 匹配两个或更多 "a"。</li>
          <li><code>{n,m}</code> : 匹配前一个元素至少 n 次，但不超过 m 次。例如 <code>a{2,4}</code> 匹配 "aa", "aaa", 或
            "aaaa"。
          </li>
        </ul>

        <h4>常见示例</h4>
        <ol>
          <li>
            <strong>匹配邮箱地址:</strong>
            <pre><code>/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g</code></pre>
          </li>
          <li>
            <strong>匹配URL (简单版):</strong>
            <pre><code>/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi</code></pre>
          </li>
          <li>
            <strong>匹配整数:</strong>
            <pre><code>/-?\d+/g</code></pre>
          </li>
          <li>
            <strong>匹配HTML标签 (简单示例，不建议用正则解析复杂HTML):</strong>
            <pre><code>/&lt;([a-z][a-z0-9]*)\b[^&gt;]*&gt;.*?&lt;\/\1&gt;/gi</code></pre>
            <p class="example-note">(注意：用正则表达式解析HTML通常很复杂且容易出错，建议使用专门的HTML解析器。)</p>
          </li>
          <li>
            <strong>提取日期 (YYYY-MM-DD 格式，带命名捕获组):</strong>
            <pre><code>/(?&lt;year&gt;\d{4})-(?&lt;month&gt;0[1-9]|1[0-2])-(?&lt;day&gt;0[1-9]|[12]\d|3[01])/g</code></pre>
            <p class="example-note">这与本工具默认提供的正则表达式类似。</p>
          </li>
        </ol>
        <p><strong>提示:</strong> 编写和调试正则表达式可能比较复杂。可以利用在线的正则表达式测试工具和学习资源来帮助您。本工具旨在提供一个便捷的测试环境。
        </p>
      </details>
    </div>

  </div>
</template>

<script lang="ts" setup>
import {ref, watch, onMounted} from 'vue';

interface MatchResult {
  fullMatch: string;
  index: number;
  groups: (string | undefined)[];
  namedGroups?: { [key: string]: string | undefined };
}

const defaultRegexLiteral = '/(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])/g';
const defaultTestString = '会议日期: 2024-07-29, 另一个日期: 2025-01-15.';

const fullRegexLiteral = ref<string>(defaultRegexLiteral);
const testString = ref<string>(defaultTestString);
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
      new RegExp(literal); // 仅用于触发错误检查
      regexError.value = '无效的正则表达式字面量格式。请使用 /pattern/flags 格式，例如 /abc/gi。如果您输入的是纯模式，请确保它没有编译错误。';
      matchResults.value = [];

    } catch (e: any) {
      regexError.value = `正则表达式模式错误: ${e.message}。如果输入的是纯模式，请检查语法。如果想使用 /pattern/flags 格式，请确保格式正确。`;
      matchResults.value = [];
    }
    return;
  }

  const pattern = regexParts[1];
  const flags = regexParts[2];

  try {
    const regex = new RegExp(pattern, flags);
    regexError.value = null;
    applyRegex(regex);

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
    if (typeof regex.lastIndex === 'number') {
      regex.lastIndex = 0;
    }

    while ((match = regex.exec(testString.value)) !== null) {
      currentMatches.push({
        fullMatch: match[0],
        index: match.index,
        groups: match.slice(1),
        namedGroups: match.groups,
      });
      // 防止全局匹配空字符串时陷入死循环
      if (match[0].length === 0 && regex.lastIndex === match.index) {
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
  fullRegexLiteral.value = ''; // 清空正则表达式输入
  testString.value = '';       // 清空测试字符串输入
  clearResults();              // 清空结果和错误状态
};

onMounted(() => {
  if (fullRegexLiteral.value || testString.value) { // 仅在有内容时执行初始测试
    performTest();
  }
});
watch([fullRegexLiteral, testString], performTestDebounced, {deep: true});

</script>

<style scoped>
.regex-tester-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: #f4f7f9;
}

.card { /*统一样式类*/
  margin-bottom: 24px;
  padding: 20px; /* 增加内边距 */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 添加细微阴影 */
}


.form-item {
  margin-bottom: 18px; /* 稍微增加间距 */
}

.form-item label {
  display: block;
  margin-bottom: 8px; /* 增加标签和输入框间距 */
  font-weight: 600; /* 字体稍粗 */
  font-size: 0.95em; /* 字体稍大 */
  color: #2c3e50; /* 深灰色 */
}

.full-regex-input {
  width: 100%;
  padding: 12px 14px; /* 增加内边距 */
  border: 1px solid #ced4da; /* 边框颜色调整 */
  border-radius: 6px;
  box-sizing: border-box;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 1rem; /* 字体稍大 */
  background-color: #fdfdfd;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; /* 添加过渡效果 */
}

.full-regex-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25); /* 聚焦阴影调整 */
  outline: none;
}


textarea {
  width: 100%;
  padding: 12px 14px; /* 增加内边距 */
  border: 1px solid #ced4da; /* 边框颜色调整 */
  border-radius: 6px;
  box-sizing: border-box;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 1rem; /* 字体稍大 */
  resize: vertical;
  min-height: 120px;
  background-color: #fdfdfd;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; /* 添加过渡效果 */
}

textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25); /* 聚焦阴影调整 */
  outline: none;
}

.actions-toolbar {
  display: flex;
  gap: 12px; /* 增加按钮间距 */
  margin-top: 20px; /* 增加上方间距 */
  flex-wrap: wrap;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px; /* 增加图标与文字间距 */
  padding: 10px 18px; /* 调整内边距 */
  font-size: 0.95rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.action-button .icon {
  font-size: 1.2em; /* 图标稍大 */
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
  outline: 3px solid rgba(59, 130, 246, 0.4); /* 聚焦轮廓更明显 */
  outline-offset: 2px;
}

.action-button:disabled {
  background-color: #e9ecef !important; /* 禁用背景色调整 */
  color: #6c757d !important; /* 禁用文字颜色调整 */
  border-color: #ced4da !important; /* 禁用边框颜色调整 */
  cursor: not-allowed;
  opacity: 0.7; /* 禁用时透明度 */
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
  background-color: #fee2e2; /* 错误背景色 */
  color: #b91c1c; /* 错误文字颜色 */
  padding: 12px 18px; /* 内边距调整 */
  border: 1px solid #fca5a5; /* 边框颜色 */
  border-radius: 6px;
  margin-top: 18px; /* 上方间距 */
  margin-bottom: 18px; /* 为下方内容留出间距 */
  font-size: 0.95em; /* 字体大小 */
}

.results-section h3 {
  margin-top: 0;
  margin-bottom: 16px; /* 增加下方间距 */
  font-size: 1.2em; /* 标题字体 */
  color: #1f2937; /* 标题颜色 */
  border-bottom: 1px solid #e5e7eb; /* 分隔线颜色 */
  padding-bottom: 10px; /* 分隔线与文字间距 */
}

.matches-found p, .no-matches p, .empty-state p {
  font-size: 1em; /* 文本字体 */
  color: #4b5563; /* 文本颜色 */
}

.empty-state {
  padding: 25px; /* 内边距 */
  text-align: center;
  color: #6b7280; /* 文字颜色 */
  background-color: #f9fafb; /* 背景色 */
  border: 1px dashed #d1d5db; /* 虚线边框 */
  border-radius: 6px; /* 圆角 */
}

.match-list {
  list-style-type: none;
  padding: 0;
}

.match-item {
  background-color: #f9fafb; /* 匹配项背景 */
  border: 1px solid #e5e7eb; /* 边框 */
  border-radius: 6px; /* 圆角 */
  padding: 12px 15px; /* 内边距 */
  margin-bottom: 12px; /* 间距 */
  font-size: 0.95em; /* 字体 */
}

.match-header {
  margin-bottom: 10px; /* 头部下方间距 */
}

.match-header strong {
  color: #1d4ed8; /* 强调文字颜色 */
}

pre.match-value, pre.group-value {
  display: inline;
  background-color: #eef2ff; /* 代码背景 */
  padding: 3px 6px; /* 内边距 */
  border-radius: 4px; /* 圆角 */
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 0.95em; /* 代码字体 */
  color: #374151; /* 代码颜色 */
  white-space: pre-wrap;
  word-break: break-all;
}

.match-groups {
  margin-top: 8px; /* 捕获组区域上方间距 */
  margin-left: 18px; /* 左缩进 */
  font-size: 0.9em; /* 字体 */
  color: #4b5563; /* 文本颜色 */
}

.group-list {
  list-style-type: disc;
  padding-left: 22px; /* 列表缩进 */
  margin-top: 5px; /* 列表上方间距 */
}

.group-list li {
  word-break: break-all;
  margin-bottom: 4px; /* 列表项间距 */
}

.match-details {
  margin-top: 8px; /* 详情区域上方间距 */
  font-size: 0.9em; /* 字体 */
  color: #6b7280; /* 文本颜色 */
}

/* Usage Guide Section Styles */
.usage-guide-section {
  /* Uses .card class for base styling */
}

.usage-guide-section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 1.3em; /* 调整标题大小 */
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 10px;
}

.usage-guide-section .guide-summary {
  cursor: pointer;
  font-weight: 600; /* 调整字重 */
  margin-bottom: 12px;
  font-size: 1.1em; /* 调整字体大小 */
  color: #2563eb; /* 调整颜色 */
  display: block; /* 让 summary 独占一行 */
  padding: 5px 0;
}

.usage-guide-section .guide-summary:hover {
  color: #1d4ed8;
}

.usage-guide-section details[open] .guide-summary {
  margin-bottom: 18px; /* 展开时增加与下方内容的间距 */
}

.usage-guide-section h4 {
  font-size: 1.15em; /* 小标题大小 */
  color: #374151; /* 小标题颜色 */
  margin-top: 20px;
  margin-bottom: 10px;
}

.usage-guide-section p, .usage-guide-section ul, .usage-guide-section ol {
  font-size: 1em; /* 正文文本大小 */
  line-height: 1.7; /* 行高 */
  margin-bottom: 12px;
  color: #374151; /* 正文颜色 */
}

.usage-guide-section ul, .usage-guide-section ol {
  padding-left: 25px; /* 列表缩进 */
}

.usage-guide-section ul ul {
  margin-top: 6px;
  margin-bottom: 6px;
}

.usage-guide-section code { /* Inline code */
  background-color: #eef2ff; /* 内联代码背景 */
  padding: 0.2em 0.5em; /* 内联代码内边距 */
  border-radius: 4px;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 0.9em; /* 内联代码字体 */
  color: #c026d3; /* 内联代码颜色 (紫色系) */
  border: 1px solid #e0e7ff; /* 轻微边框 */
}

.usage-guide-section pre { /* Block code for regex examples */
  background-color: #f3f4f6; /* 代码块背景 */
  border: 1px solid #d1d5db; /* 代码块边框 */
  padding: 12px 15px; /* 代码块内边距 */
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 0.95em; /* 代码块字体 */
  margin-top: 8px;
  margin-bottom: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  color: #111827; /* 代码块文字颜色 */
}

.usage-guide-section pre code { /* Reset inner code style if pre has its own */
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  border: none;
  color: inherit; /* 继承 pre 的颜色 */
  font-size: inherit; /* 继承 pre 的字体大小 */
}

.usage-guide-section .example-note {
  font-size: 0.9em;
  color: #4b5563;
  margin-top: -8px;
  margin-bottom: 10px;
}
</style>