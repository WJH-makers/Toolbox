export interface TodoItem {
    id: string;          // 待办事项的唯一ID
    content: string;       // 待办事项的内容文本
    completed: boolean;    // 标记是否已完成
    important: boolean;    // 标记是否为重要事项
    createdAt: string | Date; // 创建时间 (从后端API获取时，Date类型常被序列化为string)
    updatedAt: string | Date; // 最后更新时间
    userId: string;        // 关联的用户ID
}