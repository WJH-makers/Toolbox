<template>
  <div :class="{ 'is-open': isOpen }" class="ai-assistant-widget">
    <transition name="fade">
      <div v-if="isOpen" class="widget-overlay" @click="closeWidget"/>
    </transition>

    <button class="widget-toggle-button" title="AI 助手" @click="toggleWidget">
      <transition name="scale" mode="out-in">
        <svg v-if="!isOpen" class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
          <path fill="white" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <svg v-else class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
          <path fill="white"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </transition>
    </button>

    <transition name="widget-zoom">
      <div v-if="isOpen" class="widget-window">

        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="brand">
              <span class="brand-logo">✨</span>
              <span class="brand-name">AI Assistant</span>
            </div>
            <button :disabled="isCreatingSession" class="btn-new-chat" @click="handleCreateNewSession">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>新对话</span>
            </button>
          </div>

          <div class="sidebar-list custom-scroll">
            <div class="list-label">历史记录</div>

            <div v-if="isLoadingSessions" class="loading-state">
              <div class="spinner-mini"></div>
            </div>

            <ul v-else-if="historySessions.length > 0" class="session-ul">
              <li v-for="session in historySessions"
                  :key="session.id"
                  :class="{ active: currentSessionId === session.id }"
                  class="session-li"
                  @click="handleSelectSession(session.id)">
                <div class="session-content">
                  <div class="session-title">{{ session.title || '未命名对话' }}</div>
                  <div class="session-date">{{ formatRelativeTime(session.updatedAt) }}</div>
                </div>
                <button class="btn-delete" @click.stop="handleDeleteSession(session.id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </li>
            </ul>

            <div v-else class="empty-state-sidebar">
              暂无历史
            </div>
          </div>

          <div class="sidebar-footer">
            <div class="model-select-box">
              <svg class="model-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                <path d="M12 2a10 10 0 0 1 10 10"></path>
                <path d="M12 22c5.523 0 10-4.477 10-10"></path>
              </svg>
              <select v-model="selectedModel">
                <option value="deepseek-chat">DeepSeek V3</option>
                <option value="deepseek-reasoner">DeepSeek R1</option>
              </select>
              <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </aside>

        <main class="chat-area">
          <header class="chat-header">
            <div class="header-info">
              <span class="current-title">{{ currentSessionTitle }}</span>
              <span v-if="selectedModel" class="model-tag">{{ selectedModel === 'deepseek-chat' ? 'V3' : 'R1' }}</span>
            </div>
          </header>

          <div class="messages-container custom-scroll" ref="chatMessagesContainer" @scroll="handleScroll">
            <div v-if="!currentSessionId" class="welcome-screen">
              <div class="welcome-icon">👋</div>
              <h3>有什么可以帮你的吗？</h3>
            </div>

            <div v-else class="message-list">
              <div v-for="(msg, index) in messages" :key="msg.id" :class="['message-row', `role-${msg.role}`]">
                <div class="avatar">
                  {{ msg.role === 'user' ? '我' : 'AI' }}
                </div>
                <div class="bubble">
                  <MessageRenderer :content="msg.content"/>
                </div>
              </div>

              <div v-if="isLoadingReply" class="message-row role-assistant">
                <div class="avatar">AI</div>
                <div class="bubble typing">
                  <div class="dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span class="text">AI 正在思考...</span>
                </div>
              </div>

              <div v-if="chatError" class="error-notice">
                {{ chatError }}
              </div>
            </div>
          </div>

          <footer class="input-footer">
            <form class="input-box" @submit.prevent="sendMessage()">
              <textarea
                  ref="messageInput"
                  v-model="newMessage"
                  :disabled="isLoadingReply || !currentSessionId"
                  placeholder="输入消息... (Shift+Enter 换行)"
                  @input="autoResizeTextarea"
                  @keydown.enter.exact.prevent="sendMessage()"
                  @keydown.enter.shift.exact.prevent="newMessage += '\n'"
              ></textarea>
              <button type="submit" :disabled="!newMessage.trim() || isLoadingReply || !currentSessionId"
                      class="btn-send">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </footer>
        </main>
      </div>
    </transition>
  </div>
</template>

<script setup>
import {ref, nextTick, watch, computed} from 'vue';
import {debounce} from 'lodash-es';
import {formatDistanceToNowStrict} from 'date-fns';
import {zhCN} from 'date-fns/locale';
import MessageRenderer from './MessageRenderer.vue';

