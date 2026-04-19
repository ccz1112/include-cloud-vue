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
        <span v-if="!realtimeConnected" class="realtime-pill offline">连接不稳定</span>
        <span class="username">👤 {{ username }}</span>
        <span class="coins">💰 {{ coins }}</span>
        <button v-if="isRealtimeDriven" class="back-btn" :disabled="!!pendingCommand" @click="toggleAutoManage">{{ autoManageButtonText }}</button>
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
            <div v-if="players.top.statusLabel" class="player-state-line">{{ players.top.statusLabel }}</div>
          </div>
          <div v-if="players.top.isWin" class="player-result win">胡</div>
          <div class="turn-arrow" v-if="currentTurn === 'top'">▼</div>
        </div>
        <div v-if="players.top.melds.length" class="meld-area top-melds">
          <div v-for="meld in players.top.melds" :key="meld.key" class="meld-group" :class="meld.type">
            <MahjongTile
              v-for="tile in meld.tiles"
              :key="tile.id"
              class="meld-tile"
              :tile="tile"
              variant="small"
            />
          </div>
        </div>
        <div class="hidden-tiles">
          <MahjongTile v-for="i in players.top.tileCount" :key="i" back variant="small" />
        </div>
        <div class="discard-area">
          <MahjongTile
            v-for="(tile, i) in players.top.discards"
            :key="tile.id || i"
            :tile="tile"
            variant="small"
          />
        </div>
      </div>

      <div class="middle-row">
        <div class="player-area left-player">
          <div class="player-info vertical" :class="{ 'is-turn': currentTurn === 'left' }">
            <div class="avatar">🤖</div>
            <div class="player-name">{{ players.left.name }}</div>
            <div class="player-score">{{ players.left.score }}</div>
            <div v-if="players.left.statusLabel" class="player-state-line vertical">{{ players.left.statusLabel }}</div>
            <div v-if="players.left.isWin" class="player-result win vertical">胡</div>
            <div class="turn-arrow-right" v-if="currentTurn === 'left'">▶</div>
          </div>
          <div v-if="players.left.melds.length" class="meld-area side-melds vertical-melds">
            <div v-for="meld in players.left.melds" :key="meld.key" class="meld-group vertical-group" :class="meld.type">
              <MahjongTile
                v-for="tile in meld.tiles"
                :key="tile.id"
                class="meld-tile"
                :tile="tile"
                variant="small"
              />
            </div>
          </div>
          <div class="hidden-tiles vertical">
            <MahjongTile v-for="i in players.left.tileCount" :key="i" back variant="small" vertical />
          </div>
          <div class="discard-area discard-v">
            <MahjongTile
              v-for="(tile, i) in players.left.discards"
              :key="tile.id || i"
              :tile="tile"
              variant="small"
            />
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
            <div v-if="turnDeadlineText" class="deadline-panel" :class="{ urgent: isDeadlineUrgent }">
              <div class="deadline-row">
                <span class="deadline-label">回合倒计时</span>
                <span class="deadline-value">{{ turnDeadlineText }}</span>
              </div>
              <div class="deadline-track">
                <div class="deadline-bar" :style="{ width: `${turnDeadlineProgress}%` }"></div>
              </div>
            </div>
          </div>

          <div class="turn-focus-banner" :class="{ self: currentTurn === 'me', actioning: gameState === 'action' }">
            <span class="turn-focus-label">当前出牌</span>
            <strong class="turn-focus-name">{{ turnOwnerName }}</strong>
            <span class="turn-focus-tip">{{ turnFocusTip }}</span>
          </div>

          <transition name="table-cue">
            <div v-if="tableCue" class="table-cue" :class="`cue-${tableCue.type}`">
              <div class="table-cue-ring"></div>
              <div class="table-cue-body">
                <span class="table-cue-title">{{ tableCue.title }}</span>
                <span v-if="tableCue.detail" class="table-cue-detail">{{ tableCue.detail }}</span>
              </div>
              <MahjongTile v-if="tableCue.tile" :tile="tableCue.tile" variant="small" />
            </div>
          </transition>

          <div v-if="lastDiscard" :key="`last-${lastDiscardFxKey}`" class="last-discard-wrap">
            <div class="last-discard-label">最新出牌</div>
            <MahjongTile :tile="lastDiscard" variant="last" />
          </div>

          <div v-if="roundSummary.length" class="round-summary">
            <div class="summary-title">本局状态</div>
            <div class="summary-list">
              <div v-for="item in roundSummary" :key="item.key" class="summary-item" :class="{ winner: item.isWinner }">
                <span class="summary-name">{{ item.name }}</span>
                <span class="summary-meta">{{ item.description }}</span>
              </div>
            </div>
          </div>

          <div v-if="gameState === 'action'" :key="`action-${actionButtonsFxKey}`" class="action-buttons action-buttons-live">
            <button
              v-for="action in availableActions"
              :key="action.type"
              class="action-btn"
              :class="[action.type, { emphasis: action.type === 'hu' || action.type === 'gang' }]"
              :disabled="!!pendingCommand"
              @click="doAction(action.type)"
            >{{ action.label }}</button>
          </div>

          <div class="game-status">
            <span :class="statusClass">{{ statusText }}</span>
          </div>
        </div>

        <div class="player-area right-player">
          <div v-if="players.right.melds.length" class="meld-area side-melds vertical-melds align-end">
            <div v-for="meld in players.right.melds" :key="meld.key" class="meld-group vertical-group" :class="meld.type">
              <MahjongTile
                v-for="tile in meld.tiles"
                :key="tile.id"
                class="meld-tile"
                :tile="tile"
                variant="small"
              />
            </div>
          </div>
          <div class="discard-area discard-v">
            <MahjongTile
              v-for="(tile, i) in players.right.discards"
              :key="tile.id || i"
              :tile="tile"
              variant="small"
            />
          </div>
          <div class="hidden-tiles vertical">
            <MahjongTile v-for="i in players.right.tileCount" :key="i" back variant="small" vertical />
          </div>
          <div class="player-info vertical" :class="{ 'is-turn': currentTurn === 'right' }">
            <div class="turn-arrow-left" v-if="currentTurn === 'right'">◀</div>
            <div class="avatar">🤖</div>
            <div class="player-name">{{ players.right.name }}</div>
            <div class="player-score">{{ players.right.score }}</div>
            <div v-if="players.right.statusLabel" class="player-state-line vertical">{{ players.right.statusLabel }}</div>
            <div v-if="players.right.isWin" class="player-result win vertical">胡</div>
          </div>
        </div>
      </div>

      <div class="player-area bottom-player">
        <div v-if="myMelds.length" class="meld-area self-melds">
          <div v-for="meld in myMelds" :key="meld.key" class="meld-group" :class="meld.type">
            <MahjongTile
              v-for="tile in meld.tiles"
              :key="tile.id"
              class="meld-tile"
              :tile="tile"
              variant="small"
            />
          </div>
        </div>
        <div class="my-discards-wrap">
          <div class="discard-area my-discards">
            <MahjongTile
              v-for="(tile, i) in myDiscards"
              :key="tile.id || i"
              :tile="tile"
              variant="small"
            />
          </div>
        </div>

        <div class="my-hand-wrap">
          <div class="my-hand">
            <template v-for="item in handWithSeparators" :key="item.key">
              <div v-if="item.isSeparator" class="hand-sep"></div>
              <MahjongTile
                v-else
                :tile="item"
                variant="hand"
                :selected="selectedTile === item.originalIdx"
                :disabled="currentTurn !== 'me' || gameState !== 'myTurn' || !!pendingCommand"
                :clickable="true"
                @click="selectTile(item.originalIdx)"
              />
            </template>
          </div>

          <div v-if="currentTurn === 'me' && gameState === 'myTurn'" class="discard-action">
            <button class="discard-btn" :class="{ ready: selectedTile !== null && !pendingCommand }" :disabled="selectedTile === null || !!pendingCommand" @click="discardSelected">
              {{ pendingCommand ? '等待确认...' : '出牌' }}
            </button>
          </div>
          <div v-else-if="gameState === 'aiTurn'" class="waiting-hint">
            <span>{{ pendingCommand ? '指令已发送，等待服务端广播...' : '等待 AI 出牌...' }}</span>
          </div>
          <div v-else-if="isBackendDemoMode" class="waiting-hint backend-hint">
            <span>{{ isRealtimeDriven ? '当前正在进行正式对局，请按牌桌节奏完成操作。' : '当前尚未开局，请返回房间等待房主开始。' }}</span>
          </div>
        </div>

        <div class="player-info self-info" :class="{ 'is-turn': currentTurn === 'me' }">
          <div class="avatar">😊</div>
          <div>
            <div class="player-name">{{ selfSeatName }}</div>
            <div class="player-score">得分 {{ myScore }}</div>
            <div v-if="selfStatusLabel" class="player-state-line">{{ selfStatusLabel }}</div>
          </div>
          <div v-if="selfIsWin" class="player-result win">胡</div>
          <div class="turn-arrow-up" v-if="currentTurn === 'me'">▲</div>
        </div>
      </div>
    </div>

    <div v-if="showWinModal" class="win-modal">
      <div class="win-content">
        <div class="win-icon">🎉</div>
        <h2>{{ winMessage }}</h2>
        <p>本局得分：<strong>+{{ winScore }}</strong></p>
        <div v-if="settlementDetails.length" class="settlement-list">
          <div v-for="item in settlementDetails" :key="item.key" class="settlement-item" :class="{ winner: item.isWinner }">
            <span>{{ item.name }}</span>
            <span>{{ item.result }}</span>
          </div>
        </div>
        <div class="win-btns">
          <button class="new-game-btn" @click="newGame">再来一局</button>
          <button class="lobby-btn" @click="backToLobby">返回大厅</button>
        </div>
      </div>
    </div>

    <div v-if="showActionChoiceModal" class="win-modal action-choice-modal">
      <div class="win-content action-choice-content">
        <h2>{{ actionChoiceTitle }}</h2>
        <p class="backend-note">请选择服务端允许的 {{ getActionLabel(actionChoiceType) }} 方案</p>
        <div class="action-choice-list">
          <button
            v-for="option in actionChoiceOptions"
            :key="option.key"
            class="action-choice-btn"
            :disabled="!!pendingCommand"
            @click="submitChosenAction(option)"
          >
            <span>{{ option.label }}</span>
            <span v-if="option.meta" class="action-choice-meta">{{ option.meta }}</span>
          </button>
        </div>
        <div class="win-btns">
          <button class="lobby-btn" @click="cancelActionChoice">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MahjongTile from '../components/MahjongTile.vue'
