<template>
  <div :class="{ 'is-open': isOpen }" class="ai-assistant-widget">
    <div v-if="isOpen" class="widget-overlay" @click="closeWidget"/>

    <button class="widget-toggle-button" title="AI万能助手" @click="toggleWidget">
      <transition name="icon-fade" mode="out-in">
        <span v-if="isOpen" class="icon-close">✕</span>
        <svg v-else class="icon-new-chat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28"
             height="28">
          <path fill="black"
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 9h-2v2h-2v-2H9V9h2V7h2v2h2v2z"/>
        </svg>
      </transition>
    </button>

    <transition name="widget-fade">
      <div v-if="isOpen" class="widget-chat-window">
        <aside class="chat-sidebar">
          <div class="sidebar-header">
            <button
                :disabled="isCreatingSession" class="new-session-button"
                @click="handleCreateNewSession">
              <span>+ 新建对话</span>
            </button>
            <div class="model-selector-container">
              <select id="model-select" v-model="selectedModel">
                <option value="deepseek-chat">DeepSeek V3 (通用对话)</option>
                <option value="deepseek-reasoner">DeepSeek R1 (推理模型)</option>
              </select>
            </div>
          </div>
          <div class="sidebar-content">
            <div class="history-section">
              <h3 class="category-title">历史会话</h3>
              <div v-if="isLoadingSessions" class="sidebar-loading"><span>加载中...</span></div>
              <ul v-if="historySessions.length > 0" class="sessions-list">
                <li
                    v-for="session in historySessions"
                    :key="session.id"
                    :class="{ active: currentSessionId === session.id }"
                    class="session-item"
                    @click="handleSelectSession(session.id)">
                  <span class="session-title">{{ session.title || `对话 ${session.id.substring(0, 6)}` }}</span>
                  <button
                      :disabled="isDeletingSession === session.id"
                      class="delete-session-button"
                      title="删除此对话"
                      @click.stop="handleDeleteSession(session.id)">
                    <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </li>
              </ul>
              <p v-if="!isLoadingSessions && historySessions.length === 0 && !sessionsError" class="no-sessions">
                暂无历史</p>
            </div>
          </div>
        </aside>
        <main class="chat-main-area">
          <header class="chat-header">
            <span class="header-title">{{ currentSessionTitle }}</span>
          </header>
          <div class="chat-messages-wrapper">
            <div v-if="!currentSessionId" class="empty-chat-area">
              <p>点击“新建对话”或选择历史会话开始</p>
            </div>
            <div v-else ref="chatMessagesContainer" class="chat-messages" @scroll="handleScroll">
              <div v-for="(msg, index) in messages" :key="msg.id" :class="[`message-role-${msg.role}`]" class="message">
                <div class="message-bubble"
                     :class="{'first-in-group': index === 0 || messages[index - 1].role !== msg.role}">
                  <MessageRenderer :content="msg.content"/>
                </div>
              </div>
            </div>
          </div>
          <footer class="chat-input-area">
            <form class="chat-input-form" @submit.prevent="sendMessage()">
              <textarea
                  ref="messageInput"
                  v-model="newMessage"
                  :disabled="isLoadingReply || !currentSessionId"
                  placeholder="问我任何事情... (Shift + Enter 换行)"
                  rows="1"
                  @input="autoResizeTextarea"
                  @keydown.enter.exact.prevent="sendMessage()"
                  @keydown.enter.shift.exact.prevent="newMessage += '\n'"/>
              <button
                  :disabled="isLoadingReply || !currentSessionId || !newMessage.trim()"
                  class="action-button send-button"
                  type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
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

// --- State ---
const isOpen = ref(false);
const messages = ref([]);
const newMessage = ref('');
const isLoadingReply = ref(false);
const currentSessionId = ref(null);
const isCreatingSession = ref(false);
const selectedModel = ref('deepseek-chat');

const chatMessagesContainer = ref(null);
const messageInput = ref(null);
const userHasScrolledUp = ref(false);

const historySessions = ref([]);
const isLoadingSessions = ref(false);
const sessionsError = ref('');
const isDeletingSession = ref(null);
const chatError = ref('');

// --- Computed ---
const currentSessionTitle = computed(() => {
  if (!currentSessionId.value) return 'AI 万能助手';
  const session = historySessions.value.find(s => s.id === currentSessionId.value);
  return session?.title || '对话...';
});

// --- UI Helper Functions ---
const autoResizeTextarea = () => {
  nextTick(() => {
    if (!messageInput.value) return;
    messageInput.value.style.height = 'auto';
    const scrollHeight = messageInput.value.scrollHeight;
    const maxHeight = 120;
    messageInput.value.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  });
};

