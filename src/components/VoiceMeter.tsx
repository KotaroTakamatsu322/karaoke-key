import { useEffect, useRef, useState } from 'react'
import { formatNote, MAX_NOTE, MIN_NOTE, noteName } from '../lib/note'
import { BUFFER_SIZE, detectPitch, NoteTracker, toMidiFloat } from '../lib/pitch'

const INTERVAL_MS = 50 // 1秒に 20回調べる

type Props = {
  /** 測った最低音・最高音を、出せる音域の欄に入れる */
  onApplyRange: (low: number, high: number) => void
  /** 測った最高音を、裏声の最高音の欄に入れる */
  onApplyFalsetto: (high: number) => void
}

type Session = { stream: MediaStream; context: AudioContext; timer: number }

/** 今の音の表示。選べる音の外なら、国際表記に「範囲外」を添える */
function describeNote(midi: number): string {
  return midi >= MIN_NOTE && midi <= MAX_NOTE ? formatNote(midi) : `${noteName(midi)}（範囲外）`
}

/** マイクで音域を測る（実装手順書 ⑧） */
export function VoiceMeter({ onApplyRange, onApplyFalsetto }: Props) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState<number | null>(null) // 今の声（整数の MIDI 番号）
  const [low, setLow] = useState<number | null>(null) // 0.5秒続いた音のうち、いちばん低い音
  const [high, setHigh] = useState<number | null>(null)
  const session = useRef<Session | null>(null)

  const stop = () => {
    const s = session.current
    if (!s) return
    window.clearInterval(s.timer)
    s.stream.getTracks().forEach((t) => t.stop())
    void s.context.close()
    session.current = null
    setListening(false)
    setCurrent(null)
  }

  // 画面を離れたらマイクを止める
  useEffect(() => stop, [])

  const start = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('このブラウザではマイクを使えません（https のページで開いてください）')
      return
    }
    let stream: MediaStream
    try {
      // 声の高さを正しく取るため、雑音消しや音量の自動調整は切る
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch {
      setError('マイクを使えませんでした。ブラウザの設定でマイクを許可してください')
      return
    }

    const context = new AudioContext()
    const analyser = context.createAnalyser()
    analyser.fftSize = BUFFER_SIZE
    context.createMediaStreamSource(stream).connect(analyser)
    const buf = new Float32Array(BUFFER_SIZE)
    const tracker = new NoteTracker()

    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buf)
      const frequency = detectPitch(buf, context.sampleRate)
      const midi = frequency === null ? null : toMidiFloat(frequency)
      setCurrent(midi === null ? null : Math.round(midi))

      // 選べる音（lowlowA〜hihiG#）の外の音は、表示だけして数えない
      const inRange = midi !== null && Math.round(midi) >= MIN_NOTE && Math.round(midi) <= MAX_NOTE
      const held = tracker.update(inRange ? midi : null, performance.now())
      if (held !== null) {
        setLow((l) => (l === null ? held : Math.min(l, held)))
        setHigh((h) => (h === null ? held : Math.max(h, held)))
      }
    }, INTERVAL_MS)

    session.current = { stream, context, timer }
    setListening(true)
  }

  const reset = () => {
    setLow(null)
    setHigh(null)
  }

  return (
    <details className="voice-meter">
      <summary>マイクで測る</summary>
      <p className="hint">
        「測りはじめる」を押して、低い声から高い声まで、1つの高さを0.5秒以上のばして「あー」と出してください。
        短い音や雑音、選べる音（lowlowA〜hihiG#）の外の音は数えません。静かな場所で、スマホは口から30cmくらい離すと測りやすいです。
      </p>

      <div className="meter-current" aria-live="polite">
        {!listening ? '―' : current === null ? '…' : describeNote(current)}
      </div>

      <dl className="meter-result">
        <div>
          <dt>測った最低音</dt>
          <dd data-testid="measured-low">{low === null ? '―' : formatNote(low)}</dd>
        </div>
        <div>
          <dt>測った最高音</dt>
          <dd data-testid="measured-high">{high === null ? '―' : formatNote(high)}</dd>
        </div>
      </dl>

      {error && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        {listening ? (
          <button type="button" className="secondary" onClick={stop}>
            止める
          </button>
        ) : (
          <button type="button" className="secondary" onClick={() => void start()}>
            測りはじめる
          </button>
        )}
        <button type="button" className="secondary" onClick={reset} disabled={low === null}>
          やり直す
        </button>
      </div>

      {low !== null && high !== null && (
        <div className="actions">
          <button type="button" className="secondary" disabled={low === high} onClick={() => onApplyRange(low, high)}>
            出せる音域に入れる
          </button>
          <button type="button" className="secondary" onClick={() => onApplyFalsetto(high)}>
            最高音を裏声の欄に入れる
          </button>
        </div>
      )}
    </details>
  )
}
