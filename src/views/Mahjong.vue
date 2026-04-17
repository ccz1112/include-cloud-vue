<template>
  <div class="mahjong-app">
    <header class="header">
      <div class="header-left">
        <span class="logo-icon">🀄</span>
        <span class="logo-text">棋牌乐园 · {{ gameModeName }}</span>
      </div>
      <div class="header-center">
        <div class="turn-indicator">
          <span class="turn-dot" :class="turnDotClass"></span>
          <span class="turn-text">{{ turnText }}</span>
        </div>
      </div>
      <div class="header-right">
        <span class="realtime-pill" :class="{ online: realtimeConnected }">{{ realtimeLabel }}</span>
        <span class="username">👤 {{ username }}</span>
        <span class="coins">💰 {{ coins }}</span>
        <button class="back-btn" @click="backToLobby">返回大厅</button>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </header>

    <div class="game-area">
      <div class="player-area top-player">
        <div class="player-info" :class="{ 'is-turn': currentTurn === 'top' }">
          <div class="avatar">🤖</div>
          <div>
            <div class="player-name">{{ players.top.name }}</div>
            <div class="player-score">得分 {{ players.top.score }}</div>
          </div>
          <div class="turn-arrow" v-if="currentTurn === 'top'">▼</div>
        </div>
        <div class="hidden-tiles">
          <div v-for="i in players.top.tileCount" :key="i" class="tile tile-back"></div>
        </div>
        <div class="discard-area">
          <div
            v-for="(tile, i) in players.top.discards"
            :key="tile.id || i"
            class="tile tile-small"
            :class="`suit-${tile.suitClass}`"
          >
            <span class="s-num">{{ tile.numChar }}</span>
            <span v-if="tile.suit" class="s-suit">{{ tile.suit }}</span>
          </div>
        </div>
      </div>

      <div class="middle-row">
        <div class="player-area left-player">
          <div class="player-info vertical" :class="{ 'is-turn': currentTurn === 'left' }">
            <div class="avatar">🤖</div>
            <div class="player-name">{{ players.left.name }}</div>
            <div class="player-score">{{ players.left.score }}</div>
            <div class="turn-arrow-right" v-if="currentTurn === 'left'">▶</div>
          </div>
          <div class="hidden-tiles vertical">
            <div v-for="i in players.left.tileCount" :key="i" class="tile tile-back tile-vert"></div>
          </div>
          <div class="discard-area discard-v">
            <div
              v-for="(tile, i) in players.left.discards"
              :key="tile.id || i"
              class="tile tile-small"
              :class="`suit-${tile.suitClass}`"
            >
              <span class="s-num">{{ tile.numChar }}</span>
              <span v-if="tile.suit" class="s-suit">{{ tile.suit }}</span>
            </div>
          </div>
        </div>

        <div class="center-table">
          <div class="table-top">
            <div class="wind-round">
              <span class="wind-badge">{{ currentWind }}</span>
              <span class="round-text">第 {{ round }} 局</span>
            </div>
            <div class="remaining">
              <span class="remaining-label">剩余</span>
              <span class="remaining-num">{{ remainingTiles }}</span>
              <span class="remaining-label">张</span>
            </div>
          </div>

          <div v-if="lastDiscard" class="last-discard-wrap">
            <div class="last-discard-label">最新出牌</div>
            <div class="tile tile-last" :class="`suit-${lastDiscard.suitClass}`">
              <span class="s-num last-num">{{ lastDiscard.numChar }}</span>
              <span v-if="lastDiscard.suit" class="s-suit last-suit">{{ lastDiscard.suit }}</span>
            </div>
          </div>

          <div v-if="gameState === 'action'" class="action-buttons">
            <button
              v-for="action in availableActions"
              :key="action.type"
              class="action-btn"
              :class="action.type"
              @click="doAction(action.type)"
            >{{ action.label }}</button>
          </div>

          <div class="game-status">
            <span :class="statusClass">{{ statusText }}</span>
          </div>

          <div v-if="isBackendDemoMode" class="backend-banner" :class="{ error: remoteError }">
            <span class="backend-note">{{ backendModeNote }}</span>
            <button class="reload-btn" :disabled="loadingRemote" @click="loadRemoteGame">
              {{ loadingRemote ? '联调中...' : '重新发牌' }}
            </button>
            <div class="backend-tools">
              <button
                v-for="action in backendTestActions"
                :key="action.key"
                class="tool-btn"
                :disabled="!!runningTest"
                @click="runBackendTest(action)"
              >
                {{ runningTest === action.key ? '测试中...' : action.label }}
              </button>
            </div>
            <div v-if="testResult" class="test-result">{{ testResult }}</div>
          </div>
        </div>

        <div class="player-area right-player">
          <div class="discard-area discard-v">
            <div
              v-for="(tile, i) in players.right.discards"
              :key="tile.id || i"
              class="tile tile-small"
              :class="`suit-${tile.suitClass}`"
            >
              <span class="s-num">{{ tile.numChar }}</span>
              <span v-if="tile.suit" class="s-suit">{{ tile.suit }}</span>
            </div>
          </div>
          <div class="hidden-tiles vertical">
            <div v-for="i in players.right.tileCount" :key="i" class="tile tile-back tile-vert"></div>
          </div>
          <div class="player-info vertical" :class="{ 'is-turn': currentTurn === 'right' }">
            <div class="turn-arrow-left" v-if="currentTurn === 'right'">◀</div>
            <div class="avatar">🤖</div>
            <div class="player-name">{{ players.right.name }}</div>
            <div class="player-score">{{ players.right.score }}</div>
          </div>
        </div>
      </div>

      <div class="player-area bottom-player">
        <div class="my-discards-wrap">
          <div class="discard-area my-discards">
            <div
              v-for="(tile, i) in myDiscards"
              :key="tile.id || i"
              class="tile tile-small"
              :class="`suit-${tile.suitClass}`"
            >
              <span class="s-num">{{ tile.numChar }}</span>
              <span v-if="tile.suit" class="s-suit">{{ tile.suit }}</span>
            </div>
          </div>
        </div>

        <div class="my-hand-wrap">
          <div class="my-hand">
            <template v-for="item in handWithSeparators" :key="item.key">
              <div v-if="item.isSeparator" class="hand-sep"></div>
              <div
                v-else
                class="tile tile-hand"
                :class="[
                  `suit-${item.suitClass}`,
                  {
                    selected: selectedTile === item.originalIdx,
                    disabled: currentTurn !== 'me' || gameState !== 'myTurn' || !!pendingCommand
                  }
                ]"
                @click="selectTile(item.originalIdx)"
              >
                <span class="h-num">{{ item.numChar }}</span>
                <span v-if="item.suit" class="h-suit">{{ item.suit }}</span>
              </div>
            </template>
          </div>

          <div v-if="currentTurn === 'me' && gameState === 'myTurn'" class="discard-action">
            <button class="discard-btn" :disabled="selectedTile === null || !!pendingCommand" @click="discardSelected">
              {{ pendingCommand ? '等待确认...' : '出牌' }}
            </button>
          </div>
          <div v-else-if="gameState === 'aiTurn'" class="waiting-hint">
            <span>{{ pendingCommand ? '指令已发送，等待服务端广播...' : '等待 AI 出牌...' }}</span>
          </div>
          <div v-else-if="isBackendDemoMode" class="waiting-hint backend-hint">
            <span>{{ canSendRealtimeCommand ? '当前牌桌支持实时动作发送，结果以服务端广播为准' : '当前牌桌已接入实时广播，待补动作发送地址后可联调出牌与操作' }}</span>
          </div>
        </div>

        <div class="player-info self-info" :class="{ 'is-turn': currentTurn === 'me' }">
          <div class="avatar">😊</div>
          <div>
            <div class="player-name">{{ selfSeatName }}</div>
            <div class="player-score">得分 {{ myScore }}</div>
          </div>
          <div class="turn-arrow-up" v-if="currentTurn === 'me'">▲</div>
        </div>
      </div>
    </div>

    <div v-if="showWinModal" class="win-modal">
      <div class="win-content">
        <div class="win-icon">🎉</div>
        <h2>{{ winMessage }}</h2>
        <p>本局得分：<strong>+{{ winScore }}</strong></p>
        <div class="win-btns">
          <button class="new-game-btn" @click="newGame">再来一局</button>
          <button class="lobby-btn" @click="backToLobby">返回大厅</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  initMahjongGame,
  dealMahjongGame,
  testTilePool,
  testSevenPairs,
  testThirteenOrphans,
  testStandardWin
} from '../api/mahjong.js'
import { realtimeService } from '../services/realtime.js'
import { useRoomStore } from '../stores/room.js'
import { useMahjongGameStore } from '../stores/mahjongGame.js'

