<template>
  <div class="user-profile-settings" :class="themeClasses">
    <button class="profile-icon-button" aria-label="用户设置" title="用户中心" @click="toggleDropdown">
      <svg
          v-if="!authUser?.avatarUrl" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"
          fill="currentColor" class="profile-icon-svg">
        <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <img v-else :src="authUser.avatarUrl" alt="用户头像" class="profile-avatar-img">
    </button>

    <transition name="dropdown-fade">
      <div v-if="isDropdownOpen" ref="dropdownMenuEl" class="settings-dropdown">
        <div v-if="authUser" class="dropdown-header">
          <p class="user-display-info"><strong>用户名:</strong> {{ authUser.username || '未设置' }}</p>
          <p class="user-display-info"><strong>邮箱:</strong> {{ authUser.email || '未设置' }}</p>
        </div>
        <hr v-if="authUser" class="dropdown-divider">
        <ul class="dropdown-menu-list">
          <li><a href="#" @click.prevent="openEditModal('username')">编辑用户名</a></li>
          <li><a href="#" @click.prevent="openEditModal('email')">编辑邮箱</a></li>
          <li><a href="#" @click.prevent="openEditModal('password')">更改密码</a></li>
          <li><a href="#" class="logout-link" @click.prevent="handleLogout">退出登录</a></li>
          <hr class="dropdown-divider">
          <li>
            <button class="delete-account-button" @click="promptDeleteAccount">
              <svg
                  xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span>注销账户</span>
            </button>
          </li>
        </ul>
      </div>
    </transition>

    <EditProfileModal
        :is-open="isEditModalOpen"
        :title="editModalTitle"
        :edit-mode="currentEditMode"
        :initial-username="authUser?.username || ''"
        :initial-email="authUser?.email || ''"
        :is-loading="profileActions.isLoading.value"
        :api-error="profileActions.error.value"
        :api-success-message="profileActions.successMessage.value"
        @close="closeEditModal"
        @save="handleProfileUpdateSave"
        @clear-api-messages="profileActions.clearMessages"
    />

    <transition name="modal-fade">
      <div v-if="isConfirmDeleteModalOpen" class="confirm-modal-overlay" @click.self="cancelDeleteAccount">
        <div class="confirm-modal">
          <h4 class="modal-title">确认注销账户？</h4>
          <p class="modal-message">此操作不可逆，您的所有数据都将被永久删除。确定要继续吗？</p>
          <div class="modal-actions">
            <button class="button-cancel" :disabled="isDeletingAccount" @click="cancelDeleteAccount">取消</button>
            <button class="button-delete-confirm" :disabled="isDeletingAccount" @click="confirmDeleteAccount">
              {{ isDeletingAccount ? '注销中...' : '确认注销' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted, computed} from 'vue';
import {useRouter} from '#imports';
import {useUserProfile} from '~/composables/useUserProfile';
import {useAuth} from '~/composables/useAuth';
import {useThemeManager} from '~/composables/useThemeManager';
import EditProfileModal from '~/components/global/EditProfileModal.vue';

const {user: authUser, isLoggedIn, logout: performLogout, fetchCurrentUser: refreshAuthUser} = useAuth();
const profileActions = useUserProfile();
const {currentTheme} = useThemeManager();
const router = useRouter();

const isDropdownOpen = ref(false);
const dropdownMenuEl = ref<HTMLDivElement | null>(null);

const isConfirmDeleteModalOpen = ref(false);
const isDeletingAccount = ref(false);

const isEditModalOpen = ref(false);
type EditModeType = 'username' | 'email' | 'password';
const currentEditMode = ref<EditModeType | null>(null);
const editModalTitle = ref('');

const themeClasses = computed(() => ({
  'theme-dark': currentTheme.value === 'dark',
  'theme-light': currentTheme.value === 'light',
}));


const toggleDropdown = () => {
  if (!isLoggedIn.value) {
    router.push('/login');
    return;
  }
  isDropdownOpen.value = !isDropdownOpen.value;
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (
      dropdownMenuEl.value &&
      !dropdownMenuEl.value.contains(target) &&
      !target.closest('.profile-icon-button')
  ) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});

const openEditModal = (mode: EditModeType) => {
  isDropdownOpen.value = false;
  currentEditMode.value = mode;
  profileActions.clearMessages();
  if (mode === 'username') editModalTitle.value = '编辑用户名';
  else if (mode === 'email') editModalTitle.value = '编辑邮箱';
  else if (mode === 'password') editModalTitle.value = '更改密码';
  isEditModalOpen.value = true;
};

