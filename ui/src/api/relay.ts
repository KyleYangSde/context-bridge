/**
 * Client for @context-bridge/relay (:17832).
 * Pairing: POST /v1/devices → Bearer device token (not PC .bridge-token).
 * Stale localStorage tokens 401 after Relay wipe — clear + re-register.
 */
import type { HandoffState } from '../data/types'
import type { HandoffResponse, HandoffStatusDto, HealthResponse } from './types'

const ENV_URL =
  (import.meta.env.VITE_RELAY_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:17832'

const LS_KEY = 'cb_relay_device_token'

function loadToken(): string | null {
  const env = (import.meta.env.VITE_RELAY_DEVICE_TOKEN as string | undefined)?.trim()
  if (env) return env
  try {
    return localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

let deviceToken: string | null = loadToken()

export function clearDeviceToken() {
  deviceToken = null
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}

function headers(): Headers {
  const h = new Headers({ 'content-type': 'application/json' })
  if (deviceToken) h.set('Authorization', `Bearer ${deviceToken}`)
  return h
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${ENV_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, { ...init, headers: headers() })
  } catch (e) {
    throw new Error(
      `relay unreachable at ${ENV_URL}${path}: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    const err = body as { error?: string; message?: string }
    const e = new Error(
      `relay ${res.status} ${path}: ${err?.message || err?.error || res.statusText}`,
    ) as Error & { status?: number }
    e.status = res.status
    throw e
  }
  return body as T
}

export async function relayHealth(): Promise<HealthResponse> {
  const res = await fetch(`${ENV_URL}/health`)
  if (!res.ok) throw new Error(`relay health ${res.status}`)
  return res.json()
}

/** Register (or return cached). force=true clears cache first. */
export async function ensureDevice(
  role: 'pc' | 'ios' | 'other' = 'pc',
  force = false,
): Promise<string> {
  if (force) clearDeviceToken()
  if (deviceToken) return deviceToken
  const reg = await req<{ token: string; device_id: string }>('/v1/devices', {
    method: 'POST',
    body: JSON.stringify({ role, label: `ui-${role}-${Date.now()}` }),
  })
  deviceToken = reg.token
  try {
    localStorage.setItem(LS_KEY, deviceToken)
  } catch {
    /* ignore */
  }
  return deviceToken
}

async function withDeviceRetry<T>(
  role: 'pc' | 'ios' | 'other',
  run: () => Promise<T>,
): Promise<T> {
  await ensureDevice(role)
  try {
    return await run()
  } catch (e) {
    const status = (e as { status?: number })?.status
    const msg = e instanceof Error ? e.message : String(e)
    if (status === 401 || /\b401\b/.test(msg) || msg.includes('unauthorized')) {
      await ensureDevice(role, true)
      return run()
    }
    throw e
  }
}

export async function relayGetHandoff(
  role: 'pc' | 'ios' | 'other' = 'pc',
): Promise<HandoffResponse> {
  return withDeviceRetry(role, () => req<HandoffResponse>('/v1/handoff'))
}

export async function relayPatchStatus(input: {
  state: HandoffState
  reject_reason?: string | null
  consumer?: { id: string; event?: string }
}): Promise<HandoffStatusDto> {
  return withDeviceRetry('ios', () =>
    req<HandoffStatusDto>('/v1/handoff/status', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  )
}

export async function relayPutHandoff(input: {
  frontmatter: unknown
  body: string
  /** Explicit supersede when slot is pending_review/approved (409 handoff_locked otherwise). */
  force?: boolean
}): Promise<HandoffResponse> {
  return withDeviceRetry('pc', () =>
    req<HandoffResponse>('/v1/handoff', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  )
}

export function getCachedDeviceToken(): string | null {
  return deviceToken
}

export function relayBase(): string {
  return ENV_URL
}
