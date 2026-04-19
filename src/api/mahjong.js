import { createJsonRequester } from './http.js'

const DEMO_API_PREFIX = import.meta.env.VITE_MAHJONG_API_PREFIX || '/api/mahjong'
const GAME_API_PREFIX = import.meta.env.VITE_MAHJONG_GAME_API_PREFIX || '/api/mahjong/game'

const requestDemo = createJsonRequester(DEMO_API_PREFIX)
const requestGame = createJsonRequester(GAME_API_PREFIX)

export function initMahjongGame(payload = {}) {
  return requestGame('/init', {
    method: 'POST',
    body: payload
  })
}

export function getMahjongGame(gameId, viewerPlayerId) {
  return requestGame(`/${gameId}`, {
    method: 'GET',
    query: {
      viewerPlayerId
    }
  })
}

export function dealMahjongGame(gameId) {
  return requestGame(`/${gameId}/deal`, {
    method: 'POST'
  })
}

export function discardMahjongTile(gameId, payload) {
  return requestGame(`/${gameId}/discard`, {
    method: 'POST',
    body: payload
  })
}

export function drawMahjongTile(gameId, payload = {}) {
  return requestGame(`/${gameId}/draw`, {
    method: 'POST',
    body: payload
  })
}

export function pongMahjongTile(gameId, payload) {
  return requestGame(`/${gameId}/pong`, {
    method: 'POST',
    body: payload
  })
}

export function chowMahjongTile(gameId, payload) {
  return requestGame(`/${gameId}/chow`, {
    method: 'POST',
    body: payload
  })
}

export function kongMahjongTile(gameId, payload) {
  return requestGame(`/${gameId}/kong`, {
    method: 'POST',
    body: payload
  })
}

export function winMahjongTile(gameId, payload) {
  return requestGame(`/${gameId}/win`, {
    method: 'POST',
    body: payload
  })
}

export function passMahjongAction(gameId, payload) {
  return requestGame(`/${gameId}/pass`, {
    method: 'POST',
    body: payload
  })
}

export function enableMahjongAutoManage(gameId, payload) {
  return requestGame(`/${gameId}/auto-manage`, {
    method: 'POST',
    body: payload
  })
}

export function resumeMahjongAutoManage(gameId, payload) {
  return requestGame(`/${gameId}/auto-manage/resume`, {
    method: 'POST',
    body: payload
  })
}

export function getMahjongOperations(gameId, payload = {}) {
  const { playerId, seat, playerPosition, legacy = false } = payload

  if (legacy && playerPosition !== undefined && playerPosition !== null) {
    return requestGame(`/${gameId}/operations/${playerPosition}`, {
      method: 'GET',
      query: {
        playerId
      }
    })
  }

  return requestGame(`/${gameId}/operations`, {
    method: 'GET',
    query: {
      playerId,
      seat,
      playerPosition
    }
  })
}

export function initMahjongDemoGame() {
  return requestDemo('/init', { method: 'POST' })
}

export function dealMahjongDemoGame(game) {
  return requestDemo('/deal', {
    method: 'POST',
    body: game
  })
}

export function testTilePool() {
  return requestDemo('/test/init-tiles', { method: 'GET' })
}

export function testSevenPairs() {
  return requestDemo('/test/seven-pairs', { method: 'GET' })
}

export function testThirteenOrphans() {
  return requestDemo('/test/thirteen-orphans', { method: 'GET' })
}

export function testStandardWin() {
  return requestDemo('/test/standard-win', { method: 'GET' })
}