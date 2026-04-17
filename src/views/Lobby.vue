<template>
  <div class="lobby-page">
    <header class="lobby-header">
      <div>
        <p class="eyebrow">娱乐大厅</p>
        <h1>棋牌乐园</h1>
        <p class="welcome-copy">当前已接入山东麻将演示联调，并为房间系统和山东够级预留了大厅结构。</p>
      </div>
      <div class="header-right">
        <span class="realtime-pill" :class="{ online: realtimeConnected }">{{ realtimeLabel }}</span>
        <span class="username">👤 {{ username }}</span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </header>

    <main class="lobby-layout">
      <section class="hero-panel">
        <div>
          <p class="hero-label">今日可体验</p>
          <h2>{{ selectedGame.title }}</h2>
          <p class="hero-copy">{{ selectedGame.description }}</p>
        </div>
        <div class="hero-actions">
          <button class="primary-btn" @click="quickStart(selectedGame)">
            {{ selectedGame.quickStartMode ? '快速开始' : '进入房间' }}
          </button>
          <button
            class="secondary-btn"
            :disabled="!selectedGame.supportsRooms"
            @click="createRoom(selectedGame)"
          >
            创建房间
          </button>
        </div>
      </section>

      <section class="content-grid">
        <div class="panel">
          <div class="section-head">
            <h2>玩法列表</h2>
            <p>先把大厅和房间流转搭起来，后面再逐步替换为真实接口。</p>
          </div>
          <div class="game-grid">
            <article
              v-for="game in availableGames"
              :key="game.id"
              class="game-card"
              :class="{ active: game.id === selectedGame.id }"
              @click="chooseGame(game.id)"
            >
              <div class="card-top">
                <span class="game-badge">{{ game.badge }}</span>
                <span class="players-label">{{ game.playersLabel }}</span>
              </div>
              <h3>{{ game.title }}</h3>
              <p>{{ game.description }}</p>
              <div class="card-actions">
                <button class="card-btn" @click.stop="quickStart(game)">
                  {{ game.quickStartMode ? '快速开始' : '进入房间' }}
                </button>
                <button
                  class="card-btn muted"
                  :disabled="!game.supportsRooms"
                  @click.stop="createRoom(game)"
                >
                  创建房间
                </button>
              </div>
            </article>
          </div>
        </div>

        <div class="panel rooms-panel">
          <div class="section-head">
            <h2>房间列表</h2>
            <p>{{ selectedGame.title }} 的房间先用 Mock 数据占位，后续直接替换为后端接口。</p>
          </div>
          <div v-if="roomList.length" class="room-list">
            <article v-for="room in roomList" :key="room.id" class="room-item">
              <div>
                <h3>{{ room.gameTitle }}</h3>
                <p>房间号 {{ room.id }} · 房主 {{ room.ownerName }}</p>
              </div>
              <div class="room-meta">
                <span>{{ room.players.length }}/{{ room.maxPlayers }}</span>
                <span>{{ room.status }}</span>
                <button class="join-btn" @click="joinRoom(room)">加入</button>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <p>当前玩法还没有展示中的房间，先创建一个骨架房间即可继续联调。</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLobbyStore } from '../stores/lobby.js'
import { useRoomStore } from '../stores/room.js'
import { useUserStore } from '../stores/user.js'
import { realtimeService } from '../services/realtime.js'

const router = useRouter()
const lobbyStore = useLobbyStore()
const roomStore = useRoomStore()
const userStore = useUserStore()

const username = computed(() => userStore.username)
const availableGames = computed(() => lobbyStore.availableGames)
const selectedGame = computed(() => lobbyStore.selectedGame)
const roomList = computed(() => lobbyStore.filteredRooms)
const realtimeConnected = computed(() => lobbyStore.realtimeConnected)
const realtimeLabel = computed(() => realtimeConnected.value ? '实时已连接' : '实时未连接')
let unsubscribeLobby = null
let unsubscribeStatus = null

function chooseGame(gameId) {
  lobbyStore.selectGame(gameId)
}

function quickStart(game) {
  if (game.quickStartMode) {
    localStorage.setItem('gameMode', game.quickStartMode)
    router.push('/mahjong')
    return
  }
  createRoom(game)
}

function createRoom(game) {
  if (!game.supportsRooms) return
  const room = roomStore.createRoomFromGame(game, userStore.username)
  router.push(`/room/${room.id}`)
}

