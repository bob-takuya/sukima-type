/**
 * SVG Path Analyzer for accurate shape boundary detection
 * Uses SVGNest algorithms for precise polygon-based collision detection
 * Now optimized with Convex Hull preprocessing for faster calculations
 */
import { Point, PathCommand, BoundingBox, ShapeAnalysis } from './types.js';
import { SVGNestGeometry } from './svgNestGeometry.js';
import { ConvexHull } from './convexHull.js';

export class SVGPathAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    // オフスクリーンキャンバスを作成してパス計算に使用
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1000;
    this.canvas.height = 1000;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * 文字からSVGパスを取得してアウトラインを解析
   * 凸包変換により計算時間を大幅短縮
   */
  analyzeCharacterShape(
    char: string, 
    fontSize: number = 100, 
    fontFamily: string = 'serif'
  ): ShapeAnalysis {
    console.log(`🔍 Analyzing shape for character: "${char}"`);
    
    // フォントを設定
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'start';
    this.ctx.textBaseline = 'alphabetic';

    // テキストメトリクスを取得
    const metrics = this.ctx.measureText(char);
    const textWidth = metrics.width;
    const textHeight = fontSize; // 近似値

    console.log(`📏 Text metrics: ${textWidth} x ${textHeight}`);

    // アウトライン抽出
    const outline = this.extractTextOutline(char, fontSize, fontFamily);
    
    // 凸包変換で形状を単純化（計算時間短縮のため）
    console.log(`🔄 Converting to convex hull: ${outline.polygonApproximation.length} → optimized points`);
    const convexHull = ConvexHull.calculateConvexHull(outline.polygonApproximation);
    console.log(`✅ Convex hull created with ${convexHull.length} points`);
    
    // 凸包用のパスコマンド生成
    const pathCommands = this.generatePathCommands(convexHull);
    
    return {
      boundingBox: {
        x: 0,
        y: -textHeight * 0.8, // ベースライン調整
        width: textWidth,
        height: textHeight
      },
      pathCommands: pathCommands,
      polygonApproximation: convexHull, // 凸包を使用
      area: this.calculatePolygonArea(convexHull),
      centroid: this.calculateCentroid(convexHull)
    };
  }

  /**
   * テキストのアウトラインを抽出
   */
  private extractTextOutline(
    char: string, 
    fontSize: number, 
    fontFamily: string
  ): {
    pathCommands: PathCommand[];
    polygonApproximation: Point[];
    area: number;
    centroid: Point;
  } {
    // キャンバスをクリア
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // フォントを設定
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = 'black';
    
    // 文字を描画
    const x = 50;
    const y = 200;
    this.ctx.fillText(char, x, y);
    
    // ピクセルデータを取得してエッジを検出
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const polygonApproximation = this.edgeDetection(imageData);
    
    // 簡易的なパスコマンド生成
    const pathCommands = this.generatePathCommands(polygonApproximation);
    
    // 面積と重心を計算
    const area = this.calculatePolygonArea(polygonApproximation);
    const centroid = this.calculateCentroid(polygonApproximation);
    
    console.log(`📐 Extracted outline: ${polygonApproximation.length} points, area: ${area.toFixed(2)}`);
    
    return {
      pathCommands,
      polygonApproximation,
      area,
      centroid
    };
  }

  /**
   * エッジ検出によるアウトライン抽出
   */
  private edgeDetection(imageData: ImageData): Point[] {
    const { data, width, height } = imageData;
    const edges: Point[] = [];
    
    // 簡易的なエッジ検出（文字の境界を検出）
    for (let y = 1; y < height - 1; y += 4) { // サンプリング間隔を調整
      for (let x = 1; x < width - 1; x += 4) {
        const idx = (y * width + x) * 4;
        const current = data[idx + 3]; // アルファ値
        
        // 周囲のピクセルをチェック
        const neighbors = [
          data[((y-1) * width + x) * 4 + 3],     // 上
          data[((y+1) * width + x) * 4 + 3],     // 下
          data[(y * width + (x-1)) * 4 + 3],     // 左
          data[(y * width + (x+1)) * 4 + 3],     // 右
        ];
        
        // エッジ検出：現在のピクセルが文字の一部で、隣接ピクセルに背景がある場合
        if (current > 128) { // 文字の一部
          const hasBackground = neighbors.some(n => n < 128);
          if (hasBackground) {
            edges.push({ x, y });
          }
        }
      }
    }
    
    console.log(`🔍 Edge detection found ${edges.length} edge points`);
    
    // エッジポイントを整理して輪郭を作成
    return this.organizeEdgePoints(edges);
  }

  /**
   * エッジポイントを整理して輪郭線を作成
   */
  private organizeEdgePoints(edges: Point[]): Point[] {
    if (edges.length === 0) return [];
    
    // 簡易的な輪郭線作成：y座標でソートして最も外側の点を取得
    const sortedByY = edges.sort((a, b) => a.y - b.y);
    const organized: Point[] = [];
    
    // 上部の輪郭
    const topY = sortedByY[0].y;
    const topPoints = edges.filter(p => Math.abs(p.y - topY) < 10).sort((a, b) => a.x - b.x);
    organized.push(...topPoints);
    
    // 右側の輪郭
    const rightX = Math.max(...edges.map(p => p.x));
    const rightPoints = edges.filter(p => Math.abs(p.x - rightX) < 10).sort((a, b) => a.y - b.y);
    organized.push(...rightPoints);
    
    // 下部の輪郭
    const bottomY = sortedByY[sortedByY.length - 1].y;
    const bottomPoints = edges.filter(p => Math.abs(p.y - bottomY) < 10).sort((a, b) => b.x - a.x);
    organized.push(...bottomPoints);
    
    // 左側の輪郭
    const leftX = Math.min(...edges.map(p => p.x));
    const leftPoints = edges.filter(p => Math.abs(p.x - leftX) < 10).sort((a, b) => b.y - a.y);
    organized.push(...leftPoints);
    
    return organized;
  }

  /**
   * ポリゴンポイントからSVGパスコマンドを生成
   */
  private generatePathCommands(points: Point[]): PathCommand[] {
    if (points.length === 0) return [];
    
    const commands: PathCommand[] = [];
    
    // 最初の点に移動
    commands.push({
      type: 'M',
      points: [points[0].x, points[0].y]
    });
    
    // 残りの点に線を引く
    for (let i = 1; i < points.length; i++) {
      commands.push({
        type: 'L',
        points: [points[i].x, points[i].y]
      });
    }
    
    // パスを閉じる
    commands.push({
      type: 'Z',
      points: []
    });
    
    return commands;
  }

  /**
   * ポリゴンの面積を計算
   */
  private calculatePolygonArea(points: Point[]): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * ポリゴンの重心を計算
   */
  private calculateCentroid(points: Point[]): Point {
    if (points.length === 0) return { x: 0, y: 0 };
    
    const centroid = points.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y
      }),
      { x: 0, y: 0 }
    );
    
    return {
      x: centroid.x / points.length,
      y: centroid.y / points.length
    };
  }

  /**
   * パス同士の衝突検出 - SVGNest手法による正確な判定
   * 凸包により高速化済み
   */
  checkPathCollision(
    shape1: ShapeAnalysis,
    transform1: { x: number; y: number; rotation: number; scale: number },
    shape2: ShapeAnalysis,
    transform2: { x: number; y: number; rotation: number; scale: number },
    margin: number = 2
  ): boolean {
    console.log(`🔍 Checking collision between convex hulls using SVGNest algorithms`);
    
    // SVGNestのアルゴリズムを使用した正確なポリゴン衝突検出（凸包版）
    const collision = SVGNestGeometry.checkPolygonCollision(
      shape1.polygonApproximation, // 既に凸包に変換済み
      transform1,
      shape2.polygonApproximation, // 既に凸包に変換済み
      transform2,
      margin
    );
    
    console.log(`🎯 Convex hull collision result: ${collision ? 'COLLISION' : 'NO COLLISION'}`);
    return collision;
  }
}
