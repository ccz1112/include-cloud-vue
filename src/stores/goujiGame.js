import { defineStore } from 'pinia'

export const useGoujiGameStore = defineStore('goujiGame', {
  state: () => ({
    game: null,
    lastPlayedCards: [],
    currentPhase: 'WAITING',
    tributeRelations: []
  }),
  actions: {
    setGame(game) {
      this.game = game
    },
    setLastPlayedCards(cards) {
      this.lastPlayedCards = cards
    },
    setCurrentPhase(phase) {
      this.currentPhase = phase
    },
    setTributeRelations(relations) {
      this.tributeRelations = relations
    },
    reset() {
      this.game = null
      this.lastPlayedCards = []
      this.currentPhase = 'WAITING'
      this.tributeRelations = []
    }
  }
})