import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'

const SYSTEM_TOPIC = '/user/queue/system'
const AUTH_DESTINATION = '/app/system/auth'
const PING_DESTINATION = '/app/system/ping'
const PING_INTERVAL = 25000

function createTraceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildEnvelope(scene, event, payload = {}) {
  return {
    scene,
    event,
    traceId: createTraceId(),
    timestamp: Date.now(),
    payload
  }
}

function readAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('username') || ''
}

function parseEnvelope(body) {
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

class RealtimeService {
  constructor() {
    this.client = null
    this.connectionPromise = null
    this.activeSubscriptions = new Map()
    this.statusListeners = new Set()
    this.systemListeners = new Set()
    this.systemSubscription = null
    this.pingTimer = null
    this.lastSystemEnvelope = null
  }

  notifyStatus(connected) {
    this.statusListeners.forEach(listener => listener(connected))
  }

  onStatusChange(listener) {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  notifySystem(envelope) {
    this.lastSystemEnvelope = envelope
    this.systemListeners.forEach(listener => listener(envelope))
  }

  onSystemMessage(listener) {
    this.systemListeners.add(listener)
    if (this.lastSystemEnvelope) {
      listener(this.lastSystemEnvelope)
    }
    return () => {
      this.systemListeners.delete(listener)
    }
  }

  startPing() {
    this.stopPing()
    this.pingTimer = window.setInterval(() => {
      this.publish(PING_DESTINATION, buildEnvelope('system', 'PING', {})).catch(() => {})
    }, PING_INTERVAL)
  }

  stopPing() {
    if (!this.pingTimer) return
    window.clearInterval(this.pingTimer)
    this.pingTimer = null
  }

  async ensureSystemChannel() {
    const client = this.ensureClient()
    if (!client.connected) return
    if (this.systemSubscription) return

    this.systemSubscription = client.subscribe(SYSTEM_TOPIC, message => {
      const envelope = parseEnvelope(message.body)
      if (!envelope) return
      this.notifySystem(envelope)
    })

    const token = readAuthToken()
    if (token) {
      await this.publish(AUTH_DESTINATION, buildEnvelope('system', 'AUTH', { token }))
    }
    this.startPing()
  }

  resubscribeAll() {
    if (!this.client?.connected) return

    this.activeSubscriptions.forEach(entry => {
      entry.subscription?.unsubscribe()
      entry.subscription = this.client.subscribe(entry.topic, message => {
        const envelope = parseEnvelope(message.body)
        if (envelope) {
          entry.handler(envelope)
        }
      })
    })
  }

  ensureClient() {
    if (this.client) return this.client

    this.client = new Client({
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS('/ws'),
      debug: () => {},
      onConnect: () => {
        this.notifyStatus(true)
        this.ensureSystemChannel().catch(() => {})
        this.resubscribeAll()
      },
      onDisconnect: () => {
        this.systemSubscription = null
        this.stopPing()
        this.notifyStatus(false)
      },
      onStompError: () => {
        this.stopPing()
        this.notifyStatus(false)
      },
      onWebSocketClose: () => {
        this.systemSubscription = null
        this.stopPing()
        this.notifyStatus(false)
      }
    })

    return this.client
  }

  connect() {
    if (this.client?.connected) {
      return Promise.resolve(this.client)
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    const client = this.ensureClient()
    this.connectionPromise = new Promise((resolve, reject) => {
      const cleanup = () => {
        client.onConnect = originalOnConnect
        client.onStompError = originalOnStompError
        this.connectionPromise = null
      }

      const originalOnConnect = client.onConnect
      const originalOnStompError = client.onStompError

      client.onConnect = frame => {
        originalOnConnect?.(frame)
        cleanup()
        resolve(client)
      }

      client.onStompError = frame => {
        originalOnStompError?.(frame)
        cleanup()
        reject(new Error(frame.headers?.message || 'WebSocket 连接失败'))
      }

      if (!client.active) {
        client.activate()
      }
    })

    return this.connectionPromise
  }

  async subscribe(key, topic, handler) {
    const client = await this.connect()
    const previousEntry = this.activeSubscriptions.get(key)
    previousEntry?.subscription?.unsubscribe()

    const entry = {
      topic,
      handler,
      subscription: client.subscribe(topic, message => {
        const envelope = parseEnvelope(message.body)
        if (envelope) {
          handler(envelope)
        }
      })
    }

    this.activeSubscriptions.set(key, entry)
    return () => this.unsubscribe(key)
  }

  async publish(destination, body) {
    const client = await this.connect()
    client.publish({
      destination,
      body: JSON.stringify(body)
    })
  }

  unsubscribe(key) {
    const entry = this.activeSubscriptions.get(key)
    if (!entry) return
    entry.subscription?.unsubscribe()
    this.activeSubscriptions.delete(key)
  }
}

export const realtimeService = new RealtimeService()