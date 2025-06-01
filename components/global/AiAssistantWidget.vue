<template>
  <div :class="{ 'is-open': isOpen }" class="ai-assistant-widget">
    <div v-if="isOpen" class="widget-overlay" @click="closeWidget"/>

    <button class="widget-toggle-button" title="AI万能助手" @click="toggleWidget">
      <span v-if="isOpen" class="icon-close">✕</span>
      <span v-else class="icon-robot">🤖</span>
    </button>

    <div v-if="isOpen" class="widget-chat-window">
      <aside class="chat-sidebar">
        <button
            :disabled="isCreatingSession || isLoadingSessions" class="new-session-button"
            @click="handleCreateNewSession">
          {{ isCreatingSession ? '创建中...' : '+ 新建对话' }}
        </button>

        <div class="model-selector-container">
          <label for="model-select">推理模型:</label>
          <select id="model-select" v-model="selectedModel">
            <option value="deepseek-chat">DeepSeek V3 (通用对话)</option>
            <option value="deepseek-reasoner">DeepSeek R1 (推理模型)</option>
          </select>
        </div>

        <div class="chat-history-search-container">
          <label for="chat-history-search">搜索当前对话:</label>
          <div class="search-input-group">
            <input
                id="chat-history-search"
                v-model="chatSearchQuery"
                :disabled="!currentSessionId || messages.length === 0"
                placeholder="输入关键词..."
                type="search"
                @keyup.enter="executeChatSearch"
            >
            <button :disabled="!chatSearchQuery.trim() || !currentSessionId" @click="executeChatSearch">🔎</button>
          </div>
          <div v-if="chatSearchResults.length > 0" class="search-results-nav">
            <span>找到 {{ chatSearchResults.length }} 个匹配</span>
            <button :disabled="currentSearchResultIndex <= 0" @click="navigateToSearchResult('prev')">↑ 上一个</button>
            <button
                :disabled="currentSearchResultIndex >= chatSearchResults.length - 1"
                @click="navigateToSearchResult('next')">↓ 下一个
            </button>
          </div>
          <div
              v-if="searchInProgress && chatSearchResults.length === 0 && chatSearchQuery.trim()"
              class="sidebar-loading">未找到匹配项。
          </div>
        </div>


        <div v-if="isLoadingSessions && sessionsList.length === 0" class="sidebar-loading">加载会话列表...</div>
        <ul v-if="sessionsList.length > 0" class="sessions-list">
          <li
              v-for="session in sessionsList"
              :key="session.id"
              :class="{ active: currentSessionId === session.id }"
              :title="session.title || `对话 ${session.id.substring(0, 6)}`"
              class="session-item"
              @click="handleSelectSession(session.id)"
          >
            <span class="session-title">{{ session.title || `对话 ${session.id.substring(0, 6)}` }}</span>
            <div class="session-meta">
              <span class="session-timestamp">{{ formatRelativeTime(session.updatedAt) }}</span>
              <button
                  :disabled="isDeletingSession === session.id"
                  class="delete-session-button"
                  title="删除此对话"
                  @click.stop="handleDeleteSession(session.id)">
                {{ isDeletingSession === session.id ? '...' : '🗑️' }}
              </button>
            </div>
          </li>
        </ul>
        <p v-if="!isLoadingSessions && sessionsList.length === 0 && !sessionsError" class="no-sessions">
          暂无历史会话
        </p>
        <p v-if="sessionsError" class="sidebar-error">{{ sessionsError }}</p>
      </aside>

      <main class="chat-main-area">
        <header class="chat-header">
          <span>{{ currentSessionTitle || 'AI 万能助手' }}</span>
          <button class="close-chat-button-header" title="关闭" @click="closeWidget">✕</button>
        </header>

        <div class="chat-messages-wrapper">
          <div v-if="isLoadingMessages && messages.length === 0" class="loading-spinner chat-messages-loading">
            加载消息中...
          </div>
          <div v-else-if="!currentSessionId && !isLoadingSessions" class="empty-chat-area">
            请选择一个会话或新建对话开始聊天。
          </div>
          <div v-else ref="chatMessagesContainer" class="chat-messages" @scroll="handleScroll">
            <div
                v-for="(msg) in messages"
                :id="`message-${msg.id}`"
                :key="msg.id"
                :class="[`message-${msg.role}`, { 'highlighted-search-result': isSearchResultHighlighted(msg.id) }]"
                class="message"
            >
              <span class="message-role">{{ msg.role === 'user' ? '你' : '助手' }}: </span>
              <div class="message-content" v-html="formatMessageContent(msg.content, chatSearchQuery)"/>
            </div>
            <div v-if="isLoadingReply" class="message message-assistant">
              <span class="message-role">助手: </span>
              <div class="message-content typing-indicator"><span/><span/><span/></div>
            </div>
          </div>
          <div class="scroll-buttons">
            <button v-if="showScrollTopButton" class="scroll-button" title="滚动到顶部" @click="scrollToTop">↑</button>
            <button v-if="showScrollBottomButton" class="scroll-button" title="滚动到底部" @click="scrollToBottom">↓
            </button>
          </div>
        </div>

        <form class="chat-input-form" @submit.prevent="sendMessage">
          <label
              class="file-upload-button" for="file-upload-input"
              title="上传文件提供上下文 (仅支持 TXT, DOCX)">📎</label>
          <input
              id="file-upload-input"
              accept=".txt,.doc,.docx"
              style="display: none;"
              type="file"
              @change="handleFileUpload"
          >

          <textarea
              ref="messageInput"
              v-model="newMessage"
              :disabled="isLoadingReply || !currentSessionId || isLoadingMessages || isUploadingFile"
              rows="2"
              :placeholder="fileUploadStatus || '问我任何事情...' "
              @keydown.enter.exact.prevent="sendMessage"
              @keydown.enter.shift.exact.prevent="newMessage += '\n'"
          />
          <button
              :disabled="isLoadingReply || (!newMessage.trim() && !uploadedFileContext) || !currentSessionId || isLoadingMessages || isUploadingFile"
              type="submit">
            {{ isLoadingReply ? '发送中...' : (isUploadingFile ? '处理文件中...' : '发送') }}
          </button>
        </form>
        <div v-if="chatError" class="chat-error">{{ chatError }}</div>
      </main>
    </div>
  </div>
