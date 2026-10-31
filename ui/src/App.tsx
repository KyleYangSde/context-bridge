import { useCallback, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import type { HandoffCardModel, HandoffState } from './data/types'
import { mockHandoffs } from './data/mockHandoffs'
import { TrayPreview } from './pages/TrayPreview'
import { MobileList } from './pages/MobileList'
import { MobileDetail } from './pages/MobileDetail'
import type { ApiMode } from './api/types'
import * as localApi from './api/client'
import * as relayApi from './api/relay'
import './App.css'

type Shell = 'demo' | 'tray' | 'mobile'
type DemoView = 'desktop' | 'mobile'

function readShell(): Shell {
  // Cap native WebView has no ?shell= — always mobile (Relay-only)
  if (Capacitor.isNativePlatform()) return 'mobile'
  const q = new URLSearchParams(window.location.search).get('shell')
  if (q === 'tray' || q === 'mobile') return q
  return 'demo'
}

/** Cap / ?shell=mobile → Relay :17832 only (never local-api :17831). */
function isMobileShell(shell: Shell): boolean {
  return shell === 'mobile'
}

function phoneRelayRole(): 'ios' | 'other' {
  return Capacitor.getPlatform() === 'android' ? 'other' : 'ios'
}

function readInitialMode(): ApiMode {
  // Cap native gate: always Relay live (no mock fixtures on device)
  if (Capacitor.isNativePlatform()) return 'live'
  const q = new URLSearchParams(window.location.search).get('mode')
  if (q === 'live' || q === 'mock') return q
  const env = import.meta.env.VITE_API_MODE
  return env === 'live' ? 'live' : 'mock'
}

function handoffToCard(
  id: string,
  res: {
    frontmatter: HandoffCardModel['frontmatter']
    body: string
    status: { state: HandoffState; reject_reason?: string | null }
  },
): HandoffCardModel {
  return {
    id,
    frontmatter: res.frontmatter,
    body: res.body,
    state: res.status.state,
    reject_reason: res.status.reject_reason,
  }
}

export default function App() {
  const shell = useMemo(readShell, [])
  const [view, setView] = useState<DemoView>(
    shell === 'mobile' ? 'mobile' : 'desktop',
  )
  const [mode, setMode] = useState<ApiMode>(readInitialMode)
  const [cards, setCards] = useState<HandoffCardModel[]>(mockHandoffs)
  const [selectedId, setSelectedId] = useState<string | null>(
    mockHandoffs[0]?.id ?? null,
  )
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selected = cards.find((c) => c.id === selectedId) ?? null

  const loadLive = useCallback(async () => {
    setBusy(true)
    setErrorMsg(null)
    try {
      const rest =
        shell === 'demo'
          ? mockHandoffs.filter((m) => m.state !== 'pending_review')
          : []

      if (isMobileShell(shell)) {
        // Cap mobile: Relay only (device + GET handoff) — never :17831
        await relayApi.relayHealth()
        // Force re-pair: Relay may have wiped in-memory/persist tokens
        await relayApi.ensureDevice(phoneRelayRole(), true)
        const h = await relayApi.relayGetHandoff(phoneRelayRole())
        const card = handoffToCard('live-current', h)
        setCards([card, ...rest])
        setSelectedId(card.id)
        setStatusMsg(
          `live · relay ${relayApi.relayBase()} · state=${h.status.state}`,
        )
        return
      }

      await localApi.health()
      const h = await localApi.getHandoff()
      const card = handoffToCard('live-current', h)
      setCards([card, ...rest])
      setSelectedId(card.id)
      setStatusMsg(
        `live · local-api ${localApi.localApiBase()} · state=${h.status.state}`,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('404') || msg.includes('not_found')) {
        setErrorMsg(null)
        setStatusMsg('live · 暂无交接卡 — 可在托盘写入')
        setCards([])
        setSelectedId(null)
      } else if (shell === 'demo') {
        setErrorMsg(msg)
        setStatusMsg('live failed — still showing mock cards')
        setCards(mockHandoffs)
      } else {
        setErrorMsg(msg)
        setStatusMsg('live failed')
        setCards([])
        setSelectedId(null)
      }
    } finally {
      setBusy(false)
    }
  }, [shell])

  useEffect(() => {
    if (mode === 'live') {
      void loadLive()
    } else {
      setCards(mockHandoffs)
      setSelectedId(mockHandoffs[0]?.id ?? null)
      setStatusMsg('mock · offline fixtures')
      setErrorMsg(null)
    }
  }, [mode, loadLive])

  async function onStatusChange(
    id: string,
    state: Extract<HandoffState, 'approved' | 'rejected'>,
    reject_reason?: string,
  ) {
    setErrorMsg(null)
    if (mode === 'mock') {
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                state,
                reject_reason:
                  state === 'rejected' ? reject_reason ?? null : null,
              }
            : c,
        ),
      )
      setStatusMsg(`mock · ${state}`)
      return
    }

    setBusy(true)
    try {
      if (isMobileShell(shell)) {
        // Cap mobile: PATCH Relay status only
        const status = await relayApi.relayPatchStatus({
          state,
          reject_reason: state === 'rejected' ? reject_reason ?? null : null,
          consumer: { id: 'cap-mobile', event: state },
        })
        setCards((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  state: status.state,
                  reject_reason: status.reject_reason,
                }
              : c,
          ),
        )
        setStatusMsg(`live · relay ${status.state}`)
        return
      }

      // PC / demo: local-api primary + best-effort Relay mirror
      const status = await localApi.patchStatus({
        state,
        reject_reason: state === 'rejected' ? reject_reason ?? null : null,
        consumer: { id: 'ui-shell', event: state },
      })
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                state: status.state,
                reject_reason: status.reject_reason,
              }
            : c,
        ),
      )

      try {
        await relayApi.ensureDevice('ios')
        try {
          await relayApi.relayGetHandoff()
        } catch {
          const cur = await localApi.getHandoff()
          await relayApi.relayPutHandoff({
            frontmatter: cur.frontmatter,
            body: cur.body,
          })
        }
        await relayApi.relayPatchStatus({
          state,
          reject_reason: state === 'rejected' ? reject_reason ?? null : null,
          consumer: { id: 'ui-shell', event: state },
        })
        setStatusMsg(
          `live · local-api ${status.state} · relay mirrored`,
        )
      } catch (re) {
        setStatusMsg(
          `live · local-api ${status.state} · relay skip: ${
            re instanceof Error ? re.message : String(re)
          }`,
        )
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const chrome = shell === 'demo'

  return (
    <div
      className={`cb-app${shell === 'tray' ? ' cb-app--tray' : ''}${
        shell === 'mobile' ? ' cb-app--mobile-shell' : ''
      }`}
    >
      {chrome ? (
        <header className="cb-app__header">
          <div>
            <h1>Context Bridge UI</h1>
            <p>
              共享 React 皮 · Electron 托盘 + Capacitor 手机 · 无 raw transcript
            </p>
          </div>
          <div className="cb-app__controls">
            <div className="cb-app__toggle" role="tablist" aria-label="API mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'mock'}
                className={mode === 'mock' ? 'is-active' : ''}
                onClick={() => setMode('mock')}
              >
                Mock
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'live'}
                className={mode === 'live' ? 'is-active' : ''}
                onClick={() => setMode('live')}
                title="PC/demo → :17831 (+Relay); Cap mobile → :17832 only"
              >
                Live
              </button>
            </div>
            <div className="cb-app__toggle" role="tablist" aria-label="Demo view">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'desktop'}
                className={view === 'desktop' ? 'is-active' : ''}
                onClick={() => setView('desktop')}
              >
                Desktop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'mobile'}
                className={view === 'mobile' ? 'is-active' : ''}
                onClick={() => setView('mobile')}
              >
                Mobile
              </button>
            </div>
          </div>
        </header>
      ) : (
        <div className="cb-app__shellbar">
          <div className="cb-app__toggle" role="tablist" aria-label="API mode">
            <button
              type="button"
              className={mode === 'mock' ? 'is-active' : ''}
              onClick={() => setMode('mock')}
            >
              Mock
            </button>
            <button
              type="button"
              className={mode === 'live' ? 'is-active' : ''}
              onClick={() => setMode('live')}
            >
              Live
            </button>
          </div>
          {busy ? <span className="cb-app__busy">…</span> : null}
        </div>
      )}

      {statusMsg ? (
        <div className="cb-app__banner cb-app__banner--info" role="status">
          {statusMsg}
          {mode === 'live' ? (
            <button type="button" className="cb-app__linkbtn" onClick={() => void loadLive()}>
              刷新
            </button>
          ) : null}
        </div>
      ) : null}
      {errorMsg ? (
        <div className="cb-app__banner cb-app__banner--danger" role="alert">
          {errorMsg}
        </div>
      ) : null}

      <main className="cb-app__main">
        {chrome && view === 'desktop' ? (
          <TrayPreview mode={mode} onLiveWritten={() => void loadLive()} />
        ) : null}

        {shell === 'tray' ? (
          <TrayPreview
            variant="shell"
            mode={mode}
            onLiveWritten={() => void loadLive()}
          />
        ) : null}

        {shell === 'mobile' || (chrome && view === 'mobile') ? (
          <div className="cb-mobile-board">
            <div className="cb-mobile-board__narrow">
              {mobilePane === 'list' ? (
                <MobileList
                  cards={cards}
                  selectedId={selectedId}
                  shell={shell === 'mobile'}
                  onSelect={(id) => {
                    setSelectedId(id)
                    setMobilePane('detail')
                  }}
                />
              ) : (
                <MobileDetail
                  card={selected}
                  shell={shell === 'mobile'}
                  onBack={() => setMobilePane('list')}
                  onStatusChange={onStatusChange}
                />
              )}
            </div>
            {chrome ? (
              <div className="cb-mobile-board__wide">
                <MobileList
                  cards={cards}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                <MobileDetail
                  card={selected}
                  onBack={() => undefined}
                  onStatusChange={onStatusChange}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
