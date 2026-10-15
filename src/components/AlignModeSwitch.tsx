import type { AlignMode } from '../types'

const MODES: { value: AlignMode; label: string; hint: string }[] = [
  { value: 'high', label: '最高音に合わせる', hint: '曲の最高音を、自分の最高音に合わせます' },
  { value: 'center', label: '真ん中に合わせる', hint: '曲の音域の真ん中を、自分の音域の真ん中に合わせます' },
]

type Props = {
  value: AlignMode
  onChange: (value: AlignMode) => void
}

/** キーの合わせ方（high／center）の切り替え */
export function AlignModeSwitch({ value, onChange }: Props) {
  const current = MODES.find((m) => m.value === value) ?? MODES[0]
  return (
    <fieldset className="align-mode">
      <legend>キーの合わせ方</legend>
      <div className="segmented">
        {MODES.map((m) => (
          <label key={m.value} className={m.value === value ? 'checked' : undefined}>
            <input
              type="radio"
              name="alignMode"
              value={m.value}
              checked={m.value === value}
              onChange={() => onChange(m.value)}
            />
            {m.label}
          </label>
        ))}
      </div>
      <p className="hint">{current.hint}（原曲キーのまま歌える曲は変えません）</p>
    </fieldset>
  )
}
