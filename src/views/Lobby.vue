<template>
  <div class="lobby-page">
    <header class="lobby-header">
      <div>
        <p class="eyebrow">娱乐大厅</p>
        <h1>棋牌乐园</h1>
        <p class="welcome-copy">选择玩法、创建房间，和朋友一起开始一局牌。</p>
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
          <button class="primary-btn" :disabled="creatingRoom" @click="quickStart(selectedGame)">
            {{ selectedGame.quickStartMode ? '快速开始' : '进入房间' }}
          </button>
          <button
            class="secondary-btn"
            :disabled="!selectedGame.supportsRooms || creatingRoom"
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
            <p>当前可体验本地练习与山东麻将在线房间对局。</p>
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
                <button class="card-btn" :disabled="creatingRoom" @click.stop="quickStart(game)">
                  {{ game.quickStartMode ? '快速开始' : '进入房间' }}
                </button>
                <button
                  class="card-btn muted"
                  :disabled="!game.supportsRooms || creatingRoom"
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
            <p>{{ selectedGame.title }} 的在场房间会显示在这里。</p>
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
                <button class="join-btn" :disabled="joiningRoomId === room.id" @click="joinRoom(room)">
                  {{ joiningRoomId === room.id ? '加入中...' : '加入' }}
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <p>当前还没有可加入的房间，创建一个新房间开始吧。</p>
          </div>
          <p v-if="roomError" class="room-error">{{ roomError }}</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createRoom as createRoomRequest, joinRoom as joinRoomRequest, listRooms } from '../api/room.js'
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
const creatingRoom = ref(false)
const joiningRoomId = ref('')
const roomError = ref('')
let unsubscribeLobby = null
let unsubscribeStatus = null

function chooseGame(gameId) {
  lobbyStore.selectGame(gameId)
  loadRooms()
}

function quickStart(game) {
  if (game.supportsRooms) {
    createRoom(game)
    return
  }
  if (game.quickStartMode) {
    localStorage.setItem('gameMode', game.quickStartMode)
    router.push('/mahjong')
  }
}

async function loadRooms() {
  const game = selectedGame.value
  if (!game?.supportsRooms) return

  roomError.value = ''
  try {
    const rooms = await listRooms({ gameCode: game.gameCode, status: 'WAITING' })
    lobbyStore.setRoomsForGame(game.gameCode, rooms)
  } catch (error) {
    roomError.value = error instanceof Error ? error.message : '房间列表加载失败'
  }
}

async function createRoom(game) {
  if (!game.supportsRooms) return

  creatingRoom.value = true
  roomError.value = ''

  try {
    const room = await createRoomRequest({
      gameCode: game.gameCode,
      hostPlayerId: userStore.username,
      ownerName: userStore.username,
      hostPlayerName: userStore.username,
      roomName: `${game.title}房间`,
      maxPlayers: game.maxPlayers
    })
    roomStore.setCurrentRoom(room)
    localStorage.setItem('gameMode', game.quickStartMode || '')
    await router.push(`/room/${room.id}`)
    loadRooms().catch(() => {})
  } catch (error) {
    roomError.value = error instanceof Error ? error.message : '创建房间失败'
  } finally {
    creatingRoom.value = false
  }
}

async function joinRoom(room) {
  joiningRoomId.value = room.id
  roomError.value = ''

  try {
    const joinedRoom = await joinRoomRequest(room.id, {
      playerId: userStore.username,
      playerName: userStore.username
    })
    roomStore.setCurrentRoom(joinedRoom)
    localStorage.setItem('gameMode', room.gameId === 'standard-mahjong' ? 'standard' : 'shandong')
    router.push(`/room/${joinedRoom.id}`)
  } catch (error) {
    roomError.value = error instanceof Error ? error.message : '加入房间失败'
  } finally {
    joiningRoomId.value = ''
  }
}

function logout() {
  userStore.logout()
  router.push('/login')
}

onMounted(async () => {
  loadRooms()

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
  padding: 30px;
  background:
    radial-gradient(circle at top left, rgba(211, 161, 55, 0.2), transparent 28%),
    radial-gradient(circle at 85% 12%, rgba(63, 119, 93, 0.16), transparent 24%),
    linear-gradient(155deg, #10251d 0%, #07120d 100%);
  color: #f7f0dc;
  position: relative;
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
  margin-bottom: 26px;
}

.eyebrow {
  margin: 0 0 10px;
  color: rgba(247, 240, 220, 0.54);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 13px;
}

.lobby-header h1 {
  margin: 0 0 10px;
  font-size: 52px;
  color: #ffe6a8;
}

.welcome-copy {
  margin: 0;
  max-width: 680px;
  color: rgba(247, 240, 220, 0.7);
  font-size: 15px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 215, 107, 0.08);
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
  border: 1px solid rgba(255, 176, 176, 0.12);
}

.hero-panel {
  position: relative;
  display: grid;
  grid-template-columns: 1.2fr auto;
  justify-content: space-between;
  gap: 18px;
  padding: 30px;
  margin-bottom: 24px;
  border-radius: 32px;
  background:
    linear-gradient(135deg, rgba(255, 215, 107, 0.12), rgba(255,255,255,0.02)),
    rgba(9, 17, 14, 0.7);
  border: 1px solid rgba(255, 215, 107, 0.18);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.hero-panel::after {
  content: '';
  position: absolute;
  width: 240px;
  height: 240px;
  right: -70px;
  top: -80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 107, 0.15), transparent 70%);
  pointer-events: none;
}

.hero-label {
  margin: 0 0 8px;
  color: rgba(247, 240, 220, 0.62);
}

.hero-panel h2 {
  margin: 0 0 10px;
  font-size: 34px;
  color: #fff2bc;
}

.hero-copy {
  margin: 0;
  max-width: 620px;
  color: rgba(247, 240, 220, 0.74);
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  min-width: 190px;
  justify-content: center;
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
  gap: 22px;
}

.panel {
  padding: 24px;
  border-radius: 28px;
  background: rgba(6, 12, 9, 0.72);
  border: 1px solid rgba(255, 215, 107, 0.12);
  box-shadow: 0 20px 60px rgba(0,0,0,0.24);
  backdrop-filter: blur(14px);
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
  gap: 16px;
}

.game-card {
  position: relative;
  padding: 20px;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025));
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.game-card:hover {
  border-color: rgba(255, 215, 107, 0.26);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
}

.game-card.active {
  border-color: rgba(255, 215, 107, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 20px 42px rgba(0, 0, 0, 0.24);
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
  color: #ffefc0;
  font-size: 24px;
}

.game-card p,
.room-item p,
.empty-state p {
  margin: 0;
  color: rgba(247, 240, 220, 0.68);
  line-height: 1.6;
}

.card-actions {
  margin-top: 18px;
}

.card-btn {
  flex: 1;
  background: linear-gradient(135deg, #cf9c26, #ffd76b);
  color: #2b1700;
  box-shadow: 0 12px 22px rgba(187, 132, 31, 0.18);
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
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025));
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.room-item:hover {
  border-color: rgba(255, 215, 107, 0.18);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 22px;
  background: rgba(255,255,255,0.02);
}

.room-error {
  margin-top: 14px;
  color: #ffb6a6;
}

@media (max-width: 980px) {
  .content-grid,
  .game-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    min-width: 0;
    flex-direction: row;
    flex-wrap: wrap;
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

  .lobby-page {
    padding: 18px;
  }

  .lobby-header h1 {
    font-size: 40px;
  }

  .hero-panel,
  .panel {
    padding: 20px;
    border-radius: 24px;
  }
}
</style>
