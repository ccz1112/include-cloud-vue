import { WebSocketServer } from 'ws'
import { randomUUID } from 'crypto'

const PORT = 3100
const wss = new WebSocketServer({ port: PORT })

// 存储房间和玩家
const rooms = new Map()
const clients = new Map() // ws -> { username, roomId }

// 麻将牌定义
const TILES_STANDARD = {
  wan: ['一万','二万','三万','四万','五万','六万','七万','八万','九万'],
  tiao: ['一条','二条','三条','四条','五条','六条','七条','八条','九条'],
  tong: ['一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒'],
  feng: ['东风','南风','西风','北风'],
  jian: ['中','发','白']
}

const TILES_SHANDONG = {
  wan: ['一万','二万','三万','四万','五万','六万','七万','八万','九万'],
  tiao: ['一条','二条','三条','四条','五条','六条','七条','八条','九条'],
  tong: ['一筒','二筒','三筒','四筒','五筒','六筒','七筒','八筒','九筒']
}

function buildDeck(mode) {
  const tileDefs = mode === 'shandong' ? TILES_SHANDONG : TILES_STANDARD
  const deck = []
  Object.values(tileDefs).forEach(group => {
    group.forEach(name => {
      for (let i = 0; i < 4; i++) deck.push(name)
    })
  })
  // Fisher-Yates 洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function createRoom(mode, creator) {
  const id = randomUUID().slice(0, 6).toUpperCase()
  const modeLabel = mode === 'shandong' ? '山东麻将' : '大众麻将'
  const room = {
    id,
    mode,
    modeLabel,
    players: [creator],
    state: 'waiting',
    stateLabel: '等待中',
    deck: [],
    hands: {},
    currentTurn: 0,
    discards: []
  }
  rooms.set(id, room)
  return room
}

function broadcastToRoom(roomId, message, exclude = null) {
  const room = rooms.get(roomId)
  if (!room) return
  for (const [ws, info] of clients.entries()) {
    if (info.roomId === roomId && ws !== exclude && ws.readyState === 1) {
      ws.send(JSON.stringify(message))
    }
  }
}

function sendRoomUpdate(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  const playerSlots = [...room.players]
  while (playerSlots.length < 4) playerSlots.push(null)
  broadcastToRoom(roomId, {
    type: 'room_update',
    players: playerSlots
  })
}

function startGame(roomId) {
  const room = rooms.get(roomId)
  if (!room || room.players.length < 4) return

  room.state = 'playing'
  room.stateLabel = '游戏中'
  room.deck = buildDeck(room.mode)

  // 发牌：每人13张
  room.hands = {}
  room.players.forEach((player, i) => {
    room.hands[player] = room.deck.splice(0, 13)
  })
  room.currentTurn = 0

  // 通知每个玩家
  for (const [ws, info] of clients.entries()) {
    if (info.roomId === roomId && ws.readyState === 1) {
      const hand = room.hands[info.username] || []
      ws.send(JSON.stringify({
        type: 'game_start',
        hand,
        mode: room.mode
      }))

      // 通知第一个玩家出牌
      if (info.username === room.players[0]) {
        const drawnTile = room.deck.shift()
        if (drawnTile) {
          hand.push(drawnTile)
          ws.send(JSON.stringify({
            type: 'your_turn',
            drawnTile
          }))
        }
      }
    }
  }
}

function getRoomList() {
  return Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: `房间 ${r.id}`,
    mode: r.mode,
    modeLabel: r.modeLabel,
    playerCount: r.players.length,
    state: r.state,
    stateLabel: r.stateLabel
  }))
}

