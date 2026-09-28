# Typographic Nesting Generator（すきまタイプ）

タイプした文字を、すでに置かれた文字の「すきま」に回転・拡大縮小して詰め込み、画面を文字で埋めていくインタラクティブなタイポグラフィ作品。

*An interactive piece that fills the screen with typed characters, each rotated and scaled to fit into the gaps between existing ones (a course project, June 2025).*

## Status

**授業課題として作った動くプロトタイプ（2025年6月で完了、以降は更新なし）。** 基本的な体験は動きます。ただし、配置アルゴリズムは文字の形を円で近似したものです。

✅ **動くもの**
- キー入力した文字をSVGで描画する。1文字目は画面中央に大きく置く
- 2文字目以降：200箇所のランダム候補 × 8方向の回転を試し、二分探索で入る最大サイズを求めて配置する
- 日本語入力（IME）に対応。変換中は灰色、確定すると白で表示
- `Esc` で全消去
- `npm run build` は成功する（2026年9月に確認）

🚧 **部分的**
- 衝突判定は、文字を回転を考慮した円で近似している。グリフの実際の輪郭は使っていないので、「すきま」への詰め込みは大まかになる
- 輪郭ベースの判定を試した版は `svg-collision-detection` ブランチにある（精度は上がるが動作が遅く、main には入れていない）

📝 **未実装 / 使われていないもの**
- Web Worker によるレイアウト計算（`layoutWorker.ts` はあるが、`main.ts` 側では無効化されている）
- `opentype.js` は依存に入っているが、グリフ輪郭の取得には使っていない
- 作品の保存・書き出し機能

⚠️ **既知の問題**
- テスト（Vitest）は通らない：60件中50件が失敗（主にテスト環境 happy-dom 側のセットアップの問題）
- `node_modules/` がリポジトリにコミットされている
- デバッグ用の HTML（`debug*.html`, `*-test.html`）とコンソールログが残っている

## Demo

https://bob-takuya.github.io/sukima-type/

（GitHub Actions でデプロイ。今回の見直しでは、ページが表示されるかは確認していません。）

## Background

大学の造形の授業（2025年6月）の課題として制作しました。

## Usage / Development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # dist/ に出力（本番は base: /sukima-type/）
```

1. キーボードで文字を入力すると、1文字目は画面中央に大きく表示されます
2. 2文字目以降は、既存の文字のすきまに自動で配置されます
3. `Esc` ですべて消去します

主なファイル：`src/main.ts`（アプリ本体）、`src/nestingAlgorithm.ts`（配置・衝突判定）、`src/typographicRenderer.ts`（SVG描画）、`src/inputManager.ts`（キー入力・IME）
