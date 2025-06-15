import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../inputManager.js';
import { CompositionState } from '../types.js';

describe('InputManager', () => {
  let inputElement: HTMLInputElement;
  let onCharacterAdd: ReturnType<typeof vi.fn>;
  let onCharacterDelete: ReturnType<typeof vi.fn>;
  let onCompositionUpdate: ReturnType<typeof vi.fn>;
  let inputManager: InputManager;

  beforeEach(() => {
    // HTML input element を作成
    inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.id = 'test-input';
    
    // イベント系のプロパティをセットアップ
    const eventListeners = new Map<string, Function[]>();
    
    inputElement.focus = vi.fn();
    
    // addEventListener をモック（実際にハンドラーを保存）
    (inputElement.addEventListener as any) = vi.fn((type: string, handler: any) => {
      if (!eventListeners.has(type)) {
        eventListeners.set(type, []);
      }
      eventListeners.get(type)!.push(handler);
    });
    
    inputElement.removeEventListener = vi.fn();
    
    // dispatchEventを実際にイベントハンドラーを呼び出すようにオーバーライド
    (inputElement.dispatchEvent as any) = vi.fn((event: Event) => {
      const handlers = eventListeners.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
      }
      return true;
    });
    
    // document にイベントシステムを追加（clearAll イベント用）
    const documentEventListeners = new Map<string, Function[]>();
    
    (document.addEventListener as any) = vi.fn((type: string, handler: any) => {
      if (!documentEventListeners.has(type)) {
        documentEventListeners.set(type, []);
      }
      documentEventListeners.get(type)!.push(handler);
    });
    
    (document.dispatchEvent as any) = vi.fn((event: Event) => {
      const handlers = documentEventListeners.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
      }
      return true;
    });
    
    document.body.appendChild(inputElement);

    // モック関数を作成
    onCharacterAdd = vi.fn();
    onCharacterDelete = vi.fn();
    onCompositionUpdate = vi.fn();

    // InputManager をインスタンス化
    inputManager = new InputManager(inputElement, onCharacterAdd, onCharacterDelete, onCompositionUpdate);
  });

  afterEach(() => {
    // クリーンアップ - 要素が存在する場合のみ削除
    if (inputElement && inputElement.parentNode) {
      inputElement.parentNode.removeChild(inputElement);
    }
    vi.clearAllMocks();
  });

  describe('基本的な文字入力', () => {
    it('英数字の入力が正しく処理される', () => {
      // 'A' を入力
      inputElement.value = 'A';
      inputElement.dispatchEvent(new Event('input'));

      expect(onCharacterAdd).toHaveBeenCalledWith('A', false);
      expect(onCharacterAdd).toHaveBeenCalledTimes(1);
    });

    it('複数文字の同時入力が正しく処理される', () => {
      // 'Hello' を入力
      inputElement.value = 'Hello';
      inputElement.dispatchEvent(new Event('input'));

      expect(onCharacterAdd).toHaveBeenCalledTimes(5);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(1, 'H', false);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(2, 'e', false);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(3, 'l', false);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(4, 'l', false);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(5, 'o', false);
    });

    it('空白文字が無視される', () => {
      inputElement.value = ' ';
      inputElement.dispatchEvent(new Event('input'));

      expect(onCharacterAdd).not.toHaveBeenCalled();
    });

    it('入力後にinput valueがクリアされる', () => {
      inputElement.value = 'A';
      inputElement.dispatchEvent(new Event('input'));

      expect(inputElement.value).toBe('');
    });
  });

  describe('IME変換処理', () => {
    it('変換開始が正しく処理される', () => {
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      // compositionstart は直接的にコールバックを呼び出さないが、状態を変更する
      expect(onCharacterAdd).not.toHaveBeenCalled();
    });

    it('変換中の文字が正しく処理される', () => {
      // 変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      // 'か' を入力中
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'か' }));

      expect(onCharacterAdd).toHaveBeenCalledWith('か', true);
      expect(onCompositionUpdate).toHaveBeenCalled();
    });

    it('変換中の複数文字が個別に処理される', () => {
      // 変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      // 'かんじ' を入力中
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'かんじ' }));

      expect(onCharacterAdd).toHaveBeenCalledTimes(3);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(1, 'か', true);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(2, 'ん', true);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(3, 'じ', true);
    });

    it('変換候補変更時に未確定文字がクリアされる', () => {
      // 変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      // 'かんじ' を入力
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'かんじ' }));
      vi.clearAllMocks();
      
      // '漢字' に変換
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: '漢字' }));

      // 未確定文字のクリアが呼ばれる
      expect(onCompositionUpdate).toHaveBeenCalledWith({
        text: '',
        isComposing: false,
        characters: []
      });
      
      // 新しい文字が追加される
      expect(onCharacterAdd).toHaveBeenCalledWith('漢', true);
      expect(onCharacterAdd).toHaveBeenCalledWith('字', true);
    });

    it('変換確定が正しく処理される', () => {
      // 変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      // '漢字' を変換中
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: '漢字' }));
      vi.clearAllMocks();
      
      // 変換確定
      inputElement.dispatchEvent(new CompositionEvent('compositionend', { data: '漢字' }));

      expect(onCharacterAdd).toHaveBeenCalledTimes(2);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(1, '漢', false);
      expect(onCharacterAdd).toHaveBeenNthCalledWith(2, '字', false);
    });
  });

  describe('キーボードショートカット', () => {
    it('Escapeキーで変換がキャンセルされる', () => {
      // 変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'か' }));
      
      // Escapeキーを押す
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      inputElement.dispatchEvent(escapeEvent);

      expect(onCompositionUpdate).toHaveBeenCalledWith({
        text: '',
        isComposing: false,
        characters: []
      });
    });

    it('Cmd+Rで全削除イベントが発火される', () => {
      const clearAllSpy = vi.fn();
      document.addEventListener('clearAll', clearAllSpy);
      
      const cmdREvent = new KeyboardEvent('keydown', { 
        key: 'r', 
        metaKey: true 
      });
      
      // preventDefault がモックされているかチェック
      const preventDefaultSpy = vi.spyOn(cmdREvent, 'preventDefault');
      
      inputElement.dispatchEvent(cmdREvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(clearAllSpy).toHaveBeenCalled();
      
      document.removeEventListener('clearAll', clearAllSpy);
    });
  });

  describe('文字削除機能', () => {
    it('Backspaceキーで削除イベントが発火される', () => {
      const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
      const preventDefaultSpy = vi.spyOn(backspaceEvent, 'preventDefault');
      
      inputElement.dispatchEvent(backspaceEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(onCharacterDelete).toHaveBeenCalled();
    });

    it('Deleteキーで削除イベントが発火される', () => {
      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      const preventDefaultSpy = vi.spyOn(deleteEvent, 'preventDefault');
      
      inputElement.dispatchEvent(deleteEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(onCharacterDelete).toHaveBeenCalled();
    });

    it('IME変換中は削除キーが無効になる', () => {
      // IME変換開始
      inputElement.dispatchEvent(new CompositionEvent('compositionstart'));
      
      const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
      const preventDefaultSpy = vi.spyOn(backspaceEvent, 'preventDefault');
      
      inputElement.dispatchEvent(backspaceEvent);
      
      // IME変換中はpreventDefaultが呼ばれない
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(onCharacterDelete).not.toHaveBeenCalled();
    });
  });

  describe('フォーカス管理', () => {
    it('フォーカスメソッドが正しく動作する', () => {
      const focusSpy = vi.spyOn(inputElement, 'focus');
      
      inputManager.focus();
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('ドキュメントクリック時にフォーカスが移る', () => {
      const focusSpy = vi.spyOn(inputElement, 'focus');
      
      document.dispatchEvent(new Event('click'));
      
      expect(focusSpy).toHaveBeenCalled();
    });
  });
});
