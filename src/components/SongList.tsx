import { useState } from 'react'
import { calcKey } from '../lib/key'
import { playNote } from '../lib/audio'
import { formatNote, noteName } from '../lib/note'
import { createRecord, formatDate, RATING_LABELS, songRecords, suggestShift } from '../lib/record'
import {
  describeKeyResult,
  filterSongs,
  formatJoysoundShift,
  formatShift,
  SONG_ORDERS,
  sortSongs,
  STATUS_LABELS,
  type SongOrder,
} from '../lib/song'
import type { KeyResult, SingRecord, Song, VoiceProfile } from '../types'
import { RangeBar } from './RangeBar'
import { RecordForm } from './RecordForm'

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
  records: SingRecord[]
  onEdit: (song: Song) => void
  onDelete: (song: Song) => void
  onAddRecord: (record: SingRecord) => void
  onDeleteRecord: (record: SingRecord) => void
}

/** 曲の一覧（おすすめキー付き） */
export function SongList({ songs, records, ...rest }: Props) {
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
        {shown.map((song) => (
          <SongCard key={song.id} song={song} records={songRecords(records, song.id)} {...rest} />
        ))}
      </ul>
    </div>
  )
}

type CardProps = Omit<Props, 'songs'> & { song: Song }

/** 曲1つ分（おすすめキー・記録から・記録の入力と一覧） */
function SongCard({ song, profile, records, onEdit, onDelete, onAddRecord, onDeleteRecord }: CardProps) {
  const [recording, setRecording] = useState(false)
  const options = profile && keyOptions(profile, song)
  const latest = records[0] // 新しい順
  const suggested = latest && suggestShift(latest)

  return (
    <li className="song" aria-label={song.title}>
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
        options.map(({ label, result }) => (
          <KeyRow
            key={label}
            label={options.length > 1 || latest ? label : undefined}
            shift={result.shift}
            songHigh={song.high}
          >
            <span className={`status status-${result.status}`} data-testid="status">
              {STATUS_LABELS[result.status]}
            </span>
            {result.falsettoShortage > 0 && (
              <span className="falsetto-warning" data-testid="falsetto-warning">
                裏声が {result.falsettoShortage}半音 届きません
              </span>
            )}
          </KeyRow>
        ))
      ) : (
        <div className="song-range">
          {formatNote(song.low)} 〜 {formatNote(song.high)}
          {song.falsettoHigh !== undefined && `（裏声 〜 ${formatNote(song.falsettoHigh)}）`}
        </div>
      )}

      {latest && suggested !== undefined && (
        <KeyRow label="記録から" shift={suggested} songHigh={song.high} testId="record-key">
          <span className="record-note">
            前回 {formatDate(latest.date)} {formatShift(latest.shift)}：{RATING_LABELS[latest.rating]}
          </span>
        </KeyRow>
      )}

      {options && (
        <details className="song-detail">
          <summary>{options.length > 1 ? '音域の図' : describeKeyResult(options[0].result)}</summary>
          <RangeBar profile={profile} song={song} options={options} />
        </details>
      )}

      {records.length > 0 && (
        <details className="song-detail">
          <summary>歌った記録（{records.length}件）</summary>
          <ul className="record-list">
            {records.map((r) => (
              <li key={r.id}>
                <span>
                  {formatDate(r.date)} {formatShift(r.shift)}：{RATING_LABELS[r.rating]}
                </span>
                <button
                  type="button"
                  className="small danger"
                  aria-label={`${formatDate(r.date)} の記録を削除`}
                  onClick={() => onDeleteRecord(r)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {recording ? (
        <RecordForm
          defaultShift={suggested ?? options?.[0].result.shift ?? 0}
          onSave={(shift, rating) => {
            onAddRecord(createRecord(song.id, shift, rating))
            setRecording(false)
          }}
          onCancel={() => setRecording(false)}
        />
      ) : (
        <button type="button" className="small record-button" onClick={() => setRecording(true)}>
          歌った記録をつける
        </button>
      )}
    </li>
  )
}

/** キー1行分（ラベル・キー・最高音を鳴らす ▶・±6 の機種の設定・その他の表示） */
function KeyRow({
  label,
  shift,
  songHigh,
  testId = 'recommended-key',
  children,
}: {
  label?: string
  shift: number
  /** 曲の地声の最高音（原曲） */
  songHigh: number
  testId?: string
  children: React.ReactNode
}) {
  const joysoundKey = formatJoysoundShift(shift)
  const top = songHigh + shift // このキーで歌ったときの最高音
  return (
    <div className="song-result">
      {label && <span className="key-label">{label}</span>}
      <span className="song-key" data-testid={testId}>
        {formatShift(shift)}
      </span>
      <button
        type="button"
        className="small play-button"
        aria-label={`${formatShift(shift)} の最高音 ${noteName(top)} を鳴らす`}
        title={`最高音 ${noteName(top)} を鳴らす`}
        onClick={() => playNote(top)}
      >
        ▶
      </button>
      {joysoundKey && (
        <span className="song-key-alt" data-testid="joysound-key">
          ±6: {joysoundKey}
        </span>
      )}
      {children}
    </div>
  )
}
