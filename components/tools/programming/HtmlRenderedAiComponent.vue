<template>
  <div class="ai-coder-container">
    <header class="app-header">
      <h1>AI 辅助 Web 代码编辑器</h1>
    </header>

    <div class="main-layout">
      <div class="panel editor-panel">
        <div class="panel-header">
          <label class="panel-title" for="code-editor-instance">代码编辑器 (HTML, CSS, JS)</label>
          <div class="header-actions">
            <button
                :title="`切换到${currentTheme === 'light' ? '暗色' : '亮色'}主题`"
                class="action-button theme-toggle-button"
                @click="toggleTheme">
              <span class="icon">{{ currentTheme === 'light' ? '🌙' : '☀️' }}</span>
            </button>
            <input
                v-model="aiInstruction"
                class="ai-instruction-input"
                placeholder="输入AI指令, e.g., 创建导航栏"
                type="text"
                @keyup.enter="aiGeneralCompleteCode"
            >
            <button :disabled="isLoadingCompletion" class="action-button ai-button" @click="aiGeneralCompleteCode">
              <span class="icon">✨</span> {{ isLoadingCompletion ? 'AI处理中...' : 'AI 生成/补全' }}
            </button>
          </div>
        </div>
        <div class="codemirror-wrapper">
          <Codemirror
              id="code-editor-instance"
              v-model="code"
              :autofocus="true"
              :extensions="editorExtensions"
              :indent-with-tab="true"
              :style="{ height: '420px', border: '1px solid #dde2e7', borderRadius: '6px' }"
              :tab-size="2"
              placeholder="在此输入您的 HTML, CSS, 和 JavaScript 代码..."
              @ready="(payload) => handleEditorReady(payload)"
          />
        </div>
        <div class="editor-actions">
          <button class="action-button render-button" @click="renderPreview">
            <span class="icon">🖼️</span> 渲染预览
          </button>
          <button :disabled="isLoadingFormatting" class="action-button format-button" @click="formatCode">
            <span class="icon">💅</span> {{ isLoadingFormatting ? '格式化中...' : '格式化代码' }}
          </button>
          <button class="action-button download-button" @click="downloadCode">
            <span class="icon">💾</span> 下载代码
          </button>
          <button
              :disabled="!isTextSelected || isLoadingSelectionProcessing"
              class="action-button process-selection-button"
              @click="aiProcessSelection">
            <span class="icon">🧠</span> {{ isLoadingSelectionProcessing ? '处理中...' : 'AI处理选中' }}
          </button>
        </div>
        <div v-if="lintMessages.length > 0" class="lint-errors">
          <strong>语法提示:</strong>
          <ul>
            <li v-for="(msg, index) in lintMessages" :key="index" :class="`lint-message lint-${msg.severity}`">
              <span class="lint-line">行 {{ msg.fromLine }}:</span> {{ msg.message }}
            </li>
          </ul>
        </div>
      </div>

      <div class="panel output-panel">
        <label class="panel-title">实时预览 (沙盒)</label>
        <iframe
            ref="renderFrame" class="render-iframe" sandbox="allow-scripts allow-same-origin allow-forms"
            title="HTML渲染结果"/>
      </div>
    </div>
    <div v-if="errorMessage" class="error-alert">
      <span class="icon">⚠️</span> {{ errorMessage }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, nextTick, onMounted, ref, shallowRef, watch} from 'vue';
import {Codemirror} from 'vue-codemirror';
import {html} from '@codemirror/lang-html';
import {javascript} from '@codemirror/lang-javascript';
import {css} from '@codemirror/lang-css';
import {EditorView, keymap} from '@codemirror/view';
import {Compartment, EditorState} from '@codemirror/state';
import {indentWithTab} from '@codemirror/commands';
import type {Diagnostic, LintSource} from '@codemirror/lint';
import {linter, lintGutter} from '@codemirror/lint';
import {HTMLHint} from 'htmlhint';
import {oneDark} from '@codemirror/theme-one-dark';

import {format} from 'prettier/standalone';
import * as prettierPluginHtml from 'prettier/plugins/html';
import * as prettierPluginPostcss from 'prettier/plugins/postcss';
import * as prettierPluginBabel from 'prettier/plugins/babel';

