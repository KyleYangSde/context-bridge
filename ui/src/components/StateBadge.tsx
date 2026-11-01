import type { HandoffState } from '../data/types'
import { STATE_LABELS } from '../data/types'
import './StateBadge.css'

interface Props {
  state: HandoffState
  /** show Chinese label (default) */
  locale?: 'zh' | 'en'
  size?: 'sm' | 'md'
}

export function StateBadge({ state, locale = 'zh', size = 'md' }: Props) {
  const label = STATE_LABELS[state][locale]
  return (
    <span
      className={`cb-state cb-state--${state} cb-state--${size}`}
      title={`${STATE_LABELS[state].zh} / ${STATE_LABELS[state].en}`}
    >
      <span className="cb-state__dot" aria-hidden />
      {label}
    </span>
  )
}

export function StateLegend() {
  const states: HandoffState[] = [
    'draft',
    'ready',
    'pending_review',
    'approved',
    'rejected',
    'consumed',
    'superseded',
    'expired',
  ]
  return (
    <div className="cb-state-legend" role="list" aria-label="交接卡状态">
      {states.map((s) => (
        <StateBadge key={s} state={s} size="sm" />
      ))}
    </div>
  )
}
