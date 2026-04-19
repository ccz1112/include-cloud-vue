import { chromium } from 'playwright'

const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const apiBase = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:9998'

function shouldTrackBrowserUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.pathname.startsWith('/room/')
      || parsed.pathname === '/mahjong'
      || parsed.pathname.startsWith('/api/room')
      || parsed.pathname.startsWith('/api/mahjong')
      || parsed.pathname.startsWith('/api/ws')
  } catch {
    return false
  }
}

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

    page.on('console', message => {
      if (message.type() === 'error' || message.text().includes('ROOM_DEBUG')) {
        events.push(`console:${message.type()}:${message.text()}`)
      }
    })
    page.on('pageerror', error => {
      events.push(`pageerror:${error.message}`)
    })
    page.on('response', response => {
      const url = response.url()
      if (shouldTrackBrowserUrl(url)) {
        events.push(`response:${response.status()} ${url}`)
      }
    })

    await page.goto(`${webBase}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="text"]').fill('nian')
    await page.locator('input[type="password"]').fill('123456')
    await page.getByRole('button', { name: '立即登录' }).click()
    await page.waitForURL('**/lobby', { timeout: 15000 })
    events.push('login-ok')

    const createResult = await postJson('/room/create', {
      roomName: 'single-observer',
      hostPlayerId: 'sha',
      hostPlayerName: 'sha',
      gameCode: 'SHANDONG_MAHJONG',
      maxPlayerCount: 4
    })
    const roomId = createResult.data.room.roomId

    await postJson(`/room/${roomId}/join`, { playerId: 'nian', playerName: 'nian' })
    await postJson(`/room/${roomId}/join`, { playerId: 'long', playerName: 'long' })
    await postJson(`/room/${roomId}/join`, { playerId: 'abi', playerName: 'abi' })
    events.push(`room-created:${roomId}`)

    await page.goto(`${webBase}/lobby`, { waitUntil: 'domcontentloaded' })
    try {
      const roomCard = page.locator('.room-item').filter({ hasText: roomId }).first()
      for (let attempt = 0; attempt < 6; attempt++) {
        if (await roomCard.count()) break
        await page.reload({ waitUntil: 'domcontentloaded' })
      }
      await roomCard.getByRole('button', { name: '加入' }).click()
      await page.locator('.room-content').waitFor({ timeout: 15000 })
      const roomText = await page.locator('.room-content').innerText()
      events.push(`room-opened:${roomText.replace(/\s+/g, ' ').slice(0, 160)}`)
    } catch (error) {
      events.push(`room-load-timeout:${error instanceof Error ? error.message : String(error)}`)
      events.push(`room-load-url:${page.url()}`)
      events.push(`room-load-body:${(await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200)}`)
      console.log(JSON.stringify({ roomId, events }, null, 2))
      await context.close()
      return
    }

    await postJson(`/room/${roomId}/ready`, { playerId: 'sha', ready: true })
    await page.getByRole('button', { name: '我已准备' }).click()
    await postJson(`/room/${roomId}/ready`, { playerId: 'long', ready: true })
    await postJson(`/room/${roomId}/ready`, { playerId: 'abi', ready: true })
    events.push('all-ready')

    const beforeStart = await getJson(`/room/${roomId}?viewerPlayerId=nian`)
    events.push(`before-start:${beforeStart.code}:${beforeStart.data?.room?.status}:${beforeStart.data?.room?.currentGameId || ''}`)

    await postJson(`/room/${roomId}/start`, { playerId: 'sha' })
    events.push('host-started')

    const afterStart = await getJson(`/room/${roomId}?viewerPlayerId=nian`)
    events.push(`after-start:${afterStart.code}:${afterStart.data?.room?.status}:${afterStart.data?.room?.currentGameId || ''}`)

    try {
      await page.waitForURL('**/mahjong**', { timeout: 12000 })
      events.push(`mahjong-url:${page.url()}`)
    } catch (error) {
      events.push(`mahjong-timeout:${error instanceof Error ? error.message : String(error)}`)
      events.push(`final-url:${page.url()}`)
      const roomMessage = await page.locator('.room-message').allTextContents().catch(() => [])
      events.push(`room-message:${roomMessage.join(' | ')}`)
    }

    console.log(JSON.stringify({ roomId, events }, null, 2))
    await context.close()
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})