<template>
  <div class="room-page">
    <header class="room-header">
      <div>
        <p class="eyebrow">娱乐大厅 / 房间页</p>
        <h1>{{ roomTitle }}</h1>
        <p class="room-meta">房间号 {{ roomId }} · {{ roomStatus }}</p>
      </div>
      <div class="header-actions">
        <span v-if="!realtimeConnected" class="realtime-pill offline">连接不稳定</span>
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
            <strong>{{ startStatusText }}</strong>
          </div>
        </div>
      </section>

      <section class="room-panel seats-panel">
        <div class="section-head">
          <h2>座位布局</h2>
          <p>确认入座后准备，等房主开局即可进入牌桌。</p>
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
          <p>全员满座并准备完成后，由房主开始本局；结算后可重新准备下一局。</p>
        </div>
        <div class="controls-row">
            <button class="secondary-btn" :disabled="actionLoading || !canToggleReady" @click="toggleReady">
            {{ isCurrentUserReady ? '取消准备' : '我已准备' }}
          </button>
            <button class="primary-btn" :disabled="!isOwner || !canStart || actionLoading" @click="startGame">
            {{ isOwner ? '房主开始' : '等待房主开始' }}
          </button>
          <button v-if="canReviewFinishedGame" class="ghost-btn" :disabled="actionLoading" @click="openFinishedGame">
            查看结算牌桌
          </button>
        </div>
        <p v-if="message" class="room-message">{{ message }}</p>
        <p v-if="statusHint" class="room-message">{{ statusHint }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRoom, leaveRoom as leaveRoomRequest, listRooms, readyRoom, startRoom } from '../api/room.js'
import { useRoomStore } from '../stores/room.js'
import { useUserStore } from '../stores/user.js'
import { realtimeService } from '../services/realtime.js'

const router = useRouter()
const route = useRoute()
const roomStore = useRoomStore()
const userStore = useUserStore()
const message = ref('')
const realtimeConnected = ref(false)
const actionLoading = ref(false)
let unsubscribeRoom = null
let unsubscribeStatus = null
let unsubscribeSystemMessage = null
let roomRefreshTimer = null

const currentRoom = computed(() => roomStore.currentRoom)
const seats = computed(() => roomStore.seats)
const canStart = computed(() => roomStore.canStart)
const isFinished = computed(() => roomStore.isFinished)
const isMatchCompleted = computed(() => roomStore.isMatchCompleted)
const isWaitingNextRound = computed(() => roomStore.isWaitingNextRound)
const roomId = computed(() => currentRoom.value?.id || route.params.roomId)
const roomTitle = computed(() => currentRoom.value?.gameTitle || '房间不存在')
const roomStatus = computed(() => currentRoom.value?.status || '未找到房间')
const isOwner = computed(() => currentRoom.value?.ownerName === userStore.username)
const currentUserSeat = computed(() => currentRoom.value?.players.find(player => player.username === userStore.username) || null)
const isCurrentUserReady = computed(() => !!currentUserSeat.value?.ready)
const canToggleReady = computed(() => !!currentUserSeat.value && !isMatchCompleted.value && currentRoom.value?.status !== 'PLAYING')
const seatGridClass = computed(() => currentRoom.value?.maxPlayers === 6 ? 'six-seats' : 'four-seats')
const canReviewFinishedGame = computed(() => {
  return (isFinished.value || isWaitingNextRound.value || isMatchCompleted.value)
    && !!(currentRoom.value?.currentGameId || currentRoom.value?.lastFinishedGameId)
})
const startStatusText = computed(() => {
  if (isMatchCompleted.value) return '整场已结束'
  if (canReviewFinishedGame.value) return '本局已结算'
  if (isWaitingNextRound.value) return '下一局准备中'
  return canStart.value ? '可开始' : '等待更多玩家/准备'
})
const statusHint = computed(() => {
  if (isMatchCompleted.value) {
    return '已达到局数上限，房间进入只读结算状态。当前不能继续准备或开始新一局。'
  }
  if (canReviewFinishedGame.value) {
    return '当前房间已进入 FINISHED，可查看上一局结算，或由玩家重新准备下一局。'
  }
  if (isWaitingNextRound.value) {
    return '上一局已结束，旧 gameId 已清理。等待大家重新准备后，由房主再次开始。'
  }
  return ''
})
const roomHint = computed(() => {
  if (isMatchCompleted.value) {
    return '当前整场对局已经打满设定局数，房间仅保留结算查看能力。'
  }
  if (currentRoom.value?.gameId === 'shandong-mahjong') {
    return '和其他玩家准备完毕后，即可从这里进入山东麻将牌桌。'
  }
  if (currentRoom.value?.gameId === 'shandong-gouji') {
    return '山东够级当前先完成房间和桌面骨架，等待后端 controller 开放后再接真对局。'
  }
  return '本地练习模式主要用于前端交互自测。'
})