const initialCode = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 编辑器作品</title>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    body {
      background-color: #f4f6f8;
      display: flex;
      flex-direction: column;
    }
    .content-wrapper {
        width: 100%;
        flex-grow: 1;
        padding: 20px;
        background: white;
        box-sizing: border-box;
        overflow-y: auto;
    }
    h1 {
      color: #1a73e8;
      text-align: center;
      margin-top: 0;
      margin-bottom: 20px;
    }
    p#theme-indicator-p {
        text-align: center;
        margin-top: 20px;
    }
    #myButton {
       margin-top:15px;
       padding: 8px 15px;
       border-radius: 4px;
       background-color: #555;
       color: white;
       border: none;
       cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="content-wrapper">
    <h1>欢迎使用 AI 辅助 Web 编辑器!</h1>
    <p id="theme-indicator-p">当前是 <strong><span id="theme-indicator">浅色</span></strong> 主题。</p>
    <button id="myButton">一个示例按钮</button>
  </div>
  <script>
    function updateThemeIndicator(theme) {
      const indicator = document.getElementById('theme-indicator');
      const body = document.body;
      const wrapper = document.querySelector('.content-wrapper');
      const h1 = document.querySelector('h1');
      const button = document.getElementById('myButton');

      if (indicator && wrapper && body && h1) {
        indicator.textContent = theme === 'dark' ? '暗色' : '浅色';
        if (theme === 'dark') {
          body.style.backgroundColor = '#1e2022';
          wrapper.style.backgroundColor = '#2c2f33';
          wrapper.style.color = '#e0e0e0';
          h1.style.color = '#58a6ff';
          if(button) button.style.backgroundColor = '#7b1fa2';
        } else {
          body.style.backgroundColor = '#f4f6f8';
          wrapper.style.backgroundColor = 'white';
          wrapper.style.color = '#333';
          h1.style.color = '#1a73e8';
          if(button) button.style.backgroundColor = '#555';
        }
      }
    }
  <\/script>
