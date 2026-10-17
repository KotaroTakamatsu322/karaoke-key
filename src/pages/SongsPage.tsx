import { useState } from 'react'
import { SongCsv } from '../components/SongCsv'
import { SongForm } from '../components/SongForm'
import { SongList } from '../components/SongList'
import { artistNames, type SongValues } from '../lib/song'
import type { SingRecord, Song, VoiceProfile } from '../types'

type Props = {
  songs: Song[]
  profile: VoiceProfile | null
  records: SingRecord[]
  onAdd: (values: SongValues) => void
  onUpdate: (song: Song, values: SongValues) => void
  onDelete: (song: Song) => void
  onAddRecord: (record: SingRecord) => void
  onDeleteRecord: (record: SingRecord) => void
  onImport: (values: SongValues[]) => { added: number; updated: number }
  onGoToVoice: () => void
}

/** 曲の一覧と登録 */
export function SongsPage({
  songs,
  profile,
  records,
  onAdd,
  onUpdate,
  onDelete,
  onAddRecord,
  onDeleteRecord,
  onImport,
  onGoToVoice,
}: Props) {
  const [editing, setEditing] = useState<Song | null>(null)
  const artists = artistNames(songs)

  const handleDelete = (song: Song) => {
    if (!window.confirm(`「${song.title}」を削除しますか？`)) return
    if (editing?.id === song.id) setEditing(null)
    onDelete(song)
  }

  return (
    <section>
      <h2>曲</h2>

      {!profile && (
        <div className="notice">
          <p>自分の音域が登録されていないため、おすすめキーを計算できません。</p>
          <button type="button" className="secondary" onClick={onGoToVoice}>
            音域を登録する
          </button>
        </div>
      )}

      {editing ? (
        <SongForm
          key={editing.id}
          song={editing}
          artists={artists}
          onSubmit={(values) => {
            onUpdate(editing, values)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <SongForm artists={artists} onSubmit={onAdd} />
      )}

      <SongList
        songs={songs}
        profile={profile}
        records={records}
        onAddRecord={onAddRecord}
        onDeleteRecord={onDeleteRecord}
        onEdit={(song) => {
          setEditing(song)
          window.scrollTo?.({ top: 0, behavior: 'smooth' })
        }}
        onDelete={handleDelete}
      />

      <SongCsv songs={songs} onImport={onImport} />
    </section>
  )
}
