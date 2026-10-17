import { useState } from 'react'
import { calcKey, toMachineKey } from '../lib/key'
import { playNote } from '../lib/audio'
import { formatNote, noteName } from '../lib/note'
import { createRecord, formatDate, RATING_LABELS, songRecords, suggestShift } from '../lib/record'
import {
  applySongFilters,
  describeKeyResult,
  filterSongs,
  searchSuggestions,
  SONG_FILTERS,
  type SongFilter,
  formatJoysoundShift,
  formatShift,
  SONG_ORDERS,
  sortSongs,
  STATUS_LABELS,
  type SongOrder,
} from '../lib/song'
import type { KeyResult, KeyStatus, SingRecord, Song, VoiceProfile } from '../types'
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
  const [filters, setFilters] = useState<SongFilter[]>([])

  if (songs.length === 0) {
    return <p className="hint">まだ曲が登録されていません。</p>
  }

  const shown = sortSongs(applySongFilters(filterSongs(songs, query), filters, rest.profile), order)
  // 「原曲キーで歌える」は音域が登録されているときだけ出す
  const filterChoices = SONG_FILTERS.filter((f) => f.value !== 'original' || rest.profile)
  const toggleFilter = (f: SongFilter) =>
    setFilters((now) => (now.includes(f) ? now.filter((x) => x !== f) : [...now, f]))

  return (
    <div>
      <div className="list-tools">
        <input
          type="search"
          className="text-input"
          aria-label="曲名・アーティストで検索"
          placeholder="曲名・アーティストで検索"
          list="song-search-history"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <datalist id="song-search-history">
          {searchSuggestions(songs).map((s) => (
            <option key={`${s.label}:${s.value}`} value={s.value} label={s.label} />
          ))}
        </datalist>
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

      <div className="filter-chips" role="group" aria-label="絞り込み">
        {filterChoices.map((f) => (
          <button
            key={f.value}
            type="button"
            className="chip"
            aria-pressed={filters.includes(f.value)}
            onClick={() => toggleFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="hint">当てはまる曲はありません。</p>}

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
          <div className="song-title">
            {song.favorite && (
              <span className="favorite-mark" title="十八番" aria-label="十八番">
                ★
              </span>
            )}
            {song.title}
          </div>
          {(song.artist || song.female) && (
            <div className="song-artist">
              {song.artist}
              {song.female && <span className="tag">女性曲</span>}
            </div>
          )}
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
            tone={result.status}
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
        <KeyRow label="記録から" shift={suggested} songHigh={song.high} tone="record" testId="record-key">
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

/** キー1行分（ラベル・キー・最高音を鳴らす ▶・キーのメーター・±6 の機種の設定・その他の表示） */
function KeyRow({
  label,
  shift,
  songHigh,
  tone,
  testId = 'recommended-key',
  children,
}: {
  label?: string
  shift: number
  /** 曲の地声の最高音（原曲） */
  songHigh: number
  /** キーの文字とメーターの色。判定の色とそろえる（「記録から」は金色） */
  tone: KeyStatus | 'record'
  testId?: string
  children: React.ReactNode
}) {
  const joysoundKey = formatJoysoundShift(shift)
  const top = songHigh + shift // このキーで歌ったときの最高音
  return (
    <div className={`key-row tone-${tone}`}>
      <div className="key-line">
        {label && <span className="key-label">{label}</span>}
        <span className="song-key" data-testid={testId}>
          {formatShift(shift)}
        </span>
        <button
          type="button"
          className="play-button"
          aria-label={`${formatShift(shift)} の最高音 ${noteName(top)} を鳴らす`}
          title={`最高音 ${noteName(top)} を鳴らす`}
          onClick={() => playNote(top)}
        >
          ▶
        </button>
      </div>
      <KeyMeter shift={shift} />
      <div className="key-notes">
        {children}
        {joysoundKey && (
          <span className="song-key-alt" data-testid="joysound-key">
            ±6: {joysoundKey}
          </span>
        )}
      </div>
    </div>
  )
}

const METER_STEPS = Array.from({ length: 15 }, (_, i) => i - 7) // -7 〜 +7

/**
 * カラオケのリモコンのキー表示をまねたメーター。0 から設定するキーまでを光らせる。
 * 数字を読まなくても、どれだけ下げる（上げる）かが形でわかるように。読み上げは数字の方で足りるので隠す
 */
function KeyMeter({ shift }: { shift: number }) {
  const { machineKey, octave } = toMachineKey(shift)
  const lit = (step: number) => (machineKey < 0 ? step >= machineKey && step < 0 : step <= machineKey && step > 0)
  return (
    <div className="key-meter" aria-hidden="true">
      {octave !== 0 && <span className="meter-octave">{octave < 0 ? 'オク下' : 'オク上'}</span>}
      <div className="meter-cells">
        {METER_STEPS.map((step) => (
          <span
            key={step}
            className={['meter-cell', step === 0 && 'meter-zero', lit(step) && 'meter-lit', step === machineKey && step !== 0 && 'meter-at']
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>
      <div className="meter-scale">
        <span>−7</span>
        <span>0</span>
        <span>+7</span>
      </div>
    </div>
  )
}
