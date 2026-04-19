export const LOCAL_TURN_ORDER = ['me', 'left', 'top', 'right']
export const LOCAL_SELF_TURN_INDEX = 0

export function getLocalGameStateForTurn(turnKey) {
  return turnKey === 'me' ? 'myTurn' : 'aiTurn'
}

export function getNextLocalTurnIndex(currentTurnIndex, turnOrder = LOCAL_TURN_ORDER) {
  return (currentTurnIndex + 1) % turnOrder.length
}

export function getLocalAiDelayMs() {
  return 800 + Math.random() * 700
}

export function shouldTriggerLocalAction(randomValue = Math.random(), threshold = 0.22) {
  return randomValue < threshold
}

export function buildLocalWinResult(selfSeatName, isBackendDemoMode) {
  const fan = isBackendDemoMode ? 4 : 8

  return {
    fan,
    message: isBackendDemoMode ? '模拟胡牌成功！🎉' : '自摸胡牌！🎉',
    settlementDetails: [{
      key: 'self-demo-win',
      name: selfSeatName,
      result: `${fan} 番`,
      isWinner: true
    }]
  }
}

export function resolveLocalActionOutcome(type) {
  if (type === 'gang') {
    return {
      nextGameState: 'myTurn',
      shouldDraw: true,
      nextTurnIndex: null,
      shouldAdvanceTurn: false,
      isWin: false
    }
  }

  if (type === 'chi' || type === 'peng') {
    return {
      nextGameState: 'myTurn',
      shouldDraw: true,
      nextTurnIndex: LOCAL_SELF_TURN_INDEX,
      shouldAdvanceTurn: false,
      isWin: false
    }
  }

  if (type === 'hu') {
    return {
      nextGameState: null,
      shouldDraw: false,
      nextTurnIndex: null,
      shouldAdvanceTurn: false,
      isWin: true
    }
  }

  return {
    nextGameState: null,
    shouldDraw: false,
    nextTurnIndex: null,
    shouldAdvanceTurn: true,
    isWin: false
  }
}