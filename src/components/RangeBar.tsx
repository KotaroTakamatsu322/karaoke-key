import { MAX_NOTE, MIN_NOTE, toInternational, toJapanese } from '../lib/note'
import type { KeyResult, VoiceProfile } from '../types'

// ずらした後の音は日本式の表記の範囲（lowlowA〜hihiG#）を出ることがある
function noteName(midi: number): string {
  return midi >= MIN_NOTE && midi <= MAX_NOTE ? toJapanese(midi) : toInternational(midi)
}

type Props = {
  profile: VoiceProfile
  song: { low: number; high: number }
  result: KeyResult
}

/** 「自分の音域」「原曲の音域」「ずらした後の音域」を横棒で重ねて表示する */
export function RangeBar({ profile, song, result }: Props) {
  const uLow = profile.comfortableLow ?? profile.low
  const uHigh = profile.comfortableHigh ?? profile.high
  const hasComfortable = uLow !== profile.low || uHigh !== profile.high

  const notes = [profile.low, profile.high, song.low, song.high, result.shiftedLow, result.shiftedHigh]
  const min = Math.min(...notes) - 1
  const max = Math.max(...notes) + 1
  const pos = (note: number) => ((note - min) / (max - min)) * 100
  const span = (low: number, high: number) => ({ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` })

  // 自分の音域の端に縦線を引いて、はみ出しを見やすくする
  const guides = (
    <>
      <span className="range-guide" style={{ left: `${pos(uLow)}%` }} />
      <span className="range-guide" style={{ left: `${pos(uHigh)}%` }} />
    </>
  )
  const range = (low: number, high: number) => `${noteName(low)} 〜 ${noteName(high)}`
  const missingTop = Math.min(uLow, result.shiftedHigh)

  return (
    <div className="range-bar">
      <div className="range-row">
        <div className="range-label">自分</div>
        <div className="range-track">
          {guides}
          {hasComfortable && <span className="range-fill voice-limit" style={span(profile.low, profile.high)} />}
          <span className="range-fill voice" style={span(uLow, uHigh)} />
        </div>
        <div className="range-text">
          {hasComfortable ? `楽に出せる ${range(uLow, uHigh)}（限界 ${range(profile.low, profile.high)}）` : range(uLow, uHigh)}
        </div>
      </div>

      <div className="range-row">
        <div className="range-label">原曲</div>
        <div className="range-track">
          {guides}
          <span className="range-fill original" style={span(song.low, song.high)} />
        </div>
        <div className="range-text">{range(song.low, song.high)}</div>
      </div>

      <div className="range-row">
        <div className="range-label">調整後</div>
        <div className="range-track">
          {guides}
          <span className="range-fill shifted" style={span(result.shiftedLow, result.shiftedHigh)} />
          {result.missingLow > 0 && (
            <span className="range-fill missing" style={span(result.shiftedLow, missingTop)} />
          )}
        </div>
        <div className="range-text">
          {range(result.shiftedLow, result.shiftedHigh)}
          {result.missingLow > 0 && <span className="range-missing">（低い音が {result.missingLow}半音 出ない）</span>}
        </div>
      </div>
    </div>
  )
}