const router = useRouter()
const route = useRoute()
const roomStore = useRoomStore()
const mahjongGameStore = useMahjongGameStore()
const username = ref(localStorage.getItem('username') || '玩家')
const selfSeatName = ref(username.value)
const coins = ref(10000)
const myScore = ref(0)
const round = ref(1)
const currentWind = ref('东风')
const remainingTiles = ref(0)
const gameState = ref('myTurn') // myTurn | aiTurn | action | backendDemo
const selectedTile = ref(null)
const lastDiscard = ref(null)
const showWinModal = ref(false)
const winMessage = ref('')
const winScore = ref(0)
const loadingRemote = ref(false)
const remoteError = ref('')
const runningTest = ref('')
const testResult = ref('')
const realtimeActionTile = ref(null)
let unsubscribeGame = null
let unsubscribeRealtimeStatus = null
let unsubscribeSystemMessage = null

const gameMode = ref(localStorage.getItem('gameMode') || 'standard')
const gameModeName = computed(() => gameMode.value === 'shandong' ? '山东麻将' : '大众麻将')
const isBackendDemoMode = computed(() => gameMode.value === 'shandong')
const activeRoomId = computed(() => route.query.roomId || roomStore.currentRoom?.id || mahjongGameStore.roomId)
const activeGameId = computed(() => route.query.gameId || roomStore.currentRoom?.gameInstanceId || mahjongGameStore.gameId)
const isRealtimeDriven = computed(() => isBackendDemoMode.value && !!activeGameId.value)
const realtimeConnected = computed(() => mahjongGameStore.realtimeConnected)
const realtimeLabel = computed(() => realtimeConnected.value ? '对局实时已连接' : '对局实时未连接')
const pendingCommand = computed(() => mahjongGameStore.pendingCommand)
const canSendRealtimeCommand = computed(() => {
  return isRealtimeDriven.value && !!import.meta.env.VITE_MAHJONG_ACTION_DESTINATION
})

const TURN_ORDER = ['me', 'left', 'top', 'right']
const currentTurnIdx = ref(0)
const currentTurn = computed(() => TURN_ORDER[currentTurnIdx.value])

const TILES_STANDARD = {
  wan: ['一万','二万','三万','四万','五万','六万','七万','八万','九万'],
  tiao: ['一条','二条','三条','四条','五条','六条','七条','八条','九条'],
  tong: ['一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒'],
  feng: ['东风','南风','西风','北风'],
  jian: ['中','发','白']
}
const TILES_SHANDONG = {
  wan: ['一万','二万','三万','四万','五万','六万','七万','八万','九万'],
  tiao: ['一条','二条','三条','四条','五条','六条','七条','八条','九条'],
  tong: ['一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒']
}
const ALL_TILES = {
  wan: ['一万','二万','三万','四万','五万','六万','七万','八万','九万'],
  tiao: ['一条','二条','三条','四条','五条','六条','七条','八条','九条'],
  tong: ['一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒'],
  feng: ['东风','南风','西风','北风'],
  jian: ['中','发','白']
}