import {
  getMahjongGame,
  discardMahjongTile,
  drawMahjongTile,
  pongMahjongTile,
  chowMahjongTile,
  kongMahjongTile,
  winMahjongTile,
  passMahjongAction,
  enableMahjongAutoManage,
  resumeMahjongAutoManage,
  getMahjongOperations,
  dealMahjongGame
} from '../api/mahjong.js'
import { leaveRoom as leaveRoomRequest } from '../api/room.js'
import { realtimeService } from '../services/realtime.js'
import { useRoomStore } from '../stores/room.js'
import { useMahjongGameStore } from '../stores/mahjongGame.js'
import { useUserStore } from '../stores/user.js'
import { getKongTypeLabel } from '../utils/eventFormatters.js'
import {
  buildPlayerStatusLabel,
  buildSettlementDetails,
  buildSettlementDetailsFromRoundSettlement,
  normalizeMelds,
  normalizeRemoteTile,
  normalizeRemoteTiles
} from '../utils/mahjongPresentation.js'
import {
  createLocalOpponentState,
  createInitialLocalRound,
  drawTileFromDeck,
  getTileCategory
} from '../utils/mahjongLocalMock.js'
import {
  buildLocalWinResult,
  getLocalAiDelayMs,
  getLocalGameStateForTurn,
  getNextLocalTurnIndex,
  LOCAL_SELF_TURN_INDEX,
  LOCAL_TURN_ORDER,
  resolveLocalActionOutcome,
  shouldTriggerLocalAction
} from '../utils/mahjongLocalFlow.js'

const router = useRouter()
const route = useRoute()
const roomStore = useRoomStore()
const mahjongGameStore = useMahjongGameStore()
const userStore = useUserStore()
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
const realtimeActionTile = ref(null)
const selfPlayerPosition = ref(0)
let unsubscribeGame = null
let unsubscribeRealtimeStatus = null
let unsubscribeSystemMessage = null

const gameMode = ref(localStorage.getItem('gameMode') || 'standard')
const gameModeName = computed(() => gameMode.value === 'shandong' ? '山东麻将' : '大众麻将')
const isBackendDemoMode = computed(() => gameMode.value === 'shandong')
const activeRoomId = computed(() => route.query.roomId || roomStore.currentRoom?.id || mahjongGameStore.roomId)
const activeGameId = computed(() => route.query.gameId || roomStore.currentRoom?.gameInstanceId || roomStore.currentRoom?.currentGameId || mahjongGameStore.gameId)
const isRealtimeDriven = computed(() => isBackendDemoMode.value && !!activeGameId.value)
const realtimeConnected = computed(() => mahjongGameStore.realtimeConnected)
const pendingCommand = computed(() => mahjongGameStore.pendingCommand)
const selfPlayerId = computed(() => userStore.username || username.value)
const selfAutoManaged = computed(() => {
  const players = mahjongGameStore.game?.players || []
  return players.find(player => player.position === selfPlayerPosition.value)?.autoManaged || false
})
const autoManageButtonText = computed(() => selfAutoManaged.value ? '恢复手动' : '开启托管')
const nowTimestamp = ref(Date.now())
let deadlineTimer = null

