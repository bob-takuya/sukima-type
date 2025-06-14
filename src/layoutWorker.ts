import { LayoutCalculationMessage, LayoutResultMessage } from './types.js';
import { NestingAlgorithm } from './nestingAlgorithm.js';

let nestingAlgorithm: NestingAlgorithm | null = null;

self.onmessage = function(e: MessageEvent<LayoutCalculationMessage>) {
  console.log('🔧 Worker received message:', e.data);
  
  const { type, characterId, characters, newChar, viewportWidth, viewportHeight, fontMetrics } = e.data;
  
  if (type === 'calculate') {
    console.log('⚙️ Starting calculation for:', newChar, 'with', characters.length, 'existing characters');
    console.log('📐 Viewport:', { width: viewportWidth, height: viewportHeight });
    console.log('🎯 Character ID:', characterId);
    console.log('📊 Existing characters details:', characters.map(c => ({
      id: c.id,
      char: c.char,
      x: c.x,
      y: c.y,
      scale: c.scale,
      rotation: c.rotation,
      isComposing: c.isComposing
    })));
    
    // アルゴリズムインスタンスを初期化（必要に応じて）
    if (!nestingAlgorithm || 
        nestingAlgorithm['viewportWidth'] !== viewportWidth || 
        nestingAlgorithm['viewportHeight'] !== viewportHeight) {
      console.log('🔄 Creating new algorithm instance');
      nestingAlgorithm = new NestingAlgorithm(viewportWidth, viewportHeight, fontMetrics);
    }

    try {
      // 最適配置を計算
      const startTime = performance.now();
      const placement = nestingAlgorithm.calculateOptimalPlacement(characters, newChar);
      const endTime = performance.now();
      
      console.log('✅ Calculation completed in', (endTime - startTime).toFixed(2), 'ms');
      console.log('📍 Placement result:', placement);
      console.log('📊 Scale achieved:', placement.scale, '/ Max possible:', Math.min(viewportWidth, viewportHeight) * 0.9);
      
      // 結果を送信
      const result: LayoutResultMessage = {
        type: 'result',
        characterId,
        placement,
        characters
      };
      
      self.postMessage(result);
    } catch (error) {
      console.error('💥 Layout calculation error:', error);
      
      // エラー時のフォールバック配置
      const fallbackPlacement = {
        x: viewportWidth / 2,
        y: viewportHeight / 2,
        rotation: Math.random() * 360,
        scale: Math.min(100, Math.min(viewportWidth, viewportHeight) * 0.2), // Increased fallback scale
        score: 0
      };
      
      console.log('🔄 Using fallback placement:', fallbackPlacement);
      
      const result: LayoutResultMessage = {
        type: 'result',
        characterId,
        placement: fallbackPlacement,
        characters
      };
      
      self.postMessage(result);
    }
  }
};
