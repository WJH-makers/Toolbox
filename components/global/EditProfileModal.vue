<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="confirm-modal-overlay" @click.self="handleClose">
      <div class="confirm-modal edit-profile-modal">
        <h4 class="modal-title">{{ title }}</h4>

        <div v-if="clientValidationError" class="server-message error-message">{{ clientValidationError }}</div>
        <div v-if="apiError && !clientValidationError" class="server-message error-message">{{ apiError }}</div>
        <div v-if="apiSuccessMessage && !clientValidationError" class="server-message success-message">
          {{ apiSuccessMessage }}
        </div>

        <form @submit.prevent="handleSubmit">
          <div v-if="editMode === 'username'" class="form-group">
            <label for="editValueUsername">新用户名:</label>
            <input
                id="editValueUsername" v-model="editableValue.username" type="text" :disabled="isLoading"
                required>
          </div>
          <div v-if="editMode === 'email'" class="form-group">
            <label for="editValueEmail">新邮箱:</label>
            <input
                id="editValueEmail" v-model="editableValue.email" type="email" :disabled="isLoading"
                required>
          </div>
          <div v-if="editMode === 'password'">
            <div class="form-group">
              <label for="currentPasswordModal">当前密码:</label>
              <input
                  id="currentPasswordModal" v-model="editableValue.currentPassword" type="password"
                  :disabled="isLoading" required>
            </div>
            <div class="form-group">
              <label for="newPasswordModal">新密码:</label>
              <input
                  id="newPasswordModal" v-model="editableValue.newPassword" type="password"
                  :disabled="isLoading"
                  required>
            </div>
            <div class="form-group">
              <label for="confirmNewPasswordModal">确认新密码:</label>
              <input
                  id="confirmNewPasswordModal" v-model="editableValue.confirmNewPassword" type="password"
                  :disabled="isLoading" required>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="button-cancel" :disabled="isLoading" @click="handleClose">取消</button>
            <button type="submit" class="button-save" :disabled="isLoading">
              {{ isLoading ? '保存中...' : '保存更改' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import {ref, watch, reactive} from 'vue';
import type {PropType} from 'vue';

type EditModeType = 'username' | 'email' | 'password';

interface EditableValues {
  username: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  editMode: {
    type: String as PropType<EditModeType | null>,
    required: true,
  },
  initialUsername: {
    type: String,
    default: '',
  },
  initialEmail: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  apiError: {
    type: String as PropType<string | null>,
    default: null,
  },
  apiSuccessMessage: {
    type: String as PropType<string | null>,
    default: null,
  }
});

const emit = defineEmits(['close', 'save', 'clearApiMessages']);

const editableValue = reactive<EditableValues>({
  username: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
});

const clientValidationError = ref<string | null>(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    clientValidationError.value = null;
    emit('clearApiMessages');
    if (props.editMode === 'username') {
      editableValue.username = props.initialUsername;
    }
    if (props.editMode === 'email') {
      editableValue.email = props.initialEmail;
    }
    editableValue.currentPassword = '';
    editableValue.newPassword = '';
    editableValue.confirmNewPassword = '';
  }
});


const handleClose = () => {
  if (!props.isLoading) {
    emit('close');
  }
};

