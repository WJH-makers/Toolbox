<template>
  <div class="api-client-container">
    <h2 style="text-align: center;">API 客户端工具 🚀</h2>

    <div class="request-setup-section">
      <div class="form-item url-method-group">
        <select v-model="requestMethod" :disabled="isLoading" class="http-method-select">
          <option v-for="method in httpMethods" :key="method" :value="method">{{ method }}</option>
        </select>
        <input
            v-model="requestUrl"
            :disabled="isLoading"
            class="url-input"
            placeholder="输入请求 URL (例如: https://api.example.com/data)"
            type="text"
        >
        <button :disabled="isLoading || !requestUrl.trim()" class="action-button send-button" @click="sendRequest">
          <span class="icon">▶️</span>
          <span class="text">{{ isLoading ? '发送中...' : '发送请求' }}</span>
        </button>
      </div>
    </div>

    <div class="details-tabs">
      <div class="tab-headers">
        <button :class="{ active: activeTab === 'params' }" @click="activeTab = 'params'">查询参数</button>
        <button :class="{ active: activeTab === 'headers' }" @click="activeTab = 'headers'">请求头</button>
        <button :class="{ active: activeTab === 'body' }" :disabled="!isBodyAllowed" @click="activeTab = 'body'">
          请求体
        </button>
      </div>

      <div class="tab-content">
        <div v-show="activeTab === 'params'" class="params-tab">
          <h4>查询参数 (Query Parameters)</h4>
          <div v-for="(param, index) in queryParams" :key="param.id" class="key-value-pair">
            <input v-model="param.key" :disabled="isLoading" placeholder="参数名" type="text">
            <input v-model="param.value" :disabled="isLoading" placeholder="参数值" type="text">
            <button :disabled="isLoading" class="remove-button" @click="removeQueryParam(index)">移除</button>
          </div>
          <button :disabled="isLoading" class="add-button" @click="addQueryParam">+ 添加参数</button>
        </div>

        <div v-show="activeTab === 'headers'" class="headers-tab">
          <h4>请求头 (Headers)</h4>
          <div v-for="(header, index) in requestHeaders" :key="header.id" class="key-value-pair">
            <input v-model="header.key" :disabled="isLoading" placeholder="Header 名称" type="text">
            <input v-model="header.value" :disabled="isLoading" placeholder="Header 值" type="text">
            <button :disabled="isLoading" class="remove-button" @click="removeRequestHeader(index)">移除</button>
          </div>
          <button :disabled="isLoading" class="add-button" @click="addRequestHeader">+ 添加请求头</button>
        </div>

        <div v-show="activeTab === 'body'" :class="{'content-disabled': !isBodyAllowed}" class="body-tab">
          <h4>请求体 (Request Body)</h4>
          <select v-model="requestBodyType" :disabled="isLoading || !isBodyAllowed" class="body-type-select">
            <option value="none">无</option>
            <option value="json">JSON (application/json)</option>
            <option value="text">Text (text/plain)</option>
            <option value="form-urlencoded">Form (x-www-form-urlencoded)</option>
          </select>
          <textarea
              v-if="requestBodyType !== 'none' && requestBodyType !== 'form-urlencoded'"
              v-model="requestBody"
              :disabled="isLoading || !isBodyAllowed"
              placeholder="输入请求体内容..."
              rows="8"
          />
          <div v-if="requestBodyType === 'form-urlencoded'" class="form-data-pairs">
            <div v-for="(item, index) in formUrlencodedBody" :key="item.id" class="key-value-pair">
              <input v-model="item.key" :disabled="isLoading || !isBodyAllowed" placeholder="键" type="text">
              <input v-model="item.value" :disabled="isLoading || !isBodyAllowed" placeholder="值" type="text">
              <button
                  :disabled="isLoading || !isBodyAllowed" class="remove-button"
                      @click="removeFormUrlencodedItem(index)">移除
              </button>
            </div>
            <button :disabled="isLoading || !isBodyAllowed" class="add-button" @click="addFormUrlencodedItem">+
              添加表单项
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="generalError" class="error-alert api-error-alert">
      <strong>请求错误:</strong> {{ generalError }}
      <button class="close-alert-button" @click="generalError = null">×</button>
    </div>

    <div v-if="response" class="response-section">
      <h3>响应结果:</h3>
      <div class="response-status">
        状态: <span :class="statusClass">{{ response.status }} {{ response.statusText }}</span>
        <span style="margin-left: 15px;">时间: {{ responseTime }} ms</span>
      </div>

      <div class="details-tabs response-tabs">
        <div class="tab-headers">
          <button :class="{ active: activeResponseTab === 'body' }" @click="activeResponseTab = 'body'">响应体</button>
          <button :class="{ active: activeResponseTab === 'headers' }" @click="activeResponseTab = 'headers'">响应头
          </button>
        </div>
        <div class="tab-content">
          <div v-show="activeResponseTab === 'body'" class="response-body-tab">
            <div class="response-actions">
              <button :disabled="!responseBodyText" class="action-button copy-button" @click="copyResponseBody">
                <span class="icon">📋</span> <span class="text">复制响应体</span>
              </button>
            </div>
            <pre class="response-body-output"><code>{{ responseBodyText || '无响应体内容' }}</code></pre>
          </div>
          <div v-show="activeResponseTab === 'headers'" class="response-headers-tab">
            <ul v-if="responseHeadersList.length > 0" class="headers-list">
              <li v-for="(header, index) in responseHeadersList" :key="index">
                <strong>{{ header.key }}:</strong> {{ header.value }}
              </li>
            </ul>
            <p v-else>无响应头信息。</p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isLoading" class="loading-spinner">请求发送中...</div>

  </div>
