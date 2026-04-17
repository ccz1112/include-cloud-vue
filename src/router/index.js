import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Lobby from '../views/Lobby.vue'
import Mahjong from '../views/Mahjong.vue'
import Room from '../views/Room.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  {
    path: '/lobby',
    component: Lobby,
    meta: { requiresAuth: true }
  },
  {
    path: '/mahjong',
    component: Mahjong,
    meta: { requiresAuth: true }
  },
  {
    path: '/room/:roomId',
    component: Room,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn')
  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
