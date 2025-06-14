# Typographic Nesting Art Generator

ユーザーがタイピングした文字を、既存の文字の隙間にリアルタイムで最適に配置（回転・拡大縮小）し、画面をタイポグラフィで埋め尽くすインタラクティブなアート作品。

![Demo](https://via.placeholder.com/800x400/000000/FFFFFF?text=Typographic+Nesting+Art)

## 🎨 機能

- **リアルタイム文字配置**: 入力された文字が既存の文字の隙間に自動的に最適配置される
- **IME 完全対応**: 日本語入力（変換中・確定）にリアルタイムで対応
- **高性能計算**: Web Worker を使用して UI をブロックしない高速計算
- **美しいアニメーション**: スムーズな文字の出現・移動・回転アニメーション
- **適応型アルゴリズム**: 複数の配置戦略による最適化
- **パフォーマンス監視**: リアルタイムでの処理状況表示

## 🚀 クイックスタート

```bash
# プロジェクトをクローン
git clone [repository-url]
cd sukima_type

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:3000` を開いて使用開始！

## 📖 使用方法

### 基本的な使い方

1. **基本入力**: キーボードで文字を入力すると、最初の文字は画面全体に表示されます
2. **続けて入力**: 2 文字目以降は既存文字の隙間に自動配置されます
3. **日本語入力**:
   - 変換中の文字は灰色で表示
   - 変換確定すると白色に変化
   - 変換候補が変わるたびに全体が再配置

### キーボードショートカット

- `ESC` - 現在の入力をキャンセル
- `⌘ + R` (Mac) / `Ctrl + R` (Windows) - 全文字をクリア
- `⌘ + Z` - 元に戻す（将来実装予定）

### デモページ

より多くの機能を試すには `http://localhost:3000/demo.html` を開いてください：

- **デモボタン**: 自動タイピングデモ
- **パフォーマンス表示**: リアルタイムでの処理状況
- **改良された UI**: より洗練されたインターフェース

## 🔧 技術仕様

### アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   InputManager  │───▶│  Main App       │───▶│ Renderer        │
│                 │    │                 │    │                 │
│ ・IME処理        │    │ ・状態管理       │    │ ・SVG描画        │
│ ・キーボード入力  │    │ ・文字管理       │    │ ・アニメーション  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Layout Worker  │
                       │                 │
                       │ ・配置計算       │
                       │ ・衝突判定       │
                       │ ・最適化         │
                       └─────────────────┘
```

### コア・アルゴリズム

#### 1. 適応型配置戦略

- **ランダム配置**: 画面全体からランダムに位置を選択
- **コーナー配置**: 画面の四隅周辺を優先
- **エッジ配置**: 画面の端周辺を優先

#### 2. 衝突判定と最適化

- 円形衝突判定による高速処理
- バイナリサーチによる最大スケール計算
- フォントメトリクスベースの正確な寸法計算

#### 3. パフォーマンス最適化

- Web Worker によるノンブロッキング計算
- 計算量の適応的制御（300-500 イテレーション）
- バッチ更新による効率的な再描画

### 使用技術

| カテゴリ           | 技術         | 用途             |
| ------------------ | ------------ | ---------------- |
| **フロントエンド** | TypeScript   | 型安全な開発     |
| **レンダリング**   | SVG          | ベクトル描画     |
| **ビルド**         | Vite         | 高速開発・ビルド |
| **計算エンジン**   | Web Workers  | 並列処理         |
| **フォント**       | Google Fonts | 高品質フォント   |

### パフォーマンス指標

- **目標レスポンス時間**: 1 文字あたり 500ms 以内
- **メモリ使用量**: 文字数 × 約 1KB
- **CPU 使用率**: Web Worker 使用により最適化済み

## 🎯 詳細仕様書

### 文字配置ロジック

1. **初期文字**:

   ```typescript
   const scale = Math.min(viewportWidth, viewportHeight) * 0.8;
   const position = { x: viewportWidth / 2, y: viewportHeight / 2 };
   ```

2. **後続文字**:

   - 複数の配置戦略を並行実行
   - 各戦略で 300/strategyCount 回のイテレーション
   - 12 段階の回転角度を試行
   - 最大スケールの配置を選択

3. **IME 処理**:
   - `compositionstart` → 変換開始をマーク
   - `compositionupdate` → 文字ごとに個別配置
   - `compositionend` → 確定文字として再配置

### 文字の状態管理

```typescript
interface Character {
  id: string; // ユニークID
  char: string; // 文字
  x;
  y: number; // 位置
  rotation: number; // 回転角度
  scale: number; // 拡大率
  isComposing: boolean; // IME変換中フラグ
}
```

## 🎨 カスタマイズ

### 配色の変更

```css
:root {
  --bg-color: #000000; /* 背景色 */
  --text-confirmed: #ffffff; /* 確定文字 */
  --text-composing: #808080; /* 変換中文字 */
}
```

### アルゴリズムパラメータ

```typescript
// nestingAlgorithm.ts
const iterations = 300; // 計算回数
const rotationSteps = 12; // 回転試行数
const minScale = 15; // 最小文字サイズ
```

## 🚀 パフォーマンス・チューニング

### 推奨設定

```typescript
// 高性能モード
const config = {
  iterations: 200, // 計算量を削減
  rotationSteps: 8, // 回転パターンを削減
  workerTimeout: 300, // ワーカータイムアウト短縮
};

// 高品質モード
const config = {
  iterations: 500, // 計算量を増加
  rotationSteps: 16, // 回転パターンを増加
  collisionPrecision: "high", // 精密な衝突判定
};
```

## 🐛 トラブルシューティング

### よくある問題

1. **文字が重なって表示される**

   - 衝突判定の精度を上げる
   - 最小スケールを調整

2. **入力が遅い**

   - Web Worker が正常に動作しているか確認
   - 計算量パラメータを調整

3. **日本語入力が機能しない**
   - IME イベントハンドラーを確認
   - コンポジション状態の管理を見直し

### デバッグ方法

```typescript
// デバッグモードの有効化
localStorage.setItem("debug", "true");

// パフォーマンス監視
console.time("placement-calculation");
// ... 配置計算 ...
console.timeEnd("placement-calculation");
```

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

## 📚 参考資料

- [SVGnest Algorithm](https://github.com/Jack000/SVGnest)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [IME API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent)