</body>
</html>`;

const code = ref(initialCode);
const renderFrame = ref<HTMLIFrameElement | null>(null);
const aiInstruction = ref('');
const isLoadingCompletion = ref(false);
const isLoadingSelectionProcessing = ref(false);
const isLoadingFormatting = ref(false);
const errorMessage = ref<string | null>(null);
const lintMessages = ref<Array<Diagnostic & { fromLine: number }>>([]);

const editorView = shallowRef<EditorView>();
const currentTheme = ref<'light' | 'dark'>('light');
const themeCompartment = new Compartment();
const lightTheme = EditorView.theme({}, {dark: false});
const isTextSelected = ref(false);

const editorExtensions = computed(() => [
  html({matchClosingTags: true, autoCloseTags: true}),
  javascript(),
  css(),
  EditorView.lineWrapping,
  EditorState.tabSize.of(2),
  keymap.of([indentWithTab]),
  lintGutter(),
  linter(htmlLinterSource, {delay: 300}),
  themeCompartment.of(currentTheme.value === 'dark' ? oneDark : lightTheme),
  EditorView.updateListener.of(update => {
    if (editorView.value) {
      if (update.selectionSet || update.docChanged || update.focusChanged) {
        isTextSelected.value = !editorView.value.state.selection.main.empty;
      }
    }
  })
]);

const handleEditorReady = (payload: { view: EditorView; state: EditorState; container: HTMLElement }) => {
  editorView.value = payload.view;
  if (editorView.value) {
    editorView.value.dispatch({
      effects: themeCompartment.reconfigure(currentTheme.value === 'dark' ? oneDark : lightTheme)
    });
    isTextSelected.value = !editorView.value.state.selection.main.empty;
  }
};

const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
  if (editorView.value) {
    editorView.value.dispatch({
      effects: themeCompartment.reconfigure(currentTheme.value === 'dark' ? oneDark : lightTheme)
    });
  }
  if (renderFrame.value?.contentWindow && typeof (renderFrame.value.contentWindow as any).updateThemeIndicator === 'function') {
    (renderFrame.value.contentWindow as any).updateThemeIndicator(currentTheme.value);
  }
};

const htmlLinterSource: LintSource = (view: EditorView) => {
  const currentDoc = view.state.doc.toString();
  if (!currentDoc.trim()) return [];
  const diagnostics: Diagnostic[] = [];
  try {
    const results = HTMLHint.verify(currentDoc, HTMLHint.defaultRuleset);
    results.forEach((msg: any) => {
      const line = view.state.doc.line(msg.line);
      const from = line.from + Math.max(0, Math.min(msg.col - 1, line.length));
      const errorLength = msg.raw?.length || 1;
      let to = Math.min(from + errorLength, line.to);
      if (from >= to) to = from + 1;
      diagnostics.push({
        from, to,
        severity: msg.type === 'error' ? 'error' : (msg.type === 'warning' ? 'warning' : 'info'),
        message: msg.message,
      });
    });
  } catch (e) {
    console.error('HTMLHint Linter Error:', e);
  }
  return diagnostics;
};

const renderPreview = () => {
  errorMessage.value = null;
  const iframe = renderFrame.value;
  if (iframe?.contentWindow?.document) {
    try {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(code.value);
      doc.close();

      if (editorView.value) {
        const currentDiagnostics = htmlLinterSource(editorView.value);
        lintMessages.value = currentDiagnostics.map((d) => ({
          ...d, fromLine: editorView.value!.state.doc.lineAt(d.from).number,
        }));
      }

      // 确保iframe宽度为100%，不再动态调整其元素宽度
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.marginLeft = '';
        iframe.style.marginRight = '';
      }

      if (typeof (iframe.contentWindow as any).updateThemeIndicator === 'function') {
        (iframe.contentWindow as any).updateThemeIndicator(currentTheme.value);
      }
    } catch (e: any) {
      errorMessage.value = `渲染HTML时发生错误: ${e.message}`;
      lintMessages.value = [];
    }
  } else {
    nextTick(() => {
      if (iframe?.contentWindow?.document) renderPreview();
      else errorMessage.value = '预览框架不可用。';
    });
  }
};

watch(code, () => {
  nextTick(renderPreview);
}, {deep: true});

const aiGeneralCompleteCode = async () => {
  if (!aiInstruction.value.trim() && !code.value.includes('AI:')) {
    errorMessage.value = '请在上方输入框提供AI指令，或在代码中使用 格式的占位符。';
    return;
  }
  isLoadingCompletion.value = true;
  errorMessage.value = null;
  try {
    const response = await fetch('/api/ai/render/html-coder', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        code: code.value,
        instruction: aiInstruction.value || '请根据代码中的AI注释进行操作，或对整个代码进行智能补全/优化。'
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({message: `AI服务返回了错误状态 ${response.status}`}));
      throw new Error(errorData.message || `AI服务错误 (状态 ${response.status})`);
    }
    const data = await response.json();
    if (data && typeof data.completedCode === 'string') {
      code.value = data.completedCode;
      aiInstruction.value = '';
    } else {
      errorMessage.value = 'AI未能返回有效的代码格式。';
    }
  } catch (e: any) {
    errorMessage.value = `AI代码补全请求失败: ${e.message}`;
  } finally {
    isLoadingCompletion.value = false;
  }
};

const aiProcessSelection = async () => {
  if (!isTextSelected.value) {
    errorMessage.value = "请先在编辑器中选中文本以供AI处理。";
    return;
  }
  if (!editorView.value) return;
  isLoadingSelectionProcessing.value = true;
  errorMessage.value = null;
  const selection = editorView.value.state.selection.main;
  const selectedText = editorView.value.state.sliceDoc(selection.from, selection.to);
  try {
    const response = await fetch('/api/ai/render/html-coder', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        code: code.value,
        instruction: `任务：请针对以下从代码编辑器中选择的代码片段进行重构和优化，主要目标是提升其美观性、可读性和潜在效率。请仅返回修改后的代码片段本身，不要添加任何解释性文字或代码块标记。\n\n要处理的代码片段：\n\`\`\`\n${selectedText}\n\`\`\``,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({message: `AI服务返回错误 ${response.status}`}));
      throw new Error(errorData.message || `AI服务错误 (状态 ${response.status})`);
    }
    const data = await response.json();
    if (data && typeof data.completedCode === 'string' && data.completedCode.trim() !== "") {
      editorView.value.dispatch({
        changes: {from: selection.from, to: selection.to, insert: data.completedCode}
      });
      aiInstruction.value = '';
    } else if (data && data.completedCode !== undefined && data.completedCode.trim() === "") {
      errorMessage.value = "AI返回了空的代码片段，未作修改。";
    } else {
      errorMessage.value = "AI未能返回有效的代码片段。";
    }
  } catch (e: any) {
    console.error("AI Process Selection Error:", e);
    errorMessage.value = `AI处理选中内容失败: ${e.message}`;
  } finally {
    isLoadingSelectionProcessing.value = false;
  }
};