function joinRoom(room) {
  const joinedRoom = roomStore.joinRoom(room, userStore.username)
  router.push(`/room/${joinedRoom.id}`)
}

function logout() {
  userStore.logout()
  router.push('/login')
}

onMounted(async () => {
  unsubscribeStatus = realtimeService.onStatusChange(connected => {
    lobbyStore.setRealtimeConnected(connected)
  })

  try {
    unsubscribeLobby = await realtimeService.subscribe(
      'lobby-room-list',
      '/topic/lobby/rooms',
      envelope => {
        if (envelope.scene === 'lobby' && envelope.event === 'ROOM_LIST_UPDATED') {
          lobbyStore.applyRoomListEnvelope(envelope)
        }
      }
    )
  } catch {
    lobbyStore.setRealtimeConnected(false)
  }
})

onUnmounted(() => {
  unsubscribeLobby?.()
  unsubscribeStatus?.()
})
</script>

<style scoped>
.lobby-page {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(211, 161, 55, 0.2), transparent 28%),
    linear-gradient(155deg, #10251d 0%, #07120d 100%);
  color: #f7f0dc;
  font-family: 'Microsoft YaHei', sans-serif;
}

.lobby-header,
.hero-panel,
.content-grid {
  max-width: 1220px;
  margin: 0 auto;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 10px;
  color: rgba(247, 240, 220, 0.58);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 13px;
}

.lobby-header h1 {
  margin: 0 0 10px;
  font-size: 42px;
  color: #ffd76b;
}

.welcome-copy {
  margin: 0;
  max-width: 640px;
  color: rgba(247, 240, 220, 0.72);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.username {
  color: #ffd76b;
}

.realtime-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  color: rgba(247, 240, 220, 0.72);
  font-size: 12px;
}

.realtime-pill.online {
  background: rgba(67, 180, 121, 0.18);
  color: #8bf2bd;
}

.logout-btn,
.primary-btn,
.secondary-btn,
.card-btn,
.join-btn {
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
}

.logout-btn {
  padding: 12px 18px;
  background: rgba(255, 92, 92, 0.15);
  color: #ffb0b0;
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  margin-bottom: 24px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255, 215, 107, 0.16), rgba(255,255,255,0.03));
  border: 1px solid rgba(255, 215, 107, 0.18);
}

.hero-label {
  margin: 0 0 8px;
  color: rgba(247, 240, 220, 0.62);
}

.hero-panel h2 {
  margin: 0 0 10px;
  font-size: 30px;
  color: #fff2bc;
}

.hero-copy {
  margin: 0;
  max-width: 620px;
  color: rgba(247, 240, 220, 0.74);
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.primary-btn,
.secondary-btn,
.card-btn,
.join-btn {
  padding: 12px 18px;
}

.primary-btn,
.join-btn {
  background: linear-gradient(135deg, #cf9c26, #ffd76b);
  color: #2b1700;
}

.secondary-btn,
.card-btn.muted {
  background: rgba(255,255,255,0.08);
  color: #f7f0dc;
}

.secondary-btn:disabled,
.card-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
}

.panel {
  padding: 22px;
  border-radius: 26px;
  background: rgba(6, 12, 9, 0.72);
  border: 1px solid rgba(255, 215, 107, 0.12);
  box-shadow: 0 20px 60px rgba(0,0,0,0.24);
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-end;
  margin-bottom: 18px;
}

.section-head h2 {
  margin: 0 0 6px;
  color: #ffd76b;
}

.section-head p {
  margin: 0;
  color: rgba(247, 240, 220, 0.58);
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.game-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.game-card.active {
  border-color: rgba(255, 215, 107, 0.5);
  transform: translateY(-2px);
}

.card-top,
.room-meta,
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.game-badge,
.players-label {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  font-size: 12px;
}

.game-card h3,
.room-item h3 {
  margin: 16px 0 10px;
}

.game-card p,
.room-item p,
.empty-state p {
  margin: 0;
  color: rgba(247, 240, 220, 0.68);
}

.card-actions {
  margin-top: 18px;
}

.card-btn {
  flex: 1;
  background: linear-gradient(135deg, #cf9c26, #ffd76b);
  color: #2b1700;
}

.rooms-panel {
  display: flex;
  flex-direction: column;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255,255,255,0.04);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 18px;
}

@media (max-width: 980px) {
  .content-grid,
  .game-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .lobby-page,
  .lobby-header,
  .hero-panel,
  .section-head,
  .room-item,
  .hero-actions,
  .header-right {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