const scrollToBottom = (instant = false) => {
  if (!userHasScrolledUp.value || instant) {
    nextTick(() => {
      if (chatMessagesContainer.value) {
        chatMessagesContainer.value.scrollTo({
          top: chatMessagesContainer.value.scrollHeight,
          behavior: instant ? 'auto' : 'smooth'
        });
      }
    });
  }
};

const handleScroll = debounce(() => {
  if (!chatMessagesContainer.value) return;
  const {scrollTop, scrollHeight, clientHeight} = chatMessagesContainer.value;
  const nearBottom = scrollTop + clientHeight >= scrollHeight - 50;
  userHasScrolledUp.value = !nearBottom;
}, 100);

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    return formatDistanceToNowStrict(new Date(dateString), {addSuffix: true, locale: zhCN});
  } catch {
    return '未知时间';
  }
}

// --- Session Management ---
async function fetchSessions() {
  isLoadingSessions.value = true;
  sessionsError.value = '';
  try {
    const response = await $fetch('/api/ai/sessions');
    historySessions.value = response.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) || [];
  } catch (error) {
    sessionsError.value = error.data?.message || "无法加载历史会话。";
  } finally {
    isLoadingSessions.value = false;
  }
}

async function handleSelectSession(sessionId, focus = true) {
  if (!sessionId || currentSessionId.value === sessionId) return;

  currentSessionId.value = sessionId;
  isLoadingMessages.value = true;
  chatError.value = '';
  try {
    const response = await $fetch(`/api/ai/sessions/${sessionId}`);
    messages.value = (response.data || []).map(msg => ({...msg, id: msg.id || Date.now()}));
  } catch (error) {
    chatError.value = `加载会话失败: ${error.data?.message || error.message}`;
  } finally {
    isLoadingMessages.value = false;
    userHasScrolledUp.value = false;
    scrollToBottom(true);
    if (focus) nextTick(() => messageInput.value?.focus());
  }
}

async function createNewSessionInternal({title, initialMessage = null}) {
  if (isCreatingSession.value) return;
  isCreatingSession.value = true;
  chatError.value = '';
  try {
    const response = await $fetch('/api/ai/sessions', {method: 'POST', body: {title}});
    const newSession = response.data;
    if (!newSession) throw new Error("创建会话失败");

    historySessions.value.unshift(newSession);
    await handleSelectSession(newSession.id, false);

    if (initialMessage) {
      await sendMessage(initialMessage);
    }
  } catch (error) {
    sessionsError.value = `创建失败: ${error.data?.message || error.message}`;
  } finally {
    isCreatingSession.value = false;
    if (!initialMessage) nextTick(() => messageInput.value?.focus());
  }
}

function handleCreateNewSession() {
  createNewSessionInternal({title: '新对话'});
}

// This function is kept for potential future use but is not called from the UI anymore.
function handleSelectTool(tool) {
  createNewSessionInternal({title: tool.name, initialMessage: tool.prompt, focus: false});
}

async function handleDeleteSession(sessionId) {
  if (!sessionId || isDeletingSession.value === sessionId) return;
  const confirmed = window.confirm(`确定要删除对话 "${historySessions.value.find(s => s.id === sessionId)?.title}" 吗？`);
  if (!confirmed) return;

  isDeletingSession.value = sessionId;
  try {
    await $fetch(`/api/ai/sessions/${sessionId}`, {method: 'DELETE'});
    const deletedIndex = historySessions.value.findIndex(s => s.id === sessionId);
    if (deletedIndex > -1) historySessions.value.splice(deletedIndex, 1);
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null;
      messages.value = [];
    }
  } catch (error) {
    sessionsError.value = `删除会话失败: ${error.data?.message || error.message}`;
  } finally {
    isDeletingSession.value = null;
  }
}

function toggleWidget() {
  isOpen.value = !isOpen.value;
  if (isOpen.value && historySessions.value.length === 0) {
    fetchSessions();
  }
}

function closeWidget() {
  isOpen.value = false;
}

async function sendMessage(presetMessage = null) {
  const contentToSend = presetMessage || newMessage.value.trim();
  if (!currentSessionId.value || isLoadingReply.value || !contentToSend) return;

  if (!presetMessage) {
    newMessage.value = '';
    autoResizeTextarea();
  }

  messages.value.push({id: Date.now(), role: 'user', content: contentToSend});
  isLoadingReply.value = true;
  chatError.value = '';
  userHasScrolledUp.value = false;
  scrollToBottom();

  const finalApiMessages = messages.value.slice(-10).map(m => ({role: m.role, content: m.content}));
  const assistantMessageObject = {id: Date.now() + 1, role: 'assistant', content: ''};
  messages.value.push(assistantMessageObject);

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages: finalApiMessages, sessionId: currentSessionId.value, model: selectedModel.value})
    });
    if (!response.ok) throw new Error((await response.json()).message || 'API 请求失败');
    if (!response.body) throw new Error('响应体为空');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, {stream: true});
      assistantMessageObject.content += chunk;
      scrollToBottom();
    }
  } catch (error) {
    assistantMessageObject.content = `⚠️ 抱歉，请求出错: ${error.message}`;
  } finally {
    isLoadingReply.value = false;
    nextTick(() => messageInput.value?.focus());
    const sessionIdx = historySessions.value.findIndex(s => s.id === currentSessionId.value);
    if (sessionIdx > -1) {
      const session = historySessions.value.splice(sessionIdx, 1)[0];
      session.updatedAt = new Date().toISOString();
      historySessions.value.unshift(session);
    }
  }
}

