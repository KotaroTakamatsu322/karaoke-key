import { useState } from 'react'
import { parseSongsCsv, songsToCsv, type CsvError } from '../lib/csv'
import type { SongValues } from '../lib/song'
import type { Song } from '../types'

type Props = {
  songs: Song[]
  /** 取り込んだ曲を保存し、追加・上書きした曲数を返す */
  onImport: (values: SongValues[]) => { added: number; updated: number }
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

/** 曲データの CSV 取り込み・書き出し */
export function SongCsv({ songs, onImport }: Props) {
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<CsvError[]>([])

  const handleExport = () => {
    const url = URL.createObjectURL(new Blob([songsToCsv(songs)], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `karaoke-key-songs-${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイルを選び直しても読めるように
    if (!file) return

    const { values, errors } = parseSongsCsv(await file.text())
    const { added, updated } = values.length > 0 ? onImport(values) : { added: 0, updated: 0 }
    setMessage(
      values.length > 0 ? `${added}曲を追加、${updated}曲を上書きしました` : '取り込める曲がありませんでした',
    )
    setErrors(errors)
  }

  return (
    <details className="song-csv">
      <summary>CSVで取り込み・書き出し</summary>
      <p className="hint">
        1行目は見出し（曲名,アーティスト,最低音,最高音,裏声の最高音）です。音名は mid2G でも G4 でも読めます。
        曲名とアーティストが同じ曲は、CSV の内容で上書きします（歌った記録は残ります）。
      </p>

      <div className="actions">
        <button type="button" className="secondary" onClick={handleExport} disabled={songs.length === 0}>
          CSVを書き出す
        </button>
        <label className="file-button secondary">
          CSVを取り込む
          <input type="file" accept=".csv,text/csv" aria-label="CSVファイルを選ぶ" onChange={handleFile} />
        </label>
      </div>

      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((err) => (
            <li key={err.line}>
              {err.line}行目: {err.message}
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