const TILE_ORDER = {}
ALL_TILES.wan.forEach((name, index) => { TILE_ORDER[name] = index })
ALL_TILES.tiao.forEach((name, index) => { TILE_ORDER[name] = 10 + index })
ALL_TILES.tong.forEach((name, index) => { TILE_ORDER[name] = 20 + index })
ALL_TILES.feng.forEach((name, index) => { TILE_ORDER[name] = 30 + index })
ALL_TILES.jian.forEach((name, index) => { TILE_ORDER[name] = 40 + index })

const NUM_MAP = { '一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9' }

const myHand = ref([])
const myDiscards = ref([])
let gameDeck = []

const players = reactive({
  top: { name: '对家', tileCount: 13, score: 0, discards: [] },
  left: { name: '下家', tileCount: 13, score: 0, discards: [] },
  right: { name: '上家', tileCount: 13, score: 0, discards: [] }
})

const turnText = computed(() => {
  const names = {
    me: selfSeatName.value,
    left: players.left.name,
    top: players.top.name,
    right: players.right.name
  }
  return `${names[currentTurn.value]} 出牌`
})

const turnDotClass = computed(() => ({
  'dot-me': currentTurn.value === 'me',
  'dot-ai': currentTurn.value !== 'me'
}))

const availableActions = computed(() => {
  if (gameState.value !== 'action') return []
  if (mahjongGameStore.currentActions.length) {
    return mahjongGameStore.currentActions
  }
  return [
    { type: 'chi', label: '吃' },
    { type: 'peng', label: '碰' },
    { type: 'gang', label: '杠' },
    { type: 'hu', label: '胡' },
    { type: 'pass', label: '过' }
  ]
})

const statusText = computed(() => {
  if (loadingRemote.value) return '正在请求后端初始化并发牌...'
  if (remoteError.value) return remoteError.value
  if (pendingCommand.value) return `已发送 ${pendingCommand.value} 指令，等待服务端广播结果`
  if (isRealtimeDriven.value && gameState.value === 'action' && realtimeActionTile.value) {
    return `收到 ${realtimeActionTile.value.name} 的可操作提示，请选择动作`
  }
  if (isRealtimeDriven.value && currentTurn.value === 'me') return '当前牌局由实时广播驱动，可按服务端规则执行操作'
  if (mahjongGameStore.latestEvent) return `实时事件：${mahjongGameStore.latestEvent}`
  if (currentTurn.value === 'me' && gameState.value === 'myTurn') return '请选择一张牌出牌'
  if (gameState.value === 'aiTurn') return `${turnText.value}中...`
  if (gameState.value === 'action') return '是否响应？'
  if (isBackendDemoMode.value) return '当前为后端演示模式，动作流程由前端 Mock 驱动'
  return ''
})

const statusClass = computed(() => ({
  'status-myturn': !isBackendDemoMode.value && currentTurn.value === 'me' && gameState.value === 'myTurn',
  'status-waiting': !isBackendDemoMode.value && gameState.value === 'aiTurn',
  'status-action': !isBackendDemoMode.value && gameState.value === 'action',
  'status-remote': isBackendDemoMode.value && !remoteError.value,
  'status-error': isBackendDemoMode.value && !!remoteError.value
}))

const backendModeNote = computed(() => {
  if (!isBackendDemoMode.value) return ''
  if (remoteError.value) return '后端接口请求失败，确认 Spring Boot 服务已启动在 127.0.0.1:9998。'
  if (isRealtimeDriven.value && !canSendRealtimeCommand.value) return '已接入实时对局广播；若要联调出牌和吃碰杠胡，请配置 VITE_MAHJONG_ACTION_DESTINATION。'
  if (activeGameId.value) return `已接入实时对局主题：${activeGameId.value}`
  return '已按文档对接初始化和发牌接口；当前牌局从后端开局，后续出牌、吃碰杠胡先由前端 Mock 维持交互。'
})

const backendTestActions = [
  { key: 'tilePool', label: '牌库测试', handler: testTilePool },
  { key: 'sevenPairs', label: '七小对', handler: testSevenPairs },
  { key: 'thirteenOrphans', label: '十三幺', handler: testThirteenOrphans },
  { key: 'standardWin', label: '标准胡', handler: testStandardWin }
]

function normalizeActionType(action) {
  const value = String(action || '').toLowerCase()
  const aliasMap = {
    chow: 'chi',
    pong: 'peng',
    kong: 'gang',
    win: 'hu',
    pass: 'pass'
  }
  return aliasMap[value] || value
}

function getActionLabel(type) {
  const labels = {
    chi: '吃',
    peng: '碰',
    gang: '杠',
    hu: '胡',
    pass: '过',
    discard: '出牌'
  }
  return labels[type] || type
}

function getRealtimeActionEvent(type) {
  const actionMap = {
    chi: 'CHOW',
    peng: 'PONG',
    gang: 'KONG',
    hu: 'WIN',
    pass: 'PASS',
    discard: 'DISCARD'
  }
  return actionMap[type] || String(type || '').toUpperCase()
}

function buildRealtimeCommand(event, payload = {}) {
  return {
    scene: 'mahjong',
    event,
    traceId: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: Date.now(),
    roomId: activeRoomId.value || undefined,
    gameId: activeGameId.value || undefined,
    gameCode: 'SHANDONG_MAHJONG',
    payload
  }
}

async function sendRealtimeCommand(type, payload = {}) {
  if (!canSendRealtimeCommand.value) {
    remoteError.value = '缺少实时动作发送地址，请在环境变量中配置 VITE_MAHJONG_ACTION_DESTINATION。'
    return false
  }

  if (!realtimeConnected.value) {
    remoteError.value = '实时连接未建立，暂时无法发送动作。'
    return false
  }

  const event = getRealtimeActionEvent(type)
  remoteError.value = ''
  mahjongGameStore.setPendingCommand(getActionLabel(type))

  try {
    await realtimeService.publish(
      import.meta.env.VITE_MAHJONG_ACTION_DESTINATION,
      buildRealtimeCommand(event, payload)
    )
    return true
  } catch (error) {
    mahjongGameStore.setPendingCommand('')
    remoteError.value = error instanceof Error ? error.message : '实时动作发送失败'
    return false
  }
}

