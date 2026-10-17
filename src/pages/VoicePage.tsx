import { useState } from 'react'
import { NoteSelect } from '../components/NoteSelect'
import { VoiceChart } from '../components/VoiceChart'
import { formatNote } from '../lib/note'
import { validateProfile, type ProfileDraft } from '../lib/profile'
import type { VoiceProfile } from '../types'

type Props = {
  profile: VoiceProfile | null
  onSave: (profile: VoiceProfile) => boolean
}

/** 自分の音域の登録 */
export function VoicePage({ profile, onSave }: Props) {
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    low: profile?.low,
    high: profile?.high,
    comfortableLow: profile?.comfortableLow,
    comfortableHigh: profile?.comfortableHigh,
    falsettoHigh: profile?.falsettoHigh,
  }))
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const preview = validateProfile(draft)

  const update = (key: keyof ProfileDraft) => (value: number | undefined) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setMessage('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = validateProfile(draft)
    if (!result.ok) {
      setErrors(result.errors)
      setMessage('')
      return
    }
    setErrors([])
    setMessage(onSave(result.profile) ? '保存しました' : '保存できませんでした（ブラウザの設定を確認してください）')
  }

  return (
    <section>
      <h2>自分の音域</h2>

      {profile && (
        <p className="current">
          登録中: {formatNote(profile.low)} 〜 {formatNote(profile.high)}
        </p>
      )}

      {/* 選んでいる途中の音域をそのまま図にする（入力に問題があるあいだは出さない） */}
      {preview.ok && <VoiceChart profile={preview.profile} />}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend>出せる音域（必須）</legend>
          <div className="field">
            <label htmlFor="low">最低音</label>
            <NoteSelect id="low" value={draft.low} onChange={update('low')} />
          </div>
          <div className="field">
            <label htmlFor="high">最高音</label>
            <NoteSelect id="high" value={draft.high} onChange={update('high')} />
          </div>
        </fieldset>

        <fieldset>
          <legend>楽に出せる音域（任意）</legend>
          <p className="hint">登録すると、おすすめキーはこちらの音域で計算します。</p>
          <div className="field">
            <label htmlFor="comfortableLow">楽に出せる最低音</label>
            <NoteSelect
              id="comfortableLow"
              value={draft.comfortableLow}
              onChange={update('comfortableLow')}
              placeholder="未設定"
            />
          </div>
          <div className="field">
            <label htmlFor="comfortableHigh">楽に出せる最高音</label>
            <NoteSelect
              id="comfortableHigh"
              value={draft.comfortableHigh}
              onChange={update('comfortableHigh')}
              placeholder="未設定"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>裏声（任意）</legend>
          <p className="hint">登録すると、曲の裏声の最高音に届くかを調べます。</p>
          <div className="field">
            <label htmlFor="falsettoHigh">裏声の最高音</label>
            <NoteSelect
              id="falsettoHigh"
              value={draft.falsettoHigh}
              onChange={update('falsettoHigh')}
              placeholder="未設定"
            />
          </div>
        </fieldset>

        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <button type="submit" className="primary">
          保存する
        </button>
        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}
      </form>
    </section>
  )
}
