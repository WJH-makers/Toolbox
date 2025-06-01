<script setup>
import { ref } from 'vue'
import jsQR from "jsqr";

const codeVal = ref('');
const imagePreview = ref(null);
const isLoading = ref(false);
const errorMessage = ref('');

function decodeQRCode(image) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });
}

async function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    errorMessage.value = '请上传图片文件（PNG/JPG/JPEG）';
    return;
  }

  try {
    isLoading.value = true;
    const image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
        imagePreview.value = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    const result = decodeQRCode(image);
    if (result?.data) {
      codeVal.value = result.data;
      errorMessage.value = '';
    } else {
      errorMessage.value = '未识别到二维码';
      codeVal.value = '';
    }
  } catch (error) {
    errorMessage.value = '解析失败：' + error.message;
    codeVal.value = '';
  } finally {
    isLoading.value = false;
  }
}

function onFileChange(e) {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
}

function onDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files?.[0];
  if (file) handleFile(file);
}
</script>

<template>
  <div class="qr-container">
    <h1>QCode 二维码扫描</h1>
    <div 
      class="upload-area"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <input 
        type="file"
        id="qrInput"
        accept="image/*"
        @change="onFileChange"
        hidden
      />
      <label for="qrInput" class="upload-label">
        <div v-if="isLoading" class="loading-spinner"></div>
        <template v-else>
          <svg class="upload-icon" viewBox="0 0 24 24">
            <path d="M19 13v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6M12 3v14m0 0 4-4m-4 4-4-4"/>
          </svg>
          <div class="upload-text">
            <p>点击上传或拖放二维码图片</p>
            <small>支持格式：PNG, JPG, JPEG</small>
          </div>
        </template>
      </label>
    </div>

    <div v-if="imagePreview" class="preview-section">
      <img :src="imagePreview" class="preview-image" alt="二维码预览"/>
      <button @click="imagePreview = null" class="close-button">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
      <button @click="errorMessage = ''" class="dismiss-button">×</button>
    </div>

    <div v-if="codeVal" class="result-section">
      <h3>识别结果：</h3>
      <div class="result-content">{{ codeVal }}</div>
      <button @click="codeVal = ''" class="clear-button">清空结果</button>
    </div>
  </div>
</template>

<style scoped>
.qr-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.upload-area {
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

    .qr-container h1 {
      /* 添加text-align: center使文本居中 */
      text-align: center;
      
      /* 动画特效 */
      background: linear-gradient(45deg, #4b99ff, #500caf, #6d76ff, #151ab8);
      background-size: 300% 300%;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 2.8rem;
      letter-spacing: 1px;
      animation: gradientAnimation 7s ease infinite;
      margin-bottom: 30px;
      font-weight: 800;
      position: relative;
      padding-bottom: 15px;
    }

.upload-area:hover {
  border-color: #4CAF50;
  background: #f1f8e9;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  cursor: pointer;
}

.upload-icon {
  width: 48px;
  height: 48px;
  fill: #4CAF50;
  margin-bottom: 1rem;
}

.upload-text {
  text-align: center;
  color: #666;
}

.upload-text p {
  margin: 0;
  font-size: 1.1rem;
}

.upload-text small {
  color: #999;
  font-size: 0.9rem;
}

.preview-section {
  position: relative;
  margin-top: 1.5rem;
}

.preview-image {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.8);
}

.close-button svg {
  fill: white;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dismiss-button {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.5rem;
}

.result-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.result-content {
  margin: 1rem 0;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  word-break: break-all;
}

.clear-button {
  display: block;
  width: 100%;
  padding: 0.8rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.clear-button:hover {
  background: #45a049;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>