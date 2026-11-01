import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HandoffCardModel, HandoffTool } from '../data/types'
import { STATE_LABELS } from '../data/types'
import { emptyDraftCard, primaryMock } from '../data/mockHandoffs'
import { HandoffCard } from '../components/HandoffCard'
import { SourcePicker } from '../components/SourcePicker'
import { StateLegend } from '../components/StateBadge'
import type { ApiMode } from '../api/types'
import * as localApi from '../api/client'
import * as relayApi from '../api/relay'
import './TrayPreview.css'

interface Props {
  /** demo = desktop mock stage; shell = Electron tray viewport */
  variant?: 'demo' | 'shell'
  mode: ApiMode
  onLiveWritten?: () => void
}

function nowAsOf(): string {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return shifted.toISOString().replace('Z', '+08:00')
}

function handoffToCard(
  res: Awaited<ReturnType<typeof localApi.getHandoff>>,
): HandoffCardModel {
  return {
    id: 'live-current',
    frontmatter: res.frontmatter as HandoffCardModel['frontmatter'],
    body: res.body,
    state: res.status.state,
    reject_reason: res.status.reject_reason,
  }
}

export function TrayPreview({
  variant = 'demo',
  mode = 'mock',
  onLiveWritten,
}: Props) {
  const isShell = variant === 'shell'
  const [source, setSource] = useState<HandoffTool>('codex')
  const [card, setCard] = useState<HandoffCardModel>(() => ({
    ...primaryMock,
    frontmatter: {
      ...primaryMock.frontmatter,
      source: { ...primaryMock.frontmatter.source, tool: 'codex' },
    },
  }))
  const [scanError, setScanError] = useState<string | null>(null)
  const [wrote, setWrote] = useState(false)
  const [writeWarning, setWriteWarning] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [empty, setEmpty] = useState(false)

  const canWrite = useMemo(
    () =>
      card.frontmatter.secrets_scan !== 'fail' &&
      card.frontmatter.goal.trim().length > 0,
    [card],
  )

  const canReview =
    card.state === 'pending_review' ||
    card.state === 'ready' ||
    card.state === 'draft'

  const loadLive = useCallback(async () => {
    setBusy(true)
    setScanError(null)
    try {
      await localApi.health()
      const h = await localApi.getHandoff()
      const next = handoffToCard(h)
      setCard(next)
      setSource(next.frontmatter.source.tool)
      setWrote(false)
      setEmpty(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('404') || msg.includes('not_found')) {
        setEmpty(true)
        setCard(emptyDraftCard(source))
        setScanError(null)
      } else {
        setEmpty(false)
        setScanError(msg)
      }
    } finally {
      setBusy(false)
    }
  }, [source])

  useEffect(() => {
    if (mode === 'live') {
      void loadLive()
    } else {
      setCard({
        ...primaryMock,
        frontmatter: {
          ...primaryMock.frontmatter,
          source: { ...primaryMock.frontmatter.source, tool: source },
        },
      })
      setWrote(false)
      setScanError(null)
      setEmpty(false)
    }
    // only react to mode flips; source kept local
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loadLive])

  function onSourceChange(tool: HandoffTool) {
    setSource(tool)
    setWrote(false)
    setScanError(null)
    setReviewError(null)
    if (mode === 'live') {
      setCard((prev) => ({
        ...prev,
        frontmatter: {
          ...prev.frontmatter,
          source: { ...prev.frontmatter.source, tool },
        },
      }))
      return
    }
    setCard((prev) => ({
      ...prev,
      state: tool === 'opencode' || tool === 'claude-code' ? 'draft' : 'pending_review',
      frontmatter: {
        ...prev.frontmatter,
        source: { ...prev.frontmatter.source, tool },
        secrets_scan: tool === 'opencode' ? 'fail' : 'pass',
        goal:
          tool === 'grok-bot'
            ? '群结论落成交接卡，供下游 Agent 继续'
            : tool === 'codex'
              ? '把 Codex 半截任务交接到 Claude Code'
              : `${tool} 会话摘要（占位）`,
      },
      reject_reason: tool === 'opencode' ? '含疑似 token，请脱敏后重试' : null,
    }))
  }

  async function onGenerate() {
    setBusy(true)
    setWrote(false)
    setScanError(null)
    setReviewError(null)
    setWriteWarning(null)

    if (mode === 'live') {
      try {
        const res = await localApi.exportProducer(source, { session: 'last' })
        const next = handoffToCard(res)
        setCard(next)
        setSource(next.frontmatter.source.tool)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setScanError(msg)
        if (source === 'opencode' || source === 'claude-code') {
          setCard((prev) => ({
            ...prev,
            state: 'draft',
            frontmatter: {
              ...prev.frontmatter,
              secrets_scan: source === 'opencode' ? 'fail' : prev.frontmatter.secrets_scan,
            },
          }))
        }
      } finally {
        setBusy(false)
      }
      return
    }

    window.setTimeout(() => {
      if (source === 'opencode' || source === 'claude-code') {
        setScanError(
          source === 'opencode'
            ? 'secrets_scan_failed · 检测到疑似密钥，已拒写'
            : '暂无导出 · Claude Code adapter 占位',
        )
        setCard((prev) => ({
          ...prev,
          state: 'draft',
          frontmatter: {
            ...prev.frontmatter,
            secrets_scan: source === 'opencode' ? 'fail' : prev.frontmatter.secrets_scan,
          },
        }))
      } else {
        setCard((prev) => ({
          ...prev,
          state: 'pending_review',
          frontmatter: {
            ...prev.frontmatter,
            as_of: nowAsOf(),
            secrets_scan: 'pass',
          },
        }))
      }
      setBusy(false)
    }, 350)
  }

  async function onWrite() {
    if (!canWrite) {
      setScanError('密钥扫描失败或 Goal 为空 — 拒写整文件')
      return
    }
    setBusy(true)
    setScanError(null)
    setReviewError(null)
    setWriteWarning(null)

    if (mode === 'live') {
      try {
        const body = card.body || `# Handoff\n\n## Goal\n${card.frontmatter.goal}\n`
        const res = await localApi.putHandoff({
          frontmatter: {
            ...card.frontmatter,
            schema: 'handoff.v1',
            source: {
              ...card.frontmatter.source,
              session_id: card.frontmatter.source.session_id || `tray-ui-${Date.now()}`,
            },
            as_of: nowAsOf(),
            secrets_scan: 'pass',
          },
          body,
        })
        // Review submission and Relay mirroring must not undo a successful local write.
        let status = res.status
        try {
          status = await localApi.patchStatus({
            state: 'pending_review',
            consumer: { id: 'tray-ui', event: 'submit_review' },
          })
        } catch {
          // A pre-existing state may make this transition illegal.
        }
        try {
          await relayApi.ensureDevice('pc')
          await relayApi.relayPutHandoff({
            frontmatter: res.frontmatter,
            body: res.body,
            force: true, // user tapped 写入 — supersede locked slot
          })
          // Mirror review state when local submit_review succeeded
          if (status.state === 'pending_review') {
            try {
              await relayApi.relayPatchStatus({
                state: 'pending_review',
                consumer: { id: 'tray-ui', event: 'submit_review' },
              })
            } catch {
              /* relay may still be ready — approve from ready is legal */
            }
          }
        } catch (e) {
          setWriteWarning(`中继警告: ${e instanceof Error ? e.message : String(e)}`)
        }
        setCard(handoffToCard({ ...res, status }))
        setWrote(true)
        setEmpty(false)
        onLiveWritten?.()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setScanError(msg)
        if (msg.includes('secrets_scan')) {
          setCard((prev) => ({
            ...prev,
            state: 'draft',
            frontmatter: { ...prev.frontmatter, secrets_scan: 'fail' },
          }))
        }
      } finally {
        setBusy(false)
      }
      return
    }

    window.setTimeout(() => {
      setCard((prev) => ({ ...prev, state: 'ready' }))
      setWrote(true)
      setBusy(false)
    }, 280)
  }

  async function onApprove() {
    setReviewError(null)
    if (mode === 'mock') {
      setCard((prev) => ({ ...prev, state: 'approved', reject_reason: null }))
      return
    }
    setBusy(true)
    try {
      const status = await localApi.patchStatus({
        state: 'approved',
        consumer: { id: 'ui-tray', event: 'approved' },
      })
      setCard((prev) => ({
        ...prev,
        state: status.state,
        reject_reason: status.reject_reason,
      }))
      onLiveWritten?.()
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onReject() {
    if (!rejectReason.trim()) {
      setReviewError('驳回必须填写原因 · reject_reason required')
      return
    }
    setReviewError(null)
    if (mode === 'mock') {
      setCard((prev) => ({
        ...prev,
        state: 'rejected',
        reject_reason: rejectReason.trim(),
      }))
      return
    }
    setBusy(true)
    try {
      const status = await localApi.patchStatus({
        state: 'rejected',
        reject_reason: rejectReason.trim(),
        consumer: { id: 'ui-tray', event: 'rejected' },
      })
      setCard((prev) => ({
        ...prev,
        state: status.state,
        reject_reason: status.reject_reason,
      }))
      onLiveWritten?.()
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const panel = (
    <div className={`cb-win${isShell ? ' cb-win--shell' : ''}`}>
      {!isShell ? (
        <div className="cb-win__chrome">
          <span className="cb-dot cb-dot--r" />
          <span className="cb-dot cb-dot--y" />
          <span className="cb-dot cb-dot--g" />
          <span className="cb-win__title">上下文中继</span>
        </div>
      ) : (
        <div className="cb-win__chrome cb-win__chrome--shell">
          <span className="cb-win__title">上下文中继</span>
          {mode === 'live' ? (
            <button
              type="button"
              className="cb-win__refresh"
              onClick={() => void loadLive()}
              disabled={busy}
            >
              刷新
            </button>
          ) : null}
        </div>
      )}

      <div className="cb-win__body">
        {!isShell ? (
          <small className="cb-win__note">
            {mode === 'live' ? '真实 · :17831' : '演示'}
          </small>
        ) : null}
        <SourcePicker value={source} onChange={onSourceChange} disabled={busy} />

        {empty ? (
          <div className="cb-empty" role="status">
            <div className="cb-empty__title">还没有交接卡</div>
            <p className="cb-empty__body">
              选来源后填写目标，点「写入 .agent-bridge/」创建第一张卡。
            </p>
          </div>
        ) : null}

        <div className="cb-win__actions">
          <button
            type="button"
            className="cb-btn cb-btn--ghost"
            onClick={() => void onGenerate()}
            disabled={busy}
          >
            生成交接卡
          </button>
          <button
            type="button"
            className="cb-btn cb-btn--primary"
            onClick={() => void onWrite()}
            disabled={busy || !canWrite}
          >
            写入 .agent-bridge/
          </button>
        </div>

        {scanError ? (
          <div className="cb-alert cb-alert--danger" role="alert">
            {scanError}
          </div>
        ) : null}
        {writeWarning ? (
          <div className="cb-alert" role="status">{writeWarning}</div>
        ) : null}
        {wrote ? (
          <div className="cb-alert cb-alert--ok" role="status">
            已写入 · 状态 → {STATE_LABELS[card.state].zh} · 可上行中继 / 待审
          </div>
        ) : null}

        <HandoffCard
          card={card}
          editable
          onGoalChange={(goal) =>
            setCard((prev) => ({
              ...prev,
              frontmatter: { ...prev.frontmatter, goal },
            }))
          }
        />

        {canReview ? (
          <div className="cb-win__review">
            <label className="cb-win__reason-label" htmlFor="tray-reject-reason">
              驳回原因（驳回时必填）
            </label>
            <textarea
              id="tray-reject-reason"
              className="cb-win__reason"
              rows={2}
              placeholder="例如：约束不完整 / 需脱敏"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={busy}
            />
            {reviewError ? (
              <div className="cb-alert cb-alert--danger" role="alert">
                {reviewError}
              </div>
            ) : null}
            <div className="cb-win__actions">
              <button
                type="button"
                className="cb-btn cb-btn--ok"
                onClick={() => void onApprove()}
                disabled={busy}
              >
                批准
              </button>
              <button
                type="button"
                className="cb-btn cb-btn--danger"
                onClick={() => void onReject()}
                disabled={busy}
              >
                驳回
              </button>
            </div>
          </div>
        ) : (
          <p className="cb-win__note">
            当前状态不可再审（{STATE_LABELS[card.state].zh}
            {card.reject_reason ? ` · ${card.reject_reason}` : ''}）
          </p>
        )}

        {!isShell ? (
          <div className="cb-win__legend">
            <div className="cb-win__legend-label">状态机</div>
            <StateLegend />
          </div>
        ) : null}
      </div>
    </div>
  )

  if (isShell) {
    return <div className="cb-tray-shell">{panel}</div>
  }

  return (
    <div className="cb-tray-stage">
      <div className="cb-desktop">
        <div className="cb-menubar">
          <span className="cb-menubar__spacer" />
          <div className="cb-tray-icon" title="上下文中继">
            CB
          </div>
        </div>
        {panel}
      </div>
    </div>
  )
}
