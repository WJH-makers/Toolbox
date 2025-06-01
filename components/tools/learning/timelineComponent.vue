<template>
  <div class="timeline-page-container">
    <h2 class="timeline-main-title">历史长河图</h2>

    <div class="timeline-controls">
      <button
          :class="{ active: currentView === 'general' }"
          class="control-button"
          @click="setCurrentView('general')"
      >
        综合历史
      </button>
      <button
          :class="{ active: currentView === 'tech' }"
          class="control-button"
          @click="setCurrentView('tech')"
      >
        科技发展
      </button>
      <button
          :class="{ active: currentView === 'humanities' }"
          class="control-button"
          @click="setCurrentView('humanities')"
      >
        人文社会
      </button>
    </div>

    <div v-if="isLoading" class="loading-spinner">加载历史数据中...</div>
    <div v-if="!isLoading && error" class="error-message"> {{ error }}</div>

    <div v-if="!isLoading && !error && filteredEvents.length === 0" class="empty-state">
      当前视角下暂无历史事件记录。
    </div>

    <div v-if="!isLoading && !error && filteredEvents.length > 0" class="timeline-wrapper">
      <div class="timeline-axis"></div>
      <div
          v-for="(event, index) in filteredEvents"
          :key="event.id"
          :class="['timeline-event-item', index % 2 === 0 ? 'item-left' : 'item-right']"
          @mouseenter="hoveredEventId = event.id"
          @mouseleave="hoveredEventId = null"
      >
        <div class="timeline-event-content">
          <div class="event-year">
            {{ formatYear(event.year) }}
            <span v-if="event.type === 'china'" class="china-tag">(中国)</span>
          </div>
          <h4 class="event-title">{{ event.title }}</h4>
          <p class="event-description">{{ event.description }}</p>
          <div v-if="hoveredEventId === event.id && event.details" class="event-details-tooltip">
            <strong>更多信息:</strong> {{ event.details }}
          </div>
        </div>
        <div class="timeline-event-dot"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted, type Ref} from 'vue';
import type {TimelineEvent} from '~/types/timeline';
import {
  generalTimelineProvider,
  humanitiesTimelineProvider,
  techTimelineProvider
} from '~/data/timelineData'; // 导入分类数据

const isLoading = ref(true);
const error: Ref<string | null> = ref(null);
const currentView: Ref<'general' | 'tech' | 'humanities'> = ref('general');
const hoveredEventId: Ref<string | null> = ref(null);

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false;
  }, 100); // 短暂延迟模拟加载
});

const filteredEvents = computed(() => {
  const view = currentView.value;
  let unsortedEventsMap = new Map<string, TimelineEvent>();

  if (view === 'tech') {
    techTimelineProvider.forEach(event => unsortedEventsMap.set(event.id, event));
  } else if (view === 'humanities') {
    humanitiesTimelineProvider.forEach(event => unsortedEventsMap.set(event.id, event));
  } else { // 'general' view
    // 1. 添加所有标记为 'general' 的事件
    generalTimelineProvider.forEach(event => unsortedEventsMap.set(event.id, event));

    // 2. 添加所有类型为 'china' 的科技事件 (如果它们还没因为 'general' 标签被添加)
    techTimelineProvider.forEach(event => {
      if (event.type === 'china') {
        unsortedEventsMap.set(event.id, event); // Map 会自动处理重复添加（基于id）
      }
    });

    // 3. 添加所有类型为 'china' 的人文事件 (如果它们还没因为 'general' 标签或上述科技事件被添加)
    humanitiesTimelineProvider.forEach(event => {
      if (event.type === 'china') {
        unsortedEventsMap.set(event.id, event);
      }
    });
  }

  const eventsArray = Array.from(unsortedEventsMap.values());
  return eventsArray.sort((a, b) => a.year - b.year);
});

const setCurrentView = (view: 'general' | 'tech' | 'humanities') => {
  currentView.value = view;
  hoveredEventId.value = null;
};

const formatYear = (year: number): string => {
  if (year < 0) {
    return `${Math.abs(year)} 公元前`;
  }
  return `${year} 公元`;
};

