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
import type { AlignMode, Song, VoiceProfile } from '../types'
import { RangeBar } from './RangeBar'

type Props = {
  songs: Song[]
  profile: VoiceProfile | null
  alignMode: AlignMode
  onEdit: (song: Song) => void
  onDelete: (song: Song) => void
}

/** 曲の一覧（おすすめキー付き） */
export function SongList({ songs, profile, alignMode, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<SongOrder>('newest')

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
          const result = profile && calcKey(profile, song, alignMode)
          const joysoundKey = result && formatJoysoundKey(result)
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

              {result ? (
                <>
                  <div className="song-result">
                    <span className={`status status-${result.status}`} data-testid="status">
                      {STATUS_LABELS[result.status]}
                    </span>
                    <span className="song-key" data-testid="recommended-key">
                      {formatKeyResult(result)}
                    </span>
                    {joysoundKey && (
                      <span className="song-key-alt" data-testid="joysound-key">
                        ±6: {joysoundKey}
                      </span>
                    )}
                  </div>
                  <details className="song-detail">
                    <summary>{describeKeyResult(result)}</summary>
                    <RangeBar profile={profile} song={song} result={result} />
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
