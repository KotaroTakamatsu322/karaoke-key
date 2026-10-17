import { playNote } from '../lib/audio'
import { noteOptions, toJapanese } from '../lib/note'

const OPTIONS = noteOptions()

type Props = {
  id: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  /** 未選択のときに表示する文字 */
  placeholder?: string
}

/** 音名を選ぶドロップダウン（「mid2G（G4）」のように表示する）と、選んだ音を鳴らす ▶ ボタン */
export function NoteSelect({ id, value, onChange, placeholder = '選んでください' }: Props) {
  return (
    <span className="note-select-row">
      <select
        id={id}
        className="note-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      >
        <option value="">{placeholder}</option>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="small play-button"
        aria-label={value === undefined ? '音を鳴らす' : `${toJapanese(value)}を鳴らす`}
        disabled={value === undefined}
        onClick={() => value !== undefined && playNote(value)}
      >
        ▶
      </button>
    </span>
  )
}
