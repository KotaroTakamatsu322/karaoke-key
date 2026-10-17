import { GROUPS, MIN_NOTE, toJapanese } from '../lib/note'
import type { VoiceProfile } from '../types'

// 目盛りは A（グループの始まり）ごとに引く。少なくとも mid1A〜hiA は見せる
const SCALE_LOW = MIN_NOTE + 12 * 2 // mid1A
const SCALE_HIGH = MIN_NOTE + 12 * 4 // hiA

const floorToA = (n: number) => MIN_NOTE + 12 * Math.floor((n - MIN_NOTE) / 12)
const ceilToA = (n: number) => MIN_NOTE + 12 * Math.ceil((n - MIN_NOTE) / 12)

/** 音域の広さ（例: 「2オクターブと3半音」） */
export function formatWidth(semitones: number): string {
  const octaves = Math.floor(semitones / 12)
  const rest = semitones % 12
  if (octaves === 0) return `${rest}半音`
  return rest === 0 ? `${octaves}オクターブ` : `${octaves}オクターブと${rest}半音`
}

/** 自分の音域（限界の音域と楽に出せる音域）を、目盛り付きの横棒で表示する */
export function VoiceChart({ profile }: { profile: VoiceProfile }) {
  const uLow = profile.comfortableLow ?? profile.low
  const uHigh = profile.comfortableHigh ?? profile.high
  const hasComfortable = uLow !== profile.low || uHigh !== profile.high

  const min = floorToA(Math.min(profile.low, SCALE_LOW))
  const max = ceilToA(Math.max(profile.high + 1, SCALE_HIGH))
  const pos = (note: number) => ((note - min) / (max - min)) * 100
  // 1つの音を幅1つ分として塗る（最高音の右端まで含める）
  const span = (low: number, high: number) => ({ left: `${pos(low)}%`, width: `${pos(high + 1) - pos(low)}%` })

  const ticks: number[] = []
  for (let n = min; n <= max; n += 12) ticks.push(n)

  return (
    <figure className="voice-chart" aria-label="自分の音域の図">
      <div className="voice-chart-track">
        {ticks.map((n) => (
          <span key={n} className="voice-chart-tick" style={{ left: `${pos(n)}%` }} />
        ))}
        {hasComfortable && <span className="range-fill voice-limit" style={span(profile.low, profile.high)} />}
        <span className="range-fill voice" style={span(uLow, uHigh)} />
      </div>
      <div className="voice-chart-scale">
        {ticks.slice(0, -1).map((n) => (
          <span key={n} style={{ left: `${pos(n)}%`, width: `${pos(n + 12) - pos(n)}%` }}>
            {GROUPS[(n - MIN_NOTE) / 12]}
          </span>
        ))}
      </div>
      <figcaption className="voice-chart-legend">
        <div>
          <span className={`swatch ${hasComfortable ? 'voice-limit' : 'voice'}`} />
          出せる音域 {toJapanese(profile.low)} 〜 {toJapanese(profile.high)}（{formatWidth(profile.high - profile.low)}）
        </div>
        {hasComfortable && (
          <div>
            <span className="swatch voice" />
            楽に出せる音域 {toJapanese(uLow)} 〜 {toJapanese(uHigh)}（{formatWidth(uHigh - uLow)}）
          </div>
        )}
      </figcaption>
    </figure>
  )
}
