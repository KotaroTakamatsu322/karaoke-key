# カラオケ キー調整アプリ 実装手順書

自分の音域を登録すると、曲ごとに「何キー下げれば歌いやすいか」を表示するWebアプリ。
この文書は、機能一覧（たたき台）で決めた内容をもとに、実装の順番・設計・確認方法をまとめたもの。

---

## 1. 決定事項

| 項目 | 決定内容 |
|---|---|
| 使う環境 | Webアプリ（スマホのブラウザで使う。あとでPWA対応） |
| 技術 | React + TypeScript + Vite、テストは Vitest |
| データ保存 | ブラウザの localStorage（サーバーなし） |
| キーの合わせ方 | 「高め」（曲の最高音を自分の最高音に合わせる）と「低め」（音域の真ん中に合わせる）の2つを曲ごとに並べて出す。同じキーになるときは1つにまとめる。「楽に出せる最高音」が登録されていればそちらを使う（カラオケで試した結果、ちょうどいいキーは2つのあいだにあったため、切り替えをやめた） |
| 地声と裏声 | 曲・自分とも、最低音・最高音は地声で入れ、裏声の最高音は任意で別に入れる。キーは地声で計算し、ずらした後の曲の裏声が自分の裏声の最高音を超えるときだけ「裏声が○半音 届きません」と注意を出す |
| カラオケ機のキー幅 | ±7（DAMに合わせる）。JOYSOUND は ±6 なので、設定が変わるとき（ずらし幅が ±7）だけ JOYSOUND 用の値も添える |

### 費用
**作るのも使うのも、すべて無料のものだけでできる。**

| 使うもの | 費用 |
|---|---|
| Node.js / npm / React / Vite / TypeScript / Vitest / git / VS Code | 無料（オープンソース） |
| localStorage / Web Audio / マイク（ブラウザの機能） | 無料 |
| サーバー | 使わないので 0円 |
| 公開（任意）: GitHub Pages または Cloudflare Pages | 無料枠で十分 |
| アプリストアへの登録 | Webアプリなので不要（Apple 年$99 や Google $25 がかからない） |

- お金がかかる可能性があるのは **独自ドメイン**（例: `karaoke-key.com`）を使う場合だけ。任意なので、使わなければ 0円
- 有料の音域データサービスやAPIは使わない（曲データは手入力かCSVで入れる）

---

## 2. 音の表し方

### 2.1 内部での値
音はすべて **MIDIノート番号（整数）** で扱う。1違うと半音1つ分の差になる。
キーの計算は、この数値の足し算・引き算だけで済む。

### 2.2 日本式の表記との対応
日本式の表記では、**A から次の G# までを1つのグループ**として扱う。

| グループ | 範囲 | MIDI番号 |
|---|---|---|
| lowlow | lowlowA〜lowlowG# | 21〜32（A0〜G#1） |
| low | lowA〜lowG# | 33〜44（A1〜G#2） |
| mid1 | mid1A〜mid1G# | 45〜56（A2〜G#3） |
| mid2 | mid2A〜mid2G# | 57〜68（A3〜G#4） |
| hi | hiA〜hiG# | 69〜80（A4〜G#5） |
| hihi | hihiA〜hihiG# | 81〜92（A5〜G#6） |

変換式: `MIDI = 21 + 12 × グループ番号 + Aからの半音数`
（グループ番号は lowlow=0, low=1, mid1=2, mid2=3, hi=4, hihi=5。
Aからの半音数は A=0, A#=1, B=2, C=3, C#=4, … , G#=11）

確認用の値: `hiA = A4 = 69`（440Hz）、`mid2C = C4 = 60`（ド）、`lowG = G2 = 43`

画面では「mid2G（G4）」のように、両方の表記を並べて表示する。

---

## 3. キー計算の仕様

### 3.1 入力
- 自分の音域: `low`, `high`（任意で `comfortableLow`, `comfortableHigh`）
  - 計算には `uLow = comfortableLow ?? low`、`uHigh = comfortableHigh ?? high` を使う
- 曲の音域: `songLow`, `songHigh`
- 合わせ方: `'high'`（最高音に合わせる）または `'center'`（音域の真ん中に合わせる）

### 3.2 手順
1. **収まる範囲を求める**: 曲が自分の音域に収まるずらし幅は
   `minShift = uLow − songLow` 〜 `maxShift = uHigh − songHigh`