</template>

<script setup>
// The <script setup> part remains identical to the one in my previous response (2024-05-25 13:02:17 UTC).
// No changes are needed in the script logic for simply removing XLSX and PDF support
// as the file type validation is primarily handled by the backend based on ALLOWED_MIME_TYPES
// and the frontend's `handleFileUpload` already defers to the backend for extraction.
// The `accept` attribute in the template is the main frontend change for this.
import {ref, nextTick, watch, computed} from 'vue';
import {marked} from 'marked';
import {debounce} from 'lodash-es';
import {formatDistanceToNowStrict} from 'date-fns';
import {zhCN} from 'date-fns/locale';

const isOpen = ref(false);
const messages = ref([]);
const newMessage = ref('');
const isLoadingReply = ref(false);
const chatError = ref('');
const chatMessagesContainer = ref(null);
const messageInput = ref(null);

const sessionsList = ref([]);
const currentSessionId = ref(null);
const isLoadingSessions = ref(false);
const isCreatingSession = ref(false);
const isLoadingMessages = ref(false);
const sessionsError = ref('');
const isDeletingSession = ref(null);

const selectedModel = ref('deepseek-chat');
const showScrollTopButton = ref(false);
const showScrollBottomButton = ref(false);

const chatSearchQuery = ref('');
const chatSearchResults = ref([]);
const currentSearchResultIndex = ref(-1);
const searchInProgress = ref(false);

const uploadedFileContext = ref('');
const uploadedFileName = ref('');
const isUploadingFile = ref(false);
const fileUploadStatus = ref('');


const debouncedUpdateAssistantMessageContent = debounce((messageObject, newContent) => {
  if (messageObject) messageObject.content = newContent;
}, 150);

