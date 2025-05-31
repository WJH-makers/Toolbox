<template>
  <div class="machine-vision-container">
    <h2 style="text-align: center;">机器视觉解析</h2>
    <div class="upload-section form-item">
      <label for="image-upload">上传图片进行分析:</label>
      <input id="image-upload" :disabled="isAnalyzing" accept="image/*" type="file" @change="handleImageUpload">
      <button :disabled="!selectedImageFile || isAnalyzing" class="action-button" @click="analyzeImage">
        {{ isAnalyzing ? '分析中...' : '开始分析' }}
      </button>
    </div>

    <div v-if="previewUrl" class="image-preview-container">
      <strong>预览:</strong>
      <img :src="previewUrl" alt="Uploaded preview" class="image-preview">
    </div>

    <div v-if="analysisResult" class="analysis-result-container">
      <strong>分析结果:</strong>
      <pre>{{ analysisResult }}</pre>
    </div>
    <div v-if="errorMessage" class="error-alert">
      {{ errorMessage }}
    </div>
    <div v-if="isAnalyzing" class="loading-spinner">
      正在分析图像，请稍候...
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue';

const selectedImageFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const isAnalyzing = ref<boolean>(false);
const analysisResult = ref<string | null>(null); // Placeholder for AI analysis result
const errorMessage = ref<string | null>(null);

const handleImageUpload = (event: Event) => {
  errorMessage.value = null;
  analysisResult.value = null;
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedImageFile.value = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string;
    };
    reader.readAsDataURL(selectedImageFile.value);
  } else {
    selectedImageFile.value = null;
    previewUrl.value = null;
  }
};

const analyzeImage = async () => {
  if (!selectedImageFile.value) {
    errorMessage.value = "请先选择一张图片。";
    return;
  }
  isAnalyzing.value = true;
  analysisResult.value = null;
  errorMessage.value = null;

  // Placeholder for actual Machine Vision API call
  // const formData = new FormData();
  // formData.append('image', selectedImageFile.value);
  // try {
  //   const response = await fetch('/your-machine-vision-api-endpoint', {
  //     method: 'POST',
  //     body: formData,
  //   });
  //   if (!response.ok) throw new Error('分析失败，请重试。');
  //   const data = await response.json();
  //   analysisResult.value = JSON.stringify(data, null, 2);
  // } catch (e: any) {
  //   errorMessage.value = e.message;
  // } finally {
  //   isAnalyzing.value = false;
  // }

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  analysisResult.value = JSON.stringify({
    detectedObjects: [
      {label: '猫', confidence: 0.92, boundingBox: {x: 50, y: 60, width: 120, height: 100}},
      {label: '沙发', confidence: 0.85, boundingBox: {x: 10, y: 90, width: 250, height: 150}},
    ],
    dominantColors: ['#3a3a3a', '#ffffff', '#8c7860'],
    imageProperties: {width: 640, height: 480, format: selectedImageFile.value.type}
  }, null, 2);
  isAnalyzing.value = false;
};
</script>

<style scoped>
.machine-vision-container {
  max-width: 700px;
  margin: 20px auto;
  padding: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.upload-section input[type="file"] {
  display: block;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

.action-button {
  background-color: #3b82f6;
  color: white;
  padding: 10px 15px;
  font-size: 0.95rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 100%;
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.action-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.image-preview-container {
  margin-top: 20px;
  text-align: center;
}

.image-preview {
  max-width: 100%;
  max-height: 300px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 5px;
}

.analysis-result-container {
  margin-top: 20px;
}

.analysis-result-container pre {
  background-color: #f0f0f0;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Menlo', 'Consolas', monospace;
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

.loading-spinner {
  text-align: center;
  padding: 20px;
  color: #555;
}
</style>