2. **原曲キーで歌えるか**: `minShift ≤ 0 ≤ maxShift` なら、ずらし幅は **0**（判定は「原曲キーで歌える」）
3. **理想のずらし幅 `s` を決める**
   - high のとき: `s = maxShift`
   - center のとき: `s = round(自分の音域の中央 − 曲の音域の中央)` を求め、`[minShift, maxShift]` の範囲に収める
4. **曲の音域の方が広い場合**（`minShift > maxShift`）: 全部は収まらないので、判定は「音域が足りない」。
   この場合も `s = maxShift`（高音側を優先）で表示し、出せない低音が何音あるかを添える
5. **カラオケ機での設定値に直す**
   - `−7 ≤ s ≤ 7`: キー `s`、オクターブはそのまま（判定は「キー調整で歌える」）
   - `s < −7`: 1オクターブ下で歌い、キーは `s + 12`（判定は「オクターブ下推奨」）
   - `s > 7`: 1オクターブ上で歌い、キーは `s − 12`（声が高い人向け）

### 3.3 出力（型の案）
```ts
type KeyResult = {
  shift: number;          // 実際に下げる・上げる半音数（例: -9）
  machineKey: number;     // カラオケ機で設定する値（例: +3）
  octave: -1 | 0 | 1;     // 原曲から何オクターブずらして歌うか
  status: 'original' | 'adjusted' | 'octaveDown' | 'octaveUp' | 'tooWide';
  shiftedLow: number;     // ずらした後の曲の最低音
  shiftedHigh: number;    // ずらした後の曲の最高音
  missingLow: number;     // 自分の音域より低くて出せない半音数（0なら問題なし）
};
```

---

## 4. データの形

```ts
type VoiceProfile = {
  low: number; high: number;                 // 限界の音域（MIDI）
  comfortableLow?: number; comfortableHigh?: number;
  falsettoHigh?: number;                     // 裏声の最高音（あとで使う）
};

type Song = {
  id: string; title: string; artist: string;
  low: number; high: number;                 // 地声の音域（MIDI）
  falsettoHigh?: number;
  memo?: string;
  createdAt: string; updatedAt: string;
};

type Settings = { alignMode: 'high' | 'center' };

// ⑤ で追加
type SingRecord = {
  id: string; songId: string; machineKey: number;
  rating: 'easy' | 'good' | 'hard'; date: string;
};
```

localStorage のキーは `karaoke-key:v1` にまとめ、`{ version, profile, songs, settings, records }` の形で保存する。
読み書きは try/catch で囲み、失敗した場合は空のデータで起動する。

---

## 5. フォルダ構成（予定）

```
my-app/
  docs/implementation-plan.md   ← この文書
  src/
    lib/
      note.ts          音名 ⇔ MIDI番号の変換
      note.test.ts
      key.ts           キー計算
      key.test.ts
      storage.ts       localStorage の読み書き
    types.ts
    components/
      NoteSelect.tsx   音名を選ぶ入力欄
      RangeBar.tsx     音域を比べる図
      SongForm.tsx     曲の登録・編集フォーム
      SongList.tsx     曲の一覧（おすすめキー付き）
    pages/
      VoicePage.tsx    自分の音域の登録
      SongsPage.tsx    曲の一覧
    App.tsx            タブで画面を切り替える（MVPではルーターを使わない）
    main.tsx
```

---

## 6. 実装の順番

各ステップは「完了の条件」を満たしてから次に進む。

### ⓪ 準備
- Node.js（LTS版）をインストールする（現在このPCには入っていない）
  - https://nodejs.org/ からLTS版のインストーラーを入手する
  - `node -v` と `npm -v` でバージョンが表示されることを確認する
- `npm create vite@latest . -- --template react-ts` でプロジェクトを作る
- Vitest を追加して `npm test` で動くようにする
- git を初期化する（`git init`）
- **完了の条件**: `npm run dev` で初期画面が表示され、`npm test` が通る

### ① キー計算の処理とテスト
- `lib/note.ts`: 日本式／国際表記と MIDI番号の相互変換、選択肢の一覧（lowlowA〜hihiG#）
- `lib/key.ts`: 3章の仕様どおりの `calcKey(profile, song, alignMode): KeyResult`
- テストは 7章の表をすべて書く
- **完了の条件**: テストがすべて通る（画面はまだ作らない）

### ② 自分の音域の登録（A）
- `NoteSelect`: 音名のドロップダウン（「mid2G（G4）」のように表示する）
- `VoicePage`: 最低音・最高音（必須）、楽に出せる音域（任意）
- 入力チェック: 最低音 < 最高音、楽に出せる音域は限界の音域の内側
- `storage.ts` で保存し、再読み込みしても残るようにする
- **完了の条件**: 入力 → 再読み込み → 値が残っている