</template>

<script lang="ts" setup>
import {ref, computed, watch} from 'vue';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
type RequestBodyType = 'none' | 'json' | 'text' | 'form-urlencoded' | 'form-data'; // form-data not fully implemented here

interface KeyValue {
  id: number;
  key: string;
  value: string;
  enabled?: boolean; // For future use perhaps
}

const requestUrl = ref<string>('');
const requestMethod = ref<HttpMethod>('GET');
const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const queryParams = ref<KeyValue[]>([{id: Date.now(), key: '', value: ''}]);
const requestHeaders = ref<KeyValue[]>([{id: Date.now(), key: 'Content-Type', value: 'application/json'}]);
const requestBodyType = ref<RequestBodyType>('none');
const requestBody = ref<string>('');
const formUrlencodedBody = ref<KeyValue[]>([{id: Date.now(), key: '', value: ''}]);


const activeTab = ref<'params' | 'headers' | 'body'>('params');
const activeResponseTab = ref<'body' | 'headers'>('body');

const isLoading = ref<boolean>(false);
const generalError = ref<string | null>(null);

const response = ref<Response | null>(null);
const responseBodyText = ref<string>('');
const responseHeadersList = ref<{ key: string, value: string }[]>([]);
const responseTime = ref<number>(0);
// const responseSize = ref<string>(''); // Could implement later

const isBodyAllowed = computed(() => !['GET', 'HEAD'].includes(requestMethod.value));

watch(requestMethod, (newMethod) => {
  if (!isBodyAllowed.value) {
    requestBodyType.value = 'none';
    if (activeTab.value === 'body') activeTab.value = 'params';
  }
  // Auto-set Content-Type header based on body type, but only if user hasn't set it explicitly
  updateContentTypeHeader();
});

watch(requestBodyType, () => {
  updateContentTypeHeader();
});

function updateContentTypeHeader() {
  const contentTypeHeaderIndex = requestHeaders.value.findIndex(h => h.key.toLowerCase() === 'content-type');
  let autoSetContentType = true;
  if (contentTypeHeaderIndex !== -1 && requestHeaders.value[contentTypeHeaderIndex].value.trim() !== '') {
    // User has set a Content-Type, don't override unless it's clearly mismatched or body is none
    autoSetContentType = false;
  }

  if (isBodyAllowed.value) {
    let newContentType = '';
    switch (requestBodyType.value) {
      case 'json':
        newContentType = 'application/json; charset=UTF-8';
        break;
      case 'text':
        newContentType = 'text/plain; charset=UTF-8';
        break;
      case 'form-urlencoded':
        newContentType = 'application/x-www-form-urlencoded; charset=UTF-8';
        break;
      case 'none':
        newContentType = '';
        break; // No specific content type if no body
    }

    if (newContentType || requestBodyType.value === 'none') { // if 'none', we might want to remove existing C-T
      if (contentTypeHeaderIndex !== -1) {
        if (autoSetContentType || requestBodyType.value === 'none') requestHeaders.value[contentTypeHeaderIndex].value = newContentType;
      } else if (newContentType && autoSetContentType) {
        addRequestHeader('Content-Type', newContentType);
      }
    }
  } else { // For GET/HEAD, remove Content-Type if it was auto-added
    if (contentTypeHeaderIndex !== -1 && autoSetContentType) { // Only remove if it was likely auto-set
      if (requestHeaders.value.length > 1) {
        requestHeaders.value.splice(contentTypeHeaderIndex, 1);
      } else { // If it's the only header, just clear its value
        requestHeaders.value[contentTypeHeaderIndex].value = '';
      }
    }
  }
}


