<template>
  <div class="room-page">
    <header class="room-header">
      <div>
        <p class="eyebrow">娱乐大厅 / 房间页</p>
        <h1>{{ roomTitle }}</h1>
        <p class="room-meta">房间号 {{ roomId }} · {{ roomStatus }}</p>
      </div>
      <div class="header-actions">
        <span class="realtime-pill" :class="{ online: realtimeConnected }">{{ realtimeLabel }}</span>
        <button class="ghost-btn" @click="leaveRoom">退出房间</button>
      </div>
    </header>

    <main v-if="currentRoom" class="room-content">
      <section class="room-panel summary-panel">
        <div>
          <p class="panel-label">当前玩法</p>
          <h2>{{ currentRoom.gameTitle }}</h2>
          <p class="panel-copy">{{ roomHint }}</p>
        </div>
        <div class="summary-grid">
          <div>
            <span class="summary-label">房主</span>
            <strong>{{ currentRoom.ownerName }}</strong>
          </div>
          <div>
            <span class="summary-label">人数</span>
            <strong>{{ currentRoom.players.length }}/{{ currentRoom.maxPlayers }}</strong>
          </div>
          <div>
            <span class="summary-label">启动状态</span>
            <strong>{{ canStart ? '可开始' : '等待更多玩家/准备' }}</strong>
          </div>
        </div>
      </section>

      <section class="room-panel seats-panel">
        <div class="section-head">
          <h2>座位布局</h2>
          <p>房间和准备逻辑先落前端骨架，后续再接真实房间接口。</p>
        </div>
        <div class="seats-grid" :class="seatGridClass">
          <article v-for="seat in seats" :key="seat.seatIndex" class="seat-card" :class="{ filled: !!seat.player }">
            <span class="seat-index">{{ seat.seatIndex + 1 }}号位</span>
            <template v-if="seat.player">
              <h3>{{ seat.player.username }}</h3>
              <p>{{ seat.player.isOwner ? '房主' : '玩家' }}</p>
              <span class="seat-state" :class="{ ready: seat.player.ready }">
                {{ seat.player.ready ? '已准备' : '未准备' }}
              </span>
            </template>
            <template v-else>
              <h3>空座位</h3>
              <p>等待加入</p>
              <span class="seat-state empty">空闲</span>
            </template>
          </article>
        </div>
      </section>

      <section class="room-panel controls-panel">
        <div class="section-head">
          <h2>房间操作</h2>
          <p>当前先做流程骨架：准备、开始、退出，后面接房间服务即可替换数据源。</p>
        </div>
        <div class="controls-row">
          <button class="secondary-btn" @click="toggleReady">
            {{ isCurrentUserReady ? '取消准备' : '我已准备' }}
          </button>
          <button class="primary-btn" :disabled="!isOwner || !canStart" @click="startGame">
            {{ isOwner ? '房主开始' : '等待房主开始' }}
          </button>
        </div>
        <p v-if="message" class="room-message">{{ message }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoomStore } from '../stores/room.js'
import { useUserStore } from '../stores/user.js'
import { realtimeService } from '../services/realtime.js'

const router = useRouter()
const route = useRoute()
const roomStore = useRoomStore()
const userStore = useUserStore()
const message = ref('')
const realtimeConnected = ref(false)
let unsubscribeRoom = null
let unsubscribeStatus = null

const currentRoom = computed(() => roomStore.currentRoom)
const seats = computed(() => roomStore.seats)
const canStart = computed(() => roomStore.canStart)
const roomId = computed(() => currentRoom.value?.id || route.params.roomId)
const roomTitle = computed(() => currentRoom.value?.gameTitle || '房间不存在')
const roomStatus = computed(() => currentRoom.value?.status || '未找到房间')
const isOwner = computed(() => currentRoom.value?.ownerName === userStore.username)
const currentUserSeat = computed(() => currentRoom.value?.players.find(player => player.username === userStore.username) || null)
const isCurrentUserReady = computed(() => !!currentUserSeat.value?.ready)
const seatGridClass = computed(() => currentRoom.value?.maxPlayers === 6 ? 'six-seats' : 'four-seats')
const realtimeLabel = computed(() => realtimeConnected.value ? '房间实时已连接' : '房间实时未连接')
const roomHint = computed(() => {
  if (currentRoom.value?.gameId === 'shandong-mahjong') {
    return '山东麻将可直接进入当前演示牌桌，后续继续替换为真实房间制联调。'
  }
  if (currentRoom.value?.gameId === 'shandong-gouji') {
    return '山东够级当前先完成房间和桌面骨架，等待后端 controller 开放后再接真对局。'
  }
  return '本地练习模式主要用于前端交互自测。'
})

function toggleReady() {
  roomStore.toggleReady(userStore.username)
}

