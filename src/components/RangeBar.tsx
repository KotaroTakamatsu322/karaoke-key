import { noteName } from '../lib/note'
import type { VoiceProfile } from '../types'
import type { KeyOption } from './SongList'

type Props = {
  profile: VoiceProfile
  song: { low: number; high: number; falsettoHigh?: number }
  options: KeyOption[]
}

/**
 * 「自分の音域」「原曲の音域」「ずらした後の音域（高め・低め）」を横棒で重ねて表示する。
 * 裏声の最高音が地声の最高音より高ければ、地声の最高音から先を裏声の色で伸ばす
 */
export function RangeBar({ profile, song, options }: Props) {
  const uLow = profile.comfortableLow ?? profile.low
  const uHigh = profile.comfortableHigh ?? profile.high
  const hasComfortable = uLow !== profile.low || uHigh !== profile.high

  const notes = [
    profile.low,
    profile.high,
    profile.falsettoHigh ?? profile.high,
    song.low,
    song.high,
    ...options.flatMap(({ result }) => [
      result.shiftedLow,
      song.falsettoHigh === undefined ? result.shiftedHigh : song.falsettoHigh + result.shift,
    ]),
  ]
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

  // 裏声の部分（地声の最高音から裏声の最高音まで）。裏声の方が低いときは文字だけで出す
  const falsetto = (high: number, falsettoHigh: number | undefined) =>
    falsettoHigh !== undefined &&
    falsettoHigh > high && <span className="range-fill falsetto" style={span(high, falsettoHigh)} />
  const falsettoText = (falsettoHigh: number | undefined) =>
    falsettoHigh !== undefined && `（裏声 〜 ${noteName(falsettoHigh)}）`

  return (
    <div className="range-bar">
      <div className="range-row">
        <div className="range-label">自分</div>
        <div className="range-track">
          {guides}
          {falsetto(profile.high, profile.falsettoHigh)}
          {hasComfortable && <span className="range-fill voice-limit" style={span(profile.low, profile.high)} />}
          <span className="range-fill voice" style={span(uLow, uHigh)} />
        </div>
        <div className="range-text">
          {hasComfortable ? `楽に出せる ${range(uLow, uHigh)}（限界 ${range(profile.low, profile.high)}）` : range(uLow, uHigh)}
          {falsettoText(profile.falsettoHigh)}
        </div>
      </div>

      <div className="range-row">
        <div className="range-label">原曲</div>
        <div className="range-track">
          {guides}
          {falsetto(song.high, song.falsettoHigh)}
          <span className="range-fill original" style={span(song.low, song.high)} />
        </div>
        <div className="range-text">
          {range(song.low, song.high)}
          {falsettoText(song.falsettoHigh)}
        </div>
      </div>

      {options.map(({ label, result }) => {
        const shiftedFalsetto = song.falsettoHigh === undefined ? undefined : song.falsettoHigh + result.shift
        return (
          <div key={label} className="range-row">
            <div className="range-label">{options.length > 1 ? label : '調整後'}</div>
            <div className="range-track">
              {guides}
              {falsetto(result.shiftedHigh, shiftedFalsetto)}
              <span className="range-fill shifted" style={span(result.shiftedLow, result.shiftedHigh)} />
              {result.missingLow > 0 && (
                <span
                  className="range-fill missing"
                  style={span(result.shiftedLow, Math.min(uLow, result.shiftedHigh))}
                />
              )}
            </div>
            <div className="range-text">
              {range(result.shiftedLow, result.shiftedHigh)}
              {falsettoText(shiftedFalsetto)}
              {result.missingLow > 0 && <span className="range-missing">（低い音が {result.missingLow}半音 出ない）</span>}
              {result.falsettoShortage > 0 && (
                <span className="range-missing">（裏声が {result.falsettoShortage}半音 届かない）</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
