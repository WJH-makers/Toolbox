export interface AuthenticatedUser {
  id: string;
  email?: string | null; // 使用可选操作符或允许 null，如果它们确实可能不存在
  username?: string | null;
  avatarUrl?: string | null;
}