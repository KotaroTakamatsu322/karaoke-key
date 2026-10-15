import { useState } from 'react'
import { loadData, saveData, type AppData } from './lib/storage'
import { VoicePage } from './pages/VoicePage'
import type { VoiceProfile } from './types'

type Tab = 'voice' | 'songs'

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [tab, setTab] = useState<Tab>(data.profile ? 'songs' : 'voice')

  const saveProfile = (profile: VoiceProfile) => {
    const next = { ...data, profile }
    setData(next)
    return saveData(next)
  }

  return (
    <div className="app">
      <header>
        <h1>カラオケ キー調整</h1>
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
          <section>
            <h2>曲</h2>
            <p className="hint">曲の登録と一覧は次のステップ（③）で作ります。</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