const currentSessionTitle = computed(() => {
  if (!currentSessionId.value) return '选择或新建对话';
  const session = sessionsList.value.find(s => s.id === currentSessionId.value);
  return session?.title || `对话 ${currentSessionId.value.substring(0, 6)}...`;
});

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    return formatDistanceToNowStrict(new Date(dateString), {addSuffix: true, locale: zhCN});
  } catch (e) {
    return '未知时间';
  }
}

function formatMessageContent(content, query = '') {
  try {
    let htmlContent = marked.parse(content || '', {breaks: true, gfm: true, async: false});
    if (query && query.trim() !== '') {
      const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      htmlContent = htmlContent.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    return htmlContent;
  } catch (e) {
    const esc = (str) => str?.replace(/&/g, "&amp;")?.replace(/</g, "&lt;")?.replace(/>/g, "&gt;") || '';
    return `<p>Markdown渲染出错: ${esc(content)}</p>`;
  }
}

async function fetchSessionsAndSelectLatest(forceSelectLatest = false) {
  if (!isOpen.value && !forceSelectLatest) return;
  isLoadingSessions.value = true;
  sessionsError.value = '';
  try {
    const response = await $fetch('/api/ai/sessions');
    sessionsList.value = response.data || [];
    if (sessionsList.value.length > 0) {
      if (forceSelectLatest || !currentSessionId.value || !sessionsList.value.find(s => s.id === currentSessionId.value)) {
        await handleSelectSession(sessionsList.value[0].id);
      }
    } else if (!currentSessionId.value) {
      await createNewSessionInternal(false);
    }
  } catch (error) {
    sessionsError.value = error.data?.message || "无法加载会话列表。";
    messages.value = [{id: Date.now(), role: 'assistant', content: `无法加载会话列表: ${sessionsError.value}`}];
  } finally {
    isLoadingSessions.value = false;
  }
}

async function handleSelectSession(sessionId) {
  if (!sessionId || isLoadingMessages.value || (currentSessionId.value === sessionId && messages.value.length > 0 && !isLoadingMessages.value)) {
    if (currentSessionId.value === sessionId && messages.value.length > 0) {
      nextTick(() => messageInput.value?.focus());
      return;
    }
  }
  currentSessionId.value = sessionId;
  messages.value = [];
  isLoadingMessages.value = true;
  chatError.value = '';
  chatSearchQuery.value = '';
  chatSearchResults.value = [];
  currentSearchResultIndex.value = -1;
  searchInProgress.value = false;
  try {
    const response = await $fetch(`/api/ai/sessions/${sessionId}`);
    messages.value = (response.data || []).map(msg => ({
      id: msg.id || Date.now() + Math.random(),
      role: msg.role,
      content: msg.content
    }));
    if (messages.value.length === 0 && sessionId && response.data !== null) {
      messages.value.push({id: Date.now(), role: 'assistant', content: '你好！这是一个新的对话，有什么可以帮助你的吗？'});
    }
  } catch (error) {
    chatError.value = `加载会话消息失败: ${error.data?.message || error.message}`;
  } finally {
    isLoadingMessages.value = false;
    scrollToBottom();
    nextTick(() => messageInput.value?.focus());
  }
}

async function createNewSessionInternal(focusInput = true) {
  if (isCreatingSession.value) return;
  isCreatingSession.value = true;
  chatError.value = '';
  sessionsError.value = '';
  try {
    const response = await $fetch('/api/ai/sessions', {
      method: 'POST',
      body: {title: '新对话 ' + (sessionsList.value.length + 1)}
    });
    if (response.success && response.data) {
      sessionsList.value.unshift(response.data);
      await handleSelectSession(response.data.id);
    } else {
      throw new Error(response.message || "创建新会话失败");
    }
  } catch (error) {
    sessionsError.value = `创建新会话失败: ${error.data?.message || error.message}`;
  } finally {
    isCreatingSession.value = false;
    if (focusInput) nextTick(() => messageInput.value?.focus());
  }
}

async function handleCreateNewSession() {
  await createNewSessionInternal(true);
}

async function handleDeleteSession(sessionId) {
  if (!sessionId || isDeletingSession.value === sessionId) return;
  if (window.confirm(`确定要删除这个对话 "${sessionsList.value.find(s => s.id === sessionId)?.title || sessionId.substring(0, 6)}" 吗？此操作不可恢复。`)) {
    isDeletingSession.value = sessionId;
    try {
      await $fetch(`/api/ai/sessions/${sessionId}`, {method: 'DELETE'});
      const deletedIndex = sessionsList.value.findIndex(s => s.id === sessionId);
      if (deletedIndex > -1) sessionsList.value.splice(deletedIndex, 1);

      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null;
        messages.value = [];
        if (sessionsList.value.length > 0) {
          await handleSelectSession(sessionsList.value[0].id);
        } else {
          await createNewSessionInternal(false);
        }
      }
    } catch (error) {
      sessionsError.value = `删除会话失败: ${error.data?.message || error.message}`;
    } finally {
      isDeletingSession.value = null;
    }
  }
}