wss.on('connection', (ws) => {
  clients.set(ws, { username: null, roomId: null })

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    const clientInfo = clients.get(ws)

    switch (msg.type) {
      case 'login': {
        clientInfo.username = msg.username
        break
      }

      case 'get_rooms': {
        ws.send(JSON.stringify({
          type: 'room_list',
          rooms: getRoomList()
        }))
        break
      }

      case 'create_room': {
        const room = createRoom(msg.mode, msg.username)
        clientInfo.username = msg.username
        clientInfo.roomId = room.id
        ws.send(JSON.stringify({
          type: 'room_created',
          roomId: room.id,
          mode: room.mode
        }))
        sendRoomUpdate(room.id)
        // 广播更新房间列表
        broadcastRoomList()
        break
      }

      case 'join_room': {
        const room = rooms.get(msg.roomId)
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }))
          return
        }
        if (room.players.length >= 4) {
          ws.send(JSON.stringify({ type: 'error', message: '房间已满' }))
          return
        }
        if (room.state !== 'waiting') {
          ws.send(JSON.stringify({ type: 'error', message: '游戏已开始' }))
          return
        }
        room.players.push(msg.username)
        clientInfo.username = msg.username
        clientInfo.roomId = msg.roomId

        ws.send(JSON.stringify({
          type: 'room_joined',
          roomId: room.id,
          mode: room.mode
        }))
        sendRoomUpdate(room.id)
        broadcastRoomList()

        // 人满自动开始
        if (room.players.length === 4) {
          setTimeout(() => startGame(room.id), 1000)
        }
        break
      }

      case 'quick_join': {
        // 找一个同模式且未满的房间
        let found = null
        for (const room of rooms.values()) {
          if (room.mode === msg.mode && room.state === 'waiting' && room.players.length < 4) {
            found = room
            break
          }
        }
        if (!found) {
          // 没有合适的房间，创建一个
          found = createRoom(msg.mode, msg.username)
          clientInfo.username = msg.username
          clientInfo.roomId = found.id
          ws.send(JSON.stringify({
            type: 'room_created',
            roomId: found.id,
            mode: found.mode
          }))
        } else {
          found.players.push(msg.username)
          clientInfo.username = msg.username
          clientInfo.roomId = found.id
          ws.send(JSON.stringify({
            type: 'room_joined',
            roomId: found.id,
            mode: found.mode
          }))
        }
        sendRoomUpdate(found.id)
        broadcastRoomList()

        if (found.players.length === 4) {
          setTimeout(() => startGame(found.id), 1000)
        }
        break
      }

      case 'rejoin_room': {
        clientInfo.username = msg.username
        clientInfo.roomId = msg.roomId
        const room = rooms.get(msg.roomId)
        if (room) {
          sendRoomUpdate(msg.roomId)
        }
        break
      }

      case 'discard': {
        const room = rooms.get(msg.roomId)
        if (!room) return
        const playerIdx = room.players.indexOf(clientInfo.username)
        if (playerIdx === -1) return

        // 通知其他玩家
        const positions = ['bottom', 'right', 'top', 'left']
        for (const [otherWs, otherInfo] of clients.entries()) {
          if (otherInfo.roomId === msg.roomId && otherWs !== ws && otherWs.readyState === 1) {
            const otherIdx = room.players.indexOf(otherInfo.username)
            const relativePos = positions[(playerIdx - otherIdx + 4) % 4]
            otherWs.send(JSON.stringify({
              type: 'player_discard',
              tile: msg.tile,
              position: relativePos,
              player: clientInfo.username
            }))
          }
        }

        // 下一个玩家出牌
        room.currentTurn = (playerIdx + 1) % room.players.length
        const nextPlayer = room.players[room.currentTurn]
        for (const [otherWs, otherInfo] of clients.entries()) {
          if (otherInfo.username === nextPlayer && otherInfo.roomId === msg.roomId && otherWs.readyState === 1) {
            const drawnTile = room.deck.length > 0 ? room.deck.shift() : null
            if (room.hands[nextPlayer] && drawnTile) {
              room.hands[nextPlayer].push(drawnTile)
            }
            otherWs.send(JSON.stringify({
              type: 'your_turn',
              drawnTile
            }))
            break
          }
        }
        break
      }

      case 'action': {
        const room = rooms.get(msg.roomId)
        if (!room) return
        if (msg.action === 'hu') {
          broadcastToRoom(msg.roomId, {
            type: 'game_over',
            winner: clientInfo.username,
            score: 8
          })
          room.state = 'waiting'
          room.stateLabel = '等待中'
        }
        break
      }
    }
  })

  ws.on('close', () => {
    const info = clients.get(ws)
    if (info && info.roomId) {
      const room = rooms.get(info.roomId)
      if (room) {
        room.players = room.players.filter(p => p !== info.username)
        if (room.players.length === 0) {
          rooms.delete(info.roomId)
        } else {
          sendRoomUpdate(info.roomId)
        }
        broadcastRoomList()
      }
    }
    clients.delete(ws)
  })
})

function broadcastRoomList() {
  const list = getRoomList()
  for (const [ws] of clients.entries()) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'room_list', rooms: list }))
    }
  }
}

console.log(`麻将游戏 WebSocket 服务器运行在端口 ${PORT}`)
