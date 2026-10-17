import { useState } from 'react'
import { SongForm } from '../components/SongForm'
import { SongList } from '../components/SongList'
import type { SongValues } from '../lib/song'
import type { Song, VoiceProfile } from '../types'

type Props = {
  songs: Song[]
  profile: VoiceProfile | null
  onAdd: (values: SongValues) => void
  onUpdate: (song: Song, values: SongValues) => void
  onDelete: (song: Song) => void
  onGoToVoice: () => void
}

/** 曲の一覧と登録 */
export function SongsPage({ songs, profile, onAdd, onUpdate, onDelete, onGoToVoice }: Props) {
  const [editing, setEditing] = useState<Song | null>(null)

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
          onSubmit={(values) => {
            onUpdate(editing, values)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <SongForm onSubmit={onAdd} />
      )}

      <SongList
        songs={songs}
        profile={profile}
        onEdit={(song) => {
          setEditing(song)
          window.scrollTo?.({ top: 0, behavior: 'smooth' })
        }}
        onDelete={handleDelete}
      />
    </section>
  )
}
