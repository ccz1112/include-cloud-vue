import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

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

function buildRoom(game, ownerName) {
  return {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    gameId: game.id,
    gameCode: game.gameCode,
    gameTitle: game.title,
    ownerName,
    status: '等待中',
    maxPlayers: game.maxPlayers,
    players: [
      { username: ownerName, ready: true, isOwner: true, seatIndex: 0 }
    ]
  }
}

export const useRoomStore = defineStore('room', () => {
  const currentRoom = ref(readStoredRoom())

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
    return occupied >= 2 && occupied === readyCount
  })

  function setCurrentRoom(room) {
    currentRoom.value = room ? clone(room) : null
    persistRoom(currentRoom.value)
  }

  function hydrateRoom() {
    currentRoom.value = readStoredRoom()
  }

  function clearRoom() {
    currentRoom.value = null
    persistRoom(null)
  }

  function createRoomFromGame(game, ownerName) {
    const room = buildRoom(game, ownerName)
    setCurrentRoom(room)
    return room
  }

  function joinRoom(room, username) {
    const nextRoom = clone(room)
    if (!nextRoom.players.some(player => player.username === username)) {
      const takenSeats = new Set(nextRoom.players.map(player => player.seatIndex))
      const seatIndex = Array.from({ length: nextRoom.maxPlayers }, (_, index) => index)
        .find(index => !takenSeats.has(index))
      if (seatIndex !== undefined) {
        nextRoom.players.push({
          username,
          ready: false,
          isOwner: false,
          seatIndex
        })
      }
    }
    setCurrentRoom(nextRoom)
    return nextRoom
  }

  function toggleReady(username) {
    if (!currentRoom.value) return
    const player = currentRoom.value.players.find(item => item.username === username)
    if (!player) return
    if (player.isOwner && currentRoom.value.players.length === 1) {
      player.ready = true
    } else {
      player.ready = !player.ready
    }
    persistRoom(currentRoom.value)
  }

  function setRoomStatus(status) {
    if (!currentRoom.value) return
    currentRoom.value.status = status
    persistRoom(currentRoom.value)
  }

  function applyRoomEnvelope(envelope) {
    if (!currentRoom.value) return
    if (envelope.roomId && envelope.roomId !== currentRoom.value.id) return

    const { event, payload = {}, gameId, gameCode } = envelope

    if (gameId) {
      currentRoom.value.gameInstanceId = gameId
    }
    if (gameCode) {
      currentRoom.value.gameCode = gameCode
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
    }

    if (event === 'PLAYER_LEFT') {
      currentRoom.value.players = currentRoom.value.players.filter(player => {
        return player.username !== payload.playerId && player.username !== payload.playerName
      })
    }

    if (event === 'PLAYER_READY') {
      const player = currentRoom.value.players.find(item => item.username === payload.playerId || item.username === payload.playerName)
      if (player) {
        player.ready = !!payload.ready
      }
    }

    if (event === 'GAME_STARTED') {
      currentRoom.value.status = '游戏中'
      if (payload.gameSnapshot) {
        currentRoom.value.gameSnapshot = payload.gameSnapshot
      }
    }

    persistRoom(currentRoom.value)
  }

  return {
    currentRoom,
    seats,
    canStart,
    setCurrentRoom,
    hydrateRoom,
    clearRoom,
    createRoomFromGame,
    joinRoom,
    toggleReady,
    setRoomStatus,
    applyRoomEnvelope
  }
})