function toggleWidget() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    fetchSessionsAndSelectLatest(currentSessionId.value === null || sessionsList.value.length === 0);
    nextTick(() => messageInput.value?.focus());
  }
}

function closeWidget() {
  isOpen.value = false;
}

async function sendMessage() {
  if (!currentSessionId.value) {
    chatError.value = "请先选择或创建一个对话。";
    return;
  }
  if ((!newMessage.value.trim() && !uploadedFileContext.value) || isLoadingReply.value || isUploadingFile.value) return;

  let userMessageContent = newMessage.value.trim();
  let displayMessageContent = userMessageContent;

  if (uploadedFileContext.value) {
    const fileContextMarkerStart = `\n\n--- 参考文件 "${uploadedFileName.value}" 内容开始 ---\n`;
    const fileContextMarkerEnd = `\n--- 文件内容结束 ---\n\n`;
    const userQueryPart = userMessageContent || '请基于上述文件内容进行分析或回应。';

    userMessageContent = `${fileContextMarkerStart}${uploadedFileContext.value}${fileContextMarkerEnd}${userQueryPart}`;
    displayMessageContent = `${newMessage.value.trim()} (已附带文件: ${uploadedFileName.value})`;
  }

  messages.value.push({id: Date.now(), role: 'user', content: displayMessageContent});

  let contextForAPI = messages.value.map(msg => {
    if (msg.role === 'user' && msg.content === displayMessageContent && uploadedFileContext.value) {
      return {role: 'user', content: userMessageContent};
    }
    return {role: msg.role, content: msg.content};
  });

  if (selectedModel.value === 'deepseek-reasoner') {
    let firstActualMessageIndex = 0;
    if (contextForAPI.length > 0 && contextForAPI[0].role === 'assistant') {
      const firstUserIndex = contextForAPI.findIndex(msg => msg.role === 'user');
      if (firstUserIndex !== -1) {
        firstActualMessageIndex = firstUserIndex;
      } else {
        chatError.value = `模型 ${selectedModel.value} 需要用户提问来启动对话。`;
        isLoadingReply.value = false;
        messages.value.pop();
        return;
      }
    }
    contextForAPI = contextForAPI.slice(firstActualMessageIndex);
  }

  const finalApiMessages = contextForAPI.slice(-10);

  if (selectedModel.value === 'deepseek-reasoner') {
    if (!finalApiMessages.length || finalApiMessages[0].role !== 'user') {
      chatError.value = `与模型 ${selectedModel.value} 对话时，上下文必须以用户提问开始。`;
      isLoadingReply.value = false;
      return;
    }
    for (let i = 0; i < finalApiMessages.length - 1; i++) {
      if (finalApiMessages[i].role === finalApiMessages[i + 1].role) {
        chatError.value = `模型 ${selectedModel.value} 不支持连续的同角色消息。`;
        isLoadingReply.value = false;
        return;
      }
    }
  }

  newMessage.value = '';
  uploadedFileContext.value = '';
  uploadedFileName.value = '';
  fileUploadStatus.value = '';
  isLoadingReply.value = true;
  chatError.value = '';
  const assistantMessageObject = {id: Date.now(), role: 'assistant', content: ''};
  messages.value.push(assistantMessageObject);
  let accumulatedStreamContent = '';
  scrollToBottom();
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages: finalApiMessages, sessionId: currentSessionId.value, model: selectedModel.value})
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => {
        return {message: `服务错误: ${response.status}`}
      });
      throw new Error(errData.message);
    }
    if (!response.body) throw new Error('AI响应体为空');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let reading = true;
    while (reading) {
      const {done, value} = await reader.read();
      if (done) {
        reading = false;
        debouncedUpdateAssistantMessageContent.flush();
        break;
      }
      const chunk = decoder.decode(value, {stream: true});
      accumulatedStreamContent += chunk;
      debouncedUpdateAssistantMessageContent(assistantMessageObject, accumulatedStreamContent);
    }
  } catch (error) {
    chatError.value = error.message || '抱歉，与AI助手连接时发生未知错误。';
    assistantMessageObject.content = `⚠️ ${chatError.value}`;
  } finally {
    isLoadingReply.value = false;
    debouncedUpdateAssistantMessageContent.flush();
    scrollToBottom();
    nextTick(() => messageInput.value?.focus());
    const sessionIdx = sessionsList.value.findIndex(s => s.id === currentSessionId.value);
    if (sessionIdx !== -1) {
      const updatedSession = {...sessionsList.value[sessionIdx], updatedAt: new Date().toISOString()};
      sessionsList.value.splice(sessionIdx, 1);
      sessionsList.value.unshift(updatedSession);
    }
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight;
    }
  });
}

