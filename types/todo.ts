export interface TodoItem {
    id: string;
    title: string;
    content?: string | null;
    completed: boolean;
    important: boolean;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    image?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    userId: string;
}