export interface TodoItem {
    id: string;
    content: string;
    completed: boolean;
    important: boolean;
    startDate?: Date | string | null; // 修改：开始日期，可选
    endDate?: Date | string | null;   // 修改：结束日期（替换原dueDate），可选
    createdAt: Date | string;
    updatedAt: Date | string;
    userId: string;
}