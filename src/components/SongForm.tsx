import { useState } from 'react'
import { validateSong, type SongDraft, type SongValues } from '../lib/song'
import type { Song } from '../types'
import { NoteSelect } from './NoteSelect'

type Props = {
  /** 編集するときは元の曲を渡す。なければ新しく登録する */
  song?: Song
  onSubmit: (values: SongValues) => void
  onCancel?: () => void
}

/** 曲の登録・編集フォーム */
export function SongForm({ song, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<SongDraft>(() => ({
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    low: song?.low,
    high: song?.high,
  }))
  const [errors, setErrors] = useState<string[]>([])
  const prefix = song ? 'edit' : 'new'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = validateSong(draft)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    onSubmit(result.values)
    if (!song) setDraft({ title: '', artist: '', low: undefined, high: undefined })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>{song ? '曲を編集' : '曲を登録'}</legend>
        <div className="field">
          <label htmlFor={`${prefix}-title`}>曲名</label>
          <input
            id={`${prefix}-title`}
            className="text-input"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-artist`}>アーティスト</label>
          <input
            id={`${prefix}-artist`}
            className="text-input"
            value={draft.artist}
            onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor={`${prefix}-low`}>最低音</label>
            <NoteSelect id={`${prefix}-low`} value={draft.low} onChange={(low) => setDraft((d) => ({ ...d, low }))} />
          </div>
          <div className="field">
            <label htmlFor={`${prefix}-high`}>最高音</label>
            <NoteSelect
              id={`${prefix}-high`}
              value={draft.high}
              onChange={(high) => setDraft((d) => ({ ...d, high }))}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <div className="actions">
          {onCancel && (
            <button type="button" className="secondary" onClick={onCancel}>
              やめる
            </button>
          )}
          <button type="submit" className="primary">
            {song ? '変更を保存' : '登録する'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}
