import { defineStore } from 'pinia'
import { isRoomJoinable, normalizeRoomList } from '../api/room.js'

const games = [
  {
    id: 'standard-mahjong',
    gameCode: 'POPULAR_MAHJONG',
    title: '大众麻将',
    badge: '本地练习',
    description: '经典玩法，本地单机 1v3 AI，对练和验证前端交互。',
    playersLabel: '4 人桌',
    quickStartMode: 'standard',
    supportsRooms: false,
    maxPlayers: 4
  },
  {
    id: 'shandong-mahjong',
    gameCode: 'SHANDONG_MAHJONG',
    title: '山东麻将',
    badge: '在线对局',
    description: '支持多人房间、准备开局、正式对局与结算重开。',
    playersLabel: '4 人桌',
    quickStartMode: 'shandong',
    supportsRooms: true,
    maxPlayers: 4
  },
  {
    id: 'shandong-gouji',
    gameCode: 'SHANDONG_GOUJI',
    title: '山东够级',
    badge: '房间骨架',
    description: '规则引擎已存在，当前先搭房间和牌桌骨架，等待 controller 开放。',
    playersLabel: '6 人桌',
    quickStartMode: '',
    supportsRooms: true,
    maxPlayers: 6
  }
]

export const useLobbyStore = defineStore('lobby', {
  state: () => ({
    availableGames: games,
    selectedGameId: 'shandong-mahjong',
    roomGroups: {},
    realtimeConnected: false,
    lastLobbyEvent: ''
  }),
  getters: {
    selectedGame(state) {
      return state.availableGames.find(game => game.id === state.selectedGameId) || state.availableGames[0]
    },
    filteredRooms(state) {
      const selectedGame = state.availableGames.find(game => game.id === state.selectedGameId)
      return selectedGame
        ? (state.roomGroups[selectedGame.gameCode] || []).filter(isRoomJoinable)
        : []
    }
  },
  actions: {
    selectGame(gameId) {
      this.selectedGameId = gameId
    },
    setRealtimeConnected(connected) {
      this.realtimeConnected = connected
    },
    setRoomsForGame(gameCode, rooms) {
      this.roomGroups = {
        ...this.roomGroups,
        [gameCode]: rooms
      }
    },
    applyRoomListEnvelope(envelope) {
      const gameCode = envelope?.payload?.gameCode || envelope?.gameCode
      const rooms = normalizeRoomList(envelope?.payload, gameCode)
      if (!gameCode) return

      this.setRoomsForGame(gameCode, rooms)
      this.lastLobbyEvent = envelope.event || 'ROOM_LIST_UPDATED'
    }
  }
})