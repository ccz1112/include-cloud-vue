import { defineStore } from 'pinia'

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
    badge: '演示联调',
    description: '后端负责初始化和发牌，前端继续承接桌面交互与 Mock 动作流。',
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

const mockRooms = [
  {
    id: 'MJ8801',
    gameId: 'shandong-mahjong',
    gameCode: 'SHANDONG_MAHJONG',
    gameTitle: '山东麻将',
    ownerName: '牌友老李',
    status: '等待中',
    maxPlayers: 4,
    players: [
      { username: '牌友老李', ready: true, isOwner: true, seatIndex: 0 },
      { username: '清一色', ready: false, isOwner: false, seatIndex: 1 }
    ]
  },
  {
    id: 'GJ6602',
    gameId: 'shandong-gouji',
    gameCode: 'SHANDONG_GOUJI',
    gameTitle: '山东够级',
    ownerName: '够级王',
    status: '等待中',
    maxPlayers: 6,
    players: [
      { username: '够级王', ready: true, isOwner: true, seatIndex: 0 },
      { username: '顺子哥', ready: true, isOwner: false, seatIndex: 1 },
      { username: '炸弹姐', ready: false, isOwner: false, seatIndex: 2 }
    ]
  }
]

export const useLobbyStore = defineStore('lobby', {
  state: () => ({
    availableGames: games,
    selectedGameId: 'shandong-mahjong',
    mockRooms,
    realtimeRoomGroups: {},
    realtimeConnected: false,
    lastLobbyEvent: ''
  }),
  getters: {
    selectedGame(state) {
      return state.availableGames.find(game => game.id === state.selectedGameId) || state.availableGames[0]
    },
    filteredRooms(state) {
      const selectedGame = state.availableGames.find(game => game.id === state.selectedGameId)
      const realtimeRooms = selectedGame ? state.realtimeRoomGroups[selectedGame.gameCode] : null
      if (realtimeRooms?.length) {
        return realtimeRooms
      }
      return state.mockRooms.filter(room => room.gameId === state.selectedGameId)
    }
  },
  actions: {
    selectGame(gameId) {
      this.selectedGameId = gameId
    },
    setRealtimeConnected(connected) {
      this.realtimeConnected = connected
    },
    applyRoomListEnvelope(envelope) {
      const gameCode = envelope?.payload?.gameCode
      const rooms = envelope?.payload?.rooms || []
      if (!gameCode) return

      const matchedGame = this.availableGames.find(game => game.gameCode === gameCode)
      const mappedRooms = rooms.map(room => ({
        id: room.roomId,
        gameCode,
        gameId: matchedGame?.id || '',
        gameTitle: matchedGame?.title || gameCode,
        ownerName: room.ownerName || '待同步',
        status: room.status,
        maxPlayers: room.maxPlayerCount,
        players: Array.from({ length: room.playerCount }, (_, index) => ({
          username: `玩家${index + 1}`,
          ready: false,
          isOwner: index === 0,
          seatIndex: index
        }))
      }))

      this.realtimeRoomGroups = {
        ...this.realtimeRoomGroups,
        [gameCode]: mappedRooms
      }
      this.lastLobbyEvent = envelope.event || 'ROOM_LIST_UPDATED'
    }
  }
})