function startGame() {
  if (!currentRoom.value) return
  if (currentRoom.value.gameId === 'shandong-mahjong') {
    localStorage.setItem('gameMode', 'shandong')
    router.push({
      path: '/mahjong',
      query: {
        roomId: currentRoom.value.id,
        gameId: currentRoom.value.gameInstanceId || ''
      }
    })
    return
  }
  if (currentRoom.value.gameId === 'standard-mahjong') {
    localStorage.setItem('gameMode', 'standard')
    router.push({
      path: '/mahjong',
      query: {
        roomId: currentRoom.value.id
      }
    })
    return
  }
  message.value = '山东够级桌面页还没接上，这里先保留房间骨架。'
}

function leaveRoom() {
  roomStore.clearRoom()
  router.push('/lobby')
}

onMounted(() => {
  roomStore.hydrateRoom()
  if (!roomStore.currentRoom || roomStore.currentRoom.id !== route.params.roomId) {
    router.replace('/lobby')
    return
  }

  unsubscribeStatus = realtimeService.onStatusChange(connected => {
    realtimeConnected.value = connected
  })

  realtimeService.subscribe(
    `room-${route.params.roomId}`,
    `/topic/room/${route.params.roomId}`,
    envelope => {
      if (envelope.scene === 'room') {
        roomStore.applyRoomEnvelope(envelope)
        message.value = envelope.message || `已收到 ${envelope.event}`
      }
    }
  ).then(unsubscribe => {
    unsubscribeRoom = unsubscribe
  }).catch(() => {
    realtimeConnected.value = false
  })
})

onUnmounted(() => {
  unsubscribeRoom?.()
  unsubscribeStatus?.()
})
</script>

<style scoped>
.room-page {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at top, rgba(210, 170, 40, 0.16), transparent 30%),
    linear-gradient(160deg, #0b1c22 0%, #071014 100%);
  color: #f5ecd2;
  font-family: 'Microsoft YaHei', sans-serif;
}

.room-header,
.room-panel {
  max-width: 1180px;
  margin: 0 auto;
}

.room-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: rgba(245, 236, 210, 0.6);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.room-header h1 {
  margin: 0 0 8px;
  font-size: 34px;
  color: #ffd76b;
}

.room-meta {
  margin: 0;
  color: rgba(245, 236, 210, 0.65);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.realtime-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  color: rgba(245, 236, 210, 0.72);
  font-size: 12px;
}

.realtime-pill.online {
  background: rgba(64, 173, 120, 0.18);
  color: #7ff0b5;
}

.ghost-btn,
.secondary-btn,
.primary-btn {
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
}

.ghost-btn {
  padding: 12px 18px;
  background: rgba(255,255,255,0.08);
  color: #f5ecd2;
}

.room-content {
  display: grid;
  gap: 20px;
}

.room-panel {
  background: rgba(6, 14, 18, 0.76);
  border: 1px solid rgba(255, 215, 107, 0.15);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.summary-panel {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
}

.summary-panel h2,
.section-head h2 {
  margin: 0 0 8px;
  color: #ffd76b;
}

.panel-label,
.section-head p,
.room-message {
  margin: 0;
  color: rgba(245, 236, 210, 0.62);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.summary-grid div {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255,255,255,0.04);
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  color: rgba(245, 236, 210, 0.48);
  font-size: 12px;
}

.summary-grid strong {
  font-size: 18px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 18px;
}

.seats-grid {
  display: grid;
  gap: 14px;
}

.seats-grid.four-seats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.seats-grid.six-seats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.seat-card {
  min-height: 150px;
  padding: 18px;
  border-radius: 20px;
  border: 1px dashed rgba(255, 215, 107, 0.2);
  background: rgba(255,255,255,0.03);
}

.seat-card.filled {
  border-style: solid;
  background: linear-gradient(160deg, rgba(255, 215, 107, 0.08), rgba(255,255,255,0.02));
}

.seat-index {
  display: inline-block;
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(245, 236, 210, 0.55);
}

.seat-card h3 {
  margin: 0 0 6px;
}

.seat-card p {
  margin: 0 0 12px;
  color: rgba(245, 236, 210, 0.65);
}

.seat-state {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  color: #f2bc8c;
  font-size: 12px;
}

.seat-state.ready {
  background: rgba(64, 173, 120, 0.18);
  color: #7ff0b5;
}

.seat-state.empty {
  color: rgba(245, 236, 210, 0.5);
}

.controls-row {
  display: flex;
  gap: 12px;
}

.secondary-btn,
.primary-btn {
  padding: 12px 18px;
}

.secondary-btn {
  background: rgba(255,255,255,0.08);
  color: #f5ecd2;
}

.primary-btn {
  background: linear-gradient(135deg, #d3a137, #ffd76b);
  color: #241300;
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.room-message {
  margin-top: 14px;
}

@media (max-width: 900px) {
  .summary-panel,
  .summary-grid,
  .seats-grid.four-seats,
  .seats-grid.six-seats {
    grid-template-columns: 1fr;
  }

  .room-header,
  .section-head,
  .controls-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>