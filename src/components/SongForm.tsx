import { useState } from 'react'
import { validateSong, type SongDraft, type SongValues } from '../lib/song'
import type { Song } from '../types'
import { NoteSelect } from './NoteSelect'

type Props = {
  /** 編集するときは元の曲を渡す。なければ新しく登録する */
  song?: Song
  /** アーティスト欄の候補（登録済みのアーティスト） */
  artists: string[]
  onSubmit: (values: SongValues) => void
  onCancel?: () => void
}

/** 曲の登録・編集フォーム */
export function SongForm({ song, artists, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<SongDraft>(() => ({
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    low: song?.low,
    high: song?.high,
    falsettoHigh: song?.falsettoHigh,
    favorite: song?.favorite ?? false,
    female: song?.female ?? false,
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
    if (!song) {
      setDraft({ title: '', artist: '', low: undefined, high: undefined, falsettoHigh: undefined, favorite: false, female: false })
    }
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
            list={`${prefix}-artist-history`}
            autoComplete="off"
            value={draft.artist}
            onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
          />
          <datalist id={`${prefix}-artist-history`}>
            {artists.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
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
        <p className="hint">最低音・最高音は地声で入れてください。裏声の高い音があれば、下に分けて入れます。</p>
        <div className="field">
          <label htmlFor={`${prefix}-falsettoHigh`}>裏声の最高音（任意）</label>
          <NoteSelect
            id={`${prefix}-falsettoHigh`}
            value={draft.falsettoHigh}
            onChange={(falsettoHigh) => setDraft((d) => ({ ...d, falsettoHigh }))}
            placeholder="なし"
          />
        </div>
        <div className="check-row">
          <label>
            <input
              type="checkbox"
              checked={draft.favorite ?? false}
              onChange={(e) => setDraft((d) => ({ ...d, favorite: e.target.checked }))}
            />
            ★ 十八番
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.female ?? false}
              onChange={(e) => setDraft((d) => ({ ...d, female: e.target.checked }))}
            />
            女性曲
          </label>
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
