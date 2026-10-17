import { useState } from 'react'
import { createSong, updateSong, type SongValues } from './lib/song'
import { loadData, saveData, type AppData } from './lib/storage'
import { SongsPage } from './pages/SongsPage'
import { VoicePage } from './pages/VoicePage'
import type { Song, VoiceProfile } from './types'

type Tab = 'voice' | 'songs'

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [tab, setTab] = useState<Tab>(data.profile ? 'songs' : 'voice')

  const save = (next: AppData) => {
    setData(next)
    return saveData(next)
  }

  const saveProfile = (profile: VoiceProfile) => save({ ...data, profile })

  const addSong = (values: SongValues) => save({ ...data, songs: [...data.songs, createSong(values)] })

  const editSong = (song: Song, values: SongValues) =>
    save({ ...data, songs: data.songs.map((s) => (s.id === song.id ? updateSong(s, values) : s)) })

  const deleteSong = (song: Song) => save({ ...data, songs: data.songs.filter((s) => s.id !== song.id) })

  return (
    <div className="app">
      <header>
        <h1>
          キー丸<span className="tagline">キー変更を丸っと楽に</span>
        </h1>
        <nav className="tabs">
          <button type="button" aria-pressed={tab === 'songs'} onClick={() => setTab('songs')}>
            曲
          </button>
          <button type="button" aria-pressed={tab === 'voice'} onClick={() => setTab('voice')}>
            自分の音域
          </button>
        </nav>
      </header>

      <main>
        {tab === 'voice' && <VoicePage profile={data.profile} onSave={saveProfile} />}
        {tab === 'songs' && (
          <SongsPage
            songs={data.songs}
            profile={data.profile}
            onAdd={addSong}
            onUpdate={editSong}
            onDelete={deleteSong}
            onGoToVoice={() => setTab('voice')}
          />
        )}
      </main>
    </div>
  )
}

export default App
