<template>
  <section class="event-timeline">
    <div class="timeline-head" v-if="title || description">
      <h3 v-if="title">{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>

    <div v-if="events.length" class="event-list">
      <article v-for="event in events" :key="event.key" class="event-item">
        <div class="event-head">
          <strong>{{ event.event }}</strong>
          <span>{{ formatEventTime(event.timestamp) }}</span>
        </div>
        <p class="event-message">{{ formatEventPayload(event) }}</p>
      </article>
    </div>

    <p v-else class="event-empty">{{ emptyText }}</p>
  </section>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  events: {
    type: Array,
    default: () => []
  },
  emptyText: {
    type: String,
    default: '当前还没有收到事件。'
  },
  formatPayload: {
    type: Function,
    default: null
  }
})

function formatEventTime(timestamp) {
  const date = new Date(timestamp || Date.now())
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatEventPayload(event) {
  if (typeof props.formatPayload === 'function') {
    return props.formatPayload(event)
  }
  return event?.message || '已收到状态更新'
}
</script>

<style scoped>
.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-head h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #ffd76b;
}

.timeline-head p,
.event-empty {
  margin: 0;
  color: rgba(245, 236, 210, 0.62);
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255, 215, 107, 0.12);
}

.event-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #ffd76b;
}

.event-head span {
  color: rgba(245, 236, 210, 0.45);
}

.event-message {
  margin: 6px 0 0;
  color: rgba(245, 236, 210, 0.72);
  font-size: 13px;
  line-height: 1.5;
}
</style>