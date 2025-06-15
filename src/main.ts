import { Character, CompositionState, FontMetrics, LayoutCalculationMessage, LayoutResultMessage } from './types.js';
import { InputManager } from './inputManager.js';
import { TypographicRenderer } from './typographicRenderer.js';
import { NestingAlgorithm } from './nestingAlgorithm.js';

export class TypographicNestingApp {
  private renderer!: TypographicRenderer;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private inputManager!: InputManager; // Required for input handling - used via event listeners
  private layoutWorker!: Worker;
  private nestingAlgorithm!: NestingAlgorithm; // Add synchronous algorithm
  private characters: Map<string, Character>;
  private pendingCalculations: Set<string>;
  private fontMetrics: FontMetrics;
  private isInitialized: boolean = false;

  constructor() {
    this.characters = new Map();
    this.pendingCalculations = new Set();
    this.fontMetrics = {
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200
    };

    // Check for required DOM elements synchronously
    this.validateRequiredElements();
    this.initializeApp();
  }

  private validateRequiredElements(): void {
    const svgElement = document.getElementById('text-canvas');
    if (!svgElement) {
      throw new Error('Canvas element not found');
    }
    
    const inputElement = document.getElementById('input-handler');
    if (!inputElement) {
      throw new Error('Input element not found');
    }
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.initializeComponents();
      await this.loadFonts();
      this.hideLoading();
      this.updateCharacterCount(); // Initialize UI counters
      this.isInitialized = true;
      console.log('Typographic Nesting Art Generator initialized');
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('初期化に失敗しました。ページを再読み込みしてください。');
    }
  }

  private async initializeComponents(): Promise<void> {
    // SVG要素とレンダラーの初期化
    const svgElement = document.getElementById('text-canvas') as SVGSVGElement | null;
    if (!svgElement) {
      throw new Error('Canvas element not found');
    }
    this.renderer = new TypographicRenderer(svgElement);

    // 入力要素とマネージャーの初期化
    const inputElement = document.getElementById('input-handler') as HTMLInputElement | null;
    if (!inputElement) {
      throw new Error('Input element not found');
    }

    this.inputManager = new InputManager(
      inputElement,
      (char: string, isComposing: boolean) => this.handleCharacterInput(char, isComposing),
      () => this.handleCharacterDelete(),
      (state: CompositionState) => this.handleCompositionUpdate(state)
    );

    // TEMPORARILY DISABLE WEB WORKER - use synchronous calculation instead
    console.log('🔧 Using synchronous calculation (worker disabled)...');
    
    // Initialize synchronous algorithm
    this.nestingAlgorithm = new NestingAlgorithm(
      window.innerWidth, 
      window.innerHeight, 
      this.fontMetrics
    );
    
    // Listen for clear all events
    document.addEventListener('clearAll', () => {
      this.clearAll();
    });
    
    console.log('✅ Components initialized successfully');
  }

  private async loadFonts(): Promise<void> {
    try {
      // フォントの読み込み完了を待つ（タイムアウト付き）
      const fontLoadTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Font loading timeout')), 5000)
      );
      
      await Promise.race([
        document.fonts.ready,
        fontLoadTimeout
      ]);
      
      console.log('✅ Fonts loaded successfully');
    } catch (error) {
      console.warn('⚠️ Font loading warning:', error);
      // フォント読み込みに失敗してもアプリケーションは続行
      // システムフォントを使用
    }
  }

  private hideLoading(): void {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    // Show instructions
    const instructionsElement = document.getElementById('instructions');
    if (instructionsElement) {
      instructionsElement.style.opacity = '1';
      // Hide instructions after 5 seconds
      setTimeout(() => {
        if (instructionsElement) {
          instructionsElement.style.opacity = '0.3';
        }
      }, 5000);
    }
  }

  private showError(message: string): void {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.textContent = message;
      loadingElement.style.color = '#ff6b6b';
    }
  }

  private handleCharacterInput(char: string, isComposing: boolean): void {
    console.log('🎯 Character input received:', { 
      char, 
      isComposing, 
      isInitialized: this.isInitialized,
      currentCharCount: this.characters.size,
      pendingCalculations: this.pendingCalculations.size
    });
    
    if (!this.isInitialized) {
      console.log('❌ App not initialized yet');
      return;
    }

    const characterId = isComposing 
      ? `composing-${Date.now()}-${Math.random()}` 
      : `confirmed-${Date.now()}-${Math.random()}`;

    const newCharacter: Character = {
      id: characterId,
      char: char,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      isComposing: isComposing
    };

    console.log('📝 Adding character to map:', newCharacter);
    console.log('📊 Characters before add:', this.characters.size);

    // 文字をマップに追加
    this.characters.set(characterId, newCharacter);
    console.log('📊 Characters after add:', this.characters.size);
    
    // Update character count immediately
    this.updateCharacterCount();
    
    // 最初の文字の場合は画面中央に最大サイズで配置
    if (this.characters.size === 1) {
      const baseScale = Math.min(window.innerWidth, window.innerHeight) * 0.8;
      newCharacter.x = window.innerWidth / 2;
      newCharacter.y = window.innerHeight / 2;
      newCharacter.scale = baseScale;
      newCharacter.rotation = 0;
      this.renderer.addOrUpdateCharacter(newCharacter);
      console.log('🎨 First character rendered at full size:', newCharacter);
    } else {
      // 2文字目以降は最適化アルゴリズムによってのみ配置
      console.log('🧮 Calculating optimal placement for character:', newCharacter.char);
      console.log('🔍 Current characters in map:', Array.from(this.characters.values()).map(c => ({char: c.char, x: c.x, y: c.y, scale: c.scale})));
      
      // 最適化が完了するまで、この文字はレンダリングしない
      // calculateLayoutの結果でのみレンダリングされる
      this.calculateLayout(newCharacter).catch(error => {
        console.error('💥 Layout calculation failed:', error);
      });
    }
  }

  private handleCharacterDelete(): void {
    if (!this.isInitialized) {
      console.log('❌ App not initialized yet');
      return;
    }

    console.log('🗑️ Delete key pressed, current character count:', this.characters.size);

    // 文字がない場合は何もしない
    if (this.characters.size === 0) {
      console.log('ℹ️ No characters to delete');
      return;
    }

    // 最後に追加された文字を見つける（最も大きなIDを持つ文字）
    let lastCharacter: Character | null = null;
    let lastCharacterId: string | null = null;
    let latestTimestamp = 0;

    this.characters.forEach((character, id) => {
      // IDから時間戳を抽出（composing-{timestamp}-{random} または confirmed-{timestamp}-{random}）
      const timestampMatch = id.match(/-(\d+)-/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1]);
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          lastCharacter = character;
          lastCharacterId = id;
        }
      }
    });

    if (lastCharacter !== null && lastCharacterId !== null) {
      const characterToDelete = lastCharacter as Character;
      console.log('🗑️ Deleting last character:', {
        id: lastCharacterId,
        char: characterToDelete.char,
        isComposing: characterToDelete.isComposing
      });

      // レンダラーから文字を削除
      this.renderer.removeCharacter(lastCharacterId);
      
      // マップから文字を削除
      this.characters.delete(lastCharacterId);
      
      // 計算待ちリストからも削除
      this.pendingCalculations.delete(lastCharacterId);

      // 文字数を更新
      this.updateCharacterCount();

      console.log('✅ Character deleted successfully, remaining count:', this.characters.size);

      // 残りの文字を再配置（オプション: パフォーマンスを考慮して後で実装）
      // this.recalculateAllCharacters();
    } else {
      console.log('⚠️ Could not find last character to delete');
    }
  }

  private handleCompositionUpdate(state: CompositionState): void {
    if (!this.isInitialized) return;

    console.log('🔄 Composition state update:', state);

    if (!state.isComposing) {
      // 未確定文字をクリア
      console.log('🧹 Clearing composing characters');
      this.renderer.clearComposingCharacters();
      
      // charactersマップからも削除
      const composingIds: string[] = [];
      this.characters.forEach((character, id) => {
        if (character.isComposing) {
          composingIds.push(id);
        }
      });
      
      console.log('🗑️ Removing', composingIds.length, 'composing characters');
      composingIds.forEach(id => {
        this.characters.delete(id);
        this.pendingCalculations.delete(id); // 計算待ちからも削除
      });
      
      // Update character count
      this.updateCharacterCount();
    } else {
      // IME変換中の場合、必要に応じて再配置
      console.log('✏️ IME composing, current text:', state.text);
    }
  }

  private async calculateLayout(newCharacter: Character): Promise<void> {
    console.log('🧮 Calculating layout ASYNCHRONOUSLY for:', newCharacter);
    
    if (this.pendingCalculations.has(newCharacter.id)) {
      console.log('⏳ Calculation already pending for:', newCharacter.id);
      return;
    }

    this.pendingCalculations.add(newCharacter.id);
    console.log('🔄 Starting asynchronous calculation');

    try {
      // Get existing characters (excluding the new one)
      const existingCharacters = Array.from(this.characters.values()).filter(c => c.id !== newCharacter.id);
      
      console.log('📊 Existing characters for algorithm:', existingCharacters.map(c => ({
        char: c.char, x: c.x, y: c.y, scale: c.scale
      })));

      // Calculate optimal placement asynchronously
      const startTime = performance.now();
      const placement = await this.nestingAlgorithm.calculateOptimalPlacement(existingCharacters, newCharacter.char);
      const endTime = performance.now();
      
      console.log('✅ Async calculation completed in', (endTime - startTime).toFixed(2), 'ms');
      console.log('📍 Placement result:', placement);

      // Apply the result immediately
      this.applyLayoutResult(newCharacter.id, placement);
      
    } catch (error) {
      console.error('💥 Asynchronous layout calculation error:', error);
      
      // Fallback placement
      const fallbackPlacement = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        rotation: Math.random() * 360,
        scale: 50,
        score: 0
      };
      
      console.log('🔄 Using fallback placement:', fallbackPlacement);
      this.applyLayoutResult(newCharacter.id, fallbackPlacement);
    }
  }

  private applyLayoutResult(characterId: string, placement: any): void {
    const targetCharacter = this.characters.get(characterId);

    if (!targetCharacter) {
      console.log('❌ No target character found for result:', characterId);
      return;
    }

    console.log('✅ Applying layout to character:', targetCharacter.id, targetCharacter.char);
    console.log('📍 Layout result details:', {
      before: { x: targetCharacter.x, y: targetCharacter.y, scale: targetCharacter.scale, rotation: targetCharacter.rotation },
      after: { x: placement.x, y: placement.y, scale: placement.scale, rotation: placement.rotation }
    });

    // Mark calculation as complete
    this.pendingCalculations.delete(targetCharacter.id);

    // Apply placement result
    targetCharacter.x = placement.x;
    targetCharacter.y = placement.y;
    targetCharacter.rotation = placement.rotation;
    targetCharacter.scale = placement.scale;

    console.log('🎨 Final character placement:', {
      char: targetCharacter.char,
      x: targetCharacter.x,
      y: targetCharacter.y,
      rotation: targetCharacter.rotation,
      scale: targetCharacter.scale
    });

    // Render the character
    console.log('🖼️ About to render character with scale:', targetCharacter.scale);
    this.renderer.addOrUpdateCharacter(targetCharacter);
    console.log('✅ Character rendered successfully');

    // Handle composing characters if needed
    if (!targetCharacter.isComposing) {
      this.recalculateComposingCharacters();
    }
    
    this.logPerformanceMetrics();
  }

  // handleLayoutResult method removed - using synchronous calculation instead

  private logPerformanceMetrics(): void {
    if (this.characters.size % 10 === 0) {
      console.log(`Performance: ${this.characters.size} characters, ${this.pendingCalculations.size} pending calculations`);
    }
  }

  private updateCharacterCount(): void {
    const countElement = document.getElementById('char-count');
    const perfElement = document.getElementById('performance');
    
    if (countElement) {
      const confirmedCount = Array.from(this.characters.values()).filter(c => !c.isComposing).length;
      const composingCount = Array.from(this.characters.values()).filter(c => c.isComposing).length;
      countElement.textContent = `Characters: ${confirmedCount}${composingCount > 0 ? ` (+${composingCount} composing)` : ''}`;
    }
    
    if (perfElement) {
      const pendingCount = this.pendingCalculations.size;
      const performance = pendingCount > 5 ? 'Calculating...' : 
                         pendingCount > 2 ? 'Good' : 
                         'Excellent';
      perfElement.textContent = `Performance: ${performance}`;
    }
  }

  private recalculateComposingCharacters(): void {
    const composingCharacters: Character[] = [];
    this.characters.forEach(character => {
      if (character.isComposing) {
        composingCharacters.push(character);
      }
    });

    // 未確定文字があれば再配置
    composingCharacters.forEach(character => {
      this.calculateLayout(character);
    });
  }

  private clearAll(): void {
    this.renderer.clear();
    this.characters.clear();
    this.pendingCalculations.clear();
    this.updateCharacterCount();
    console.log('All characters cleared');
  }

  public destroy(): void {
    // Worker disabled - no need to terminate
    // if (this.layoutWorker) {
    //   this.layoutWorker.terminate();
    // }
    this.renderer.clear();
    this.characters.clear();
  }
}

// アプリケーションの初期化
let app: TypographicNestingApp;

document.addEventListener('DOMContentLoaded', () => {
  app = new TypographicNestingApp();
});

// クリーンアップ
window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});
