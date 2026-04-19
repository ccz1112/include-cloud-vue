import { createJsonRequester } from './http.js'

const ROOM_API_PREFIX = import.meta.env.VITE_ROOM_API_PREFIX || '/api/room'
const requestRoom = createJsonRequester(ROOM_API_PREFIX)

const GAME_META = {
  SHANDONG_MAHJONG: {
    gameId: 'shandong-mahjong',
    gameTitle: '山东麻将',
    maxPlayers: 4
  },
  SHANDONG_GOUJI: {
    gameId: 'shandong-gouji',
    gameTitle: '山东够级',
    maxPlayers: 6
  },
  POPULAR_MAHJONG: {
    gameId: 'standard-mahjong',
    gameTitle: '大众麻将',
    maxPlayers: 4
  }
}

function getGameMeta(gameCode) {
  return GAME_META[gameCode] || {
    gameId: '',
    gameTitle: gameCode || '未知玩法',
    maxPlayers: 4
  }
}

function unwrapRoomSnapshot(source = {}) {
  if (source?.room || source?.currentGame || source?.roomSnapshot) {
    return source.roomSnapshot || source
  }
  return {
    room: source,
    currentGame: source.currentGame || source.gameSnapshot || null
  }
}

function normalizeRoomPlayer(player = {}, index = 0) {
  const username = player.username || player.playerName || player.nickname || player.name || `玩家${index + 1}`

  return {
    username,
    ready: !!(player.ready ?? player.isReady),
    isOwner: !!(player.isOwner ?? player.owner),
    seatIndex: player.seatIndex ?? player.seatNo ?? player.position ?? index,
    playerId: player.playerId || player.userId || username,
    raw: player
  }
}

export function normalizeRoom(room = {}, fallback = {}) {
  const snapshot = unwrapRoomSnapshot(room)
  const rawRoom = snapshot.room || {}
  const currentGame = snapshot.currentGame || rawRoom.currentGame || rawRoom.gameSnapshot || fallback.gameSnapshot || null
  const gameCode = rawRoom.gameCode || rawRoom.game?.gameCode || fallback.gameCode || ''
  const gameMeta = getGameMeta(gameCode)
  const normalizedGameId = rawRoom.gameId || rawRoom.game?.gameId || fallback.gameId || gameMeta.gameId
  const players = (rawRoom.players || rawRoom.playerList || rawRoom.seats || []).map((player, index) => normalizeRoomPlayer(player, index))
  const playerCount = rawRoom.playerCount ?? snapshot.seatedCount ?? fallback.seatedCount ?? players.length
  const ownerName = rawRoom.ownerName
    || rawRoom.hostPlayerName
    || rawRoom.hostPlayerId
    || rawRoom.owner?.playerName
    || rawRoom.owner?.username
    || players.find(player => player.isOwner)?.username
    || players[0]?.username
    || fallback.ownerName
    || '待同步'
  const currentGameId = rawRoom.currentGameId
    || rawRoom.gameInstanceId
    || currentGame?.gameId
    || fallback.currentGameId
    || ''
  const lastFinishedGameId = rawRoom.lastFinishedGameId
    || fallback.lastFinishedGameId
    || ''

  return {
    id: rawRoom.roomId || rawRoom.id || fallback.id || '',
    roomName: rawRoom.roomName || rawRoom.name || fallback.roomName || '',
    gameId: normalizedGameId,
    gameCode,
    gameTitle: rawRoom.gameTitle || rawRoom.gameName || fallback.gameTitle || gameMeta.gameTitle,
    ownerName,
    status: rawRoom.status || rawRoom.statusLabel || rawRoom.roomStatus || fallback.status || '等待中',
    maxPlayers: rawRoom.maxPlayers || rawRoom.maxPlayerCount || rawRoom.playerLimit || fallback.maxPlayers || gameMeta.maxPlayers,
    players: players.length ? players : Array.from({ length: playerCount }, (_, index) => ({
      username: `玩家${index + 1}`,
      ready: false,
      isOwner: false,
      seatIndex: index,
      playerId: '',
      raw: null
    })),
    currentGameId,
    lastFinishedGameId,
    gameInstanceId: currentGameId,
    gameSnapshot: currentGame,
    matchId: rawRoom.matchId || fallback.matchId || '',
    matchCompleted: !!(rawRoom.matchCompleted ?? fallback.matchCompleted),
    maxRoundCount: rawRoom.maxRoundCount ?? fallback.maxRoundCount ?? 8,
    completedRoundCount: rawRoom.completedRoundCount ?? fallback.completedRoundCount ?? 0,
    seatedCount: playerCount,
    readyCount: snapshot.readyCount ?? players.filter(player => player.ready).length,
    allReady: snapshot.allReady ?? false,
    raw: snapshot
  }
}

export function isRoomJoinable(room = {}) {
  const status = String(room.status || '').toUpperCase()
  const seatedCount = room.seatedCount ?? room.players?.length ?? 0
  const maxPlayers = room.maxPlayers ?? 0

  return status === 'WAITING' && seatedCount < maxPlayers
}

export function normalizeRoomList(data, fallbackGameCode = '') {
  const rooms = Array.isArray(data)
    ? data
    : Array.isArray(data?.records)
      ? data.records
    : Array.isArray(data?.rooms)
      ? data.rooms
      : Array.isArray(data?.list)
        ? data.list
        : []

  return rooms.map(room => normalizeRoom(room, { gameCode: fallbackGameCode }))
}

export async function listRooms(query = {}) {
  const result = await requestRoom('/list', {
    method: 'GET',
    query
  })
  return normalizeRoomList(result, query.gameCode)
}

export async function createRoom(payload) {
  const room = await requestRoom('/create', {
    method: 'POST',
    body: {
      gameCode: payload.gameCode,
      roomName: payload.roomName,
      hostPlayerId: payload.hostPlayerId || payload.playerId || payload.ownerName,
      hostPlayerName: payload.hostPlayerName || payload.ownerName,
      maxPlayerCount: payload.maxPlayers,
      maxRoundCount: payload.maxRoundCount || 8
    }
  })
  return normalizeRoom(room, { gameCode: payload.gameCode })
}

export async function getRoom(roomId, viewerPlayerId) {
  const room = await requestRoom(`/${roomId}`, {
    method: 'GET',
    query: {
      viewerPlayerId
    }
  })
  return normalizeRoom(room)
}

export async function joinRoom(roomId, payload) {
  const room = await requestRoom(`/${roomId}/join`, {
    method: 'POST',
    body: {
      playerId: payload.playerId || payload.playerName,
      playerName: payload.playerName
    }
  })
  return normalizeRoom(room, { id: roomId })
}

export async function leaveRoom(roomId, payload) {
  const room = await requestRoom(`/${roomId}/leave`, {
    method: 'POST',
    body: {
      playerId: payload.playerId || payload.playerName
    }
  })
  return room ? normalizeRoom(room, { id: roomId }) : null
}

export async function readyRoom(roomId, payload) {
  const room = await requestRoom(`/${roomId}/ready`, {
    method: 'POST',
    body: {
      playerId: payload.playerId || payload.playerName,
      ready: payload.ready
    }
  })
  return normalizeRoom(room, { id: roomId })
}

export async function startRoom(roomId, playerId) {
  const room = await requestRoom(`/${roomId}/start`, {
    method: 'POST',
    body: {
      playerId
    }
  })
  return normalizeRoom(room, { id: roomId })
}