function handleScroll() {
  if (!chatMessagesContainer.value) return;
  const {scrollTop, scrollHeight, clientHeight} = chatMessagesContainer.value;
  showScrollTopButton.value = scrollTop > 200;
  showScrollBottomButton.value = scrollHeight - scrollTop - clientHeight > 200;
}

function scrollToTop() {
  chatMessagesContainer.value?.scrollTo({top: 0, behavior: 'smooth'});
}

function executeChatSearch() {
  if (!chatSearchQuery.value.trim() || !currentSessionId.value) {
    chatSearchResults.value = [];
    currentSearchResultIndex.value = -1;
    searchInProgress.value = !!chatSearchQuery.value.trim();
    return;
  }
  searchInProgress.value = true;
  const query = chatSearchQuery.value.toLowerCase();
  const results = [];
  messages.value.forEach((msg) => {
    if (msg.content && msg.content.toLowerCase().includes(query)) {
      results.push({messageId: msg.id, domId: `message-${msg.id}`});
    }
  });
  chatSearchResults.value = results;
  currentSearchResultIndex.value = -1;
  if (results.length > 0) navigateToSearchResult('next');
}

function navigateToSearchResult(direction) {
  if (chatSearchResults.value.length === 0) return;
  if (direction === 'next') currentSearchResultIndex.value = (currentSearchResultIndex.value + 1) % chatSearchResults.value.length;
  else if (direction === 'prev') currentSearchResultIndex.value = (currentSearchResultIndex.value - 1 + chatSearchResults.value.length) % chatSearchResults.value.length;

  const targetResult = chatSearchResults.value[currentSearchResultIndex.value];
  if (targetResult) {
    const element = document.getElementById(targetResult.domId);
    element?.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
}

function isSearchResultHighlighted(messageId) {
  if (chatSearchResults.value.length === 0 || currentSearchResultIndex.value === -1) return false;
  const currentResult = chatSearchResults.value[currentSearchResultIndex.value];
  return currentResult && currentResult.messageId === messageId;
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const originalFileName = file.name;
  uploadedFileName.value = originalFileName;
  uploadedFileContext.value = '';
  isUploadingFile.value = true;
  fileUploadStatus.value = `正在上传并处理 ${originalFileName}...`;
  chatError.value = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await $fetch('/api/ai/extract-text', {
      method: 'POST',
      body: formData,
    });

    if (response.success && typeof response.extractedText === 'string') {
      uploadedFileContext.value = response.extractedText;
      fileUploadStatus.value = `文件 "${response.fileName}" 内容已准备好。`;
      messageInput.value?.focus();
    } else {
      throw new Error(response.message || "提取文件内容失败或返回格式不正确。");
    }
  } catch (err) {
    chatError.value = `处理文件 "${originalFileName}" 失败: ${err.data?.message || err.message || '未知错误'}`;
    uploadedFileName.value = '';
    fileUploadStatus.value = '';
  } finally {
    isUploadingFile.value = false;
    if (event.target) event.target.value = '';
  }
}

