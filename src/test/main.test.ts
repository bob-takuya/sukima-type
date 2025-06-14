import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypographicNestingApp } from '../main';

// DOM要素のモック
const createMockDOM = () => {
  // SVG要素
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgElement.id = 'text-canvas';
  document.body.appendChild(svgElement);

  // Input要素
  const inputElement = document.createElement('input');
  inputElement.id = 'input-handler';
  inputElement.type = 'text';
  document.body.appendChild(inputElement);

  // Loading要素
  const loadingElement = document.createElement('div');
  loadingElement.id = 'loading';
  document.body.appendChild(loadingElement);

  // Instructions要素
  const instructionsElement = document.createElement('div');
  instructionsElement.id = 'instructions';
  document.body.appendChild(instructionsElement);

  // Character count要素
  const charCountElement = document.createElement('span');
  charCountElement.id = 'char-count';
  document.body.appendChild(charCountElement);

  // Performance要素
  const perfElement = document.createElement('span');
  perfElement.id = 'performance';
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

const cleanupDOM = () => {
  const elements = [
    'text-canvas',
    'input-handler', 
    'loading',
    'instructions',
    'char-count',
    'performance'
  ];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.remove();
    }
  });
};

describe('TypographicNestingApp', () => {
  let app: TypographicNestingApp;
  let mockElements: ReturnType<typeof createMockDOM>;

  beforeEach(async () => {
    mockElements = createMockDOM();
    
    // document.fonts.ready をモック
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() }
    });
    
    // DOMContentLoaded が既に発火している状態をシミュレート
    Object.defineProperty(document, 'readyState', {
      value: 'complete'
    });
    
    app = new TypographicNestingApp();
    
    // 初期化が完了するまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    if (app) {
      app.destroy();
    }
    cleanupDOM();
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('必要なDOM要素が見つからない場合エラーがスローされる', () => {
      cleanupDOM();
      
      expect(() => {
        new TypographicNestingApp();
      }).toThrow();
    });

    it('初期化後にローディング要素が非表示になる', async () => {
      const loadingElement = document.getElementById('loading');
      
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(loadingElement?.style.display).toBe('none');
    });

    it('初期化後に説明要素が表示される', async () => {
      const instructionsElement = document.getElementById('instructions');
      
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(instructionsElement?.style.opacity).toBe('1');
    });
  });

  describe('文字入力処理', () => {
    it('最初の文字が正しく処理される', async () => {
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // 'A' を入力
      inputElement.value = 'A';
      inputElement.dispatchEvent(new Event('input'));
      
      // 処理が完了するまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 1');
    });

    it('複数文字の入力が正しく処理される', async () => {
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // 'Hello' を一文字ずつ入力
      for (const char of 'Hello') {
        inputElement.value = char;
        inputElement.dispatchEvent(new Event('input'));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // 処理が完了するまで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 5');
    });

    it('IME変換中の文字が正しく処理される', async () => {
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // IME変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      // 'か' を変換中
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'か' }));
      
      // 処理が完了するまで待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('composing');
    });

    it('IME変換確定時に文字が正しく処理される', async () => {
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // IME変換開始〜確定
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: '漢字' }));
      inputElement.dispatchEvent(new CompositionEvent('compositionend', { data: '漢字' }));
      
      // 処理が完了するまで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 2');
      expect(charCountElement?.textContent).not.toContain('composing');
    });
  });

  describe('全削除機能', () => {
    it('clearAllイベントで全文字が削除される', async () => {
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const inputElement = document.getElementById('input-handler') as HTMLInputElement;
      
      // 文字を入力
      inputElement.value = 'Test';
      inputElement.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 全削除イベントを発火
      document.dispatchEvent(new CustomEvent('clearAll'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const charCountElement = document.getElementById('char-count');
      expect(charCountElement?.textContent).toContain('Characters: 0');
    });
  });

  describe('パフォーマンス監視', () => {
    it('文字数の増加に応じてパフォーマンス表示が更新される', async () => {
      // 初期化完了まで待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const perfElement = document.getElementById('performance');
      
      // 初期状態では 'Excellent' が表示される
      expect(perfElement?.textContent).toContain('Excellent');
    });
  });
});