function parseTile(name) {
  for (const suit of ['万', '条', '筒']) {
    if (name.endsWith(suit)) {
      return {
        numChar: NUM_MAP[name[0]] ?? name[0],
        suit,
        suitClass: { '万': 'wan', '条': 'tiao', '筒': 'tong' }[suit]
      }
    }
  }
  if (['东风', '南风', '西风', '北风'].includes(name)) {
    return { numChar: name[0], suit: '风', suitClass: 'feng' }
  }
  if (name === '中') return { numChar: '中', suit: '', suitClass: 'zhong' }
  if (name === '发') return { numChar: '发', suit: '', suitClass: 'fa' }
  if (name === '白') return { numChar: '白', suit: '', suitClass: 'bai' }
  return { numChar: name, suit: '', suitClass: 'other' }
}

function makeTile(name) {
  return { name, ...parseTile(name) }
}

function formatTileNameFromApi(tile) {
  if (!tile) return ''
  if (tile.displayName) return tile.displayName

  const typeMap = {
    BAMBOO: '条',
    CHARACTER: '万',
    DOT: '筒'
  }
  const windMap = {
    EAST: '东风',
    SOUTH: '南风',
    WEST: '西风',
    NORTH: '北风',
    东: '东风',
    南: '南风',
    西: '西风',
    北: '北风'
  }
  const dragonMap = {
    RED: '中',
    GREEN: '发',
    WHITE: '白',
    中: '中',
    发: '发',
    白: '白'
  }

  if (tile.type === 'WIND') return windMap[tile.value] || `${tile.value}风`
  if (tile.type === 'DRAGON') return dragonMap[tile.value] || tile.value
  if (typeMap[tile.type]) return `${tile.value}${typeMap[tile.type]}`
  return `${tile.value || ''}`
}

function normalizeRemoteTile(tile, index = 0) {
  const name = formatTileNameFromApi(tile)
  return {
    id: tile?.id || `${name}-${index}`,
    raw: tile,
    name,
    ...parseTile(name)
  }
}

function normalizeRemoteTiles(tiles = []) {
  return tiles.map((tile, index) => normalizeRemoteTile(tile, index))
}

function sortHand(hand) {
  return [...hand].sort((left, right) => (TILE_ORDER[left.name] ?? 99) - (TILE_ORDER[right.name] ?? 99))
}

function getTileCategory(name) {
  if (ALL_TILES.wan.includes(name)) return 'wan'
  if (ALL_TILES.tiao.includes(name)) return 'tiao'
  if (ALL_TILES.tong.includes(name)) return 'tong'
  if (ALL_TILES.feng.includes(name)) return 'feng'
  if (ALL_TILES.jian.includes(name)) return 'jian'
  return 'other'
}

const handWithSeparators = computed(() => {
  const sorted = sortHand(myHand.value)
  const result = []
  let lastCategory = null
  const used = new Set()

  sorted.forEach((tile, index) => {
    const category = getTileCategory(tile.name)
    if (lastCategory !== null && category !== lastCategory) {
      result.push({ isSeparator: true, key: `sep-${index}` })
    }

    let originalIdx = -1
    for (let i = 0; i < myHand.value.length; i++) {
      if (myHand.value[i].name === tile.name && !used.has(i)) {
        originalIdx = i
        used.add(i)
        break
      }
    }

    result.push({ ...tile, originalIdx, isSeparator: false, key: `tile-${index}` })
    lastCategory = category
  })

  return result
})