const formatCode = async () => {
  if (!code.value.trim()) {
    errorMessage.value = "没有需要格式化的代码。";
    return;
  }
  isLoadingFormatting.value = true;
  errorMessage.value = null;
  await nextTick();
  try {
    const formattedCode = await format(code.value, {
      parser: "html",
      plugins: [prettierPluginHtml, prettierPluginPostcss, prettierPluginBabel],
      printWidth: 100, tabWidth: 2, useTabs: false, semi: true, singleQuote: false,
      trailingComma: "es5", bracketSpacing: true, htmlWhitespaceSensitivity: "css",
    });
    code.value = formattedCode;
  } catch (e: any) {
    errorMessage.value = "代码格式化失败: " + e.message;
  } finally {
    isLoadingFormatting.value = false;
  }
};

const downloadCode = () => {
  const filename = "ai-edited-page.html";
  const blob = new Blob([code.value], {type: 'text/html;charset=utf-8;'});
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

onMounted(() => {
  if (renderFrame.value) {
    const doRender = () => {
      if (renderFrame.value && renderFrame.value.contentWindow) {
        renderPreview();
      }
    };
    if (renderFrame.value.contentWindow && renderFrame.value.contentWindow.document.readyState === 'complete') {
      doRender();
    } else if (renderFrame.value.contentWindow) {
      doRender();
      renderFrame.value.onload = doRender;
    } else {
      renderFrame.value.onload = doRender;
    }
  }
});
</script>

<style scoped>
.ai-coder-container {
  max-width: 100%;
  min-width: 700px;
  margin: 0 auto;
  padding: 20px;
  background-color: #eef2f7;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 40px);
  box-sizing: border-box;
}

.app-header {
  text-align: center;
  margin-bottom: 20px;
  padding: 10px 0;
  border-bottom: 1px solid #dce4ec;
}

.app-header h1 {
  font-size: 1.9rem;
  font-weight: 600;
  color: #34495e;
  letter-spacing: -0.5px;
}

.main-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex-grow: 1;
  min-height: 0;
}

.panel {
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-panel {
  flex: 0 1;
}

.codemirror-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}


.output-panel {
  flex: 1 1 auto;
  min-height: 450px; /* 增加预览面板的最小高度和默认高度 */
  height: 50vh; /* 或者使其占据视口的一半 */
  padding: 15px;
}


.panel-header {
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-title {
  font-weight: 600;
  font-size: 1.15rem;
  color: #34495e;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-toggle-button {
  padding: 8px 12px !important;
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
  box-shadow: none;
}

.theme-toggle-button:hover {
  background-color: #e9ecef;
}

.ai-instruction-input {
  flex-grow: 1;
  min-width: 220px;
  padding: 9px 12px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  height: 38px;
  box-sizing: border-box;
}

.ai-instruction-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

:deep(.cm-editor) {
  border-radius: 6px;
  font-size: 0.95rem;
}

:deep(.cm-gutters) {
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
}

:deep(.cm-editor .cm-scroller::-webkit-scrollbar) {
  width: 10px;
  height: 10px;
}

:deep(.cm-editor .cm-scroller::-webkit-scrollbar-track) {
  background-color: #f1f1f1;
  border-radius: 5px;
}

:deep(.cm-editor .cm-scroller::-webkit-scrollbar-thumb) {
  background-color: #c1c1c1;
  border-radius: 5px;
  border: 2px solid #f1f1f1;
}

:deep(.cm-editor .cm-scroller::-webkit-scrollbar-thumb:hover) {
  background-color: #a8a8a8;
}

:deep(.cm-lintRange-error) {
  text-decoration: none;
  background: repeating-linear-gradient(
      -45deg,
      rgba(220, 53, 69, 0.18),
      rgba(220, 53, 69, 0.18) 4px,
      transparent 4px,
      transparent 8px
  );
  position: relative;
}

:deep(.cm-lintRange-error)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0px;
  height: 2.5px;
  background-image: linear-gradient(135deg, transparent 0%, transparent 35%, red 35%, red 65%, transparent 65%, transparent 100%);
  background-size: 7px 2.5px;
  background-repeat: repeat-x;
  opacity: 1;
}

