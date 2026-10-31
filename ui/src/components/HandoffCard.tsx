import type { HandoffCardModel } from '../data/types'
import { StateBadge } from './StateBadge'
import './HandoffCard.css'

interface Props {
  card: HandoffCardModel
  /** light edit: goal only */
  editable?: boolean
  onGoalChange?: (goal: string) => void
  compact?: boolean
}

function formatAsOf(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function Section({
  title,
  items,
  empty = '—',
}: {
  title: string
  items: string[]
  empty?: string
}) {
  return (
    <section className="cb-card__section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="cb-card__empty">{empty}</p>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li key={`${title}-${i}`}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function HandoffCard({
  card,
  editable,
  onGoalChange,
  compact,
}: Props) {
  const { frontmatter: fm, state, reject_reason } = card
  const scanFail = fm.secrets_scan === 'fail'

  return (
    <article
      className={`cb-card${compact ? ' cb-card--compact' : ''}${
        scanFail ? ' cb-card--scan-fail' : ''
      }`}
    >
      <header className="cb-card__head">
        <div className="cb-card__meta">
          <span className="cb-card__tool">{fm.source.tool}</span>
          <span className="cb-card__sep">·</span>
          <time dateTime={fm.as_of}>{formatAsOf(fm.as_of)}</time>
          {fm.supersedes ? (
            <>
              <span className="cb-card__sep">·</span>
              <span className="cb-card__super">已替代上一张</span>
            </>
          ) : null}
        </div>
        <StateBadge state={state} />
      </header>

      {scanFail ? (
        <div className="cb-card__banner cb-card__banner--danger" role="alert">
          密钥扫描失败 · secrets_scan fail — 拒写，请脱敏后重试
        </div>
      ) : null}

      {state === 'rejected' && reject_reason ? (
        <div className="cb-card__banner cb-card__banner--warn" role="status">
          驳回原因：{reject_reason}
        </div>
      ) : null}

      <div className="cb-card__goal">
        <div className="cb-card__goal-label">目标</div>
        {editable ? (
          <textarea
            className="cb-card__goal-input"
            rows={2}
            value={fm.goal}
            onChange={(e) => onGoalChange?.(e.target.value)}
            aria-label="Goal"
          />
        ) : (
          <p>{fm.goal}</p>
        )}
      </div>

      {!compact ? (
        <>
          <Section title="决策" items={fm.decisions} />
          <Section title="约束" items={fm.constraints} />
          <Section title="未决" items={fm.open_questions} />
          <Section
            title="相关文件"
            items={fm.files_touched}
            empty="无"
          />
        </>
      ) : (
        <p className="cb-card__compact-hint">
          {fm.decisions.length} 决策 · {fm.constraints.length} 约束 ·{' '}
          {fm.open_questions.length} 未决
        </p>
      )}
    </article>
  )
}