function parseDeadlineTimestamp(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const turnDeadlineTimestamp = computed(() => parseDeadlineTimestamp(mahjongGameStore.game?.turnDeadlineAt))
const turnDeadlineRemainingMs = computed(() => {
  if (!turnDeadlineTimestamp.value) return 0
  return Math.max(0, turnDeadlineTimestamp.value - nowTimestamp.value)
})
const turnDeadlineTotalMs = computed(() => {
  const fallback = 15000
  if (!turnDeadlineTimestamp.value || !mahjongGameStore.game?.turnPhase) return fallback
  return Math.max(turnDeadlineRemainingMs.value, fallback)
})
const turnDeadlineSeconds = computed(() => Math.ceil(turnDeadlineRemainingMs.value / 1000))
const turnDeadlineText = computed(() => {
  if (!isRealtimeDriven.value || !turnDeadlineTimestamp.value) return ''
  if (turnDeadlineRemainingMs.value <= 0) return '已超时，等待托管/广播'
  return `${turnDeadlineSeconds.value} 秒`
})
const turnDeadlineProgress = computed(() => {
  if (!turnDeadlineTimestamp.value) return 0
  const percent = (turnDeadlineRemainingMs.value / turnDeadlineTotalMs.value) * 100
  return Math.max(0, Math.min(100, percent))
})
const isDeadlineUrgent = computed(() => turnDeadlineRemainingMs.value > 0 && turnDeadlineRemainingMs.value <= 5000)

const currentTurnIdx = ref(0)
const currentTurn = computed(() => LOCAL_TURN_ORDER[currentTurnIdx.value])

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

const myHand = ref([])
const myDiscards = ref([])
const myMelds = ref([])
const selfStatusLabel = ref('')
const selfIsWin = ref(false)
const settlementDetails = ref([])
const showActionChoiceModal = ref(false)
const actionChoiceType = ref('')
const actionChoiceTitle = ref('')
const actionChoiceOptions = ref([])
const tableCue = ref(null)
const lastDiscardFxKey = ref(0)
const actionButtonsFxKey = ref(0)
let gameDeck = []
let tableCueTimer = null

const players = reactive({
  top: createLocalOpponentState('对家'),
  left: createLocalOpponentState('下家'),
  right: createLocalOpponentState('上家')
})

const roundSummary = computed(() => {
  const game = mahjongGameStore.game
  if (!game?.players?.length) return []

  return game.players.map(player => ({
    key: player.playerId || `${player.playerName}-${player.position}`,
    name: player.playerName || `玩家${player.position + 1}`,
    description: buildPlayerStatusLabel(player) || `剩余手牌 ${getPlayerHandCount(player)} 张`,
    isWinner: !!player.isWin
  }))
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

const turnOwnerName = computed(() => {
  const names = {
    me: selfSeatName.value,
    left: players.left.name,
    top: players.top.name,
    right: players.right.name
  }
  return names[currentTurn.value]
})

const turnFocusTip = computed(() => {
  if (gameState.value === 'action') return '请选择动作响应'
  if (currentTurn.value === 'me') return '现在轮到你出牌'
  return '等待对方完成操作'
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
    { type: 'draw', label: '摸牌' },
    { type: 'chi', label: '吃' },
    { type: 'peng', label: '碰' },
    { type: 'gang', label: '杠' },
    { type: 'hu', label: '胡' },
    { type: 'pass', label: '过' }
  ]
})

const statusText = computed(() => {
  if (loadingRemote.value) return '正在同步当前牌局...'
  if (remoteError.value) return remoteError.value
  if (pendingCommand.value) return `正在提交 ${pendingCommand.value} 指令，等待服务端结果`
  if (isDeadlineUrgent.value) return `请尽快操作，剩余 ${turnDeadlineSeconds.value} 秒`
  if (isRealtimeDriven.value && gameState.value === 'action' && realtimeActionTile.value) {
    return `收到 ${realtimeActionTile.value.name} 的可操作提示，请选择动作`
  }
  if (isRealtimeDriven.value && currentTurn.value === 'me') return '当前牌局已接入正式接口，可直接按后端规则执行操作'
  if (currentTurn.value === 'me' && gameState.value === 'myTurn') return '请选择一张牌出牌'
  if (gameState.value === 'aiTurn') return `${turnText.value}中...`
  if (gameState.value === 'action') return '是否响应？'
  if (isBackendDemoMode.value) return '请在房间内等待房主开始本局。'
  return ''
})

const statusClass = computed(() => ({
  'status-myturn': currentTurn.value === 'me' && gameState.value === 'myTurn' && !remoteError.value,
  'status-waiting': gameState.value === 'aiTurn' && !remoteError.value,
  'status-action': gameState.value === 'action' && !remoteError.value,
  'status-remote': isRealtimeDriven.value && !['myTurn', 'aiTurn', 'action'].includes(gameState.value) && !remoteError.value,
  'status-error': !!remoteError.value
}))

function normalizeActionType(action) {
  const value = String(action || '').toLowerCase()
  const aliasMap = {
    draw: 'draw',
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
    draw: '摸牌',
    chi: '吃',
    peng: '碰',
    gang: '杠',
    hu: '胡',
    pass: '过',
    discard: '出牌'
  }
  return labels[type] || type
}

function emitTableCue(type, title, detail = '', tile = null) {
  if (tableCueTimer) {
    window.clearTimeout(tableCueTimer)
    tableCueTimer = null
  }

  tableCue.value = {
    id: `${type}-${Date.now()}`,
    type,
    title,
    detail,
    tile
  }

  tableCueTimer = window.setTimeout(() => {
    tableCue.value = null
    tableCueTimer = null
  }, 1450)
}

function normalizeOptionTiles(source) {
  if (!Array.isArray(source)) return []
  return normalizeRemoteTiles(source)
}

function getPlayerHandCount(player) {
  if (!player) return 0
  if (typeof player.handTileCount === 'number') return player.handTileCount
  if (Array.isArray(player.handTiles)) return player.handTiles.length
  return 0
}

function buildActionOptions(type, operationState) {
  if (!operationState || typeof operationState !== 'object') return []

  if (type === 'chi') {
    return (operationState.chowableTiles || []).map((entry, index) => {
      const tiles = Array.isArray(entry?.tiles) ? entry.tiles : Array.isArray(entry) ? entry : []
      const normalized = normalizeOptionTiles(tiles)
      return {
        key: `chi-${index}`,
        label: normalized.map(tile => tile.name).join(' / ') || `吃牌方案 ${index + 1}`,
        payload: {
          tiles,
          relatedTile: operationState.lastDiscardedTile || realtimeActionTile.value?.raw || lastDiscard.value?.raw || null
        }
      }
    })
  }

  if (type === 'gang') {
    const kongOperations = (operationState.kongOperations || []).map((entry, index) => {
      const tiles = Array.isArray(entry?.tiles) ? entry.tiles : []
      const normalized = normalizeOptionTiles(tiles)
      return {
        key: `gang-op-${index}`,
        label: normalized.map(tile => tile.name).join(' / ') || `杠牌方案 ${index + 1}`,
        meta: getKongTypeLabel(entry?.kongType || entry?.type),
        payload: {
          kongType: entry?.kongType || entry?.type,
          tiles,
          relatedTile: entry?.relatedTile || operationState.lastDiscardedTile || realtimeActionTile.value?.raw || lastDiscard.value?.raw || null
        }
      }
    })

    if (kongOperations.length) return kongOperations

    return (operationState.kongableTiles || []).map((entry, index) => {
      const tiles = Array.isArray(entry?.tiles) ? entry.tiles : Array.isArray(entry) ? entry : []
      const normalized = normalizeOptionTiles(tiles)
      return {
        key: `gang-${index}`,
        label: normalized.map(tile => tile.name).join(' / ') || `杠牌方案 ${index + 1}`,
        payload: {
          tiles,
          relatedTile: operationState.lastDiscardedTile || realtimeActionTile.value?.raw || lastDiscard.value?.raw || null
        }
      }
    })
  }

  return []
}

function cancelActionChoice() {
  showActionChoiceModal.value = false
  actionChoiceType.value = ''
  actionChoiceTitle.value = ''
  actionChoiceOptions.value = []
}

async function submitChosenAction(option) {
  const sent = await performFormalGameAction(actionChoiceType.value, option?.payload || {})
  if (sent) {
    cancelActionChoice()
    gameState.value = 'aiTurn'
  }
  return sent
}

async function openActionChoice(type) {
  const options = buildActionOptions(type, mahjongGameStore.currentOperationState)
  if (!options.length) {
    return performFormalGameAction(type)
  }
  if (options.length === 1) {
    return submitChosenAction(options[0])
  }
  actionChoiceType.value = type
  actionChoiceTitle.value = `${getActionLabel(type)}牌方案`
  actionChoiceOptions.value = options
  showActionChoiceModal.value = true
  return false
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

function makeTile(name) {
  return { name, ...normalizeRemoteTile({ displayName: name }) }
}

function sortHand(hand) {
  return [...hand].sort((left, right) => (TILE_ORDER[left.name] ?? 99) - (TILE_ORDER[right.name] ?? 99))
}

function applySettlement(roundSettlement, fallbackGame = null) {
  if (!roundSettlement) return

  const winner = (roundSettlement.players || []).find(player => player.winner)
  if (roundSettlement.settlementType === 'DRAW') {
    winMessage.value = '本局流局'
    winScore.value = 0
  } else {
    winMessage.value = `${winner?.playerName || '有人'} 本局结算`
    winScore.value = winner?.winFan || roundSettlement.fan || 0
  }

  settlementDetails.value = buildSettlementDetailsFromRoundSettlement(roundSettlement)
  if (!settlementDetails.value.length && fallbackGame) {
    settlementDetails.value = buildSettlementDetails(fallbackGame)
  }
  showWinModal.value = true
}

function handleRoomSnapshot(roomSnapshot, options = {}) {
  if (!roomSnapshot) return

  roomStore.setCurrentRoom(roomSnapshot)
  const nextRoomId = roomSnapshot.roomId || roomSnapshot.id || activeRoomId.value
  const nextGameId = roomSnapshot.currentGameId || roomSnapshot.gameInstanceId || ''

  if (!nextGameId && options.returnToRoomOnNoGame && nextRoomId) {
    mahjongGameStore.setContext({ roomId: nextRoomId, gameId: '' })
    router.replace(`/room/${nextRoomId}`)
  }
}

function getPlayerName(player) {
  return player?.playerName || player?.username || player?.playerId || ''
}

function resolveSelfPlayerPosition(game) {
  const selfPlayer = (game?.players || []).find(player => {
    return player?.playerId === selfPlayerId.value || getPlayerName(player) === username.value
  })
  return selfPlayer?.position ?? selfPlayerPosition.value ?? 0
}

function toRelativePosition(absolutePosition) {
  return (absolutePosition - selfPlayerPosition.value + LOCAL_TURN_ORDER.length) % LOCAL_TURN_ORDER.length
}

function getPlayerByRelativePosition(positionMap, relativePosition) {
  const absolutePosition = (selfPlayerPosition.value + relativePosition) % LOCAL_TURN_ORDER.length
  return positionMap.get(absolutePosition)
}

function extractOperationTypes(result) {
  if (result && !Array.isArray(result) && typeof result === 'object') {
    const types = []
    if (Array.isArray(result.actions) || Array.isArray(result.availableActions) || Array.isArray(result.operations) || Array.isArray(result.list)) {
      return extractOperationTypes(result.actions || result.availableActions || result.operations || result.list)
    }
    if (result.turnPhase === 'WAITING_FOR_DRAW') types.push('draw')
    if (result.canPong) types.push('peng')
    if (Array.isArray(result.chowableTiles) && result.chowableTiles.length) types.push('chi')
    if (Array.isArray(result.kongableTiles) && result.kongableTiles.length) types.push('gang')
    if (Array.isArray(result.kongOperations) && result.kongOperations.length) types.push('gang')
    if (result.canWin) types.push('hu')
    if (result.canPass) types.push('pass')
    return [...new Set(types)]
  }

  const rawOperations = Array.isArray(result)
    ? result
    : result?.actions || result?.availableActions || result?.operations || result?.list || []

  return rawOperations
    .map(operation => normalizeActionType(operation?.type || operation?.action || operation?.event || operation))
    .filter(Boolean)
}

async function refreshAvailableOperations() {
  if (!isRealtimeDriven.value || !activeGameId.value) return

  try {
    const result = await getMahjongOperations(activeGameId.value, {
      playerId: selfPlayerId.value,
      seat: selfPlayerPosition.value,
      playerPosition: selfPlayerPosition.value
    })
    mahjongGameStore.setCurrentOperationState(result)
    const types = extractOperationTypes(result)
    const actions = types
      .filter(type => type !== 'discard')
      .map(type => ({ type, label: getActionLabel(type) }))

    mahjongGameStore.setCurrentActions(actions)
    if (actions.length) {
      gameState.value = 'action'
    } else {
      gameState.value = getLocalGameStateForTurn(currentTurn.value)
    }
  } catch {
    mahjongGameStore.setCurrentOperationState(null)
    if (!mahjongGameStore.currentActions.length) {
      gameState.value = getLocalGameStateForTurn(currentTurn.value)
    }
  }
}

async function loadLatestFormalGame(targetGameId = activeGameId.value) {
  if (!targetGameId) {
    throw new Error('当前缺少正式对局 ID，请先返回房间开始游戏。')
  }

  const game = await getMahjongGame(targetGameId, selfPlayerId.value)
  applyRemoteGame(game)
  await refreshAvailableOperations()
  return game
}

function buildFormalActionPayload(type, payload = {}) {
  const relatedTile = payload.relatedTile || realtimeActionTile.value?.raw || lastDiscard.value?.raw || null

  return {
    playerId: selfPlayerId.value,
    playerPosition: selfPlayerPosition.value,
    action: getRealtimeActionEvent(type),
    relatedTile,
    tile: payload.tile || relatedTile,
    tiles: payload.tiles || (relatedTile ? [relatedTile] : []),
    ...payload
  }
}

async function performFormalGameAction(type, payload = {}) {
  if (!activeGameId.value) {
    remoteError.value = '当前缺少正式对局 ID，请先返回房间开始游戏。'
    return false
  }

  remoteError.value = ''
  mahjongGameStore.setPendingCommand(getActionLabel(type))

  try {
    let result = null
    const requestPayload = buildFormalActionPayload(type, payload)

    if (type === 'discard') {
      result = await discardMahjongTile(activeGameId.value, requestPayload)
    } else if (type === 'draw') {
      result = await drawMahjongTile(activeGameId.value, requestPayload)
    } else if (type === 'peng') {
      result = await pongMahjongTile(activeGameId.value, requestPayload)
    } else if (type === 'chi') {
      result = await chowMahjongTile(activeGameId.value, requestPayload)
    } else if (type === 'gang') {
      result = await kongMahjongTile(activeGameId.value, requestPayload)
    } else if (type === 'hu') {
      result = await winMahjongTile(activeGameId.value, requestPayload)
    } else if (type === 'pass') {
      result = await passMahjongAction(activeGameId.value, requestPayload)
    }

    const nextGame = result?.players ? result : result?.game?.players ? result.game : await getMahjongGame(activeGameId.value, selfPlayerId.value)
    applyRemoteGame(nextGame)
    await refreshAvailableOperations()
    mahjongGameStore.setPendingCommand('')
    return true
  } catch (error) {
    mahjongGameStore.setPendingCommand('')
    remoteError.value = error instanceof Error ? error.message : '正式对局动作提交失败'
    return false
  }
}

const handWithSeparators = computed(() => {
  const sorted = sortHand(myHand.value)
  const result = []
  let lastCategory = null
  const used = new Set()

  sorted.forEach((tile, index) => {
    const category = getTileCategory(tile.name, ALL_TILES)
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

function setSidePlayer(target, player, fallbackName) {
  target.name = player?.playerName || fallbackName
  target.tileCount = getPlayerHandCount(player)
  target.score = player?.winFan ?? 0
  target.discards = normalizeRemoteTiles(player?.discardedTiles || [])
  target.melds = normalizeMelds(player)
  target.statusLabel = buildPlayerStatusLabel(player)
  target.isWin = !!player?.isWin
}

function resetTable() {
  selfSeatName.value = username.value
  myHand.value = []
  myDiscards.value = []
  myMelds.value = []
  myScore.value = 0
  selfStatusLabel.value = ''
  selfIsWin.value = false
  settlementDetails.value = []
  round.value = 1
  currentWind.value = '东风'
  remainingTiles.value = 0
  selectedTile.value = null
  realtimeActionTile.value = null
  lastDiscard.value = null
  tableCue.value = null
  currentTurnIdx.value = 0
  Object.assign(players.top, createLocalOpponentState('对家'))
  Object.assign(players.left, createLocalOpponentState('下家'))
  Object.assign(players.right, createLocalOpponentState('上家'))
}

function applyRemoteGame(game) {
  resetTable()
  selfPlayerPosition.value = resolveSelfPlayerPosition(game)
  mahjongGameStore.setGame(game)
  roomStore.setCurrentGameSnapshot(game)
  if (game?.status === 'FINISHED') {
    roomStore.setRoomStatus('FINISHED')
  } else if (game?.status) {
    roomStore.setRoomStatus('PLAYING')
  }
  mahjongGameStore.setLastDiscard(game?.lastDiscardedTile || null)
  mahjongGameStore.setPendingCommand('')
  mahjongGameStore.setCurrentActions([])
  mahjongGameStore.setCurrentOperationState(null)
  round.value = game?.round || 1
  remainingTiles.value = game?.remainingTileCount ?? game?.tilePool?.length ?? 0
  currentTurnIdx.value = Math.min(
    Math.max(toRelativePosition(game?.currentPlayerPosition ?? selfPlayerPosition.value), 0),
    LOCAL_TURN_ORDER.length - 1
  )
  currentWind.value = game?.dealerPosition === selfPlayerPosition.value ? '东风' : `庄家位 ${game.dealerPosition + 1}`
  selectedTile.value = null
  lastDiscard.value = game?.lastDiscardedTile ? normalizeRemoteTile(game.lastDiscardedTile) : null
  gameDeck = normalizeRemoteTiles(game?.tilePool || [])
  showWinModal.value = false
  winMessage.value = ''
  winScore.value = 0
  settlementDetails.value = game?.roundSettlement ? buildSettlementDetailsFromRoundSettlement(game.roundSettlement) : buildSettlementDetails(game)

  const positionMap = new Map((game?.players || []).map(player => [player.position, player]))
  const me = positionMap.get(selfPlayerPosition.value)
  const left = getPlayerByRelativePosition(positionMap, 1)
  const top = getPlayerByRelativePosition(positionMap, 2)
  const right = getPlayerByRelativePosition(positionMap, 3)

  selfSeatName.value = me?.playerName || username.value
  myHand.value = sortHand(normalizeRemoteTiles(me?.handTiles || []))
  myDiscards.value = normalizeRemoteTiles(me?.discardedTiles || [])
  myMelds.value = normalizeMelds(me)
  myScore.value = me?.winFan ?? 0
  selfStatusLabel.value = buildPlayerStatusLabel(me)
  selfIsWin.value = !!me?.isWin

  setSidePlayer(players.left, left, '下家')
  setSidePlayer(players.top, top, '对家')
  setSidePlayer(players.right, right, '上家')

  gameState.value = getLocalGameStateForTurn(currentTurn.value)
  if (!isRealtimeDriven.value && currentTurn.value !== 'me') {
    const delay = getLocalAiDelayMs()
    setTimeout(() => runAiTurn(), delay)
  }
}

async function toggleAutoManage() {
  if (!activeGameId.value) return

  remoteError.value = ''
  mahjongGameStore.setPendingCommand(autoManageButtonText.value)

  try {
    const payload = {
      playerId: selfPlayerId.value,
      seat: selfPlayerPosition.value
    }
    const result = selfAutoManaged.value
      ? await resumeMahjongAutoManage(activeGameId.value, payload)
      : await enableMahjongAutoManage(activeGameId.value, payload)

    const nextGame = result?.players ? result : result?.game?.players ? result.game : await getMahjongGame(activeGameId.value, selfPlayerId.value)
    applyRemoteGame(nextGame)
    await refreshAvailableOperations()
  } catch (error) {
    remoteError.value = error instanceof Error ? error.message : '托管状态切换失败'
  } finally {
    mahjongGameStore.setPendingCommand('')
  }
}

async function loadRemoteGame() {
  loadingRemote.value = true
  remoteError.value = ''

  try {
    if (activeGameId.value) {
      await loadLatestFormalGame()
    } else {
      throw new Error(activeRoomId.value
        ? '当前房间尚未开始正式对局，请返回房间等待房主开局。'
        : '请先进入房间，再开始山东麻将对局。')
    }
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

  mahjongGameStore.pushRecentEvent(envelope)
  mahjongGameStore.setLatestEvent(envelope.event)
  mahjongGameStore.setPendingCommand('')
  mahjongGameStore.setContext({
    roomId: envelope.roomId,
    gameId: envelope.gameId
  })

  if (envelope.payload?.roomSnapshot) {
    handleRoomSnapshot(envelope.payload.roomSnapshot)
  }

  if (envelope.payload?.gameSnapshot) {
    applyRemoteGame(envelope.payload.gameSnapshot)
  }

  if (envelope.payload?.tile) {
    lastDiscard.value = normalizeRemoteTile(envelope.payload.tile)
    mahjongGameStore.setLastDiscard(envelope.payload.tile)
  }

  if (envelope.event === 'ACTION_AVAILABLE' || envelope.event === 'ACTION_WINDOW_UPDATED') {
    realtimeActionTile.value = envelope.payload?.relatedTile ? normalizeRemoteTile(envelope.payload.relatedTile) : null
    if (envelope.payload?.playerPosition !== selfPlayerPosition.value) {
      mahjongGameStore.setCurrentActions([])
      gameState.value = getLocalGameStateForTurn(currentTurn.value)
      return
    }

    const actions = (envelope.payload?.actions || []).map(action => {
      const type = normalizeActionType(action)
      return { type, label: getActionLabel(type) }
    })
    mahjongGameStore.setCurrentActions(actions)
    gameState.value = 'action'
    emitTableCue('action', '可执行动作', actions.map(action => action.label).join(' / '), realtimeActionTile.value)
    return
  }

  realtimeActionTile.value = null
  mahjongGameStore.setCurrentActions([])

  if (envelope.event === 'TILE_DRAWN' || envelope.event === 'DEAL_COMPLETED') {
    emitTableCue('draw', envelope.event === 'DEAL_COMPLETED' ? '牌局已发牌' : '有人摸牌', envelope.event === 'DEAL_COMPLETED' ? '等待本轮开始' : '牌局继续进行')
    gameState.value = getLocalGameStateForTurn(currentTurn.value)
    refreshAvailableOperations()
  }

  if (envelope.event === 'TILE_DISCARDED' || envelope.event === 'PONG_COMPLETED' || envelope.event === 'CHOW_COMPLETED' || envelope.event === 'KONG_COMPLETED') {
    const cueMap = {
      TILE_DISCARDED: '出牌',
      PONG_COMPLETED: '碰牌',
      CHOW_COMPLETED: '吃牌',
      KONG_COMPLETED: '杠牌'
    }
    emitTableCue(normalizeActionType(envelope.event.replace('_COMPLETED', '').replace('TILE_', '').toLowerCase()), cueMap[envelope.event] || '牌局动作', envelope.payload?.playerName || envelope.payload?.playerId || '', lastDiscard.value)
    gameState.value = getLocalGameStateForTurn(currentTurn.value)
    refreshAvailableOperations()
  }

  if (envelope.event === 'ROUND_SETTLED') {
    roomStore.setRoomStatus('FINISHED')
    emitTableCue('hu', '本局结算', '牌局已结束')
    applySettlement(envelope.payload?.roundSettlement || mahjongGameStore.game?.roundSettlement, mahjongGameStore.game)
  }
}

function handleSystemEnvelope(envelope) {
  if (envelope.scene !== 'system' && envelope.event !== 'ERROR') return

  if (['RECONNECT_SNAPSHOT', 'ERROR'].includes(envelope.event)) {
    mahjongGameStore.pushRecentEvent(envelope)
  }

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

  if (envelope.event === 'RECONNECT_SNAPSHOT') {
    if (envelope.payload?.roomSnapshot) {
      handleRoomSnapshot(envelope.payload.roomSnapshot, { returnToRoomOnNoGame: true })
    }
    if (envelope.payload?.gameSnapshot) {
      applyRemoteGame(envelope.payload.gameSnapshot)
      refreshAvailableOperations()
      return
    }
    if (envelope.payload?.gameChanged && envelope.payload?.roomSnapshot?.currentGameId) {
      const nextGameId = envelope.payload.roomSnapshot.currentGameId
      mahjongGameStore.setContext({
        roomId: envelope.payload.roomSnapshot.roomId || envelope.roomId || activeRoomId.value,
        gameId: nextGameId
      })
      router.replace({
        path: '/mahjong',
        query: {
          roomId: envelope.payload.roomSnapshot.roomId || activeRoomId.value,
          gameId: nextGameId
        }
      })
      loadLatestFormalGame(nextGameId).catch(() => {})
    }
    return
  }

  if (envelope.event === 'ERROR') {
    mahjongGameStore.setPendingCommand('')
    remoteError.value = envelope.message || '实时服务返回错误'
  }
}

async function subscribeGameTopic(targetGameId = activeGameId.value) {
  if (!targetGameId) return

  unsubscribeGame?.()
  try {
    unsubscribeGame = await realtimeService.subscribe(
      `mahjong-game-${targetGameId}`,
      `/topic/game/${targetGameId}`,
      handleRealtimeEnvelope
    )
    await realtimeService.requestReconnectSnapshot({
      roomId: activeRoomId.value || undefined,
      gameId: targetGameId,
      gameCode: 'SHANDONG_MAHJONG'
    })
  } catch {
    mahjongGameStore.setRealtimeConnected(false)
  }
}

function selectTile(index) {
  if (currentTurn.value !== 'me' || gameState.value !== 'myTurn') return
  selectedTile.value = selectedTile.value === index ? null : index
}

async function discardSelected() {
  if (selectedTile.value === null) return
  if (currentTurn.value !== 'me' || gameState.value !== 'myTurn') return

  const tile = myHand.value[selectedTile.value]

  if (isRealtimeDriven.value) {
    const sent = await performFormalGameAction('discard', {
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
  emitTableCue('discard', '你已出牌', removedTile?.name || '', removedTile)
  selectedTile.value = null
  advanceTurn()
}

function advanceTurn() {
  if (isRealtimeDriven.value) return
  currentTurnIdx.value = getNextLocalTurnIndex(currentTurnIdx.value)
  if (currentTurn.value === 'me') {
    gameState.value = getLocalGameStateForTurn(currentTurn.value)
    drawTile()
  } else {
    gameState.value = getLocalGameStateForTurn(currentTurn.value)
    const delay = getLocalAiDelayMs()
    setTimeout(() => runAiTurn(), delay)
  }
}

function runAiTurn() {
  if (isRealtimeDriven.value) return
  if (loadingRemote.value || currentTurn.value === 'me') return
  const key = currentTurn.value
  const defs = gameMode.value === 'shandong' ? TILES_SHANDONG : TILES_STANDARD
  const tile = drawTileFromDeck(gameDeck, defs, makeTile)
  players[key].discards.push(tile)
  lastDiscard.value = tile
  emitTableCue('discard', `${players[key].name} 出牌`, tile?.name || '', tile)
  remainingTiles.value = Math.max(0, remainingTiles.value - 1)

  if (shouldTriggerLocalAction()) {
    gameState.value = 'action'
    setTimeout(() => {
      if (gameState.value === 'action') doAction('pass')
    }, 5000)
  } else {
    advanceTurn()
  }
}

function drawTile() {
  if (isRealtimeDriven.value) return
  if (remainingTiles.value <= 0) return
  const defs = gameMode.value === 'shandong' ? TILES_SHANDONG : TILES_STANDARD
  const tile = drawTileFromDeck(gameDeck, defs, makeTile)
  myHand.value.push(tile)
  myHand.value = sortHand(myHand.value)
  remainingTiles.value = Math.max(0, remainingTiles.value - 1)
}

async function doAction(type) {
  if (isRealtimeDriven.value) {
    const sent = ['chi', 'gang'].includes(type)
      ? await openActionChoice(type)
      : await performFormalGameAction(type)
    if (sent) {
      emitTableCue(type, `已提交${getActionLabel(type)}`, realtimeActionTile.value?.name || lastDiscard.value?.name || '', realtimeActionTile.value || lastDiscard.value)
      gameState.value = 'aiTurn'
      mahjongGameStore.setCurrentActions([])
    }
    return
  }
  const actionOutcome = resolveLocalActionOutcome(type)
  emitTableCue(type, `执行${getActionLabel(type)}`, lastDiscard.value?.name || '', lastDiscard.value)

  if (actionOutcome.isWin) {
    const winResult = buildLocalWinResult(selfSeatName.value, isBackendDemoMode.value)
    winMessage.value = winResult.message
    winScore.value = winResult.fan
    myScore.value += winResult.fan
    settlementDetails.value = winResult.settlementDetails
    showWinModal.value = true
    return
  }

  if (actionOutcome.nextTurnIndex !== null) {
    currentTurnIdx.value = actionOutcome.nextTurnIndex
  }

  if (actionOutcome.nextGameState) {
    gameState.value = actionOutcome.nextGameState
  }

  if (actionOutcome.shouldDraw) {
    drawTile()
    return
  }

  if (actionOutcome.shouldAdvanceTurn) {
    advanceTurn()
  }
}

function newGame() {
  showWinModal.value = false
  if (isRealtimeDriven.value && activeRoomId.value) {
    router.push(`/room/${activeRoomId.value}`)
    return
  }
  if (isBackendDemoMode.value) {
    loadRemoteGame()
    return
  }
  round.value++
  initLocalGame()
}

function initLocalGame() {
  resetTable()
  const defs = gameMode.value === 'shandong' ? TILES_SHANDONG : TILES_STANDARD
  const initialRound = createInitialLocalRound(defs, makeTile, sortHand)
  gameDeck = initialRound.deck
  myHand.value = initialRound.myHand
  players.top.tileCount = initialRound.sideTileCount
  players.left.tileCount = initialRound.sideTileCount
  players.right.tileCount = initialRound.sideTileCount
  players.top.discards = []
  players.left.discards = []
  players.right.discards = []
  myDiscards.value = []
  remainingTiles.value = initialRound.remainingTiles
  selectedTile.value = null
  lastDiscard.value = null
  currentTurnIdx.value = LOCAL_SELF_TURN_INDEX
  gameState.value = getLocalGameStateForTurn(currentTurn.value)
}

function canLeaveActiveRoom() {
  const status = String(roomStore.currentRoom?.status || '').toUpperCase()
  return !!activeRoomId.value && status !== 'PLAYING'
}

function cleanupLocalGameState() {
  roomStore.clearRoom()
  mahjongGameStore.reset()
}

async function exitCurrentContext(targetPath, shouldLogout = false) {
  if (pendingCommand.value) return

  if (isRealtimeDriven.value && activeRoomId.value && !canLeaveActiveRoom()) {
    remoteError.value = '对局进行中，不能直接退出到大厅。请先完成本局或等待结算。'
    return
  }

  if (canLeaveActiveRoom()) {
    try {
      await leaveRoomRequest(activeRoomId.value, {
        playerId: selfPlayerId.value,
        playerName: username.value
      })
    } catch (error) {
      remoteError.value = error instanceof Error ? error.message : '离开房间失败'
      return
    }
  }

  cleanupLocalGameState()
  if (shouldLogout) {
    userStore.logout()
  }
  router.push(targetPath)
}

async function backToLobby() {
  await exitCurrentContext('/lobby')
}

async function logout() {
  await exitCurrentContext('/login', true)
}

onMounted(() => {
  deadlineTimer = window.setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 1000)

  roomStore.hydrateRoom()
  mahjongGameStore.setContext({
    roomId: activeRoomId.value,
    gameId: activeGameId.value
  })

  unsubscribeRealtimeStatus = realtimeService.onStatusChange(connected => {
    mahjongGameStore.setRealtimeConnected(connected)
    if (connected && activeGameId.value) {
      realtimeService.requestReconnectSnapshot({
        roomId: activeRoomId.value || undefined,
        gameId: activeGameId.value,
        gameCode: 'SHANDONG_MAHJONG'
      }).catch(() => {})
    }
  })
  unsubscribeSystemMessage = realtimeService.onSystemMessage(handleSystemEnvelope)

  if (isBackendDemoMode.value) {
    if (roomStore.currentRoom?.gameSnapshot) {
      applyRemoteGame(roomStore.currentRoom.gameSnapshot)
    }
    if (activeGameId.value) {
      subscribeGameTopic()
    }
    loadRemoteGame()
    return
  }
  initLocalGame()
})

watch(lastDiscard, (value, previous) => {
  if (!value || value === previous) return
  lastDiscardFxKey.value += 1
})

watch(
  () => `${gameState.value}:${availableActions.value.map(action => action.type).join(',')}`,
  (value, previous) => {
    if (value === previous) return
    if (gameState.value === 'action' && availableActions.value.length) {
      actionButtonsFxKey.value += 1
    }
  }
)

onUnmounted(() => {
  if (tableCueTimer) {
    window.clearTimeout(tableCueTimer)
    tableCueTimer = null
  }
  if (deadlineTimer) {
    window.clearInterval(deadlineTimer)
    deadlineTimer = null
  }
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
    radial-gradient(circle at 50% 50%, rgba(66, 145, 74, 0.18) 0%, transparent 26%),
    radial-gradient(circle at 50% 0%, rgba(226, 191, 92, 0.12) 0%, transparent 24%),
    radial-gradient(ellipse at 50% 0%, rgba(40,110,40,0.58) 0%, transparent 58%),
    linear-gradient(180deg, #123417 0%, #071109 100%);
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
  padding: 12px 22px;
  background: linear-gradient(180deg, rgba(5, 15, 10, 0.82), rgba(5, 15, 10, 0.56));
  border-bottom: 1px solid rgba(255,215,0,0.16);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(10px);
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
.realtime-pill.offline {
  background: rgba(255, 120, 120, 0.12);
  color: #ffc1c1;
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
  padding: 12px 16px 10px;
  gap: 10px;
  overflow: hidden;
}

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
  background: linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,255,255,0.06));
  box-shadow: 0 0 24px rgba(255,215,0,0.36), inset 0 0 0 1px rgba(255,245,180,0.2);
  transform: scale(1.04);
}
.self-info { padding: 7px 16px; }
.avatar { font-size: 22px; }
.player-name { font-size: 13px; color: #ffd700; font-weight: 600; }
.player-score { font-size: 11px; color: rgba(255,255,255,0.4); }
.player-state-line {
  font-size: 11px;
  color: rgba(255,255,255,0.58);
  margin-top: 2px;
}
.player-state-line.vertical {
  max-width: 56px;
  line-height: 1.3;
}
.player-result {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}
.player-result.vertical {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
}
.player-result.win {
  background: rgba(224, 40, 40, 0.2);
  border: 1px solid rgba(224, 40, 40, 0.45);
  color: #ff8f8f;
  box-shadow: 0 0 18px rgba(224, 40, 40, 0.2);
}

.turn-arrow, .turn-arrow-up, .turn-arrow-right, .turn-arrow-left {
  color: #ffd700;
  font-size: 16px;
  font-weight: 800;
  text-shadow: 0 0 14px rgba(255,215,0,0.75);
  animation: blink 0.75s infinite;
}

.meld-area {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 280px;
}
.side-melds {
  max-width: 84px;
}
.self-melds {
  max-width: 520px;
}
.vertical-melds {
  flex-direction: column;
}
.align-end {
  align-items: flex-end;
}
.meld-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.08);
}
.meld-group.vertical-group {
  flex-direction: column;
}
.meld-group.chi { border-color: rgba(40, 200, 104, 0.24); }
.meld-group.peng { border-color: rgba(240, 144, 24, 0.24); }
.meld-group.gang { border-color: rgba(152, 72, 200, 0.24); }
.meld-tile {
  margin: 0;
}

.hidden-tiles { display: flex; flex-wrap: wrap; gap: 1px; max-width: 190px; }
.hidden-tiles.vertical { flex-direction: column; max-width: none; max-height: 170px; overflow: hidden; }

.discard-area {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 108px;
  min-height: 48px;
  background: linear-gradient(180deg, rgba(8, 20, 12, 0.42), rgba(0, 0, 0, 0.2));
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.discard-v { flex-direction: column; min-width: 44px; min-height: 104px; max-height: 236px; overflow: hidden; }
.my-discards { min-width: 320px; }

.middle-row { flex: 1; display: flex; align-items: center; gap: 10px; min-height: 0; }
.left-player, .right-player { flex-shrink: 0; }

.center-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background:
    radial-gradient(circle at center, rgba(28, 103, 54, 0.34) 0%, rgba(10, 42, 21, 0.56) 52%, rgba(4, 14, 8, 0.72) 100%),
    linear-gradient(180deg, rgba(255,255,255,0.03), transparent);
  border: 1px solid rgba(255,215,0,0.16);
  border-radius: 28px;
  padding: 22px 14px;
  min-height: 180px;
  position: relative;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.03),
    inset 0 20px 40px rgba(255,255,255,0.03),
    0 28px 42px rgba(0,0,0,0.24);
}
.center-table::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(255,215,0,0.08);
  border-radius: 22px;
  pointer-events: none;
}
.center-table::after {
  content: '';
  position: absolute;
  inset: 22% 28%;
  border-radius: 28px;
  border: 1px dashed rgba(255, 215, 107, 0.08);
  pointer-events: none;
}

.turn-focus-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 215, 107, 0.18), rgba(255, 160, 40, 0.08));
  border: 1px solid rgba(255, 215, 107, 0.3);
  box-shadow: 0 0 22px rgba(255, 215, 107, 0.16);
}
.turn-focus-banner.self {
  background: linear-gradient(135deg, rgba(255, 215, 107, 0.28), rgba(255, 237, 176, 0.12));
  box-shadow: 0 0 26px rgba(255, 215, 107, 0.26);
}
.turn-focus-banner.actioning {
  animation: focusPulse 1.15s ease-in-out infinite;
}
.turn-focus-label {
  font-size: 11px;
  color: rgba(255,255,255,0.62);
  letter-spacing: 1px;
}
.turn-focus-name {
  font-size: 20px;
  color: #fff1b0;
  letter-spacing: 1px;
  text-shadow: 0 0 16px rgba(255, 215, 107, 0.35);
}
.turn-focus-tip {
  font-size: 12px;
  color: rgba(255,255,255,0.78);
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

.deadline-panel {
  width: min(100%, 240px);
  padding: 8px 10px;
  background: rgba(5, 22, 14, 0.46);
  border: 1px solid rgba(122, 214, 145, 0.22);
  border-radius: 10px;
}
.deadline-panel.urgent {
  background: rgba(58, 18, 18, 0.55);
  border-color: rgba(255, 120, 120, 0.34);
}
.deadline-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: rgba(255,255,255,0.78);
}
.deadline-label {
  color: rgba(255,255,255,0.54);
}
.deadline-value {
  color: #9df0b7;
  font-weight: 700;
}
.deadline-panel.urgent .deadline-value {
  color: #ff9a9a;
}
.deadline-track {
  margin-top: 7px;
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  overflow: hidden;
}
.deadline-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #5ce087 0%, #ffd86b 70%, #ff7b7b 100%);
  transition: width 0.8s linear;
}

.last-discard-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.last-discard-label { font-size: 11px; color: rgba(255,255,255,0.42); letter-spacing: 0.16em; }

.table-cue {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(8, 22, 13, 0.88), rgba(18, 48, 26, 0.7));
  border: 1px solid rgba(255, 215, 107, 0.18);
  box-shadow: 0 18px 30px rgba(0,0,0,0.24);
  overflow: hidden;
}
.table-cue-ring {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  transform: translateX(-100%);
  animation: cueSweep 1.1s ease-out forwards;
}
.table-cue-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.table-cue-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.table-cue-detail {
  font-size: 12px;
  color: rgba(255,255,255,0.72);
}
.cue-discard {
  border-color: rgba(255, 215, 107, 0.28);
}
.cue-action {
  border-color: rgba(114, 215, 255, 0.34);
  background: linear-gradient(135deg, rgba(11, 24, 34, 0.9), rgba(23, 68, 92, 0.65));
}
.cue-hu {
  border-color: rgba(255, 123, 123, 0.36);
  background: linear-gradient(135deg, rgba(61, 12, 12, 0.92), rgba(128, 24, 24, 0.68));
}
.cue-chi,
.cue-peng,
.cue-gang,
.cue-draw {
  border-color: rgba(157, 240, 183, 0.28);
}

.table-cue-enter-active,
.table-cue-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}
.table-cue-enter-from,
.table-cue-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

.round-summary {
  width: min(100%, 340px);
  padding: 10px 12px;
  background: rgba(0,0,0,0.24);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
}
.summary-title {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.summary-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}
.summary-item.winner {
  color: #ffd66b;
}
.summary-name {
  font-weight: 700;
}
.summary-meta {
  text-align: right;
  color: rgba(255,255,255,0.56);
}

.action-buttons { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
.action-buttons-live {
  animation: actionGroupRise 0.32s ease-out;
}
.action-btn {
  position: relative;
  padding: 7px 15px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
}
.action-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.24), transparent 80%);
  transform: translateX(-130%);
}
.action-buttons-live .action-btn::after {
  animation: btnShine 1s ease-out both;
}
.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
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
.action-btn.emphasis {
  animation: emphasisBeat 1.1s ease-in-out infinite;
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

.room-debug-panel {
  width: min(100%, 420px);
  padding: 10px 12px;
  background: rgba(0,0,0,0.24);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
}
.room-debug-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.room-debug-item {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
}
.room-debug-label {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.48);
  margin-bottom: 4px;
}
.room-debug-value {
  font-size: 12px;
  color: rgba(255,255,255,0.84);
}