:deep(.cm-lintRange-warning) {
  text-decoration: none;
  background: repeating-linear-gradient(
      -45deg,
      rgba(255, 193, 7, 0.2),
      rgba(255, 193, 7, 0.2) 4px,
      transparent 4px,
      transparent 8px
  );
  position: relative;
}

:deep(.cm-lintRange-warning)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0px;
  height: 2.5px;
  background-image: linear-gradient(135deg, transparent 0%, transparent 35%, orange 35%, orange 65%, transparent 65%, transparent 100%);
  background-size: 7px 2.5px;
  background-repeat: repeat-x;
  opacity: 1;
}

:deep(.cm-lintRange-info) {
  position: relative;
}

:deep(.cm-lintRange-info)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0px;
  height: 2px;
  background-image: linear-gradient(135deg, transparent 0%, transparent 35%, cornflowerblue 35%, cornflowerblue 65%, transparent 65%, transparent 100%);
  background-size: 7px 2px;
  background-repeat: repeat-x;
  opacity: 0.9;
}

.editor-actions {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.action-button {
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-button:active {
  transform: translateY(0px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);
}

.action-button:disabled {
  background-color: #b0bec5 !important;
  color: #78909c !important;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.action-button .icon {
  font-size: 1.05em;
}

.render-button {
  background-color: #007bff;
  color: white;
}

.render-button:hover {
  background-color: #0056b3;
}

.ai-button {
  background-color: #28a745;
  color: white;
}

.ai-button:hover {
  background-color: #1e7e34;
}

.format-button {
  background-color: #6f42c1;
  color: white;
}

.format-button:hover {
  background-color: #5a32a3;
}

.download-button {
  background-color: #fd7e14;
  color: white;
}

.download-button:hover {
  background-color: #e36700;
}

.process-selection-button {
  background-color: #17a2b8;
  color: white;
}

.process-selection-button:hover {
  background-color: #117a8b;
}

.output-panel .render-iframe {
  width: 100%; /* 让 iframe 宽度撑满其父容器 .output-panel */
  height: 100%; /* 让 iframe 高度撑满其父容器 .output-panel 的可用空间 */
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background-color: #ffffff;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.04);
}

.lint-errors {
  margin-top: 15px;
  padding: 10px 12px;
  background-color: #fff9e0;
  border-left: 4px solid #ffc107;
  border-radius: 5px;
  font-size: 0.85rem;
  max-height: 130px;
  overflow-y: auto;
  color: #594f36;
}

.lint-errors strong {
  color: #594502;
  display: block;
  margin-bottom: 6px;
}

.lint-errors ul {
  list-style-type: none;
  padding-left: 0;
  margin: 0;
}

.lint-errors li {
  padding: 3px 0;
  border-bottom: 1px solid #f7f0cc;
}

.lint-errors li:last-child {
  border-bottom: none;
}

.lint-line {
  font-weight: bold;
  margin-right: 8px;
  color: #856404;
}

.lint-message.lint-error {
  color: #721c24;
}

.lint-message.lint-error .lint-line {
  color: #721c24;
}

.lint-message.lint-warning {
  color: #856404;
}

.lint-message.lint-warning .lint-line {
  color: #856404;
}

.error-alert {
  margin-top: 18px;
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px 15px;
  border: 1px solid #f5c6cb;
  border-left-width: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.error-alert .icon {
  font-size: 1.2em;
}
</style>