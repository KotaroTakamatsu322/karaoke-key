import { useState } from 'react'
import { RATING_LABELS, RATINGS } from '../lib/record'
import { formatShift } from '../lib/song'
import type { Rating } from '../types'

// ずらし幅の選択肢: +19〜-19（カラオケ機の ±7 と、1オクターブ上下の分）
const SHIFTS = Array.from({ length: 39 }, (_, i) => 19 - i)

type Props = {
  /** 最初に選んでおくずらし幅 */
  defaultShift: number
  onSave: (shift: number, rating: Rating) => void
  onCancel: () => void
}

/** 歌った記録の入力（歌ったキーと感想） */
export function RecordForm({ defaultShift, onSave, onCancel }: Props) {
  const [shift, setShift] = useState(defaultShift)
  const [rating, setRating] = useState<Rating | null>(null)

  return (
    <form
      className="record-form"
      aria-label="歌った記録"
      onSubmit={(e) => {
        e.preventDefault()
        if (rating) onSave(shift, rating)
      }}
    >
      <label className="record-field">
        歌ったキー
        <select className="note-select" value={shift} onChange={(e) => setShift(Number(e.target.value))}>
          {SHIFTS.map((s) => (
            <option key={s} value={s}>
              {formatShift(s)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="rating-choices">
        <legend>感想</legend>
        {RATINGS.map((r) => (
          <label key={r} className={r === rating ? 'checked' : undefined}>
            <input type="radio" name="rating" value={r} checked={r === rating} onChange={() => setRating(r)} />
            {RATING_LABELS[r]}
          </label>
        ))}
      </fieldset>

      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>
          やめる
        </button>
        <button type="submit" className="primary" disabled={!rating}>
          記録する
        </button>
      </div>
    </form>
  )
}
