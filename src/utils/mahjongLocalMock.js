export function getTileCategory(name, tileGroups) {
  if (tileGroups.wan.includes(name)) return 'wan'
  if (tileGroups.tiao.includes(name)) return 'tiao'
  if (tileGroups.tong.includes(name)) return 'tong'
  if (tileGroups.feng.includes(name)) return 'feng'
  if (tileGroups.jian.includes(name)) return 'jian'
  return 'other'
}

export function buildShuffledDeck(tileDefs, makeTile) {
  const deck = []
  Object.values(tileDefs).forEach(group => {
    group.forEach(name => {
      for (let i = 0; i < 4; i++) deck.push(makeTile(name))
    })
  })

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  return deck
}

export function pickRandomTile(tileDefs, makeTile) {
  const all = Object.values(tileDefs).flat()
  return makeTile(all[Math.floor(Math.random() * all.length)])
}

export function createInitialLocalRound(tileDefs, makeTile, sortHand) {
  const deck = buildShuffledDeck(tileDefs, makeTile)
  const myHand = sortHand(deck.splice(0, 13))

  deck.splice(0, 13)
  deck.splice(0, 13)
  deck.splice(0, 13)

  return {
    deck,
    myHand,
    sideTileCount: 13,
    remainingTiles: deck.length
  }
}

export function drawTileFromDeck(deck, tileDefs, makeTile) {
  if (deck.length > 0) {
    return deck.pop()
  }

  return pickRandomTile(tileDefs, makeTile)
}

export function createLocalOpponentState(name) {
  return {
    name,
    tileCount: 13,
    score: 0,
    discards: [],
    melds: [],
    statusLabel: '',
    isWin: false
  }
}