const closeEditModal = () => {
  isEditModalOpen.value = false;
};

const handleProfileUpdateSave = async (payload: any) => {
  let result: { success: boolean; error?: string; message?: string; data?: any } | undefined;

  if (payload.mode === 'username') {
    if (!payload.value?.trim()) { // Basic check, modal should ideally ensure this
      profileActions.error.value = "用户名不能为空。";
      return;
    }
    result = await profileActions.updateUsername(payload.value);
  } else if (payload.mode === 'email') {
    if (!payload.value?.trim() || !/^\S+@\S+\.\S+$/.test(payload.value)) { // Basic check
      profileActions.error.value = "请输入有效的邮箱地址。";
      return;
    }
    result = await profileActions.updateEmail(payload.value);
  } else if (payload.mode === 'password') {
    result = await profileActions.changePassword(payload.currentPassword, payload.newPassword);
  }

  if (result?.success) {
    await refreshAuthUser();
    setTimeout(() => {
      if (!profileActions.error.value) {
        closeEditModal();
      }
    }, 1500);
  }
};

const promptDeleteAccount = () => {
  isDropdownOpen.value = false;
  isConfirmDeleteModalOpen.value = true;
};
const cancelDeleteAccount = () => {
  if (isDeletingAccount.value) return;
  isConfirmDeleteModalOpen.value = false;
};
const confirmDeleteAccount = async () => {
  if (isDeletingAccount.value) return;
  isDeletingAccount.value = true;
  try {
    const result = await profileActions.deleteUserAccountAPI();
    alert(result.message || '账户注销处理中...');
    isConfirmDeleteModalOpen.value = false;
    if (result.success) {
      await performLogout();
      router.push('/');
    }
  } catch (error: any) {
    alert(error.message || '账户注销操作失败，请稍后再试。');
  } finally {
    isDeletingAccount.value = false;
  }
};
const handleLogout = async () => {
  isDropdownOpen.value = false;
  try {
    await performLogout();
  } catch (error: any) {
    alert(error.message || '退出登录失败。');
  }
};
</script>

<style scoped>
.user-profile-settings {
  position: fixed;
  top: 15px;
  right: 20px;
  z-index: 1100;
}

.profile-icon-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--round-toggle-bg, var(--color-input-bg));
  color: var(--color-text);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  outline: none;
  box-shadow: var(--shadow-elevation-medium, 0 4px 8px rgba(0, 0, 0, 0.1));
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.profile-icon-button:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-elevation-high, 0 6px 12px rgba(0, 0, 0, 0.15));
}

.profile-icon-svg {
  width: 24px;
  height: 24px;
}

.profile-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.settings-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background-color: var(--content-box-background, var(--color-background));
  border-radius: var(--glass-border-radius-small, 8px);
  box-shadow: var(--shadow-elevation-high, 0 8px 16px rgba(0, 0, 0, 0.2));
  border: 1px solid var(--color-border);
  padding: 0.5rem 0;
  color: var(--color-text);
}

.theme-light .settings-dropdown {
  background-color: #fff;
  border-color: #e2e8f0;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.dropdown-header {
  padding: 0.75rem 1rem;
}

.user-display-info {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0 0 0.3rem 0;
  line-height: 1.3;
}

.user-display-info strong {
  font-weight: 500;
  color: var(--color-text);
  margin-right: 0.3em;
}

.dropdown-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.5rem 0;
}

.dropdown-menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dropdown-menu-list li a, .dropdown-menu-list li button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.9rem;
  color: var(--color-text);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
  box-sizing: border-box;
}

.dropdown-menu-list li a:hover, .dropdown-menu-list li button:hover {
  background-color: var(--color-input-bg-hover, var(--color-border));
}

.delete-account-button {
  color: var(--error-text-color, #dc3545) !important;
}

.delete-account-button .icon {
  stroke: var(--error-text-color, #dc3545) !important;
}

.delete-account-button:hover {
  background-color: var(--error-bg, rgba(220, 53, 69, 0.1)) !important;
}

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
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.modal-message {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
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

.button-delete-confirm {
  background-color: var(--error-border-color, #c82333);
  color: var(--error-text-color, white);
}

.button-delete-confirm:hover {
  background-color: var(--error-text-color, #bd2130);
}

.button-delete-confirm:disabled {
  background-color: var(--button-disabled-bg);
  cursor: not-allowed;
  opacity: 0.7;
}

.dropdown-fade-enter-active, .dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from, .dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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

.icon {
  width: 1em;
  height: 1em;
  margin-right: 0.5em;
  vertical-align: -0.125em;
}
</style>