// --- 状态管理 ---
const isOpen = ref(false);
const messages = ref([]);
const newMessage = ref('');
const isLoadingReply = ref(false);
const currentSessionId = ref(null);
const isCreatingSession = ref(false);
const selectedModel = ref('deepseek-chat');
const historySessions = ref([]);
const isLoadingSessions = ref(false);
const chatError = ref('');
const userHasScrolledUp = ref(false);

// --- DOM Refs ---
const chatMessagesContainer = ref(null);
const messageInput = ref(null);

// --- 计算属性 ---
const currentSessionTitle = computed(() => {
  if (!currentSessionId.value) return 'AI 助手';
  const s = historySessions.value.find(x => x.id === currentSessionId.value);
  return s?.title || '新对话';
});

// --- 工具函数 ---
const formatRelativeTime = (date) => {
  try {
    return formatDistanceToNowStrict(new Date(date), {addSuffix: true, locale: zhCN});
  } catch {
    return '';
  }
};

const autoResizeTextarea = () => {
  nextTick(() => {
    if (!messageInput.value) return;
    messageInput.value.style.height = 'auto';
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px';
  });
};

const scrollToBottom = (force = false) => {
  if (!userHasScrolledUp.value || force) {
    nextTick(() => {
      if (chatMessagesContainer.value) {
        chatMessagesContainer.value.scrollTo({top: chatMessagesContainer.value.scrollHeight, behavior: 'smooth'});
      }
    });
  }
};

const handleScroll = debounce(() => {
  if (!chatMessagesContainer.value) return;
  const {scrollTop, clientHeight, scrollHeight} = chatMessagesContainer.value;
  userHasScrolledUp.value = scrollTop + clientHeight < scrollHeight - 50;
}, 100);

// --- 业务逻辑 ---
async function fetchSessions() {
  isLoadingSessions.value = true;
  try {
    const res = await fetch('/api/ai/sessions');
    const data = await res.json();
    historySessions.value = data.data?.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) || [];
  } catch (e) {
    console.error(e);
  } finally {
    isLoadingSessions.value = false;
  }
}

async function handleSelectSession(id) {
  if (currentSessionId.value === id) return;
  currentSessionId.value = id;
  messages.value = [];
  chatError.value = '';

  try {
    const res = await fetch(`/api/ai/sessions/${id}`);
    const data = await res.json();
    messages.value = (data.data || []).map(m => ({...m, id: m.id || Date.now()}));
    nextTick(() => scrollToBottom(true));
  } catch (e) {
    chatError.value = '加载失败';
  }
}

async function handleCreateNewSession() {
  if (isCreatingSession.value) return;
  isCreatingSession.value = true;
  try {
    const res = await fetch('/api/ai/sessions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({title: '新对话'})
    });
    const data = await res.json();
    historySessions.value.unshift(data.data);
    await handleSelectSession(data.data.id);
  } catch (e) {
    console.error(e);
  } finally {
    isCreatingSession.value = false;
  }
}

async function handleDeleteSession(id) {
  if (!confirm('确认删除？')) return;
  try {
    await fetch(`/api/ai/sessions/${id}`, {method: 'DELETE'});
    historySessions.value = historySessions.value.filter(s => s.id !== id);
    if (currentSessionId.value === id) {
      currentSessionId.value = null;
      messages.value = [];
    }
  } catch (e) {
    console.error(e);
  }
}

async function sendMessage() {
  const content = newMessage.value.trim();
  if (!content || isLoadingReply.value || !currentSessionId.value) return;

  newMessage.value = '';
  autoResizeTextarea();

  messages.value.push({id: Date.now(), role: 'user', content});
  isLoadingReply.value = true;
  chatError.value = '';
  userHasScrolledUp.value = false;
  scrollToBottom();

  try {
    const apiMsgs = messages.value.map(m => ({role: m.role, content: m.content}));
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages: apiMsgs, sessionId: currentSessionId.value, model: selectedModel.value})
    });

    if (!res.ok) throw new Error('API Error');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, {stream: true});
    }

    messages.value.push({id: Date.now() + 1, role: 'assistant', content: fullText});

  } catch (e) {
    chatError.value = e.message || '请求出错';
  } finally {
    isLoadingReply.value = false;
    nextTick(() => scrollToBottom(true));
  }
}

function toggleWidget() {
  isOpen.value = !isOpen.value;
  if (isOpen.value && historySessions.value.length === 0) fetchSessions();
}