onMounted(() => {
  if (isOpen.value) {
    fetchSessions();
  }
});

watch(messages, () => {
  if (!userHasScrolledUp.value) {
    scrollToBottom();
  }
}, {deep: true});
</script>

<style scoped>
/* Using the "Modern Gradient & Glassmorphism" theme */
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --bg-primary: rgba(255, 255, 255, 0.7);
  --bg-secondary: rgba(245, 245, 247, 0.5);
  --bg-tertiary-hover: rgba(0, 0, 0, 0.04);
  --border-color: rgba(0, 0, 0, 0.08);
  --text-primary: #ffffff;
  --text-secondary: #000000;
  --text-tertiary: #9CA3AF;
  --accent-gradient: linear-gradient(135deg, #3B82F6, #8B5CF6);
  --accent-gradient-hover: linear-gradient(135deg, #60A5FA, #A78BFA);
  --accent-active-bg: rgba(59, 130, 246, 0.1);
  --accent-active-border: #3B82F6;
  --overlay-bg: rgba(17, 24, 39, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
}

.ai-assistant-widget {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 2000;
  font-family: var(--font-primary);
}

.widget-toggle-button {
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
  box-shadow: var(--shadow-lg);
}

.widget-toggle-button:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 15px 25px -5px rgba(59, 130, 246, 0.3);
}

.widget-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--overlay-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 2001;
}

.widget-chat-window {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 1024px;
  height: 88vh;
  max-height: 768px;
  background-color: var(--bg-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  overflow: hidden;
  z-index: 2002;
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
}

.chat-sidebar {
  width: 320px;
  min-width: 300px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.new-session-button {
  width: 100%;
  padding: 10px;
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.new-session-button:hover {
  background: var(--accent-gradient-hover);
  box-shadow: var(--shadow-md);
}

.model-selector-container select {
  width: 100%;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
}

.sidebar-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0.5rem 1rem;
}

.category-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-tertiary);
  margin: 1.5rem 0 0.75rem 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tool-list, .sessions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tool-item, .session-item {
  padding: 0.75rem;
  margin-bottom: 0.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.tool-item:hover, .session-item:hover {
  background-color: var(--bg-tertiary-hover);
  transform: translateX(4px);
}

.session-item.active {
  background-color: var(--accent-active-bg);
}

.session-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  bottom: 25%;
  width: 4px;
  background-color: var(--accent-active-border);
  border-radius: 0 4px 4px 0;
}

.tool-name, .session-title {
  font-weight: 500;
  color: var(--text-primary);
}

.tool-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.delete-session-button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.2s;
}

.session-item:hover .delete-session-button {
  opacity: 1;
}

.delete-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.chat-main-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.chat-header {
  padding: 0 1.5rem;
  height: 65px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.chat-messages-wrapper {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}

.chat-messages {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.empty-chat-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}

.message {
  display: flex;
  margin-bottom: 0.5rem;
}

.message-role-user {
  justify-content: flex-end;
}

.message-role-assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 0.75rem 1.1rem;
  border-radius: 20px;
  line-height: 1.6;
  word-wrap: break-word;
  box-shadow: var(--shadow-md);
}

.message-bubble.first-in-group {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}

.message-role-assistant .message-bubble {
  background-color: #FFFFFF;
  border-bottom-left-radius: 5px;
}

.message-role-user .message-bubble {
  background: var(--accent-gradient);
  color: white;
  border-bottom-right-radius: 5px;
}

.chat-input-area {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
}

.chat-input-form {
  position: relative;
  background-color: #FFFFFF;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.chat-input-form:focus-within {
  border-color: var(--accent-active-border);
  box-shadow: 0 0 0 3px var(--accent-active-bg);
}

.chat-input-form textarea {
  width: 100%;
  padding: 12px 60px 12px 16px;
  background-color: transparent;
  border: none;
  resize: none;
  font-size: 1rem;
}

.form-actions {
  position: absolute;
  right: 8px;
  bottom: 6px;
}

.send-button {
  background: var(--accent-gradient);
  border: none;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  display: flex;
}

.send-button svg {
  fill: white;
}

.widget-fade-enter-active, .widget-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.widget-fade-enter-from, .widget-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -49%) scale(0.97);
}
</style>