// Query Params functions
const addQueryParam = () => queryParams.value.push({id: Date.now(), key: '', value: ''});
const removeQueryParam = (index: number) => queryParams.value.splice(index, 1);

// Request Headers functions
const addRequestHeader = (key = '', value = '') => requestHeaders.value.push({id: Date.now(), key, value});
const removeRequestHeader = (index: number) => requestHeaders.value.splice(index, 1);

// Form URL Encoded Body functions
const addFormUrlencodedItem = () => formUrlencodedBody.value.push({id: Date.now(), key: '', value: ''});
const removeFormUrlencodedItem = (index: number) => formUrlencodedBody.value.splice(index, 1);


const sendRequest = async () => {
  if (!requestUrl.value.trim()) {
    generalError.value = "请求 URL 不能为空。";
    return;
  }
  isLoading.value = true;
  generalError.value = null;
  response.value = null;
  responseBodyText.value = '';
  responseHeadersList.value = [];
  responseTime.value = 0;

  const startTime = performance.now();

  try {
    const headers = new Headers();
    requestHeaders.value.forEach(header => {
      if (header.key.trim() && header.value.trim()) { // Only add if key and value are not empty
        headers.append(header.key, header.value);
      }
    });

    let body: BodyInit | null = null;
    if (isBodyAllowed.value) {
      switch (requestBodyType.value) {
        case 'json':
        case 'text':
          body = requestBody.value;
          break;
        case 'form-urlencoded':
          const formParams = new URLSearchParams();
          formUrlencodedBody.value.forEach(item => {
            if (item.key.trim()) formParams.append(item.key, item.value);
          });
          body = formParams;
          break;
        case 'none':
        default:
          body = null;
      }
    }

    let finalUrl = requestUrl.value;
    if (queryParams.value.some(p => p.key.trim())) {
      const queryString = new URLSearchParams();
      queryParams.value.forEach(p => {
        if (p.key.trim()) queryString.append(p.key, p.value);
      });
      finalUrl += `?${queryString.toString()}`;
    }


    const rawResponse = await fetch(finalUrl, {
      method: requestMethod.value,
      headers: headers,
      body: body,
      // signal: AbortSignal.timeout(10000) // Example: 10s timeout
    });

    response.value = rawResponse; // Store the raw Response object

    const endTime = performance.now();
    responseTime.value = Math.round(endTime - startTime);

    // Process headers
    const respHeaders: { key: string, value: string }[] = [];
    rawResponse.headers.forEach((value, key) => {
      respHeaders.push({key, value});
    });
    responseHeadersList.value = respHeaders;

    // Process body
    // Try to intelligently parse body
    const contentType = rawResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const jsonBody = await rawResponse.json();
        responseBodyText.value = JSON.stringify(jsonBody, null, 2); // Pretty print
      } catch (e) {
        responseBodyText.value = await rawResponse.text(); // Fallback to text if JSON parsing fails
        console.warn("Response said JSON, but failed to parse. Showing as text.", e);
      }
    } else {
      responseBodyText.value = await rawResponse.text();
    }
    // Could implement size calculation: responseSize.value = ...

  } catch (e: any) {
    const endTime = performance.now();
    responseTime.value = Math.round(endTime - startTime);
    generalError.value = `请求失败: ${e.message}`;
    console.error("API Request Error:", e);
    // If fetch throws (e.g. network error), response.value will be null
    // If it's an HTTP error status, fetch by default doesn't throw unless it's network level
    // However, if using $fetch, it throws on 4xx/5xx. Raw fetch does not.
    // Since we are using raw fetch now, we rely on response.ok or status codes.
    // The catch block here is more for network level errors or programming errors.
  } finally {
    isLoading.value = false;
  }
};

