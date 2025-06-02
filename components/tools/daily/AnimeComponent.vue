// TraceMoeImageSearch.vue
<template>
  <div class="image-search-container">
    <h1>动漫以图搜图</h1>
    
    <div class="upload-section">
      <div 
        class="drop-area" 
        :class="{ 'drag-over': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <div v-if="!uploadedImage">
          <input 
            type="file" 
            ref="fileInput" 
            @change="onFileSelected" 
            accept="image/*" 
            class="file-input"
          />
          <button @click="triggerFileInput" class="upload-btn">选择图片</button>
          <p>或将动漫截图拖放到此处</p>
        </div>
        <div v-else class="preview-container">
          <img :src="uploadedImage" class="preview-image" alt="上传的图片" />
          <div class="button-group">
            <button @click="clearImage" class="clear-btn">清除</button>
            <button 
              @click="searchImage" 
              class="search-btn" 
              :disabled="isSearching"
            >
              {{ isSearching ? '搜索中...' : '开始搜索' }}
            </button>
          </div>
        </div>
      </div>

      <div class="url-input-section">
        <h3>- 或者使用网络图片链接 -</h3>
        <div class="url-input-group">
          <input 
            type="text" 
            v-model="imageUrl" 
            placeholder="输入动漫截图URL" 
            class="url-input"
          />
          <button 
            @click="searchByUrl" 
            :disabled="!imageUrl || isSearching" 
            class="url-search-btn"
          >
            {{ isSearching ? '搜索中...' : '搜索' }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="search-options">
      <label class="cutborders-option">
        <input type="checkbox" v-model="cutBorders" /> 自动裁剪黑边
      </label>
      <div class="slider-container">
        <label>相似度阈值: {{ similarityThreshold }}%</label>
        <input 
          type="range" 
          v-model.number="similarityThreshold" 
          min="0" 
          max="100" 
          class="similarity-slider"
        />
      </div>
    </div>
    
    <div v-if="isSearching" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在分析图片并查找来源，这可能需要几秒钟...</p>
    </div>
    
    <div v-if="error" class="error-container">
      <p>{{ error }}</p>
    </div>
    
    <div v-if="searchResults.length > 0" class="results-container">
      <h2>搜索结果</h2>
      <div class="results-list">
        <div 
          v-for="(result, index) in searchResults" 
          :key="index" 
          class="result-item"
        >
          <div class="result-preview">
            <div class="video-container" v-if="result.video">
              <video 
                :src="result.video" 
                controls
                autoplay
                loop
                muted
                class="preview-video"
              ></video>
              <div class="time-badge">{{ formatTime(result.from) }} - {{ formatTime(result.to) }}</div>
            </div>
            <div class="image-container" v-else>
              <img :src="result.image" :alt="result.filename" class="preview-image" />
            </div>
          </div>
          
          <div class="result-details">
            <div class="result-header">
              <span class="similarity">相似度: {{ (result.similarity * 100).toFixed(2) }}%</span>
            </div>
            
            <div class="result-titles">
              <h3>{{ result.anime }}</h3>
              <p class="episode-info">
                <span v-if="result.episode">第 {{ result.episode }} 集</span>
                <span v-if="result.episode && result.from"> · </span>
                <span v-if="result.from">{{ formatTime(result.from) }}</span>
              </p>
            </div>
            
            <div class="result-actions">
              <a 
                :href="`https://anilist.co/anime/${result.anilist}`" 
                target="_blank" 
                rel="noopener noreferrer"
                class="action-btn anilist-btn"
              >
                在 AniList 上查看
              </a>
              
              <button 
                @click="copyText(`${result.anime} ${result.episode ? '- 第 ' + result.episode + ' 集' : ''} ${result.from ? '(' + formatTime(result.from) + ')' : ''}`)" 
                class="action-btn copy-btn"
              >
                复制信息
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="searchPerformed && searchResults.length === 0 && !error && !isSearching" class="no-results">
      <p>未找到匹配的动画场景，请尝试其他截图或降低相似度阈值</p>
    </div>
    
    <div class="api-info">
      <p>此工具使用 <a href="https://trace.moe" target="_blank">trace.moe</a> API，仅支持动画视频的截图搜索。</p>
      <p>API 使用限制: 每分钟 10 次请求，每天 150 次请求 (免费用户)</p>
    </div>
  </div>
</template>

<script>

export default {
  name: 'TraceMoeImageSearch',
  data() {
    return {
      uploadedImage: null,
      imageFile: null,
      imageUrl: '',
      isDragging: false,
      isSearching: false,
      searchPerformed: false,
      error: null,
      searchResults: [],
      cutBorders: true,
      similarityThreshold: 80, // 默认相似度阈值 80%
      copySuccess: false
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    
    onFileSelected(event) {
      const file = event.target.files[0];
      if (file && file.type.match('image.*')) {
        this.processFile(file);
      }
    },
    
    onDrop(event) {
      this.isDragging = false;
      const file = event.dataTransfer.files[0];
      if (file && file.type.match('image.*')) {
        this.processFile(file);
      }
    },
    
    processFile(file) {
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    clearImage() {
      this.uploadedImage = null;
      this.imageFile = null;
      this.searchResults = [];
      this.searchPerformed = false;
      this.error = null;
    },
    
    async searchImage() {
      if (!this.uploadedImage || !this.imageFile) return;
      
      this.isSearching = true;
      this.searchResults = [];
      this.error = null;
      this.searchPerformed = true;
      
      try {
        // 准备 FormData 对象
        const formData = new FormData();
        formData.append('image', this.imageFile);
        
        // 添加裁剪黑边参数
        let url = 'https://api.trace.moe/search';
        if (this.cutBorders) {
          url += '?cutBorders=true';
        }
        
        // 使用 FormData 发送请求到 trace.moe API
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        }).then(res => {
          if (!res.ok) {
            throw new Error(`HTTP错误 ${res.status}`);
          }
          return res.json();
        });
        
        this.processResults(response);
      } catch (error) {
        this.handleError(error);
      } finally {
        this.isSearching = false;
      }
    },
    
    async searchByUrl() {
      if (!this.imageUrl) return;
      
      this.isSearching = true;
      this.searchResults = [];
      this.error = null;
      this.searchPerformed = true;
      
      try {
        // 准备请求参数
        const params = new URLSearchParams();
        if (this.cutBorders) {
          params.append('cutBorders', 'true');
        }
        params.append('url', encodeURIComponent(this.imageUrl));
        
        // 发送请求到 trace.moe API
        const response = await fetch(`https://api.trace.moe/search?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP错误 ${response.status}`);
        }
        
        const data = await response.json();
        this.processResults(data);
      } catch (error) {
        this.handleError(error);
      } finally {
        this.isSearching = false;
      }
    },
    
    processResults(data) {
      if (!data || !data.result || data.result.length === 0) {
        return; // 没有结果，保持空数组
      }
      
      // 根据相似度阈值过滤结果
      const threshold = this.similarityThreshold / 100;
      const filteredResults = data.result
        .filter(item => item.similarity >= threshold)
        .slice(0, 5); // 只取前5个结果
      
      // 处理搜索结果
      this.searchResults = filteredResults.map(result => {
        return {
          anime: result.filename || '未知动画',
          episode: result.episode || null,
          from: result.from,
          to: result.to,
          similarity: result.similarity,
          video: result.video,
          image: result.image,
          anilist: result.anilist || null,
          filename: result.filename || '未知场景'
        };
      });
    },
    
    handleError(error) {
      console.error('Search error:', error);
      
      if (error.response) {
        // 服务器返回错误状态码
        const status = error.response.status;
        if (status === 429) {
          this.error = '请求次数超过限制，请稍后再试 (API 限制：每分钟 10 次，每天 150 次)';
        } else if (status === 400) {
          this.error = '请求错误：图片格式不支持或无法处理';
        } else if (status === 413) {
          this.error = '图片太大，请使用小于 10MB 的图片';
        } else {
          this.error = `服务器错误 (${status}): ${error.response?.data?.error || '未知错误'}`;
        }
      } else if (error.request) {
        // 请求已发送但未收到响应
        this.error = '无法连接到 trace.moe 服务器，请检查您的网络连接';
      } else {
        // 设置请求时发生错误
        this.error = `请求错误: ${error.message}`;
      }
    },
    
    formatTime(seconds) {
      // 将秒数格式化为 MM:SS 格式
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        // 可以添加复制成功的提示
        alert('已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败: ', err);
      });
    }
  }
}
</script>

