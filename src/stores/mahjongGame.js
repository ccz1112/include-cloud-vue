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
    currentOperationState: null,
    recentEvents: [],
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
    setCurrentOperationState(operationState) {
      this.currentOperationState = operationState || null
    },
    pushRecentEvent(envelope) {
      if (!envelope?.event) return
      this.recentEvents = [
        {
          key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          event: envelope.event,
          message: envelope.message || '',
          timestamp: envelope.timestamp || Date.now(),
          payload: envelope.payload || {}
        },
        ...this.recentEvents
      ].slice(0, 16)
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
      this.currentOperationState = null
      this.recentEvents = []
      this.lastDiscard = null
    }
  }
})