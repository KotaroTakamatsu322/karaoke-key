import { noteOptions } from '../lib/note'

const OPTIONS = noteOptions()

type Props = {
  id: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  /** 未選択のときに表示する文字 */
  placeholder?: string
}

/** 音名を選ぶドロップダウン（「mid2G（G4）」のように表示する） */
export function NoteSelect({ id, value, onChange, placeholder = '選んでください' }: Props) {
  return (
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
  )
}