function closeWidget() {
  isOpen.value = false;
}

watch(isOpen, (v) => {
  if (v) fetchSessions();
});
</script>

<style scoped>
/* --- 变量定义 --- */
:root {
  --primary: #2563EB; /* 品牌蓝 */
  --primary-dark: #1D4ED8;
  --bg-window: #ffffff; /* 窗口背景 */
  --bg-sidebar: #F8FAFC; /* 侧边栏背景 */
  --border: #E2E8F0; /* 边框颜色 */
  --text-main: #0F172A; /* 主文字 */
  --text-sub: #64748B; /* 副文字 */
  --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
  --radius: 16px;
}

/* 基础容器 */
.ai-assistant-widget {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-main);
}

/* 遮罩 */
.widget-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
  z-index: 0;
}

/* 开关按钮 */
.widget-toggle-button {
  position: relative;
  z-index: 10001; /* 保证在最顶层 */
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #4F46E5);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.widget-toggle-button:hover {
  transform: scale(1.05);
}

/* 主窗口 - 修复核心：绝对居中定位 */
.widget-window {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* 核心：屏幕正中间 */
  width: 900px;
  height: 700px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--bg-window);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  overflow: hidden;
  z-index: 10000; /* 位于遮罩之上 */
}

/* --- 侧边栏 --- */
.sidebar {
  width: 260px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-weight: 700;
  font-size: 16px;
  color: var(--text-main);
}

.btn-new-chat {
  width: 100%;
  padding: 10px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.btn-new-chat:hover {
  background: var(--primary-dark);
}

/* 列表 */
.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.list-label {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 8px;
  font-weight: 600;
}

.session-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.session-li {
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
  border: 1px solid transparent;
}

.session-li:hover {
  background: rgba(0, 0, 0, 0.03);
}

.session-li.active {
  background: white;
  border-color: #BFDBFE;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.session-li.active .session-title {
  color: var(--primary);
  font-weight: 500;
}

.session-content {
  overflow: hidden;
  flex: 1;
}

.session-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main);
}

.session-date {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 2px;
}

.btn-delete {
  background: none;
  border: none;
  color: #94A3B8;
  padding: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.btn-delete:hover {
  color: #EF4444;
}

.session-li:hover .btn-delete {
  opacity: 1;
}

/* 底部模型选择 */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}

.model-select-box {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 10px;
  height: 36px;
}

.model-select-box select {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
  appearance: none;
}

.model-icon, .chevron {
  color: var(--text-sub);
  pointer-events: none;
}

.model-icon {
  margin-right: 8px;
}

/* --- 聊天区 --- */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
}

.chat-header {
  height: 60px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.current-title {
  font-weight: 600;
  font-size: 15px;
  margin-right: 8px;
}

.model-tag {
  font-size: 11px;
  background: #F1F5F9;
  color: var(--text-sub);
  padding: 2px 6px;
  border-radius: 4px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #F9FAFB;
}

/* 消息气泡 */
.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.role-user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.role-user .avatar {
  background: #CBD5E1;
  color: white;
}

.role-assistant .avatar {
  background: linear-gradient(135deg, var(--primary), #4F46E5);
  color: white;
}

.bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.role-user .bubble {
  background: var(--primary);
  color: white;
  border-top-right-radius: 2px;
}

.role-assistant .bubble {
  background: white;
  border: 1px solid var(--border);
  color: var(--text-main);
  border-top-left-radius: 2px;
}

/* 思考动画 */
.bubble.typing {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-sub);
  font-size: 13px;
}

.dots {
  display: flex;
  gap: 4px;
}

.dots span {
  width: 4px;
  height: 4px;
  background: var(--text-sub);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 欢迎页 */
.welcome-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* 输入区 */
.input-footer {
  padding: 20px;
  border-top: 1px solid var(--border);
  background: white;
}

.input-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px;
  transition: all 0.2s;
}

.input-box:focus-within {
  background: white;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  resize: none;
  max-height: 120px;
  padding: 8px;
}

.btn-send {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: var(--primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条 */
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}

/* 动画定义 - 适配居中缩放 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.widget-zoom-enter-active, .widget-zoom-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.widget-zoom-enter-from, .widget-zoom-leave-to {
  opacity: 0;
  transform: translate(-50%, -45%) scale(0.95); /* 居中状态下的缩放起点 */
}

.scale-enter-active, .scale-leave-active {
  transition: all 0.2s;
}

.scale-enter-from, .scale-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>