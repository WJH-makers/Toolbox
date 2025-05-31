<template>
  <div class="html-renderer-container">
    <h2 style="text-align: center;">HTML 渲染 (AI辅助版)</h2>
    <div class="tool-grid">
      <div class="panel input-panel">
        <label for="html-input">输入HTML代码:</label>
        <textarea id="html-input" v-model="htmlInput" placeholder="在此粘贴HTML..." rows="15"></textarea>
        <button class="action-button" @click="renderHtml">渲染/分析</button>
      </div>
      <div class="panel output-panel">
        <label>渲染结果:</label>
        <iframe ref="renderFrame" class="render-iframe" sandbox="allow-scripts"></iframe>
        <div v-if="aiAnalysis" class="ai-analysis-output">
          <strong>AI 分析建议:</strong>
          <p>{{ aiAnalysis }}</p>
        </div>
      </div>
    </div>
    <div v-if="errorMessage" class="error-alert">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue';

const htmlInput = ref<string>('<h1>Hello World!</h1><p>这是一个示例。</p>');
const renderFrame = ref<HTMLIFrameElement | null>(null);
const aiAnalysis = ref<string | null>(null); // Placeholder for AI analysis result
const errorMessage = ref<string | null>(null);

const renderHtml = () => {
  errorMessage.value = null;
  aiAnalysis.value = null; // Clear previous analysis
  if (renderFrame.value && renderFrame.value.contentWindow) {
    try {
      const doc = renderFrame.value.contentWindow.document;
      doc.open();
      doc.write(htmlInput.value);
      doc.close();
      // Placeholder for AI analysis call
      // For example: aiAnalysis.value = await fetchAiAnalysis(htmlInput.value);
      aiAnalysis.value = "AI分析功能待实现：例如代码质量、可访问性建议等。";
    } catch (e: any) {
      errorMessage.value = "渲染HTML时发生错误: " + e.message;
      console.error("HTML rendering error:", e);
    }
  }
};

// Placeholder for a function that would call an AI service
// async function fetchAiAnalysis(html: string): Promise<string> {
//   // Simulate AI call
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   return `AI分析：检测到 ${html.length > 50 ? '较多' : '少量'} 内容。建议优化图片标签alt属性。`;
// }
</script>

<style scoped>
.html-renderer-container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
}

.tool-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 768px) {
  .tool-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.panel {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
}

.panel label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 0.9rem;
  resize: vertical;
}

.render-iframe {
  width: 100%;
  height: 300px; /* Adjust as needed */
  border: 1px solid #ccc;
  border-radius: 6px;
}

.action-button {
  margin-top: 10px;
  background-color: #3b82f6;
  color: white;
  padding: 10px 15px;
  font-size: 0.95rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.action-button:hover {
  background-color: #2563eb;
}

.ai-analysis-output {
  margin-top: 15px;
  padding: 10px;
  background-color: #eef2f7;
  border-radius: 4px;
  font-size: 0.9em;
}

.error-alert {
  margin-top: 15px;
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
</style>