watch(messages, () => {
  scrollToBottom();
  handleScroll();
}, {deep: true});
watch(isOpen, (newValue) => {
  if (newValue) {
    if (!currentSessionId.value || sessionsList.value.length === 0) {
      fetchSessionsAndSelectLatest(true);
    }
    nextTick(() => messageInput.value?.focus());
  }
});
</script>

<style scoped>
.ai-assistant-widget {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
}

.widget-toggle-button {
  background-color: var(--color-primary, #007bff);
  color: white;
  border: none;
  border-radius: 12px;
  width: 56px;
  height: 56px;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out;
  z-index: 1002;
}

.ai-assistant-widget.is-open .widget-toggle-button {
  background-color: var(--color-secondary, #6c757d);
  transform: rotate(45deg);
}

.widget-toggle-button:hover {
  background-color: var(--color-primary-hover, #0056b3);
  transform: scale(1.05);
}

.ai-assistant-widget.is-open .widget-toggle-button:hover {
  background-color: #5a6268;
}

.widget-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1001;
}

.widget-chat-window {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 850px;
  height: 80vh;
  max-height: 700px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  z-index: 1002;
}

.chat-sidebar {
  width: 300px;
  min-width: 250px;
  background-color: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  padding: 15px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.model-selector-container {
  margin-bottom: 15px;
  font-size: 0.85rem;
}

.model-selector-container label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: 500;
}

.model-selector-container select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ced4da;
  background-color: #fff;
  font-size: 0.85rem;
}

.new-session-button {
  background-color: #fff;
  color: var(--color-primary, #007bff);
  border: 1px solid var(--color-primary, #007bff);
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 15px;
  font-size: 0.9rem;
  text-align: center;
  transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
}

.new-session-button:disabled {
  background-color: #eee;
  color: #aaa;
  border-color: #ddd;
  cursor: not-allowed;
}

.new-session-button:hover:not(:disabled) {
  background-color: #e3f2fd;
  color: #0056b3;
}

.sidebar-loading, .no-sessions, .sidebar-error {
  text-align: center;
  color: #6c757d;
  font-size: 0.85rem;
  padding: 10px 0;
}

.sidebar-error {
  color: #dc3545;
}

.sessions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex-grow: 1;
  overflow-y: auto;
}

.session-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.session-item:hover {
  background-color: #e9ecef;
}

.session-item.active {
  background-color: #d4eaff;
  color: #0056b3;
  font-weight: 600;
  border-left: 3px solid var(--color-primary, #007bff);
  padding-left: 9px;
}

.session-title {
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  margin-bottom: 3px;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.session-timestamp {
  font-size: 0.7em;
  color: #6c757d;
}

.delete-session-button {
  background: none;
  border: none;
  color: #adb5bd;
  cursor: pointer;
  font-size: 0.9em;
  padding: 2px 4px;
  margin-left: 5px;
  opacity: 0.7;
  transition: color 0.2s, opacity 0.2s;
}

.delete-session-button:hover {
  color: #dc3545;
  opacity: 1;
}

.delete-session-button:disabled {
  color: #e0e0e0;
  cursor: not-allowed;
}

.chat-main-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #fff;
}

.chat-header {
  background-color: #f8f9fa;
  padding: 15px 20px;
  font-size: 1rem;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-chat-button-header {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #888;
  opacity: 0.7;
  transition: opacity 0.2s ease-in-out;
}

.close-chat-button-header:hover {
  opacity: 1;
}

.chat-messages-wrapper {
  flex-grow: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-messages-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  color: #6c757d;
}

.empty-chat-area {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
  text-align: center;
}

.chat-messages {
  flex-grow: 1;
  padding: 15px;
  padding-bottom: 50px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ccc #f0f0f0;
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background-color: #f0f0f0;
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background-color: #bbb;
}

.message {
  margin-bottom: 12px;
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 80%;
  word-wrap: break-word;
  font-size: 0.9rem;
  line-height: 1.6;
  clear: both;
}

.message.highlighted-search-result {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 8px;
}

.message-content :deep(mark.search-highlight) {
  background-color: #fff8b0;
  padding: 0.1em;
  border-radius: 2px;
}

.message-role {
  font-weight: 500;
  margin-bottom: 5px;
  display: block;
  font-size: 0.8rem;
  color: #777;
}

.message-user {
  background-color: var(--color-primary, #007bff);
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 6px;
  float: right;
}

.message-user .message-role {
  display: none;
}

.message-assistant {
  background-color: #f0f0f0;
  color: #333;
  margin-right: auto;
  border-bottom-left-radius: 6px;
  float: left;
}

.message-content :deep(p:first-child) {
  margin-top: 0;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(pre) {
  background-color: #282c34;
  color: #abb2bf;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.8rem;
  border: 1px solid #3e4451;
  margin: 0.8em 0;
}

.message-content :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 85%;
}

.message-content :deep(pre code) {
  background-color: transparent !important;
  padding: 0 !important;
  color: inherit !important;
  font-size: 1em !important;
  border-radius: 0;
  border: none;
}

.message-content :deep(ul), .message-content :deep(ol) {
  padding-left: 20px;
  margin: 0.5em 0;
}

.chat-input-form {
  display: flex;
  padding: 10px 15px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  align-items: flex-end;
}

.file-upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #d0d0d0;
  background-color: #fff;
  border-radius: 50%;
  cursor: pointer;
  margin-right: 8px;
  font-size: 18px;
  color: #555;
  transition: background-color 0.2s, color 0.2s;
  flex-shrink: 0;
}

.file-upload-button:hover {
  background-color: #f0f0f0;
  color: var(--color-primary, #007bff);
}

.chat-input-form textarea {
  flex-grow: 1;
  padding: 8px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  margin-right: 10px;
  resize: none;
  font-size: 0.9rem;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
  min-height: 38px;
}

.chat-input-form textarea:focus {
  outline: none;
  border-color: var(--color-primary, #007bff);
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, .25);
}

.chat-input-form button {
  background-color: var(--color-primary, #007bff);
  color: white;
  border: none;
  padding: 0 18px;
  height: 38px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background-color 0.2s ease-in-out;
  flex-shrink: 0;
}

.chat-input-form button:hover {
  background-color: var(--color-primary-hover, #0056b3);
}

.chat-input-form button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.chat-error {
  padding: 10px 15px;
  font-size: 0.85rem;
  color: #d9534f;
  text-align: center;
  background-color: #fdf7f7;
  border-top: 1px solid #e0e0e0;
}

.typing-indicator {
  display: flex;
  align-items: center;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: #bbb;
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1.0);
  }
}

.scroll-buttons {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.scroll-button {
  background-color: rgba(108, 117, 125, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.scroll-button:hover {
  background-color: rgba(90, 98, 104, 0.9);
}

.chat-history-search-container {
  padding: 10px 0;
  margin-bottom: 10px;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}

.chat-history-search-container label {
  display: block;
  font-size: 0.8rem;
  color: #555;
  margin-bottom: 5px;
  font-weight: 500;
}

.search-input-group {
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
}

.search-input-group input[type="search"] {
  flex-grow: 1;
  padding: 6px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.85rem;
}

.search-input-group button {
  padding: 6px 10px;
  font-size: 0.85rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-input-group button:hover:not(:disabled) {
  background-color: #5a6268;
}

.search-input-group button:disabled {
  background-color: #ccc;
}

.search-results-nav {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #555;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-results-nav button {
  font-size: 0.75rem;
  padding: 3px 6px;
  margin-left: 5px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
}

.search-results-nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

</style>