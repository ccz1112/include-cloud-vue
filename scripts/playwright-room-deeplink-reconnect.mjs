import { chromium } from 'playwright'

const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const apiBase = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:9998'

async function postJson(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  return response.json()
}

async function getJson(path) {
  const response = await fetch(`${apiBase}${path}`)
  return response.json()
}

function pushEvent(events, value) {
  events.push(value)
}

async function login(page, username, password, events) {
  await page.goto(`${webBase}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="text"]').fill(username)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: '立即登录' }).click()
  await page.waitForURL('**/lobby', { timeout: 15000 })
  pushEvent(events, `login-ok:${username}`)
}

async function ensureRoomPage(page, roomId, events, label) {
  await page.goto(`${webBase}/room/${roomId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.room-content').waitFor({ timeout: 15000 })
  const roomText = await page.locator('.room-content').innerText()
  pushEvent(events, `${label}:room-page:${roomText.replace(/\s+/g, ' ').slice(0, 120)}`)
}

async function openRoomEntryDuringPlaying(page, roomId, events, label) {
  await page.goto(`${webBase}/room/${roomId}`, { waitUntil: 'domcontentloaded' })

  try {
    await page.waitForURL('**/mahjong**', { timeout: 4000 })
    pushEvent(events, `${label}:direct-redirect:${page.url()}`)
    return 'mahjong'
  } catch {
    await page.locator('.room-content').waitFor({ timeout: 15000 })
    const roomText = await page.locator('.room-content').innerText()
    pushEvent(events, `${label}:room-page:${roomText.replace(/\s+/g, ' ').slice(0, 120)}`)
    return 'room'
  }
}

async function ensureMahjongPage(page, roomId, gameId, events, label) {
  await page.goto(`${webBase}/mahjong?roomId=${roomId}&gameId=${gameId}`, { waitUntil: 'domcontentloaded' })
  await page.getByText('棋牌乐园').first().waitFor({ timeout: 15000 })
  pushEvent(events, `${label}:mahjong-page:${page.url()}`)
}

async function waitForMahjongUrl(page, events, label) {
  await page.waitForURL('**/mahjong**', { timeout: 15000 })
  pushEvent(events, `${label}:mahjong-url:${page.url()}`)
}

async function main() {
  const events = []
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions']
  })

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(20000)

    await login(page, 'nian', '123456', events)

    const createResult = await postJson('/room/create', {
      roomName: 'deeplink-reconnect',
      hostPlayerId: 'sha',
      hostPlayerName: 'sha',
      gameCode: 'SHANDONG_MAHJONG',
      maxPlayerCount: 4
    })
    const roomId = createResult.data.room.roomId
    pushEvent(events, `room-created:${roomId}`)

    await postJson(`/room/${roomId}/join`, { playerId: 'nian', playerName: 'nian' })
    await postJson(`/room/${roomId}/join`, { playerId: 'long', playerName: 'long' })
    await postJson(`/room/${roomId}/join`, { playerId: 'abi', playerName: 'abi' })

    await ensureRoomPage(page, roomId, events, 'before-start')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.room-content').waitFor({ timeout: 15000 })
    pushEvent(events, `before-start:room-reload:${page.url()}`)

    await postJson(`/room/${roomId}/ready`, { playerId: 'sha', ready: true })
    await postJson(`/room/${roomId}/ready`, { playerId: 'nian', ready: true })
    await postJson(`/room/${roomId}/ready`, { playerId: 'long', ready: true })
    await postJson(`/room/${roomId}/ready`, { playerId: 'abi', ready: true })
    pushEvent(events, 'all-ready')

    await postJson(`/room/${roomId}/start`, { playerId: 'sha' })
    const roomDetail = await getJson(`/room/${roomId}?viewerPlayerId=nian`)
    const gameId = roomDetail.data?.room?.currentGameId || ''
    pushEvent(events, `game-started:${gameId}`)

    await waitForMahjongUrl(page, events, 'after-start')

    const duringPlayingMode = await openRoomEntryDuringPlaying(page, roomId, events, 'during-playing-entry')
    if (duringPlayingMode === 'room') {
      await waitForMahjongUrl(page, events, 'during-playing-redirect')
    }

    await ensureMahjongPage(page, roomId, gameId, events, 'mahjong-deeplink')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('棋牌乐园').first().waitFor({ timeout: 15000 })
    pushEvent(events, `mahjong-reload:${page.url()}`)

    console.log(JSON.stringify({ roomId, gameId, events }, null, 2))
    await context.close()
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})