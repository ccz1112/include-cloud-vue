const API_PREFIX = import.meta.env.VITE_MAHJONG_API_PREFIX || '/mahjong'

async function request(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  if (!response.ok) {
    throw new Error(`接口请求失败（${response.status}）`)
  }

  const result = await response.json()
  if (result.code !== 200) {
    throw new Error(result.msg || '接口返回异常')
  }

  return result.data
}

export function initMahjongGame() {
  return request('/init', { method: 'POST' })
}

export function dealMahjongGame(game) {
  return request('/deal', {
    method: 'POST',
    body: JSON.stringify(game)
  })
}

export function testTilePool() {
  return request('/test/init-tiles', { method: 'GET' })
}

export function testSevenPairs() {
  return request('/test/seven-pairs', { method: 'GET' })
}

export function testThirteenOrphans() {
  return request('/test/thirteen-orphans', { method: 'GET' })
}

export function testStandardWin() {
  return request('/test/standard-win', { method: 'GET' })
}