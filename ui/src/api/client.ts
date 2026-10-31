/**
 * Client for @context-bridge/local-api on 127.0.0.1:17831
 * Auth: Bearer or x-bridge-token (from VITE_BRIDGE_TOKEN / localStorage).
 */
import type { HandoffState } from '../data/types'
import type { HandoffResponse, HandoffStatusDto, HealthResponse } from './types'

const ENV_URL =
  (import.meta.env.VITE_LOCAL_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:17831'

function token(): string {
  try {
    const ls = localStorage.getItem('cb_bridge_token')
    if (ls) return ls.trim()
  } catch {
    /* ssr/tray */
  }
  return ((import.meta.env.VITE_BRIDGE_TOKEN as string | undefined) || '').trim()
}

export function setBridgeToken(t: string) {
  localStorage.setItem('cb_bridge_token', t.trim())
}

export function getBridgeToken(): string {
  return token()
}

function headers(extra?: HeadersInit): Headers {
  const h = new Headers(extra)
  if (!h.has('content-type')) h.set('content-type', 'application/json')
  const t = token()
  if (t) {
    h.set('Authorization', `Bearer ${t}`)
    h.set('x-bridge-token', t)
  }
  return h
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${ENV_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, { ...init, headers: headers(init?.headers) })
  } catch (e) {
    throw new Error(
      `local-api unreachable at ${ENV_URL}${path}: ${e instanceof Error ? e.message : String(e)}`,
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
    const err = body as { error?: string; message?: string; hits?: unknown }
    const detail = err?.message || err?.error || res.statusText
    throw new Error(`local-api ${res.status} ${path}: ${detail}`)
  }
  return body as T
}

export async function health(): Promise<HealthResponse> {
  return req<HealthResponse>('/health')
}

export async function getHandoff(): Promise<HandoffResponse> {
  return req<HandoffResponse>('/v1/handoff')
}

export async function getStatus(): Promise<HandoffStatusDto> {
  return req<HandoffStatusDto>('/v1/handoff/status')
}

export async function patchStatus(input: {
  state: HandoffState
  reject_reason?: string | null
  consumer?: { id: string; event?: string }
}): Promise<HandoffStatusDto> {
  return req<HandoffStatusDto>('/v1/handoff/status', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function putHandoff(input: {
  frontmatter: unknown
  body: string
}): Promise<HandoffResponse> {
  return req<HandoffResponse>('/v1/handoff', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}


export async function exportProducer(
  producer: string,
  input: { session?: string; hint?: string } = {},
): Promise<HandoffResponse> {
  const raw = await req<{
    handoff: { frontmatter: HandoffResponse['frontmatter']; body: string }
    status: HandoffStatusDto
    path?: string
  }>(`/v1/export/${encodeURIComponent(producer)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return {
    frontmatter: raw.handoff.frontmatter,
    body: raw.handoff.body,
    path: raw.path,
    status: raw.status,
  }
}

export function localApiBase(): string {
  return ENV_URL
}

