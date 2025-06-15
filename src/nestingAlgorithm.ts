import { Character, PlacementResult, FontMetrics, ShapeAnalysis } from './types.js';
import { SVGPathAnalyzer } from './svgPathAnalyzer.js';
import { SVGNestGeometry } from './svgNestGeometry.js';

export class NestingAlgorithm {
  private viewportWidth: number;
  private viewportHeight: number;
  private fontMetrics: FontMetrics;
  private pathAnalyzer: SVGPathAnalyzer;
  private characterShapeCache: Map<string, ShapeAnalysis> = new Map();

  constructor(viewportWidth: number, viewportHeight: number, fontMetrics: FontMetrics) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.fontMetrics = fontMetrics;
    this.pathAnalyzer = new SVGPathAnalyzer();
  }

  /**
   * Get font-aware character dimensions
   */
  private getCharacterDimensions(scale: number): { width: number; height: number } {
    // フォントメトリクスを使用してより正確な寸法を計算
    const height = (scale * (this.fontMetrics.ascender - this.fontMetrics.descender)) / this.fontMetrics.unitsPerEm;
    
    // 文字によって幅が異なるが、平均的な幅比率を使用
    // 日本語文字（漢字・ひらがな・カタカナ）は通常正方形に近い
    // 英数字は幅が狭い
    const width = scale * 0.7; // より実際的な幅比率
    
    return { width, height };
  }

  /**
   * 新しい文字の最適な配置を計算する - SVGNest手法使用
   */
  calculateOptimalPlacement(
    existingCharacters: Character[],
    newChar: string
  ): PlacementResult {
    console.log(`🎯 calculateOptimalPlacement called for "${newChar}"`);
    console.log(`📊 Existing characters: ${existingCharacters.length}`);
    console.log(`📐 Viewport: ${this.viewportWidth} x ${this.viewportHeight}`);
    
    // 最初の文字の場合は画面中央に最大サイズで配置
    if (existingCharacters.length === 0) {
      console.log('🎯 First character detected, placing at center');
      return this.placeFirstCharacter(newChar);
    }

    // 既存の文字との衝突を避けて最大サイズで配置
    console.log('🎯 Finding best placement for subsequent character');
    const result = this.findBestPlacement(existingCharacters, newChar);
    console.log('🎯 calculateOptimalPlacement result:', result);
    return result;
  }

  /**
   * 最初の文字を画面全体に最大化して配置
   */
  private placeFirstCharacter(_char: string): PlacementResult {
    // 画面の80%を使用して最初の文字を配置
    const baseScale = Math.min(this.viewportWidth, this.viewportHeight) * 0.8;
    
    console.log(`📐 First character placement: scale=${baseScale}, viewport=${this.viewportWidth}x${this.viewportHeight}`);
    
    return {
      x: this.viewportWidth / 2,
      y: this.viewportHeight / 2,
      rotation: 0,
      scale: baseScale,
      score: 1.0
    };
  }

  /**
   * 既存の文字を避けて新しい文字の最適な配置を見つける
   */
  private findBestPlacement(
    existingCharacters: Character[],
    newChar: string
  ): PlacementResult {
    console.log('🔍 findBestPlacement starting...');
    
    let bestPlacement: PlacementResult = {
      x: this.viewportWidth / 2,
      y: this.viewportHeight / 2,
      rotation: 0,
      scale: 10,
      score: 0
    };

    // Simplified single-phase search for debugging
    const attempts = 200;
    const rotationSteps = 8;
    
    console.log(`🎲 Testing ${attempts} random positions with ${rotationSteps} rotation steps each`);

    for (let i = 0; i < attempts; i++) {
      const x = Math.random() * this.viewportWidth;
      const y = Math.random() * this.viewportHeight;
      
      for (let r = 0; r < rotationSteps; r++) {
        const rotation = (r * 360) / rotationSteps;
        
        const maxScale = this.calculateMaxScale(
          existingCharacters,
          newChar,
          x,
          y,
          rotation
        );

        if (maxScale > bestPlacement.scale) {
          bestPlacement = {
            x,
            y,
            rotation,
            scale: maxScale,
            score: maxScale
          };
          console.log(`🎯 New best placement found: scale=${maxScale.toFixed(1)} at (${x.toFixed(1)}, ${y.toFixed(1)}) rot=${rotation}°`);
        }
      }
    }

    // Ensure minimum scale
    if (bestPlacement.scale < 15) {
      console.log(`⚠️ Scale too small (${bestPlacement.scale}), setting to minimum 15`);
      bestPlacement.scale = 15;
    }

    console.log(`📐 Final placement: scale=${bestPlacement.scale.toFixed(1)}, pos=(${bestPlacement.x.toFixed(1)}, ${bestPlacement.y.toFixed(1)}), rot=${bestPlacement.rotation.toFixed(1)}°`);

    return bestPlacement;
  }

  /**
   * グリッド位置を生成
   */
  private generateGridPositions(gridSize: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const stepX = this.viewportWidth / gridSize;
    const stepY = this.viewportHeight / gridSize;
    
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        positions.push({
          x: i * stepX,
          y: j * stepY
        });
      }
    }
    
    return positions;
  }

  /**
   * 指定された位置・回転での最大可能スケールを計算
   */
  private calculateMaxScale(
    existingCharacters: Character[],
    _newChar: string,
    x: number,
    y: number,
    rotation: number
  ): number {
    const maxPossibleScale = Math.min(this.viewportWidth, this.viewportHeight) * 0.8; // Reduced from 0.9
    let maxScale = 0;

    // バイナリサーチで最大スケールを見つける
    let low = 10; // Increased minimum from 5
    let high = maxPossibleScale;
    let iterations = 0;

    // console.log(`🔍 Binary search for scale at pos=(${x.toFixed(1)}, ${y.toFixed(1)}), rot=${rotation.toFixed(1)}°`);

    for (let i = 0; i < 15; i++) { // Reduced iterations from 20 to 15
      iterations++;
      const mid = (low + high) / 2;
      
      const hasCollision = this.checkCollision(existingCharacters, _newChar, x, y, rotation, mid);
      
      if (hasCollision) {
        high = mid;
        // console.log(`  ❌ Scale ${mid.toFixed(1)} has collision, reducing max to ${high.toFixed(1)}`);
      } else {
        low = mid;
        maxScale = mid;
        // console.log(`  ✅ Scale ${mid.toFixed(1)} OK, increasing min to ${low.toFixed(1)}`);
      }
      
      if (high - low < 2) break; // Increased threshold from 1 to 2
    }

    // console.log(`🎯 Final max scale: ${maxScale.toFixed(1)} (${iterations} iterations)`);
    return maxScale;
  }

  /**
   * 文字の衝突判定 - SVGNest手法による正確な判定
   */
  private checkCollision(
    existingCharacters: Character[],
    newChar: string,
    x: number,
    y: number,
    rotation: number,
    scale: number
  ): boolean {
    // 画面境界チェック（回転を考慮）
    const charDimensions = this.getCharacterDimensions(scale);
    const charWidth = charDimensions.width;
    const charHeight = charDimensions.height;

    // 回転を考慮した境界ボックス計算
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const rotatedWidth = charWidth * cos + charHeight * sin;
    const rotatedHeight = charWidth * sin + charHeight * cos;

    const margin = 20; // 境界から余裕を持たせる
    if (x - rotatedWidth/2 < margin || x + rotatedWidth/2 > this.viewportWidth - margin ||
        y - rotatedHeight/2 < margin || y + rotatedHeight/2 > this.viewportHeight - margin) {
      return true;
    }

    // 新しい文字の形状を解析（キャッシュから取得またはキャッシュに保存）
    let newCharShape = this.characterShapeCache.get(newChar);
    if (!newCharShape) {
      newCharShape = this.pathAnalyzer.analyzeCharacterShape(newChar, 100); // 基準サイズで解析
      if (newCharShape) {
        this.characterShapeCache.set(newChar, newCharShape);
      }
    }

    const newCharTransform = { x, y, rotation, scale: scale / 100 }; // スケール調整

    // 既存の文字との衝突チェック（SVGNest手法）
    for (const existingChar of existingCharacters) {
      let existingCharShape = this.characterShapeCache.get(existingChar.char);
      if (!existingCharShape) {
        existingCharShape = this.pathAnalyzer.analyzeCharacterShape(existingChar.char, 100);
        if (existingCharShape) {
          this.characterShapeCache.set(existingChar.char, existingCharShape);
        }
      }

      const existingCharTransform = {
        x: existingChar.x,
        y: existingChar.y,
        rotation: existingChar.rotation,
        scale: existingChar.scale / 100
      };

      // SVGNestアルゴリズムによる正確な衝突検出
      if (newCharShape && existingCharShape && this.pathAnalyzer.checkPathCollision(
        newCharShape,
        newCharTransform,
        existingCharShape,
        existingCharTransform,
        5 // マージン
      )) {
        return true;
      }
    }

    return false;
  }

  /**
   * 2つの文字が重なっているかチェック
   */
  private charactersOverlap(
    char1: { x: number; y: number; scale: number; rotation: number },
    char2: { x: number; y: number; scale: number; rotation: number }
  ): boolean {
    const char1Dims = this.getCharacterDimensions(char1.scale);
    const char2Dims = this.getCharacterDimensions(char2.scale);
    
    // 距離による判定
    const dx = char1.x - char2.x;
    const dy = char1.y - char2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 回転を考慮した効果的半径の計算
    const char1Radius = this.getEffectiveRadius(char1Dims, char1.rotation);
    const char2Radius = this.getEffectiveRadius(char2Dims, char2.rotation);
    
    // 適切な間隔を保つために係数を調整
    const separationFactor = 0.9; // 文字間の最小間隔を制御
    
    return distance < (char1Radius + char2Radius) * separationFactor;
  }

  /**
   * 回転を考慮した文字の効果的半径を計算
   */
  private getEffectiveRadius(
    dimensions: { width: number; height: number }, 
    rotation: number
  ): number {
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    
    // 回転後の境界ボックスから半径を計算
    const rotatedWidth = dimensions.width * cos + dimensions.height * sin;
    const rotatedHeight = dimensions.width * sin + dimensions.height * cos;
    
    return Math.max(rotatedWidth, rotatedHeight) * 0.5;
  }

  /**
   * 全文字の再配置（IME変換時などに使用）
   */
  recalculateAllPlacements(characters: Character[]): Character[] {
    if (characters.length === 0) return [];

    const result: Character[] = [];
    
    // 確定文字（白）を先に処理
    const confirmedChars = characters.filter(c => !c.isComposing);
    const composingChars = characters.filter(c => c.isComposing);

    console.log(`🔄 Recalculating placements: ${confirmedChars.length} confirmed, ${composingChars.length} composing`);

    // 確定文字はそのまま保持
    result.push(...confirmedChars);

    // 作成中の文字を順次最適配置
    for (const char of composingChars) {
      console.log(`📍 Recalculating placement for composing char: ${char.char}`);
      const placement = this.calculateOptimalPlacement(result, char.char);
      const updatedChar = {
        ...char,
        x: placement.x,
        y: placement.y,
        rotation: placement.rotation,
        scale: placement.scale
      };
      result.push(updatedChar);
      console.log(`✅ Composing char placed:`, updatedChar);
    }

    return result;
  }
}