### ③ 曲の登録・一覧（B）
- `SongForm`: 曲名・アーティスト・最低音・最高音。登録と編集で共用する
- `SongList`: 各曲に **おすすめキー** を表示する。削除・検索（曲名とアーティスト）・並べ替えができる
- 音域が未登録のときは、登録を促すメッセージを出す
- **完了の条件**: 曲を3曲登録し、それぞれ正しいおすすめキーが出る

### ④ 判定ラベルと音域の図（C） → ここで MVP 完成
- 判定ラベル: 原曲キーで歌える／キー調整で歌える／オクターブ下推奨／音域が足りない（色分けする）
- `RangeBar`: 横棒の図で「自分の音域」「原曲の音域」「ずらした後の音域」を重ねて表示する
- オクターブ下推奨のときは「1オクターブ下で歌い、キーは +3」のように書いて表示する
- 設定で合わせ方（high／center）を切り替えられるようにする
- スマホの画面幅（360px程度）で見やすく表示できることを確認する
- **完了の条件**: スマホで一通り操作できる → **実際にカラオケで1回使ってみる**

### ⑤ 試聴機能と歌った記録（A・D）
- 試聴: `NoteSelect` の横に ▶ ボタン。Web Audio API の OscillatorNode で約1秒鳴らす
- 記録: 曲ごとに「歌ったキー＋楽／ちょうどいい／きつい」を保存する
- 補正: 直近の記録が「きつい」なら -1、「楽」なら +1 を提案する（最初は単純なルールにする）
- **完了の条件**: 記録が残り、次に開いたときに補正したキーが提案される

### ⑥ CSVの取り込み・書き出し、曲データの追加（F）
- CSVの形式: `title,artist,low,high`（音名は日本式・国際表記のどちらでも読み込める）
- 取り込むときに、読めなかった行を一覧で表示する
- 主な曲のデータは、自分で調べた値を CSV で用意する（音域まとめサイトから自動で取ってこない）
- **完了の条件**: 書き出した CSV をそのまま取り込み直すと、元と同じデータになる

### ⑦ その他（G）— 使いながら必要なものだけ
- 女性曲フラグ（オクターブ下で歌う前提で計算する）
- 複数プロフィール（友達の分）
- PWA対応（ホーム画面に追加、オフラインで使える）

### ⑧ マイクで音域を測る（E）
- `getUserMedia` でマイクの音を取り、自己相関法などで声の高さを検出する
- 雑音対策: 音量がしきい値より小さい部分を無視する／一定時間（例: 0.5秒）続いた音だけを採用する
- 検出した最低音・最高音を、確認したうえで音域に登録する
- **完了の条件**: 鍵盤アプリなどで鳴らした音を ±1半音以内で検出できる

---

## 7. テストケース（① で作る）

自分の音域を lowG(43)〜mid2G(67) として計算する（合わせ方は high）。

| # | 曲の音域 | 期待される結果 |
|---|---|---|
| 1 | mid1C(48)〜hiB(71) | shift -4、キー -4、キー調整で歌える |
| 2 | mid1C(48)〜mid2E(64) | shift 0、原曲キーで歌える |
| 3 | mid1G(55)〜hiE(76) | shift -9、オクターブ下推奨、キー +3 |
| 4 | lowF(41)〜hiC(72) | 音域が足りない。shift -5、出せない低音が 7半音 |
| 5 | mid1D(50)〜hiA#(70)、合わせ方 center | shift -5 |
| 6 | mid1D(50)〜hiB(71)、楽に出せる最高音を mid2F(65) にした場合 | shift -6（楽な音域を使う） |

音名の変換:
- `hiA → 69`、`mid2C → 60`、`lowG → 43`、`C4 → 60`、`69 → hiA`
- 不正な文字列（例: `midX`）はエラーにする

---

## 8. 全体の確認方法
- `npm test`: 計算と変換のテストがすべて通る
- `npm run dev` で起動し、ブラウザで次の操作を通して確認する
  音域を入力 → 曲を登録 → おすすめキー・判定・図が出る → 再読み込みしても残っている
- スマホでの確認: 同じWi-Fiにつないだスマホから `npm run dev -- --host` で表示されるURLを開く
- ④ が終わったら、実際にカラオケで使って計算どおりに歌えるかを確かめ、⑤以降の優先順位を見直す
