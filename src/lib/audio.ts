// 試聴（Web Audio API で音を鳴らす）
import { toFrequency } from './note'

const DURATION = 1 // 秒
const FADE = 0.02 // 始めと終わりのフェード（プツッという音を防ぐ）
const VOLUME = 0.3

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

/** 音を約1秒鳴らす。Web Audio が使えないブラウザでは何もしない */
export function playNote(midi: number): void {
  const ctx = getContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = toFrequency(midi)

  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(VOLUME, t + FADE)
  gain.gain.setValueAtTime(VOLUME, t + DURATION - FADE)
  gain.gain.linearRampToValueAtTime(0, t + DURATION)

  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + DURATION)
}
