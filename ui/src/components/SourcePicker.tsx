import type { HandoffTool } from '../data/types'
import { SOURCE_OPTIONS } from '../data/types'
import './SourcePicker.css'

interface Props {
  value: HandoffTool
  onChange: (tool: HandoffTool) => void
  disabled?: boolean
}

export function SourcePicker({ value, onChange, disabled }: Props) {
  return (
    <div className="cb-source" role="group" aria-label="选择来源 / Source">
      <div className="cb-source__label">选择来源</div>
      <div className="cb-source__row">
        {SOURCE_OPTIONS.map((opt) => {
          const active = value === opt.tool
          return (
            <button
              key={opt.tool}
              type="button"
              className={`cb-source__chip${active ? ' is-active' : ''}${
                !opt.ready ? ' is-placeholder' : ''
              }`}
              disabled={disabled}
              onClick={() => onChange(opt.tool)}
              title={
                opt.ready
                  ? opt.label
                  : `${opt.label} · 暂无导出 / placeholder`
              }
            >
              <span className="cb-source__name">{opt.label}</span>
              {!opt.ready && <span className="cb-source__tag">占位</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
