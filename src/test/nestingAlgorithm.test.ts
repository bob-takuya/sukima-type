import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NestingAlgorithm } from '../nestingAlgorithm.js';
import { Character, FontMetrics } from '../types.js';

// テスト用のSVGPathAnalyzerモック
vi.mock('../svgPathAnalyzer.js', () => ({
  SVGPathAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeCharacterShape: vi.fn(() => ({
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      pathCommands: [],
      polygonApproximation: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ],
      area: 10000,
      centroid: { x: 50, y: 50 }
    })),
    checkPathCollision: vi.fn(() => false)
  }))
}));

describe('NestingAlgorithm', () => {
  let algorithm: NestingAlgorithm;
  let fontMetrics: FontMetrics;
  const viewportWidth = 1000;
  const viewportHeight = 800;

  beforeEach(() => {
    fontMetrics = {
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200
    };
    
    algorithm = new NestingAlgorithm(viewportWidth, viewportHeight, fontMetrics);
  });

  describe('最初の文字の配置', () => {
    it('画面中央に大きなサイズで配置される', async () => {
      const result = await algorithm.calculateOptimalPlacement([], 'A');
      
      expect(result.x).toBe(viewportWidth / 2);
      expect(result.y).toBe(viewportHeight / 2);
      expect(result.rotation).toBe(0);
      expect(result.scale).toBeGreaterThan(500); // 大きなサイズ
      expect(result.score).toBe(1.0);
    });

    it('異なる画面サイズでも適切にスケールされる', async () => {
      const smallAlgorithm = new NestingAlgorithm(400, 300, fontMetrics);
      const largeAlgorithm = new NestingAlgorithm(2000, 1500, fontMetrics);
      
      const smallResult = await smallAlgorithm.calculateOptimalPlacement([], 'A');
      const largeResult = await largeAlgorithm.calculateOptimalPlacement([], 'A');
      
      expect(smallResult.scale).toBeLessThan(largeResult.scale);
    });
  });

  describe('2文字目以降の配置', () => {
    let existingCharacter: Character;

    beforeEach(() => {
      existingCharacter = {
        id: 'char-1',
        char: 'A',
        x: viewportWidth / 2,
        y: viewportHeight / 2,
        rotation: 0,
        scale: 400,
        isComposing: false
      };
    });

    it('既存の文字と重ならない位置に配置される', async () => {
      const result = await algorithm.calculateOptimalPlacement([existingCharacter], 'B');
      
      expect(result.x).toBeDefined();
      expect(result.y).toBeDefined();
      expect(result.scale).toBeGreaterThan(0);
      
      // 画面内に配置されているかチェック
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(viewportWidth);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(viewportHeight);
    });

    it('最小スケールが保証される', () => {
      // 画面を既存文字で埋め尽くす
      const manyCharacters: Character[] = [];
      for (let i = 0; i < 20; i++) {
        manyCharacters.push({
          id: `char-${i}`,
          char: 'X',
          x: Math.random() * viewportWidth,
          y: Math.random() * viewportHeight,
          rotation: 0,
          scale: 100,
          isComposing: false
        });
      }
      
      const result = algorithm.calculateOptimalPlacement(manyCharacters, 'B');
      
      expect(result.scale).toBeGreaterThanOrEqual(15); // 最小スケール
    });

    it('回転が適用される場合がある', () => {
      const results: number[] = [];
      
      // 複数回実行して回転のバリエーションをチェック
      for (let i = 0; i < 10; i++) {
        const result = algorithm.calculateOptimalPlacement([existingCharacter], 'B');
        results.push(result.rotation);
      }
      
      // 少なくとも一度は0以外の回転が適用されることを期待
      const hasNonZeroRotation = results.some(rotation => rotation !== 0);
      expect(hasNonZeroRotation).toBe(true);
    });

    it('複数の配置戦略が使用される', () => {
      const results: { x: number; y: number }[] = [];
      
      // 複数回実行して位置のバリエーションをチェック
      for (let i = 0; i < 20; i++) {
        const result = algorithm.calculateOptimalPlacement([existingCharacter], 'B');
        results.push({ x: result.x, y: result.y });
      }
      
      // 位置にバリエーションがあることを確認
      const uniquePositions = new Set(results.map(pos => `${pos.x},${pos.y}`));
      expect(uniquePositions.size).toBeGreaterThan(1);
    });
  });

  describe('文字の寸法計算', () => {
    it('フォントメトリクスに基づいて正確な寸法が計算される', () => {
      // プライベートメソッドをテストするためにany型でキャスト
      const algorithmAny = algorithm as any;
      
      const scale = 100;
      const dimensions = algorithmAny.getCharacterDimensions(scale);
      
      expect(dimensions.width).toBeDefined();
      expect(dimensions.height).toBeDefined();
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      
      // スケールに比例して寸法が変化することを確認
      const largeDimensions = algorithmAny.getCharacterDimensions(scale * 2);
      expect(largeDimensions.width).toBeGreaterThan(dimensions.width);
      expect(largeDimensions.height).toBeGreaterThan(dimensions.height);
    });
  });

  describe('衝突判定', () => {
    it('重なっている文字が正しく検出される', () => {
      const char1 = {
        x: 100,
        y: 100,
        scale: 50,
        rotation: 0
      };
      
      const char2 = {
        x: 110, // 近い位置
        y: 110,
        scale: 50,
        rotation: 0
      };
      
      const char3 = {
        x: 300, // 遠い位置
        y: 300,
        scale: 50,
        rotation: 0
      };
      
      const algorithmAny = algorithm as any;
      
      expect(algorithmAny.charactersOverlap(char1, char2)).toBe(true);
      expect(algorithmAny.charactersOverlap(char1, char3)).toBe(false);
    });

    it('画面境界外の配置が正しく検出される', () => {
      const algorithmAny = algorithm as any;
      
      // 画面外の位置
      const outsidePositions = [
        { x: -50, y: 100 }, // 左外
        { x: viewportWidth + 50, y: 100 }, // 右外
        { x: 100, y: -50 }, // 上外
        { x: 100, y: viewportHeight + 50 } // 下外
      ];
      
      outsidePositions.forEach(pos => {
        const hasCollision = algorithmAny.checkCollision(
          [],
          'A',
          pos.x,
          pos.y,
          0,
          100
        );
        expect(hasCollision).toBe(true);
      });
      
      // 画面内の位置
      const insideCollision = algorithmAny.checkCollision(
        [],
        'A',
        viewportWidth / 2,
        viewportHeight / 2,
        0,
        100
      );
      expect(insideCollision).toBe(false);
    });
  });

  describe('全文字再配置', () => {
    it('確定文字は位置が保持される', async () => {
      const confirmedChar: Character = {
        id: 'confirmed-1',
        char: 'A',
        x: 100,
        y: 100,
        rotation: 0,
        scale: 50,
        isComposing: false
      };
      
      const composingChar: Character = {
        id: 'composing-1',
        char: 'か',
        x: 200,
        y: 200,
        rotation: 0,
        scale: 30,
        isComposing: true
      };
      
      const result = await algorithm.recalculateAllPlacements([confirmedChar, composingChar]);
      
      // 確定文字は元の位置を保持
      const resultConfirmed = result.find(c => c.id === 'confirmed-1');
      expect(resultConfirmed?.x).toBe(100);
      expect(resultConfirmed?.y).toBe(100);
      expect(resultConfirmed?.isComposing).toBe(false);
      
      // 変換中文字は再配置される可能性がある
      const resultComposing = result.find(c => c.id === 'composing-1');
      expect(resultComposing?.isComposing).toBe(true);
    });

    it('空の配列を処理しても問題ない', async () => {
      const result = await algorithm.recalculateAllPlacements([]);
      expect(result).toEqual([]);
    });
  });
});
