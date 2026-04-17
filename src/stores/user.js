import { defineStore } from 'pinia'

function readInitialUser() {
  return {
    username: localStorage.getItem('username') || '玩家',
    avatar: '😊',
    isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
    token: localStorage.getItem('token') || ''
  }
}

export const useUserStore = defineStore('user', {
  state: () => readInitialUser(),
  actions: {
    setAuth({ username, token }) {
      if (username !== undefined) {
        localStorage.setItem('username', username)
      }
      if (token !== undefined) {
        if (token) {
          localStorage.setItem('token', token)
        } else {
          localStorage.removeItem('token')
        }
      }
      localStorage.setItem('isLoggedIn', 'true')
      this.syncFromLocalStorage()
    },
    syncFromLocalStorage() {
      Object.assign(this, readInitialUser())
    },
    logout() {
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('username')
      localStorage.removeItem('token')
      localStorage.removeItem('gameMode')
      this.syncFromLocalStorage()
    }
  }
})