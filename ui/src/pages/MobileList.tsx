import type { HandoffCardModel } from '../data/types'
import { StateBadge } from '../components/StateBadge'
import './Mobile.css'

interface Props {
  cards: HandoffCardModel[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Cap / ?shell=mobile — flat chrome, no demo notch */
  shell?: boolean
}

function formatAsOf(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function MobileList({ cards, selectedId, onSelect, shell }: Props) {
  return (
    <div className={`cb-phone${shell ? ' cb-phone--shell' : ''}`}>
      {shell ? null : <div className="cb-phone__notch" aria-hidden />}
      <header className="cb-phone__bar">
        <h1>交接卡</h1>
        <span className="cb-phone__bar-sub">中继</span>
      </header>
      {cards.length === 0 ? (
        <div className="cb-empty cb-empty--phone" role="status">
          <div className="cb-empty__title">暂无待审卡</div>
          <p className="cb-empty__body">
            PC 托盘写入并提交后，这里会出现可批准的交接卡。
          </p>
        </div>
      ) : (
        <ul className="cb-phone__list">
          {cards.map((c) => {
            const active = c.id === selectedId
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`cb-phone__row${active ? ' is-active' : ''}`}
                  onClick={() => onSelect(c.id)}
                >
                  <div className="cb-phone__row-top">
                    <span className="cb-phone__tool">{c.frontmatter.source.tool}</span>
                    <StateBadge state={c.state} size="sm" />
                  </div>
                  <p className="cb-phone__goal">{c.frontmatter.goal}</p>
                  <time className="cb-phone__time" dateTime={c.frontmatter.as_of}>
                    {formatAsOf(c.frontmatter.as_of)}
                  </time>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