function toggleReady() {
  if (!currentRoom.value || !canToggleReady.value) return

  actionLoading.value = true
  message.value = ''
  readyRoom(currentRoom.value.id, {
    playerId: userStore.username,
    playerName: userStore.username,
    ready: !isCurrentUserReady.value
  }).then(room => {
    roomStore.setCurrentRoom(room)
  }).catch(error => {
    message.value = error instanceof Error ? error.message : '准备状态更新失败'
  }).finally(() => {
    actionLoading.value = false
  })
}

function startGame() {
  if (!currentRoom.value) return
  if (currentRoom.value.gameCode === 'SHANDONG_GOUJI') {
    message.value = '山东够级桌面页还没接上，这里先保留房间骨架。'
    return
  }

  actionLoading.value = true
  message.value = ''
  startRoom(currentRoom.value.id, userStore.username).then(room => {
    roomStore.setCurrentRoom(room)
    localStorage.setItem('gameMode', room.gameId === 'standard-mahjong' ? 'standard' : 'shandong')
    router.push({
      path: '/mahjong',
      query: {
        roomId: room.id,
        gameId: room.currentGameId || room.gameInstanceId || ''
      }
    })
  }).catch(error => {
    message.value = error instanceof Error ? error.message : '开始游戏失败'
  }).finally(() => {
    actionLoading.value = false
  })
}

function navigateToGame(room = currentRoom.value) {
  const nextGameId = room?.currentGameId || room?.gameInstanceId || ''
  if (!nextGameId) return
  if (router.currentRoute.value.path === '/mahjong' && router.currentRoute.value.query.gameId === nextGameId) {
    return
  }

  localStorage.setItem('gameMode', room?.gameId === 'standard-mahjong' ? 'standard' : 'shandong')
  router.push({
    path: '/mahjong',
    query: {
      roomId: room?.id || route.params.roomId,
      gameId: nextGameId
    }
  })
}

function resolveRoomGameId(room = currentRoom.value, envelope = null) {
  return room?.currentGameId || room?.gameInstanceId || envelope?.payload?.currentGameId || envelope?.gameId || ''
}

function openFinishedGame() {
  const gameId = currentRoom.value?.currentGameId || currentRoom.value?.lastFinishedGameId
  if (!gameId) return
  localStorage.setItem('gameMode', currentRoom.value.gameId === 'standard-mahjong' ? 'standard' : 'shandong')
  router.push({
    path: '/mahjong',
    query: {
      roomId: currentRoom.value.id,
      gameId
    }
  })
}

async function leaveRoom() {
  const targetRoomId = roomId.value
  if (!targetRoomId) {
    roomStore.clearRoom()
    router.push('/lobby')
    return
  }

  actionLoading.value = true
  message.value = ''

  try {
    await leaveRoomRequest(targetRoomId, {
      playerId: userStore.username,
      playerName: userStore.username
    })
    roomStore.clearRoom()
    router.push('/lobby')
  } catch (error) {
    message.value = error instanceof Error ? error.message : '离开房间失败'
  } finally {
    actionLoading.value = false
  }
}

async function ensureRoomLoaded() {
  const targetRoomId = route.params.roomId
  if (!targetRoomId) {
    router.replace('/lobby')
    return false
  }

  if (roomStore.currentRoom?.id === targetRoomId) {
    return true
  }

  try {
    const room = await getRoom(targetRoomId, userStore.username)
    roomStore.setCurrentRoom(room)
    return true
  } catch {
    router.replace('/lobby')
    return false
  }
}

async function refreshRoomSnapshot() {
  const targetRoomId = route.params.roomId
  if (!targetRoomId) return

  try {
    const room = await getRoom(targetRoomId, userStore.username)
    roomStore.setCurrentRoom(room)
    if ((room.status === 'PLAYING' || room.currentGameId) && room.currentGameId) {
      navigateToGame(room)
    }
    return
  } catch {
    const gameCode = currentRoom.value?.gameCode
    if (!gameCode) {
      realtimeConnected.value = false
      return
    }

    try {
      const rooms = await listRooms({ gameCode })
      const room = rooms.find(item => item.id === targetRoomId)
      if (room) {
        roomStore.setCurrentRoom({
          ...currentRoom.value,
          ...room,
          players: currentRoom.value?.players || room.players
        })
        if ((room.status === 'PLAYING' || room.status === '游戏中' || room.currentGameId) && room.currentGameId) {
          navigateToGame({
            ...currentRoom.value,
            ...room
          })
        }
      }
    } catch {
      realtimeConnected.value = false
    }
    return
  }

  try {
    const gameCode = currentRoom.value?.gameCode
    if (!gameCode) return

    const rooms = await listRooms({ gameCode })
    const room = rooms.find(item => item.id === targetRoomId)
    if (room && (room.status === 'PLAYING' || room.status === '游戏中' || room.currentGameId) && room.currentGameId) {
      roomStore.setCurrentRoom({
        ...currentRoom.value,
        ...room,
        players: currentRoom.value?.players || room.players
      })
      navigateToGame({
        ...currentRoom.value,
        ...room
      })
    }
  } catch {
    realtimeConnected.value = false
  }
}