</script>

<style scoped>
/* 样式部分与之前相同，此处省略以保持简洁 */
.timeline-page-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.timeline-main-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #333;
}

.timeline-controls {
  display: flex;
  justify-content: center;
  margin-bottom: 2.5rem;
  gap: 10px;
}

.control-button {
  padding: 10px 20px;
  font-size: 1rem;
  border: 1px solid #007bff;
  background-color: #fff;
  color: #007bff;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.control-button:hover {
  background-color: #007bff;
  color: #fff;
}

.control-button.active {
  background-color: #007bff;
  color: #fff;
  font-weight: bold;
}

.loading-spinner,
.error-message,
.empty-state {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
  padding: 40px 0;
}

.error-message {
  color: #d9534f;
}

.timeline-wrapper {
  position: relative;
  padding: 20px 0;
}

.timeline-axis {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 4px;
  background-color: #007bff;
  transform: translateX(-50%);
  z-index: 0;
  border-radius: 2px;
}

.timeline-event-item {
  display: flex;
  position: relative;
  margin-bottom: 40px;
  width: 100%;
  z-index: 1;
}

.timeline-event-item.item-left {
  justify-content: flex-start;
}

.timeline-event-item.item-right {
  justify-content: flex-end;
}

.timeline-event-content {
  width: calc(50% - 40px);
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.timeline-event-item:hover .timeline-event-content {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.item-left .timeline-event-content {
  margin-right: 40px; /* Space from the central axis */
}

.item-right .timeline-event-content {
  margin-left: 40px; /* Space from the central axis */
}

.timeline-event-dot {
  width: 18px;
  height: 18px;
  background-color: #ffffff;
  border: 4px solid #007bff;
  border-radius: 50%;
  position: absolute;
  top: 20px; /* Adjust to align with text or a specific point */
  z-index: 2;
  transform: translateY(-50%); /* Center the dot vertically */
}

.item-left .timeline-event-dot {
  left: calc(50% - 9px);
}

.item-right .timeline-event-dot {
  right: calc(50% - 9px);
}


.event-year {
  font-size: 0.9em;
  color: #007bff;
  font-weight: 600;
  margin-bottom: 8px;
}

.china-tag {
  display: inline-block;
  background-color: #fde8e8;
  color: #c53030;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 8px;
}

.event-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.event-description {
  font-size: 0.95rem;
  color: #555;
  line-height: 1.6;
  margin-bottom: 0;
}

.event-details-tooltip {
  position: absolute;
  left: 100%;
  top: 0;
  width: 280px;
  background-color: #333;
  color: #fff;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
  margin-left: 15px;
  font-size: 0.9em;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.item-right .event-details-tooltip {
  left: auto;
  right: 100%;
  margin-left: 0;
  margin-right: 15px;
}

.timeline-event-item:hover .event-details-tooltip {
  opacity: 1;
  visibility: visible;
}

.event-details-tooltip strong {
  display: block;
  margin-bottom: 5px;
  color: #00bfff;
}

@media (max-width: 768px) {
  .timeline-axis {
    left: 20px;
  }

  .timeline-event-item,
  .timeline-event-item.item-left,
  .timeline-event-item.item-right {
    justify-content: flex-start;
    padding-left: 40px;
  }

  .timeline-event-content,
  .item-left .timeline-event-content,
  .item-right .timeline-event-content {
    width: calc(100% - 20px);
    margin-left: 20px;
    margin-right: 0;
  }

  .timeline-event-dot,
  .item-left .timeline-event-dot,
  .item-right .timeline-event-dot {
    left: 11px;
    right: auto;
  }

  .event-details-tooltip,
  .item-right .event-details-tooltip {
    position: static;
    width: auto;
    margin-top: 10px;
    margin-left: 0;
    margin-right: 0;
    left: auto;
    right: auto;
    opacity: 1;
    visibility: visible;
    background-color: #f0f0f0;
    color: #333;
  }

  .event-details-tooltip strong {
    color: #007bff;
  }
}
</style>