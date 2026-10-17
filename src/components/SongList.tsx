import { useState } from 'react'
import { calcKey } from '../lib/key'
import { formatNote } from '../lib/note'
import {
  describeKeyResult,
  filterSongs,
  formatJoysoundKey,
  formatKeyResult,
  SONG_ORDERS,
  sortSongs,
  STATUS_LABELS,
  type SongOrder,
} from '../lib/song'
import type { KeyResult, Song, VoiceProfile } from '../types'
import { RangeBar } from './RangeBar'

export type KeyOption = { label: string; result: KeyResult }

/**
 * 2つの合わせ方のキーを並べる（カラオケで試すと、ちょうどいいキーは2つのあいだにあった）。
 * 同じキーになるとき（原曲キー・音域が足りない・ずらせる幅が1つだけ）は1つにまとめる
 */
function keyOptions(profile: VoiceProfile, song: Song): KeyOption[] {
  const high = calcKey(profile, song, 'high')
  const center = calcKey(profile, song, 'center')
  if (high.shift === center.shift) return [{ label: 'おすすめ', result: high }]
  return [
    { label: '高め', result: high },
    { label: '低め', result: center },
  ]
}

type Props = {
  songs: Song[]
  profile: VoiceProfile | null
  onEdit: (song: Song) => void
  onDelete: (song: Song) => void
}

/** 曲の一覧（おすすめキー付き） */
export function SongList({ songs, profile, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<SongOrder>('artist')

  if (songs.length === 0) {
    return <p className="hint">まだ曲が登録されていません。</p>
  }

  const shown = sortSongs(filterSongs(songs, query), order)

  return (
    <div>
      <div className="list-tools">
        <input
          type="search"
          className="text-input"
          aria-label="曲名・アーティストで検索"
          placeholder="曲名・アーティストで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="note-select"
          aria-label="並べ替え"
          value={order}
          onChange={(e) => setOrder(e.target.value as SongOrder)}
        >
          {SONG_ORDERS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 && <p className="hint">「{query}」に当てはまる曲はありません。</p>}

      <ul className="song-list">
        {shown.map((song) => {
          const options = profile && keyOptions(profile, song)
          return (
            <li key={song.id} className="song" aria-label={song.title}>
              <div className="song-head">
                <div className="song-main">
                  <div className="song-title">{song.title}</div>
                  {song.artist && <div className="song-artist">{song.artist}</div>}
                </div>
                <div className="song-actions">
                  <button type="button" className="small" onClick={() => onEdit(song)}>
                    編集
                  </button>
                  <button type="button" className="small danger" onClick={() => onDelete(song)}>
                    削除
                  </button>
                </div>
              </div>

              {options ? (
                <>
                  {options.map(({ label, result }) => {
                    const joysoundKey = formatJoysoundKey(result)
                    return (
                      <div key={label} className="song-result">
                        {options.length > 1 && <span className="key-label">{label}</span>}
                        <span className="song-key" data-testid="recommended-key">
                          {formatKeyResult(result)}
                        </span>
                        {joysoundKey && (
                          <span className="song-key-alt" data-testid="joysound-key">
                            ±6: {joysoundKey}
                          </span>
                        )}
                        <span className={`status status-${result.status}`} data-testid="status">
                          {STATUS_LABELS[result.status]}
                        </span>
                      </div>
                    )
                  })}
                  <details className="song-detail">
                    <summary>{options.length > 1 ? '音域の図' : describeKeyResult(options[0].result)}</summary>
                    <RangeBar profile={profile} song={song} options={options} />
                  </details>
                </>
              ) : (
                <div className="song-range">
                  {formatNote(song.low)} 〜 {formatNote(song.high)}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