const handleSubmit = () => {
  if (props.isLoading) return;
  clientValidationError.value = null;
  emit('clearApiMessages');

  if (props.editMode === 'username') {
    if (!editableValue.username.trim()) {
      clientValidationError.value = "新用户名不能为空。";
      return;
    }
    if (editableValue.username.trim().length < 3) {
      clientValidationError.value = "新用户名长度至少需要3位。";
      return;
    }
  }

  if (props.editMode === 'email') {
    if (!editableValue.email.trim() || !/^\S+@\S+\.\S+$/.test(editableValue.email)) {
      clientValidationError.value = "请输入有效的邮箱地址。";
      return;
    }
  }

  if (props.editMode === 'password') {
    if (!editableValue.currentPassword?.trim()) {
      clientValidationError.value = "当前密码不能为空。";
      return;
    }
    if (!editableValue.newPassword?.trim()) {
      clientValidationError.value = "新密码不能为空。";
      return;
    }
    if (editableValue.newPassword !== editableValue.confirmNewPassword) {
      clientValidationError.value = "新密码和确认密码不匹配。";
      return;
    }
    const newPass = editableValue.newPassword;
    const minLength = 8;
    if (newPass.length < minLength) {
      clientValidationError.value = `新密码长度至少需要 ${minLength} 位。`;
      return;
    }
    const hasUpperCase = /[A-Z]/.test(newPass);
    const hasLowerCase = /[a-z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    const strengthErrors = [];
    if (!hasUpperCase) strengthErrors.push('大写字母');
    if (!hasLowerCase) strengthErrors.push('小写字母');
    if (!hasNumber) strengthErrors.push('数字');
    if (strengthErrors.length > 0) {
      clientValidationError.value = `新密码必须至少包含：${strengthErrors.join('、')}。`;
      return;
    }
    if (editableValue.currentPassword === newPass) {
      clientValidationError.value = '新密码不能与当前密码相同。';
      return;
    }
  }

  let payload: any = {};
  if (props.editMode === 'username') {
    payload = {mode: props.editMode, value: editableValue.username.trim()};
  }
  if (props.editMode === 'email') {
    payload = {mode: props.editMode, value: editableValue.email.trim()};
  }
  if (props.editMode === 'password') {
    payload = {
      mode: props.editMode,
      currentPassword: editableValue.currentPassword,
      newPassword: editableValue.newPassword,
    };
  }
  emit('save', payload);
};
</script>

<style scoped>
.confirm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.confirm-modal {
  background-color: var(--content-box-background, var(--color-background));
  padding: 1.8rem 2rem;
  border-radius: var(--glass-border-radius-small, 10px);
  box-shadow: var(--shadow-elevation-high);
  width: 100%;
  max-width: 420px;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.theme-light .confirm-modal {
  background-color: #fff;
  border-color: #e2e8f0;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--color-text);
}

.edit-profile-modal .form-group {
  margin-bottom: 1rem;
}

.edit-profile-modal label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.3rem;
  text-align: left;
}

.edit-profile-modal input[type="text"],
.edit-profile-modal input[type="email"],
.edit-profile-modal input[type="password"] {
  width: 100%;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  background-color: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-sizing: border-box;
  color: var(--color-text);
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.edit-profile-modal input:disabled {
  background-color: var(--input-disabled-bg);
  cursor: not-allowed;
}

.edit-profile-modal input::placeholder {
  color: var(--input-placeholder-color);
}

.edit-profile-modal input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--input-focus-shadow-color, rgba(96, 165, 250, 0.25));
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.modal-actions button {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.button-cancel {
  background-color: var(--color-input-bg-hover, var(--color-border));
  color: var(--color-text);
}

.button-cancel:hover {
  opacity: 0.8;
}

.button-save {
  background-color: var(--color-primary, var(--color-primary));
  color: white;
}

.button-save:hover {
  background-color: var(--color-primary-hover, var(--color-primary-hover));
}

.button-save:disabled {
  background-color: var(--button-disabled-bg);
  cursor: not-allowed;
  opacity: 0.7;
}

.server-message {
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  text-align: center;
  line-height: 1.4;
}

.error-message {
  background-color: var(--error-bg);
  color: var(--error-text-color);
  border: 1px solid var(--error-border-color);
}

.success-message {
  background-color: var(--success-bg);
  color: var(--success-text-color);
  border: 1px solid var(--success-border-color);
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .confirm-modal, .modal-fade-leave-active .confirm-modal {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-fade-enter-from .confirm-modal, .modal-fade-leave-to .confirm-modal {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>