watch(
  () => [currentRoom.value?.status, currentRoom.value?.currentGameId],
  ([status, gameId]) => {
    if ((status === 'PLAYING' || status === '游戏中') && gameId) {
      navigateToGame(currentRoom.value)
    }
  }
)

onMounted(() => {
  roomStore.hydrateRoom()

  ensureRoomLoaded().then(loaded => {
    if (!loaded) return

    if ((currentRoom.value?.status === 'PLAYING' || currentRoom.value?.status === '游戏中') && currentRoom.value?.currentGameId) {
      navigateToGame(currentRoom.value)
      return
    }

    roomRefreshTimer = window.setInterval(() => {
      refreshRoomSnapshot().catch(() => {})
    }, 2000)

    unsubscribeStatus = realtimeService.onStatusChange(connected => {
      realtimeConnected.value = connected
    })

    unsubscribeSystemMessage = realtimeService.onSystemMessage(envelope => {
      if (envelope.event === 'AUTH_FAILED') {
        realtimeConnected.value = false
        message.value = envelope.message || '实时鉴权失败，当前房间可能无法同步其他玩家操作。'
      }

      if (envelope.event === 'ERROR') {
        message.value = envelope.message || '实时服务返回错误'
      }
    })

    realtimeService.subscribe(
      `room-${route.params.roomId}`,
      `/topic/room/${route.params.roomId}`,
      envelope => {
        if (envelope.scene === 'room') {
          roomStore.applyRoomEnvelope(envelope)
          if (envelope.event === 'PLAYER_JOINED') {
            message.value = '有新玩家加入房间，如已准备请重新确认准备状态。'
          } else {
            message.value = envelope.message || `已收到 ${envelope.event}`
          }
          if (envelope.event === 'GAME_STARTED') {
            const nextGameId = resolveRoomGameId(roomStore.currentRoom, envelope)
            if (nextGameId) {
              navigateToGame({
                ...roomStore.currentRoom,
                currentGameId: nextGameId,
                gameInstanceId: nextGameId
              })
            } else {
              refreshRoomSnapshot().catch(() => {})
            }
          }
        }
      }
    ).then(unsubscribe => {
      unsubscribeRoom = unsubscribe
    }).catch(() => {
      realtimeConnected.value = false
    })
  })
})

onUnmounted(() => {
  unsubscribeRoom?.()
  unsubscribeStatus?.()
  unsubscribeSystemMessage?.()
  if (roomRefreshTimer) {
    window.clearInterval(roomRefreshTimer)
    roomRefreshTimer = null
  }
})
</script>

<style scoped>
.room-page {
  min-height: 100vh;
  padding: 30px;
  background:
    radial-gradient(circle at top, rgba(210, 170, 40, 0.16), transparent 30%),
    radial-gradient(circle at 84% 16%, rgba(78, 124, 112, 0.16), transparent 24%),
    linear-gradient(160deg, #0b1c22 0%, #071014 100%);
  color: #f5ecd2;
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
  margin-bottom: 26px;
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
  font-size: 42px;
  color: #ffe5a5;
}

.room-meta {
  margin: 0;
  color: rgba(245, 236, 210, 0.65);
  font-size: 15px;
}

.header-actions {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255, 215, 107, 0.08);
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

.realtime-pill.offline {
  background: rgba(255, 120, 120, 0.12);
  color: #ffc1c1;
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
  border: 1px solid rgba(255,255,255,0.06);
}

.room-content {
  display: grid;
  gap: 22px;
}

.room-panel {
  background: rgba(6, 14, 18, 0.76);
  border: 1px solid rgba(255, 215, 107, 0.15);
  border-radius: 28px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(14px);
}

.summary-panel {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 26px;
  position: relative;
  overflow: hidden;
}

.summary-panel::after {
  content: '';
  position: absolute;
  width: 220px;
  height: 220px;
  right: -90px;
  top: -90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 107, 0.12), transparent 72%);
  pointer-events: none;
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

.panel-copy {
  max-width: 600px;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.summary-grid div {
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025));
  border: 1px solid rgba(255,255,255,0.04);
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  color: rgba(245, 236, 210, 0.48);
  font-size: 12px;
}

.summary-grid strong {
  font-size: 20px;
  color: #fff0c0;
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
  padding: 20px;
  border-radius: 22px;
  border: 1px dashed rgba(255, 215, 107, 0.2);
  background: rgba(255,255,255,0.03);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.seat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 215, 107, 0.3);
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
  color: #fff0c0;
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
  flex-wrap: wrap;
}


.secondary-btn,
.primary-btn {
  padding: 12px 18px;
}

.secondary-btn {
  background: rgba(255,255,255,0.08);
  color: #f5ecd2;
  border: 1px solid rgba(255,255,255,0.06);
}

.primary-btn {
  background: linear-gradient(135deg, #d3a137, #ffd76b);
  color: #241300;
  box-shadow: 0 12px 24px rgba(194, 138, 36, 0.22);
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.room-message {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.05);
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

  .room-page {
    padding: 18px;
  }

  .room-panel {
    padding: 20px;
    border-radius: 24px;
  }

  .room-header h1 {
    font-size: 34px;
  }
}
</style>