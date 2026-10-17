// 試聴（Web Audio API で、人が「あー」と歌っているような音を鳴らす）
// 音声ファイルは使わず、のどの音（倍音の多いのこぎり波）を、口の中の響き（フォルマント）をまねたフィルターに通して作る
import { toFrequency } from './note'

const DURATION = 1.2 // 秒
const ATTACK = 0.08 // 出だしでふくらむ時間
const RELEASE = 0.15 // 最後に消えていく時間
const VOLUME = 0.5 // フィルターを通すと音が小さくなる分、元の音（0.3）より大きめにする

// 男性の「あ」の響き（周波数 Hz・鋭さ Q・強さ）
const FORMANTS = [
  { frequency: 800, q: 10, gain: 1 },
  { frequency: 1150, q: 12, gain: 0.5 },
  { frequency: 2900, q: 24, gain: 0.25 },
]
// 高い音（基音が F1 を超えるあたり）でも音の高さが聞こえるように足す道
const BODY = { frequency: 1000, gain: 0.3 }

// ビブラート（声のゆれ）。出だしはゆらさず、少し遅れて深くする
const VIBRATO_RATE = 5.5 // Hz
const VIBRATO_CENTS = 20
const VIBRATO_DELAY = 0.25
const VIBRATO_FULL = 0.5

let context: AudioContext | null = null

// AudioContext はボタンを押したとき（ユーザーの操作の中）に作らないと、スマホでは音が出ない
function getContext(): AudioContext | null {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

/** 音を約1秒、声のような音で鳴らす。Web Audio が使えないブラウザでは何もしない */
export function playNote(midi: number): void {
  const ctx = getContext()
  if (!ctx) return

  const t = ctx.currentTime
  const end = t + DURATION
  const freq = toFrequency(midi)

  // のどの音
  const voice = ctx.createOscillator()
  voice.type = 'sawtooth'
  voice.frequency.value = freq

  // ビブラート: ゆっくりした sine で音の高さを少しゆらす
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = VIBRATO_RATE
  const depth = ctx.createGain()
  depth.gain.setValueAtTime(0, t + VIBRATO_DELAY)
  depth.gain.linearRampToValueAtTime(freq * (2 ** (VIBRATO_CENTS / 1200) - 1), t + VIBRATO_FULL)
  lfo.connect(depth).connect(voice.frequency)

  // 音量の形（ふくらんで、保って、消える）
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0, t)
  envelope.gain.linearRampToValueAtTime(VOLUME, t + ATTACK)
  envelope.gain.setValueAtTime(VOLUME, end - RELEASE)
  envelope.gain.linearRampToValueAtTime(0, end)
  envelope.connect(ctx.destination)

  // 口の中の響き: フィルターを並べて通し、足し合わせる
  const paths = [
    ...FORMANTS.map((f) => ({ type: 'bandpass' as const, ...f })),
    { type: 'lowpass' as const, q: 0.7, ...BODY },
  ]
  for (const p of paths) {
    const filter = ctx.createBiquadFilter()
    filter.type = p.type
    filter.frequency.value = p.frequency
    filter.Q.value = p.q
    const gain = ctx.createGain()
    gain.gain.value = p.gain
    voice.connect(filter).connect(gain).connect(envelope)
  }

  voice.start(t)
  lfo.start(t)
  voice.stop(end)
  lfo.stop(end)
}
