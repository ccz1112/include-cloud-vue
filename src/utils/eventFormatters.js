function safeDisplayTile(tile) {
  if (!tile) return ''
  return tile.displayName || tile.name || `${tile.value || ''}`
}

function summarizeTiles(tiles = []) {
  if (!Array.isArray(tiles) || !tiles.length) return ''
  return tiles.map(tile => safeDisplayTile(tile)).filter(Boolean).join(' / ')
}

export function getKongTypeLabel(type) {
  const labels = {
    CONCEALED: '暗杠',
    EXPOSED: '明杠',
    ADDITIONAL: '补杠'
  }
  return labels[type] || type || ''
}

export function formatRoomEventPayload(event) {
  const payload = event?.payload || {}
  if (payload.playerName || payload.playerId) {
    const name = payload.playerName || payload.playerId
    if (payload.ready !== undefined) {
      return `${name} -> ${payload.ready ? '已准备' : '取消准备'}`
    }
    return `${name}`
  }
  if (payload.currentGameId) return `gameId = ${payload.currentGameId}`
  if (payload.readyCount !== undefined) return `readyCount = ${payload.readyCount}`
  return event?.message || '已收到房间状态更新'
}

export function formatMahjongEventPayload(event) {
  const payload = event?.payload || {}
  const relatedTile = safeDisplayTile(payload.relatedTile)
  const tile = safeDisplayTile(payload.tile)
  const tiles = summarizeTiles(payload.tiles)
  const actions = Array.isArray(payload.actions) ? payload.actions.join(' / ') : ''

  if (payload.roundSettlement?.settlementType === 'DRAW') {
    return `本局流局${payload.roundSettlement.finishReason ? ` · ${payload.roundSettlement.finishReason}` : ''}`
  }
  if (payload.roundSettlement?.winnerPosition !== undefined) {
    return `${payload.roundSettlement.winnerPosition} 号位结算，${payload.roundSettlement.fan || 0} 番`
  }
  if (payload.winInfo?.winnerName) {
    return `${payload.winInfo.winnerName} 完成胡牌`
  }
  if (actions) {
    return `可操作: ${actions}${relatedTile ? ` · 目标牌 ${relatedTile}` : ''}`
  }
  if (payload.kongType || payload.type) {
    const kongType = getKongTypeLabel(payload.kongType || payload.type)
    return `${kongType}${tiles ? ` · ${tiles}` : ''}`
  }
  if (payload.playerPosition !== undefined && tile) {
    return `${payload.playerPosition} 号位操作 ${tile}`
  }
  if (payload.playerPosition !== undefined && tiles) {
    return `${payload.playerPosition} 号位操作 ${tiles}`
  }
  if (payload.playerPosition !== undefined) {
    return `${payload.playerPosition} 号位触发事件`
  }
  return event?.message || '已收到对局状态更新'
}