.action-choice-content {
  width: min(520px, calc(100vw - 32px));
}
.action-choice-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
.action-choice-btn {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.action-choice-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
}
.action-choice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.action-choice-meta {
  color: rgba(255,255,255,0.55);
  font-size: 12px;
}

.bottom-player { gap: 6px; flex-shrink: 0; }
.my-discards-wrap { display: flex; justify-content: center; width: 100%; }
.my-hand-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; }
.my-hand {
  display: flex;
  align-items: flex-end;
  max-width: min(100%, 980px);
  padding: 14px 14px 10px;
  background: linear-gradient(180deg, rgba(8, 21, 12, 0.52), rgba(4, 10, 6, 0.38));
  border: 1px solid rgba(255, 215, 107, 0.14);
  border-radius: 22px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 20px 40px rgba(0,0,0,0.18);
  overflow-x: auto;
  overflow-y: visible;
}
.my-hand::-webkit-scrollbar {
  height: 8px;
}
.my-hand::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 107, 0.22);
  border-radius: 999px;
}
.hand-sep {
  width: 8px;
  height: 66px;
  align-self: flex-end;
  border-right: 2px dashed rgba(255,215,0,0.16);
  margin: 0 6px;
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
.discard-btn.ready {
  animation: discardReady 1.2s ease-in-out infinite;
}
.discard-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.discard-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(255,215,0,0.5);
}

