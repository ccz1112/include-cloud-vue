const NUMBER_TO_CN = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九' }

const MAHJONG_GLYPHS = {
  东风: '\u{1F000}',
  南风: '\u{1F001}',
  西风: '\u{1F002}',
  北风: '\u{1F003}',
  中: '\u{1F004}',
  发: '\u{1F005}',
  白: '\u{1F006}',
  一万: '\u{1F007}',
  二万: '\u{1F008}',
  三万: '\u{1F009}',
  四万: '\u{1F00A}',
  五万: '\u{1F00B}',
  六万: '\u{1F00C}',
  七万: '\u{1F00D}',
  八万: '\u{1F00E}',
  九万: '\u{1F00F}',
  一条: '\u{1F010}',
  二条: '\u{1F011}',
  三条: '\u{1F012}',
  四条: '\u{1F013}',
  五条: '\u{1F014}',
  六条: '\u{1F015}',
  七条: '\u{1F016}',
  八条: '\u{1F017}',
  九条: '\u{1F018}',
  一筒: '\u{1F019}',
  二筒: '\u{1F01A}',
  三筒: '\u{1F01B}',
  四筒: '\u{1F01C}',
  五筒: '\u{1F01D}',
  六筒: '\u{1F01E}',
  七筒: '\u{1F01F}',
  八筒: '\u{1F020}',
  九筒: '\u{1F021}'
}

function normalizeTileName(name = '') {
  return String(name).replace(/^([1-9])([万条筒])$/, (_, number, suit) => `${NUMBER_TO_CN[number]}${suit}`)
}

function getMahjongGlyph(name) {
  return MAHJONG_GLYPHS[name] || ''
}

function parseTile(name) {
  const normalizedName = normalizeTileName(name)

  for (const suit of ['万', '条', '筒']) {
    if (normalizedName.endsWith(suit)) {
      const rank = normalizedName[0]
      const suitLabel = suit === '万' ? '萬' : suit === '条' ? '索' : '筒'
      return {
        numChar: rank,
        suit: suitLabel,
        suitClass: { '万': 'wan', '条': 'tiao', '筒': 'tong' }[suit],
        glyph: getMahjongGlyph(normalizedName),
        shortLabel: `${rank}${suitLabel}`,
        tileLabel: normalizedName
      }
    }
  }
  if (['东风', '南风', '西风', '北风'].includes(normalizedName)) {
    return {
      numChar: normalizedName[0],
      suit: '風',
      suitClass: 'feng',
      glyph: getMahjongGlyph(normalizedName),
      shortLabel: normalizedName[0],
      tileLabel: normalizedName
    }
  }
  if (normalizedName === '中') return { numChar: '中', suit: '元', suitClass: 'zhong', glyph: getMahjongGlyph(normalizedName), shortLabel: '中', tileLabel: normalizedName }
  if (normalizedName === '发') return { numChar: '發', suit: '元', suitClass: 'fa', glyph: getMahjongGlyph(normalizedName), shortLabel: '發', tileLabel: normalizedName }
  if (normalizedName === '白') return { numChar: '白', suit: '元', suitClass: 'bai', glyph: getMahjongGlyph(normalizedName), shortLabel: '白', tileLabel: normalizedName }
  return { numChar: normalizedName, suit: '', suitClass: 'other', glyph: '', shortLabel: normalizedName, tileLabel: normalizedName }
}

export function formatTileNameFromApi(tile) {
  if (!tile) return ''
  if (tile.displayName) return tile.displayName

  const typeMap = {
    BAMBOO: '条',
    CHARACTER: '万',
    DOT: '筒'
  }
  const windMap = {
    EAST: '东风',
    SOUTH: '南风',
    WEST: '西风',
    NORTH: '北风',
    东: '东风',
    南: '南风',
    西: '西风',
    北: '北风'
  }
  const dragonMap = {
    RED: '中',
    GREEN: '发',
    WHITE: '白',
    中: '中',
    发: '发',
    白: '白'
  }

  if (tile.type === 'WIND') return windMap[tile.value] || `${tile.value}风`
  if (tile.type === 'DRAGON') return dragonMap[tile.value] || tile.value
  if (typeMap[tile.type]) return `${tile.value}${typeMap[tile.type]}`
  return `${tile.value || ''}`
}

export function normalizeRemoteTile(tile, index = 0) {
  const name = normalizeTileName(formatTileNameFromApi(tile))
  return {
    id: tile?.id || `${name}-${index}`,
    raw: tile,
    name,
    ...parseTile(name)
  }
}

export function normalizeRemoteTiles(tiles = []) {
  return tiles.map((tile, index) => normalizeRemoteTile(tile, index))
}

function flattenTiles(source, fallbackGroupSize = 3) {
  if (!Array.isArray(source) || !source.length) return []
  if (Array.isArray(source[0])) return source

  if (source[0] && typeof source[0] === 'object' && !('type' in source[0] || 'displayName' in source[0] || 'value' in source[0])) {
    return source.flatMap(item => {
      if (Array.isArray(item?.tiles)) return [item.tiles]
      if (Array.isArray(item?.list)) return [item.list]
      if (Array.isArray(item?.cards)) return [item.cards]
      if (item?.tile) return [[item.tile]]
      return []
    })
  }

  const groups = []
  for (let index = 0; index < source.length; index += fallbackGroupSize) {
    groups.push(source.slice(index, index + fallbackGroupSize))
  }
  return groups
}

export function normalizeMelds(player) {
  const pongGroups = flattenTiles(player?.pongTiles, 3).map((group, index) => ({
    key: `peng-${player?.position}-${index}`,
    type: 'peng',
    label: '碰',
    tiles: normalizeRemoteTiles(group)
  }))
  const chowGroups = flattenTiles(player?.chowTiles, 3).map((group, index) => ({
    key: `chi-${player?.position}-${index}`,
    type: 'chi',
    label: '吃',
    tiles: normalizeRemoteTiles(group)
  }))
  const kongGroups = flattenTiles(player?.kongTiles, 4).map((group, index) => ({
    key: `gang-${player?.position}-${index}`,
    type: 'gang',
    label: '杠',
    tiles: normalizeRemoteTiles(group)
  }))

  return [...chowGroups, ...pongGroups, ...kongGroups]
}

export function buildPlayerStatusLabel(player) {
  if (!player) return ''

  const labels = []
  if (player.isDealer) labels.push('庄家')
  if (player.isWin) labels.push(`胡牌${player.winType ? ` · ${player.winType}` : ''}`)
  else if (player.winType) labels.push(player.winType)
  if (typeof player.winFan === 'number' && player.winFan > 0) labels.push(`${player.winFan} 番`)
  return labels.join(' / ')
}

export function buildSettlementDetails(game) {
  return (game?.players || []).map(player => ({
    key: player.playerId || `${player.playerName}-${player.position}`,
    name: player.playerName || `玩家${player.position + 1}`,
    result: buildPlayerStatusLabel(player) || `未胡牌 · 手牌 ${player.handTiles?.length ?? 0} 张`,
    isWinner: !!player.isWin
  }))
}

export function buildSettlementDetailsFromRoundSettlement(roundSettlement) {
  return (roundSettlement?.players || []).map(player => ({
    key: player.playerId || `${player.playerName}-${player.position}`,
    name: player.playerName || `玩家${player.position + 1}`,
    result: player.winner
      ? `${player.winType || '胡牌'} · ${player.winFan || roundSettlement?.fan || 0} 番 · ${player.scoreDelta ?? 0} 分`
      : `未胡牌 · ${player.scoreDelta ?? 0} 分`,
    isWinner: !!player.winner
  }))
}