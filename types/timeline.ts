export interface TimelineEvent {
    id: string;
    year: number; // 正数表示公元 (AD)，负数表示公元前 (BC)
    title: string;
    description: string; // 主要描述，始终可见
    type: 'world' | 'china'; // 事件主要归属地：世界或中国
    tags: Array<'general' | 'tech' | 'humanities'>; // 事件分类标签，用于筛选不同主题的时间线
    details?: string; // 鼠标悬停时显示的额外详细信息
}