@keyframes focusPulse {
  0%, 100% { box-shadow: 0 0 22px rgba(255, 215, 107, 0.16); transform: translateY(0); }
  50% { box-shadow: 0 0 30px rgba(255, 215, 107, 0.28); transform: translateY(-2px); }
}

@keyframes cueSweep {
  from { transform: translateX(-110%); }
  to { transform: translateX(110%); }
}

@keyframes actionGroupRise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes btnShine {
  from { transform: translateX(-130%); }
  to { transform: translateX(130%); }
}

@keyframes emphasisBeat {
  0%, 100% { transform: scale(1); filter: saturate(1); }
  50% { transform: scale(1.05); filter: saturate(1.12); }
}

@keyframes discardReady {
  0%, 100% { box-shadow: 0 3px 16px rgba(255,215,0,0.35); }
  50% { box-shadow: 0 8px 24px rgba(255,215,0,0.55); }
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
.settlement-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(100%, 420px);
  margin: 0 auto 24px;
}
.settlement-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.76);
  font-size: 14px;
}
.settlement-item.winner {
  background: rgba(255, 215, 0, 0.12);
  border-color: rgba(255, 215, 0, 0.28);
  color: #ffd76b;
}
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

@media (max-width: 1100px) {
  .header {
    flex-wrap: wrap;
    justify-content: center;
  }

  .header-center {
    order: 3;
    width: 100%;
  }

  .header-right {
    flex-wrap: wrap;
    justify-content: center;
  }

  .center-table {
    padding: 18px 12px;
  }

  .self-melds {
    max-width: 100%;
  }

  .my-discards {
    min-width: min(100%, 260px);
  }

  .my-hand {
    max-width: calc(100vw - 36px);
  }
}

@media (max-width: 820px) {
  .mahjong-app {
    overflow: auto;
  }

  .game-area {
    overflow: visible;
    min-width: 760px;
  }

  .middle-row {
    gap: 8px;
  }

  .player-info.vertical {
    padding: 6px 4px;
  }

  .player-state-line.vertical {
    max-width: 48px;
  }

  .turn-focus-name {
    font-size: 16px;
  }

  .turn-focus-tip {
    width: 100%;
    text-align: center;
  }

  .round-summary {
    width: min(100%, 300px);
  }

  .discard-v {
    max-height: 196px;
  }
}
</style>
