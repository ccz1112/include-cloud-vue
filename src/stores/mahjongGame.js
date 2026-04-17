import { defineStore } from 'pinia'

export const useMahjongGameStore = defineStore('mahjongGame', {
  state: () => ({
    game: null,
    roomId: '',
    gameId: '',
    realtimeConnected: false,
    latestEvent: '',
    pendingCommand: '',
    currentActions: [],
    lastDiscard: null
  }),
  actions: {
    setGame(game) {
      this.game = game
    },
    setContext(context = {}) {
      if (context.roomId !== undefined) this.roomId = context.roomId || ''
      if (context.gameId !== undefined) this.gameId = context.gameId || ''
    },
    setRealtimeConnected(connected) {
      this.realtimeConnected = connected
    },
    setLatestEvent(event) {
      this.latestEvent = event
    },
    setPendingCommand(command) {
      this.pendingCommand = command || ''
    },
    setCurrentActions(actions) {
      this.currentActions = actions
    },
    setLastDiscard(tile) {
      this.lastDiscard = tile
    },
    reset() {
      this.game = null
      this.roomId = ''
      this.gameId = ''
      this.realtimeConnected = false
      this.latestEvent = ''
      this.pendingCommand = ''
      this.currentActions = []
      this.lastDiscard = null
    }
  }
})