const statusClass = computed(() => {
  if (!response.value) return '';
  if (response.value.status >= 200 && response.value.status < 300) return 'status-success';
  if (response.value.status >= 400 && response.value.status < 500) return 'status-client-error';
  if (response.value.status >= 500) return 'status-server-error';
  return 'status-info';
});

const copyResponseBody = async () => {
  if (!responseBodyText.value) return;
  try {
    await navigator.clipboard.writeText(responseBodyText.value);
    // Optionally, show a success message
    alert('响应体已复制到剪贴板！');
  } catch (err) {
    alert('复制失败，请手动复制。');
    console.error('Failed to copy response body: ', err);
  }
};

</script>

<style scoped>
.api-client-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
}

.request-setup-section {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.url-method-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.http-method-select {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 0.95rem;
  background-color: white;
}

.url-input {
  flex-grow: 1;
  padding: 10px;
  font-size: 0.95rem;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.details-tabs {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden; /* Clip content to border-radius */
  margin-bottom: 20px;
}

.tab-headers {
  display: flex;
  background-color: #f1f3f5;
}

.tab-headers button {
  flex-grow: 1;
  padding: 12px 15px;
  background-color: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: #495057;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.tab-headers button:hover {
  color: #007bff;
}

.tab-headers button.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.tab-headers button:disabled {
  color: #adb5bd;
  cursor: not-allowed;
}


.tab-content {
  padding: 15px;
  background-color: #ffffff;
}

.tab-content .content-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.tab-content h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1em;
  color: #333;
}

.key-value-pair {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.key-value-pair input[type="text"] {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.remove-button, .add-button {
  padding: 6px 10px;
  font-size: 0.85rem;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ccc;
  background-color: #f8f9fa;
  color: #333;
}

.remove-button {
  background-color: #fde8e8;
  border-color: #f5c6cb;
  color: #c53030;
}

.remove-button:hover {
  background-color: #f8d7da;
}

.add-button {
  margin-top: 5px;
  background-color: #e0f2f7;
  border-color: #b3e0ff;
  color: #007bff;
}

.add-button:hover {
  background-color: #ccebff;
}

.body-type-select {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.body-tab textarea {
  width: 100%;
  min-height: 150px;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 0.9rem;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-data-pairs {
  margin-top: 10px;
}

.response-section {
  margin-top: 25px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
}

.response-section h3 {
  padding: 15px 15px 10px 15px;
  margin: 0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 1.1em;
}

.response-status {
  padding: 10px 15px;
  font-size: 0.95rem;
  background-color: #f7f9fc;
  border-bottom: 1px solid #e0e0e0;
}

.status-success {
  color: #28a745;
  font-weight: bold;
}

.status-client-error {
  color: #dc3545;
  font-weight: bold;
}

.status-server-error {
  color: #dc3545;
  font-weight: bold;
}

.status-info {
  color: #17a2b8;
  font-weight: bold;
}

.response-tabs .tab-content {
  padding: 0; /* Remove padding if pre has its own */
}

.response-body-output {
  background-color: #282c34; /* Dark background for code */
  color: #abb2bf; /* Light text for dark background */
  padding: 15px;
  border-radius: 0 0 7px 7px; /* Match parent tabs border radius */
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  min-height: 150px;
}

.response-headers-tab {
  padding: 15px;
}

.headers-list {
  list-style-type: none;
  padding: 0;
  font-size: 0.9em;
  line-height: 1.6;
}

.headers-list strong {
  color: #333;
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

.send-button {
  background-color: #007bff;
  color: white;
}

.send-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.response-actions {
  padding: 10px 15px;
  border-bottom: 1px solid #3f4652; /* Separator from body content */
  background-color: #343a40; /* Slightly lighter than body background */
  display: flex;
  justify-content: flex-end;
}

.response-actions .copy-button {
  background-color: #6c757d;
  color: white;
  padding: 6px 12px;
  font-size: 0.85rem;
}

.response-actions .copy-button:hover:not(:disabled) {
  background-color: #5a6268;
}

.api-error-alert {
  margin-top: 15px;
}

.loading-spinner {
  text-align: center;
  padding: 20px;
  color: #555;
}

.close-alert-button { /* For general error alert */
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: inherit;
}
</style>