function buildDeck() {
  const defs = gameMode.value === 'shandong' ? TILES_SHANDONG : TILES_STANDARD
  const deck = []
  Object.values(defs).forEach(group => {
    group.forEach(name => {
      for (let i = 0; i < 4; i++) deck.push(makeTile(name))
    })
  })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function setSidePlayer(target, player, fallbackName) {
  target.name = player?.playerName || fallbackName
  target.tileCount = player?.handTiles?.length ?? 0
  target.score = player?.winFan ?? 0
  target.discards = normalizeRemoteTiles(player?.discardedTiles || [])
}

function resetTable() {
  selfSeatName.value = username.value
  myHand.value = []
  myDiscards.value = []
  myScore.value = 0
  round.value = 1
  currentWind.value = '东风'
  remainingTiles.value = 0
  selectedTile.value = null
  realtimeActionTile.value = null
  lastDiscard.value = null
  currentTurnIdx.value = 0
  players.top.name = '对家'
  players.top.tileCount = 13
  players.top.score = 0
  players.top.discards = []
  players.left.name = '下家'
  players.left.tileCount = 13
  players.left.score = 0
  players.left.discards = []
  players.right.name = '上家'
  players.right.tileCount = 13
  players.right.score = 0
  players.right.discards = []
}

function applyRemoteGame(game) {
  resetTable()
  mahjongGameStore.setGame(game)
  mahjongGameStore.setLastDiscard(game?.lastDiscardedTile || null)
  mahjongGameStore.setPendingCommand('')
  mahjongGameStore.setCurrentActions([])
  round.value = game?.round || 1
  remainingTiles.value = game?.tilePool?.length ?? 0
  currentTurnIdx.value = Math.min(Math.max(game?.currentPlayerPosition ?? 0, 0), TURN_ORDER.length - 1)
  currentWind.value = game?.dealerPosition === 0 ? '东风' : `庄家位 ${game.dealerPosition + 1}`
  selectedTile.value = null
  lastDiscard.value = game?.lastDiscardedTile ? normalizeRemoteTile(game.lastDiscardedTile) : null
  gameDeck = normalizeRemoteTiles(game?.tilePool || [])
  showWinModal.value = false
  winMessage.value = ''
  winScore.value = 0

  const positionMap = new Map((game?.players || []).map(player => [player.position, player]))
  const me = positionMap.get(0)
  const left = positionMap.get(1)
  const top = positionMap.get(2)
  const right = positionMap.get(3)

  selfSeatName.value = me?.playerName || username.value
  myHand.value = sortHand(normalizeRemoteTiles(me?.handTiles || []))
  myDiscards.value = normalizeRemoteTiles(me?.discardedTiles || [])
  myScore.value = me?.winFan ?? 0

  setSidePlayer(players.left, left, '下家')
  setSidePlayer(players.top, top, '对家')
  setSidePlayer(players.right, right, '上家')

  gameState.value = currentTurn.value === 'me' ? 'myTurn' : 'aiTurn'
  if (!isRealtimeDriven.value && currentTurn.value !== 'me') {
    const delay = 800 + Math.random() * 700
    setTimeout(() => runAiTurn(), delay)
  }
}

async function loadRemoteGame() {
  loadingRemote.value = true
  remoteError.value = ''

  try {
    const initializedGame = await initMahjongGame()
    const dealtGame = await dealMahjongGame(initializedGame)
    applyRemoteGame(dealtGame)
  } catch (error) {
    resetTable()
    gameDeck = []
    gameState.value = 'idle'
    remoteError.value = error instanceof Error ? error.message : '后端请求失败'
  } finally {
    loadingRemote.value = false
  }
}

function handleRealtimeEnvelope(envelope) {
  if (envelope.scene !== 'mahjong') return

  mahjongGameStore.setLatestEvent(envelope.event)
  mahjongGameStore.setPendingCommand('')
  mahjongGameStore.setContext({
    roomId: envelope.roomId,
    gameId: envelope.gameId
  })

  if (envelope.payload?.gameSnapshot) {
    applyRemoteGame(envelope.payload.gameSnapshot)
  }

  if (envelope.payload?.tile) {
    lastDiscard.value = normalizeRemoteTile(envelope.payload.tile)
    mahjongGameStore.setLastDiscard(envelope.payload.tile)
  }

  if (envelope.event === 'ACTION_AVAILABLE') {
    realtimeActionTile.value = envelope.payload?.relatedTile ? normalizeRemoteTile(envelope.payload.relatedTile) : null
    if (envelope.payload?.playerPosition !== 0) {
      mahjongGameStore.setCurrentActions([])
      gameState.value = currentTurn.value === 'me' ? 'myTurn' : 'aiTurn'
      return
    }

    const actions = (envelope.payload?.actions || []).map(action => {
      const type = normalizeActionType(action)
      return { type, label: getActionLabel(type) }
    })
    mahjongGameStore.setCurrentActions(actions)
    gameState.value = 'action'
    return
  }

  realtimeActionTile.value = null
  mahjongGameStore.setCurrentActions([])

  if (envelope.event === 'TILE_DRAWN' || envelope.event === 'DEAL_COMPLETED') {
    gameState.value = currentTurn.value === 'me' ? 'myTurn' : 'aiTurn'
  }

  if (envelope.event === 'TILE_DISCARDED' || envelope.event === 'PONG_COMPLETED' || envelope.event === 'CHOW_COMPLETED' || envelope.event === 'KONG_COMPLETED') {
    gameState.value = currentTurn.value === 'me' ? 'myTurn' : 'aiTurn'
  }

  if (envelope.event === 'ROUND_SETTLED') {
    const fan = envelope.payload?.winInfo?.fan || 0
    winMessage.value = '本局已结算'
    winScore.value = fan
    showWinModal.value = true
  }
}

function handleSystemEnvelope(envelope) {
  if (envelope.scene !== 'system' && envelope.event !== 'ERROR') return

  if (envelope.event === 'AUTH_FAILED') {
    remoteError.value = envelope.message || '实时鉴权失败'
    return
  }

  if (envelope.event === 'AUTH_SUCCESS') {
    remoteError.value = ''
    return
  }

  if (envelope.event === 'PONG') {
    return
  }

  if (envelope.event === 'ERROR') {
    mahjongGameStore.setPendingCommand('')
    remoteError.value = envelope.message || '实时服务返回错误'
  }
}

async function subscribeGameTopic() {
  if (!activeGameId.value) return

  unsubscribeGame?.()
  try {
    unsubscribeGame = await realtimeService.subscribe(
      `mahjong-game-${activeGameId.value}`,
      `/topic/game/${activeGameId.value}`,
      handleRealtimeEnvelope
    )
  } catch {
    mahjongGameStore.setRealtimeConnected(false)
  }
}

async function runBackendTest(action) {
  runningTest.value = action.key
  testResult.value = ''

  try {
    const result = await action.handler()
    testResult.value = typeof result === 'string' ? result : JSON.stringify(result)
  } catch (error) {
    testResult.value = error instanceof Error ? error.message : '测试接口调用失败'
  } finally {
    runningTest.value = ''
  }
}

function selectTile(index) {
  if (isRealtimeDriven.value && !canSendRealtimeCommand.value) return
  if (currentTurn.value !== 'me' || gameState.value !== 'myTurn') return
  selectedTile.value = selectedTile.value === index ? null : index
}

async function discardSelected() {
  if (selectedTile.value === null) return
  if (currentTurn.value !== 'me' || gameState.value !== 'myTurn') return

  const tile = myHand.value[selectedTile.value]

  if (isRealtimeDriven.value) {
    const sent = await sendRealtimeCommand('discard', {
      playerPosition: 0,
      tile: tile?.raw || {
        displayName: tile?.name,
        value: tile?.numChar
      }
    })
    if (sent) {
      gameState.value = 'aiTurn'
      selectedTile.value = null
    }
    return
  }

  const removedTile = myHand.value.splice(selectedTile.value, 1)[0]
  myDiscards.value.push(removedTile)
  lastDiscard.value = removedTile
  selectedTile.value = null
  advanceTurn()
}

function advanceTurn() {
  if (isRealtimeDriven.value) return
  currentTurnIdx.value = (currentTurnIdx.value + 1) % TURN_ORDER.length
  if (currentTurn.value === 'me') {
    gameState.value = 'myTurn'
    drawTile()
  } else {
    gameState.value = 'aiTurn'
    const delay = 800 + Math.random() * 700
    setTimeout(() => runAiTurn(), delay)
  }
}

function runAiTurn() {
  if (isRealtimeDriven.value) return
  if (loadingRemote.value || currentTurn.value === 'me') return
  const key = currentTurn.value
  const tile = gameDeck.length > 0 ? gameDeck.pop() : randomTile()
  players[key].discards.push(tile)
  lastDiscard.value = tile
  remainingTiles.value = Math.max(0, remainingTiles.value - 1)

  if (Math.random() < 0.22) {
    gameState.value = 'action'
    setTimeout(() => {
      if (gameState.value === 'action') doAction('pass')
    }, 5000)
  } else {
    advanceTurn()
  }
}

function randomTile() {
  const defs = gameMode.value === 'shandong' ? TILES_SHANDONG : TILES_STANDARD
  const all = Object.values(defs).flat()
  return makeTile(all[Math.floor(Math.random() * all.length)])
}

function drawTile() {
  if (isRealtimeDriven.value) return
  if (remainingTiles.value <= 0) return
  const tile = gameDeck.length > 0 ? gameDeck.pop() : randomTile()
  myHand.value.push(tile)
  myHand.value = sortHand(myHand.value)
  remainingTiles.value = Math.max(0, remainingTiles.value - 1)
}

async function doAction(type) {
  if (isRealtimeDriven.value) {
    const sent = await sendRealtimeCommand(type, {
      playerPosition: 0,
      relatedTile: realtimeActionTile.value?.raw || null,
      action: getRealtimeActionEvent(type)
    })
    if (sent) {
      gameState.value = 'aiTurn'
      mahjongGameStore.setCurrentActions([])
    }
    return
  }
  if (type === 'hu') {
    const fan = isBackendDemoMode.value ? 4 : 8
    winMessage.value = isBackendDemoMode.value ? '模拟胡牌成功！🎉' : '自摸胡牌！🎉'
    winScore.value = fan
    myScore.value += fan
    showWinModal.value = true
    return
  }
  if (type === 'gang') {
    gameState.value = 'myTurn'
    drawTile()
    return
  }
  if (type === 'chi' || type === 'peng') {
    gameState.value = 'myTurn'
    currentTurnIdx.value = 0
    drawTile()
    return
  }
  advanceTurn()
}

function newGame() {
  showWinModal.value = false
  if (isBackendDemoMode.value) {
    loadRemoteGame()
    return
  }
  round.value++
  initLocalGame()
}

function initLocalGame() {
  resetTable()
  gameDeck = buildDeck()
  myHand.value = sortHand(gameDeck.splice(0, 13))
  players.top.tileCount = 13
  gameDeck.splice(0, 13)
  players.left.tileCount = 13
  gameDeck.splice(0, 13)
  players.right.tileCount = 13
  gameDeck.splice(0, 13)
  players.top.discards = []
  players.left.discards = []
  players.right.discards = []
  myDiscards.value = []
  remainingTiles.value = gameDeck.length
  selectedTile.value = null
  lastDiscard.value = null
  currentTurnIdx.value = 0
  gameState.value = 'myTurn'
}

function backToLobby() {
  router.push('/lobby')
}

function logout() {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('username')
  localStorage.removeItem('token')
  localStorage.removeItem('gameMode')
  router.push('/login')
}

onMounted(() => {
  roomStore.hydrateRoom()
  mahjongGameStore.setContext({
    roomId: activeRoomId.value,
    gameId: activeGameId.value
  })

  unsubscribeRealtimeStatus = realtimeService.onStatusChange(connected => {
    mahjongGameStore.setRealtimeConnected(connected)
  })
  unsubscribeSystemMessage = realtimeService.onSystemMessage(handleSystemEnvelope)

  if (isBackendDemoMode.value) {
    if (roomStore.currentRoom?.gameSnapshot) {
      applyRemoteGame(roomStore.currentRoom.gameSnapshot)
    }
    if (activeGameId.value) {
      subscribeGameTopic()
      return
    }
    loadRemoteGame()
    return
  }
  initLocalGame()
})

onUnmounted(() => {
  unsubscribeGame?.()
  unsubscribeRealtimeStatus?.()
  unsubscribeSystemMessage?.()
  mahjongGameStore.setPendingCommand('')
  mahjongGameStore.setCurrentActions([])
})
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.mahjong-app {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(40,110,40,0.55) 0%, transparent 55%),
    linear-gradient(180deg, #0e2e10 0%, #061006 100%);
  display: flex;
  flex-direction: column;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  color: #fff;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: rgba(0,0,0,0.55);
  border-bottom: 1px solid rgba(255,215,0,0.2);
  backdrop-filter: blur(6px);
  flex-shrink: 0;
  gap: 12px;
}
.header-left { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.logo-icon { font-size: 24px; }
.logo-text { font-size: 16px; font-weight: 700; color: #ffd700; letter-spacing: 1px; }

.header-center { display: flex; align-items: center; flex: 1; justify-content: center; }
.turn-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 4px 16px;
}
.turn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: blink 1.2s infinite;
}
.dot-me { background: #2ecc71; box-shadow: 0 0 8px #2ecc71; }
.dot-ai { background: #f0a030; box-shadow: 0 0 8px #f0a030; }
.turn-text { font-size: 13px; color: rgba(255,255,255,0.85); white-space: nowrap; }

.header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.realtime-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.72);
  font-size: 12px;
}
.realtime-pill.online {
  background: rgba(67, 180, 121, 0.18);
  color: #8bf2bd;
}
.username { font-size: 13px; color: #ffd700; }
.coins { font-size: 13px; color: #ffd700; font-weight: 600; }
.back-btn {
  padding: 5px 12px;
  background: rgba(255,215,0,0.12);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 6px;
  color: #ffd700;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.2s;
}
.back-btn:hover { background: rgba(255,215,0,0.25); }
.logout-btn {
  padding: 5px 12px;
  background: rgba(255,80,80,0.12);
  border: 1px solid rgba(255,80,80,0.3);
  border-radius: 6px;
  color: #ff9999;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.2s;
}
.logout-btn:hover { background: rgba(255,80,80,0.25); }

.game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 12px 6px;
  gap: 6px;
  overflow: hidden;
}

.tile {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #fefef5 0%, #f6f0d5 60%, #ece3b0 100%);
  border: 1px solid #c8a400;
  border-bottom: 3px solid #9a7c00;
  border-right: 1px solid #b09000;
  border-radius: 5px;
  user-select: none;
  box-shadow: 1px 3px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.95);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.tile-back {
  background: linear-gradient(155deg, #236030 0%, #15461e 55%, #0c3014 100%);
  border-color: #2e7a3a;
  border-bottom-color: #1a5224;
  position: relative;
  overflow: hidden;
}
.tile-back::after {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(255,215,0,0.12);
  border-radius: 3px;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255,215,0,0.04) 4px,
    rgba(255,215,0,0.04) 5px
  );
}

.tile-small {
  width: 26px;
  height: 34px;
  margin: 1px;
  cursor: default;
}
.tile-small .s-num { font-size: 14px; line-height: 1; font-weight: 700; }
.tile-small .s-suit { font-size: 8px; line-height: 1; opacity: 0.7; }

.tile-vert { width: 18px; height: 26px; margin: 1px; }

.tile-last {
  width: 52px;
  height: 70px;
  box-shadow: 0 0 20px rgba(255,215,0,0.45), 2px 4px 10px rgba(0,0,0,0.5);
  animation: tileIn 0.28s cubic-bezier(.34,1.56,.64,1);
}
.last-num { font-size: 28px; font-weight: 800; line-height: 1; }
.last-suit { font-size: 13px; line-height: 1; margin-top: 3px; opacity: 0.8; }
@keyframes tileIn {
  from { transform: scale(0.65) rotate(-8deg); opacity: 0; }
  to { transform: scale(1) rotate(0deg); opacity: 1; }
}

.tile-hand {
  width: 50px;
  height: 70px;
  margin: 0 2px;
  cursor: pointer;
  border-bottom-width: 4px;
}
.tile-hand .h-num { font-size: 26px; font-weight: 800; line-height: 1; }
.tile-hand .h-suit { font-size: 11px; line-height: 1; margin-top: 4px; opacity: 0.8; }
.tile-hand:hover:not(.disabled) {
  transform: translateY(-12px);
  box-shadow: 2px 10px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.9);
}
.tile-hand.selected {
  transform: translateY(-18px) !important;
  border-color: #ffd700;
  border-bottom-color: #b89200;
  background: linear-gradient(160deg, #fffce8 0%, #fff5a0 55%, #f0e050 100%);
  box-shadow: 0 12px 28px rgba(255,215,0,0.6), inset 0 1px 0 rgba(255,255,255,0.9);
}
.tile-hand.disabled {
  cursor: not-allowed;
  filter: brightness(0.9) saturate(0.7);
}

.suit-wan .s-num, .suit-wan .h-num { color: #c20020; }
.suit-wan .s-suit, .suit-wan .h-suit { color: #9e0018; }
.suit-tiao .s-num, .suit-tiao .h-num { color: #006810; }
.suit-tiao .s-suit, .suit-tiao .h-suit { color: #005010; }
.suit-tong .s-num, .suit-tong .h-num { color: #0040a8; }
.suit-tong .s-suit, .suit-tong .h-suit { color: #003288; }
.suit-feng .s-num, .suit-feng .h-num { color: #5a3c00; }
.suit-feng .s-suit, .suit-feng .h-suit { color: #3e2800; }
.suit-zhong .s-num, .suit-zhong .h-num { color: #cc0000; font-weight: 900; }
.suit-fa .s-num, .suit-fa .h-num { color: #007030; font-weight: 900; }
.suit-bai .s-num, .suit-bai .h-num { color: #888; font-weight: 900; }

.player-area { display: flex; align-items: center; gap: 10px; }
.top-player, .bottom-player { flex-direction: column; align-items: center; }

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.38);
  border: 1px solid rgba(255,215,0,0.14);
  border-radius: 11px;
  padding: 7px 13px;
  transition: all 0.3s;
  position: relative;
}
.player-info.vertical {
  flex-direction: column;
  padding: 8px 6px;
  gap: 4px;
  text-align: center;
}
.player-info.is-turn {
  border-color: #ffd700;
  background: rgba(255,215,0,0.1);
  box-shadow: 0 0 18px rgba(255,215,0,0.28);
}
.self-info { padding: 7px 16px; }
.avatar { font-size: 22px; }
.player-name { font-size: 13px; color: #ffd700; font-weight: 600; }
.player-score { font-size: 11px; color: rgba(255,255,255,0.4); }

.turn-arrow, .turn-arrow-up, .turn-arrow-right, .turn-arrow-left {
  color: #ffd700;
  font-size: 11px;
  animation: blink 0.75s infinite;
}

.hidden-tiles { display: flex; flex-wrap: wrap; gap: 1px; max-width: 190px; }
.hidden-tiles.vertical { flex-direction: column; max-width: none; max-height: 170px; overflow: hidden; }

.discard-area {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-width: 90px;
  min-height: 36px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 4px;
}
.discard-v { flex-direction: column; min-width: 34px; min-height: 80px; max-height: 210px; overflow: hidden; }
.my-discards { min-width: 220px; }

.middle-row { flex: 1; display: flex; align-items: center; gap: 10px; min-height: 0; }
.left-player, .right-player { flex-shrink: 0; }

.center-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: radial-gradient(ellipse at center, rgba(0,100,20,0.22) 0%, transparent 70%);
  border: 2px solid rgba(255,215,0,0.12);
  border-radius: 20px;
  padding: 16px 10px;
  min-height: 180px;
  position: relative;
}
.center-table::before {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(255,215,0,0.06);
  border-radius: 16px;
  pointer-events: none;
}

.table-top { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.wind-round { display: flex; align-items: center; gap: 8px; }
.wind-badge {
  background: rgba(255,215,0,0.16);
  border: 1px solid rgba(255,215,0,0.32);
  color: #ffd700;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}
.round-text { font-size: 12px; color: rgba(255,255,255,0.45); }
.remaining { font-size: 12px; color: rgba(255,255,255,0.4); }
.remaining-num { color: #ffd700; font-weight: 700; font-size: 15px; margin: 0 3px; }
.remaining-label { color: rgba(255,255,255,0.4); }

.last-discard-wrap { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.last-discard-label { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 1px; }

.action-buttons { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
.action-btn {
  padding: 7px 15px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.15s, box-shadow 0.15s;
}
.chi { background: linear-gradient(135deg, #1a8a44, #28c868); color: #fff; }
.peng { background: linear-gradient(135deg, #c06010, #f09018); color: #fff; }
.gang { background: linear-gradient(135deg, #6a28a0, #9848c8); color: #fff; }
.hu {
  background: linear-gradient(135deg, #aa1818, #e02828);
  color: #fff;
  animation: huPulse 1s infinite;
}
@keyframes huPulse {
  0%,100% { box-shadow: 0 0 14px rgba(224,40,40,0.5); }
  50% { box-shadow: 0 0 28px rgba(224,40,40,0.9); }
}
.pass {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.18);
  color: #aaa;
}
.action-btn:hover { transform: scale(1.08); }

.game-status { font-size: 13px; min-height: 20px; }
.status-myturn { color: #2ecc71; font-weight: 600; }
.status-waiting { color: #f0a030; }
.status-action { color: #e03030; animation: blink 0.75s infinite; }
.status-remote { color: #72d7ff; }
.status-error { color: #ff7b7b; }

.backend-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: min(100%, 420px);
  padding: 12px 14px;
  background: rgba(17, 48, 61, 0.45);
  border: 1px solid rgba(114, 215, 255, 0.3);
  border-radius: 12px;
}
.backend-banner.error {
  background: rgba(70, 20, 20, 0.45);
  border-color: rgba(255, 123, 123, 0.35);
}
.backend-note {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255,255,255,0.72);
  text-align: center;
}
.reload-btn {
  padding: 7px 16px;
  background: rgba(114, 215, 255, 0.14);
  border: 1px solid rgba(114, 215, 255, 0.35);
  border-radius: 8px;
  color: #72d7ff;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.reload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.reload-btn:hover:not(:disabled) {
  background: rgba(114, 215, 255, 0.22);
}

.backend-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.tool-btn {
  padding: 6px 12px;
  background: rgba(255, 215, 0, 0.12);
  border: 1px solid rgba(255, 215, 0, 0.28);
  border-radius: 8px;
  color: #ffd700;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn:hover:not(:disabled) {
  background: rgba(255, 215, 0, 0.2);
}

.test-result {
  width: 100%;
  padding: 10px 12px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: rgba(255,255,255,0.75);
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

.bottom-player { gap: 6px; flex-shrink: 0; }
.my-discards-wrap { display: flex; justify-content: center; }
.my-hand-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.my-hand { display: flex; align-items: flex-end; padding: 4px 0 2px; }
.hand-sep {
  width: 8px;
  height: 54px;
  align-self: flex-end;
  border-right: 2px dashed rgba(255,215,0,0.16);
  margin: 0 2px;
  flex-shrink: 0;
}
.discard-action { display: flex; justify-content: center; }
.waiting-hint {
  font-size: 13px;
  color: rgba(255,255,255,0.35);
  padding: 6px 0;
  animation: blink 1.2s infinite;
}
.backend-hint {
  animation: none;
  color: rgba(114, 215, 255, 0.78);
}
.discard-btn {
  padding: 9px 44px;
  background: linear-gradient(135deg, #c08010, #ffd700);
  border: none;
  border-radius: 10px;
  color: #1a0a00;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 3px 16px rgba(255,215,0,0.35);
  transition: all 0.18s;
}
.discard-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.discard-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(255,215,0,0.5);
}

@keyframes blink {
  0%,100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.win-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(5px);
}
.win-content {
  background: linear-gradient(145deg, #1a0800, #3c1600);
  border: 2px solid #ffd700;
  border-radius: 22px;
  padding: 50px 60px;
  text-align: center;
  box-shadow: 0 0 70px rgba(255,215,0,0.35);
  animation: winIn 0.4s cubic-bezier(.34,1.56,.64,1);
}
@keyframes winIn {
  from { transform: scale(0.55); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.win-icon { font-size: 68px; margin-bottom: 16px; }
.win-content h2 { color: #ffd700; font-size: 30px; margin-bottom: 12px; }
.win-content p { color: rgba(255,255,255,0.65); font-size: 16px; margin-bottom: 28px; }
.win-content strong { color: #ffd700; font-size: 22px; }
.win-btns { display: flex; gap: 14px; justify-content: center; }
.new-game-btn {
  padding: 11px 34px;
  background: linear-gradient(135deg, #b07808, #ffd700);
  border: none;
  border-radius: 10px;
  color: #1a0a00;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.2s;
}
.lobby-btn {
  padding: 11px 34px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.2s;
}
.new-game-btn:hover, .lobby-btn:hover { transform: scale(1.06); }
</style>
