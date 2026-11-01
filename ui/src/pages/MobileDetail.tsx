import { useState } from 'react'
import type { HandoffCardModel, HandoffState } from '../data/types'
import { STATE_LABELS } from '../data/types'
import { HandoffCard } from '../components/HandoffCard'
import './Mobile.css'

interface Props {
  card: HandoffCardModel | null
  onBack: () => void
  onStatusChange: (
    id: string,
    state: Extract<HandoffState, 'approved' | 'rejected'>,
    reject_reason?: string,
  ) => void
  /** Cap / ?shell=mobile — flat chrome, no demo notch */
  shell?: boolean
}

export function MobileDetail({ card, onBack, onStatusChange, shell }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!card) {
    return (
      <div className={`cb-phone cb-phone--empty${shell ? ' cb-phone--shell' : ''}`}>
        {shell ? null : <div className="cb-phone__notch" aria-hidden />}
        <p className="cb-phone__hint">从列表选择一张交接卡</p>
      </div>
    )
  }

  const canReview =
    card.state === 'pending_review' ||
    card.state === 'ready' ||
    card.state === 'draft'

  function approve() {
    setError(null)
    onStatusChange(card!.id, 'approved')
  }

  function reject() {
    if (!reason.trim()) {
      setError('驳回必须填写原因 · reject_reason required')
      return
    }
    setError(null)
    onStatusChange(card!.id, 'rejected', reason.trim())
  }

  return (
    <div className={`cb-phone${shell ? ' cb-phone--shell' : ''}`}>
      {shell ? null : <div className="cb-phone__notch" aria-hidden />}
      <header className="cb-phone__bar">
        <button type="button" className="cb-phone__back" onClick={onBack}>
          ← 列表
        </button>
        <h1>详情</h1>
        <span className="cb-phone__bar-sub">只读正文</span>
      </header>

      <div className="cb-phone__detail">
        <HandoffCard card={card} />

        {canReview ? (
          <div className="cb-phone__review">
            <label className="cb-phone__reason-label" htmlFor="reject-reason">
              驳回原因（驳回时必填）
            </label>
            <textarea
              id="reject-reason"
              className="cb-phone__reason"
              rows={2}
              placeholder="例如：约束不完整 / 需脱敏"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error ? (
              <div className="cb-alert cb-alert--danger" role="alert">
                {error}
              </div>
            ) : null}
            <div className="cb-phone__review-actions">
              <button type="button" className="cb-btn cb-btn--ok" onClick={approve}>
                批准
              </button>
              <button type="button" className="cb-btn cb-btn--danger" onClick={reject}>
                驳回
              </button>
            </div>
            <p className="cb-phone__note">
              iOS 不 PUT 正文 · 只 PATCH status（经中继）
            </p>
          </div>
        ) : (
          <p className="cb-phone__note">
            当前状态不可再审（{STATE_LABELS[card.state].zh}
            {card.reject_reason ? ` · ${card.reject_reason}` : ''}）
          </p>
        )}
      </div>
    </div>
  )
}
