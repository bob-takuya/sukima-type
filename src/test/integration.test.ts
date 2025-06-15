import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// エンドツーエンドの統合テスト
describe('Typographic Nesting App - Integration Tests', () => {
  const createFullMockDOM = () => {
    // 必要なすべてのDOM要素を作成
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.id = 'text-canvas';
    document.body.appendChild(svgElement);

    const inputElement = document.createElement('input');
    inputElement.id = 'input-handler';
    inputElement.type = 'text';
    document.body.appendChild(inputElement);

    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading';
    loadingElement.textContent = 'Loading...';
    document.body.appendChild(loadingElement);

    const instructionsElement = document.createElement('div');
    instructionsElement.id = 'instructions';
    document.body.appendChild(instructionsElement);

    const charCountElement = document.createElement('span');
    charCountElement.id = 'char-count';
    charCountElement.textContent = 'Characters: 0';
    document.body.appendChild(charCountElement);

    const perfElement = document.createElement('span');
    perfElement.id = 'performance';
    perfElement.textContent = 'Performance: Excellent';
    document.body.appendChild(perfElement);

    return {
      svgElement,
      inputElement,
      loadingElement,
      instructionsElement,
      charCountElement,
      perfElement
    };
  };

  const cleanupFullDOM = () => {
    ['text-canvas', 'input-handler', 'loading', 'instructions', 'char-count', 'performance']
      .forEach(id => {
        const element = document.getElementById(id);
        if (element) element.remove();
      });
  };

  beforeEach(() => {
    createFullMockDOM();
    
    // document.fonts.ready をモック
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() }
    });
    
    // ウィンドウサイズをモック
    Object.defineProperty(window, 'innerWidth', { value: 1000 });
    Object.defineProperty(window, 'innerHeight', { value: 800 });
  });

  afterEach(() => {
    cleanupFullDOM();
    vi.clearAllMocks();
  });

  describe('完全なユーザーフロー', () => {
    it('アプリ起動 → 英字入力 → 表示確認', async () => {
      // アプリを動的にインポートして初期化
      const { TypographicNestingApp } = await import('../main');
      const app = new TypographicNestingApp();
      
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ローディングが非表示になることを確認
      const loadingElement = document.getElementById('loading');
      expect(loadingElement?.style.display).toBe('none');
      
      // 文字を入力
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      inputElement.value = 'A';
      inputElement.dispatchEvent(new Event('input'));
      
      // 処理完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 文字数表示が更新されることを確認
      const charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 1');
      
      // SVGに文字要素が追加されることを確認
      const svgElement = document.getElementById('text-canvas');
      const textElements = svgElement?.querySelectorAll('text');
      expect(textElements?.length).toBeGreaterThan(0);
      
      app.destroy();
    });

    it('複数文字の連続入力', async () => {
      const { TypographicNestingApp } = await import('../main');
      const app = new TypographicNestingApp();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // "Hello" を一文字ずつ入力
      for (const char of 'Hello') {
        inputElement.value = char;
        inputElement.dispatchEvent(new Event('input'));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 最終的な文字数確認
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 5');
      
      // SVGに5つの文字要素があることを確認
      const svgElement = document.getElementById('text-canvas');
      const textElements = svgElement?.querySelectorAll('text');
      expect(textElements?.length).toBe(5);
      
      app.destroy();
    });

    it('日本語IME入力の完全フロー', async () => {
      const { TypographicNestingApp } = await import('../main');
      const app = new TypographicNestingApp();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // IME変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      // "かん" を入力中
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'かん' }));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 変換中文字として表示されることを確認
      let charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('composing');
      
      // "漢" に変換
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: '漢' }));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 変換確定
      inputElement.dispatchEvent(new CompositionEvent('compositionend', { data: '漢' }));
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 確定文字として表示されることを確認
      charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 1');
      expect(charCountElement?.textContent).not.toContain('composing');
      
      // SVG内の文字要素が白色（確定）で表示されることを確認
      const svgElement = document.getElementById('text-canvas');
      const textElement = svgElement?.querySelector('text');
      expect(textElement?.getAttribute('fill')).toBe('#FFFFFF');
      
      app.destroy();
    });

    it('全削除機能のテスト', async () => {
      const { TypographicNestingApp } = await import('../main');
      const app = new TypographicNestingApp();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // いくつか文字を入力
      for (const char of 'Test') {
        inputElement.value = char;
        inputElement.dispatchEvent(new Event('input'));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 文字が追加されたことを確認
      let charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 4');
      
      // 全削除イベントを発火
      document.dispatchEvent(new CustomEvent('clearAll'));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 全削除されたことを確認
      charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 0');
      
      app.destroy();
    });

    it('キーボードショートカットのテスト', async () => {
      const { TypographicNestingApp } = await import('../main');
      const app = new TypographicNestingApp();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // 文字を入力
      inputElement.value = 'A';
      inputElement.dispatchEvent(new Event('input'));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Cmd+R (全削除) をテスト
      const clearAllSpy = vi.fn();
      document.addEventListener('clearAll', clearAllSpy);
      
      const cmdREvent = new KeyboardEvent('keydown', { 
        key: 'r', 
        metaKey: true 
      });
      
      const preventDefaultSpy = vi.spyOn(cmdREvent, 'preventDefault');
      inputElement.dispatchEvent(cmdREvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(clearAllSpy).toHaveBeenCalled();
      
      app.destroy();
    });
  });

  describe('エラーハンドリング', () => {
    it('必要なDOM要素がない場合のエラー処理', async () => {
      // SVG要素を削除
      const svgElement = document.getElementById('text-canvas');
      if (svgElement) svgElement.remove();
      
      const { TypographicNestingApp } = await import('../main');
      
      expect(() => {
        new TypographicNestingApp();
      }).toThrow('Canvas element not found');
    });

    it('Web Worker エラーの処理', async () => {
      // Web Worker のエラーをシミュレート
      const originalWorker = global.Worker;
      global.Worker = vi.fn().mockImplementation(() => {
        const mockWorker = {
          postMessage: vi.fn(),
          terminate: vi.fn(),
          onmessage: null as ((this: Worker, ev: MessageEvent) => any) | null,
          onerror: null as ((this: AbstractWorker, ev: ErrorEvent) => any) | null
        };
        
        // エラーを即座に発火
        setTimeout(() => {
          if (mockWorker.onerror) {
            mockWorker.onerror.call(mockWorker as any, new ErrorEvent('error', { 
              message: 'Worker failed to load' 
            }));
          }
        }, 100);
        
        return mockWorker;
      });
      
      const { TypographicNestingApp } = await import('../main');
      const app = new TypographicNestingApp();
      
      // エラーが発生してもアプリが動作することを確認
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const loadingElement = document.getElementById('loading');
      expect(loadingElement?.style.display).toBe('none');
      
      app.destroy();
      global.Worker = originalWorker;
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の文字入力でもパフォーマンスが保たれる', async () => {
      const { TypographicNestingApp } = await import('../main');
      const app = new TypographicNestingApp();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      const startTime = performance.now();
      
      // 20文字を高速入力
      for (let i = 0; i < 20; i++) {
        inputElement.value = String.fromCharCode(65 + (i % 26)); // A-Z
        inputElement.dispatchEvent(new Event('input'));
        await new Promise(resolve => setTimeout(resolve, 10)); // 短い間隔
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 合理的な時間内で完了することを確認 (20秒以内)
      expect(duration).toBeLessThan(20000);
      
      // パフォーマンス表示が更新されることを確認
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const perfElement = document.getElementById('performance');
      expect(perfElement?.textContent).toBeDefined();
      
      app.destroy();
    }, 30000); // 30秒のタイムアウト
  });
});
