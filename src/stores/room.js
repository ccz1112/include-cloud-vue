import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { normalizeRoom } from '../api/room.js'

const STORAGE_KEY = 'mahjong-room'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readStoredRoom() {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

function persistRoom(room) {
  if (!room) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(room))
}

export const useRoomStore = defineStore('room', () => {
  const currentRoom = ref(readStoredRoom())
  const recentEvents = ref([])

  function syncReadyState() {
    if (!currentRoom.value) return
    currentRoom.value.seatedCount = currentRoom.value.players.length
    currentRoom.value.readyCount = currentRoom.value.players.filter(player => player.ready).length
    currentRoom.value.allReady = currentRoom.value.readyCount > 0 && currentRoom.value.readyCount === currentRoom.value.players.length
  }

  function pushRecentEvent(envelope) {
    if (!envelope?.event) return
    recentEvents.value = [
      {
        key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        event: envelope.event,
        message: envelope.message || '',
        timestamp: envelope.timestamp || Date.now(),
        payload: envelope.payload || {}
      },
      ...recentEvents.value
    ].slice(0, 12)
  }

  const seats = computed(() => {
    if (!currentRoom.value) return []
    const result = []
    for (let seatIndex = 0; seatIndex < currentRoom.value.maxPlayers; seatIndex++) {
      const player = currentRoom.value.players.find(item => item.seatIndex === seatIndex)
      result.push({ seatIndex, player: player || null })
    }
    return result
  })

  const canStart = computed(() => {
    if (!currentRoom.value) return false
    const occupied = currentRoom.value.players.length
    const readyCount = currentRoom.value.players.filter(player => player.ready).length
    return !currentRoom.value.matchCompleted
      && occupied === currentRoom.value.maxPlayers
      && readyCount === currentRoom.value.maxPlayers
  })

  const isFinished = computed(() => currentRoom.value?.status === 'FINISHED' || currentRoom.value?.status === '游戏结束')
  const isMatchCompleted = computed(() => !!currentRoom.value?.matchCompleted)

  const isWaitingNextRound = computed(() => {
    if (!currentRoom.value) return false
    return currentRoom.value.status === 'WAITING' && !currentRoom.value.currentGameId && !currentRoom.value.matchCompleted
  })

  function setCurrentRoom(room) {
    currentRoom.value = room ? normalizeRoom(clone(room), currentRoom.value || {}) : null
    persistRoom(currentRoom.value)
  }

  function hydrateRoom() {
    const room = readStoredRoom()
    currentRoom.value = room ? normalizeRoom(room) : null
  }

  function clearRoom() {
    currentRoom.value = null
    recentEvents.value = []
    persistRoom(null)
  }

  function setRoomStatus(status) {
    if (!currentRoom.value) return
    currentRoom.value.status = status
    persistRoom(currentRoom.value)
  }

  function setCurrentGameSnapshot(gameSnapshot) {
    if (!currentRoom.value) return
    currentRoom.value.gameSnapshot = gameSnapshot || null
    currentRoom.value.currentGameId = gameSnapshot?.gameId || currentRoom.value.currentGameId || ''
    currentRoom.value.gameInstanceId = currentRoom.value.currentGameId
    persistRoom(currentRoom.value)
  }

  function clearCurrentGame() {
    if (!currentRoom.value) return
    currentRoom.value.currentGameId = ''
    currentRoom.value.gameInstanceId = ''
    currentRoom.value.gameSnapshot = null
    persistRoom(currentRoom.value)
  }

  function applyRoomEnvelope(envelope) {
    if (!currentRoom.value) return
    if (envelope.roomId && envelope.roomId !== currentRoom.value.id) return

    pushRecentEvent(envelope)

    const { event, payload = {}, gameId, gameCode } = envelope

    if (payload.roomSnapshot || payload.room) {
      setCurrentRoom(normalizeRoom(payload.roomSnapshot || payload.room, currentRoom.value))
      return
    }

    if (gameId) {
      currentRoom.value.currentGameId = gameId
      currentRoom.value.gameInstanceId = gameId
    }
    if (gameCode) {
      currentRoom.value.gameCode = gameCode
    }
    if (payload.gameSnapshot) {
      currentRoom.value.gameSnapshot = payload.gameSnapshot
    }

    if (event === 'PLAYER_JOINED' && payload.player) {
      const exists = currentRoom.value.players.some(player => player.username === payload.player.playerName)
      if (!exists) {
        currentRoom.value.players.push({
          username: payload.player.playerName,
          ready: !!payload.player.ready,
          isOwner: false,
          seatIndex: payload.player.seatNo ?? currentRoom.value.players.length
        })
      }
      currentRoom.value.players.forEach(player => {
        player.ready = false
      })
      currentRoom.value.status = 'WAITING'
      currentRoom.value.currentGameId = ''
      currentRoom.value.gameInstanceId = ''
      currentRoom.value.lastFinishedGameId = ''
      currentRoom.value.gameSnapshot = null
      currentRoom.value.matchCompleted = false
      syncReadyState()
    }

    if (event === 'PLAYER_LEFT') {
      currentRoom.value.players = currentRoom.value.players.filter(player => {
        return player.username !== payload.playerId && player.username !== payload.playerName
      })
      currentRoom.value.status = 'WAITING'
      currentRoom.value.currentGameId = ''
      currentRoom.value.gameInstanceId = ''
      currentRoom.value.lastFinishedGameId = ''
      currentRoom.value.gameSnapshot = null
      currentRoom.value.matchCompleted = false
      syncReadyState()
    }

    if (event === 'PLAYER_READY') {
      const player = currentRoom.value.players.find(item => item.username === payload.playerId || item.username === payload.playerName)
      if (player) {
        player.ready = !!payload.ready
      }
      syncReadyState()
      if ((currentRoom.value.status === 'FINISHED' || currentRoom.value.status === '游戏结束') && payload.ready) {
        currentRoom.value.status = 'WAITING'
      }
      if (currentRoom.value.status === 'WAITING' && payload.ready) {
        currentRoom.value.currentGameId = ''
        currentRoom.value.gameInstanceId = ''
        currentRoom.value.gameSnapshot = null
      }
    }

    if (event === 'GAME_STARTED') {
      currentRoom.value.status = 'PLAYING'
      currentRoom.value.currentGameId = payload.currentGameId || gameId || currentRoom.value.currentGameId || ''
      currentRoom.value.gameInstanceId = currentRoom.value.currentGameId
      currentRoom.value.matchCompleted = false
      if (payload.gameSnapshot) {
        currentRoom.value.gameSnapshot = payload.gameSnapshot
      }
      syncReadyState()
    }

    if (event === 'ROUND_SETTLED') {
      currentRoom.value.status = 'FINISHED'
      currentRoom.value.currentGameId = payload.currentGameId || gameId || currentRoom.value.currentGameId || ''
      currentRoom.value.gameInstanceId = currentRoom.value.currentGameId
      currentRoom.value.lastFinishedGameId = currentRoom.value.currentGameId
      currentRoom.value.matchCompleted = !!payload.matchCompleted
      if (payload.gameSnapshot) {
        currentRoom.value.gameSnapshot = payload.gameSnapshot
      }
      syncReadyState()
    }

    persistRoom(currentRoom.value)
  }

  return {
    currentRoom,
    recentEvents,
    seats,
    canStart,
    isFinished,
    isMatchCompleted,
    isWaitingNextRound,
    setCurrentRoom,
    hydrateRoom,
    clearRoom,
    setRoomStatus,
    setCurrentGameSnapshot,
    clearCurrentGame,
    applyRoomEnvelope
  }
})