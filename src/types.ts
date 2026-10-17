// 音はすべて MIDI ノート番号（整数）で扱う

export type VoiceProfile = {
  low: number
  high: number
  comfortableLow?: number
  comfortableHigh?: number
  falsettoHigh?: number
}

export type Song = {
  id: string
  title: string
  artist: string
  low: number
  high: number
  falsettoHigh?: number
  memo?: string
  createdAt: string
  updatedAt: string
}

export type AlignMode = 'high' | 'center'

export type Settings = { alignMode: AlignMode }

export type SingRecord = {
  id: string
  songId: string
  machineKey: number
  rating: 'easy' | 'good' | 'hard'
  date: string
}

export type KeyStatus = 'original' | 'adjusted' | 'octaveDown' | 'octaveUp' | 'tooWide'

export type KeyResult = {
  shift: number // 実際に下げる・上げる半音数
  machineKey: number // カラオケ機で設定する値（-7〜+7）
  octave: -1 | 0 | 1 // 原曲から何オクターブずらして歌うか
  status: KeyStatus
  shiftedLow: number
  shiftedHigh: number
  missingLow: number // 自分の音域より低くて出せない半音数
  falsettoShortage: number // 曲の裏声の最高音が、自分の裏声の最高音に届かない半音数（どちらかが未登録なら 0）
}