<style scoped>
.image-search-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #333;
}

h1, h2, h3 {
  color: #333;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.drop-area {
  width: 100%;
  max-width: 500px;
  height: 300px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  padding: 20px;
}

.drag-over {
  border-color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
}

.file-input {
  display: none;
}

.upload-btn, .search-btn, .clear-btn, .url-search-btn, .action-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 5px;
  transition: background-color 0.3s;
}

.upload-btn:hover, .search-btn:hover, .action-btn:hover {
  background-color: #45a049;
}

.clear-btn {
  background-color: #f44336;
}

.clear-btn:hover {
  background-color: #d32f2f;
}

.button-group {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.search-btn:disabled, .url-search-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.url-input-section {
  width: 100%;
  max-width: 500px;
  margin-top: 20px;
  text-align: center;
}

.url-input-group {
  display: flex;
  margin: 15px 0;
}

.url-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
}

.url-search-btn {
  background-color: #2196F3;
  border-radius: 0 4px 4px 0;
}

.url-search-btn:hover {
  background-color: #0b7dda;
}

.search-options {
  width: 100%;
  max-width: 500px;
  margin: 10px auto 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.cutborders-option {
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  cursor: pointer;
}

.slider-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.similarity-slider {
  width: 100%;
  cursor: pointer;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
}

.results-container {
  margin-top: 30px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-item {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.result-preview {
  flex: 0 0 300px;
  position: relative;
}

.video-container, .image-container {
  width: 100%;
  height: 100%;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-video, .preview-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.time-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.result-details {
  flex: 1;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.result-header {
  margin-bottom: 10px;
}

.similarity {
  font-weight: bold;
  color: #4CAF50;
  font-size: 18px;
}

.result-titles {
  margin-bottom: 15px;
}

.result-titles h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.episode-info {
  color: #666;
  margin: 5px 0 0;
}

.result-actions {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.anilist-btn {
  background-color: #2196F3;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.anilist-btn:hover {
  background-color: #0b7dda;
}

.copy-btn {
  background-color: #9E9E9E;
}

.copy-btn:hover {
  background-color: #757575;
}

.no-results {
  text-align: center;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 20px;
}

.api-info {
  margin-top: 40px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.api-info a {
  color: #2196F3;
  text-decoration: none;
}

.api-info a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .result-item {
    flex-direction: column;
  }
  
  .result-preview {
    width: 100%;
    height: 200px;
  }
}
</style>