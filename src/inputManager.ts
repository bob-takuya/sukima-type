import { Character, CompositionState } from './types.js';

export class InputManager {
  private inputElement: HTMLInputElement;
  private onCharacterAdd: (char: string, isComposing: boolean) => void;
  private onCharacterDelete: () => void;
  private onCompositionUpdate: (state: CompositionState) => void;
  private compositionState: CompositionState;

  constructor(
    inputElement: HTMLInputElement,
    onCharacterAdd: (char: string, isComposing: boolean) => void,
    onCharacterDelete: () => void,
    onCompositionUpdate: (state: CompositionState) => void
  ) {
    this.inputElement = inputElement;
    this.onCharacterAdd = onCharacterAdd;
    this.onCharacterDelete = onCharacterDelete;
    this.onCompositionUpdate = onCompositionUpdate;
    this.compositionState = {
      text: '',
      isComposing: false,
      characters: []
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // フォーカスを維持
    this.inputElement.focus();
    
    document.addEventListener('click', () => {
      this.inputElement.focus();
    });

    // IME変換開始
    this.inputElement.addEventListener('compositionstart', () => {
      this.compositionState.isComposing = true;
    });

    // IME変換中（リアルタイム更新）
    this.inputElement.addEventListener('compositionupdate', (e) => {
      this.handleCompositionUpdate(e.data);
    });

    // IME変換終了（確定）
    this.inputElement.addEventListener('compositionend', (e) => {
      this.handleCompositionEnd(e.data);
    });

    // 通常の文字入力（英数字など）
    this.inputElement.addEventListener('input', (e) => {
      console.log('⌨️ Input event triggered:', { 
        value: this.inputElement.value, 
        isComposing: this.compositionState.isComposing,
        inputType: (e as InputEvent).inputType
      });
      
      if (!this.compositionState.isComposing && this.inputElement.value) {
        const inputValue = this.inputElement.value;
        console.log('📝 Processing input value:', inputValue);
        
        // Clear input immediately to prevent interference
        this.inputElement.value = '';
        
        // Process each character
        for (const char of inputValue) {
          if (char && char.trim()) {
            console.log('➕ Adding character:', char);
            this.onCharacterAdd(char, false);
          }
        }
        
        console.log('🧹 Input processing completed');
      }
    });

    // キーボードイベント
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearComposition();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // 削除キーが押された場合
        if (!this.compositionState.isComposing) {
          e.preventDefault();
          this.onCharacterDelete();
        }
      } else if (e.key === 'F5' || (e.metaKey && e.key === 'r')) {
        // Prevent refresh, clear everything instead
        e.preventDefault();
        this.clearAll();
      } else if (e.metaKey && e.key === 'z') {
        // Undo functionality could be added here
        e.preventDefault();
      }
    });
  }

  private handleCompositionUpdate(data: string): void {
    if (!data) return;

    // 前の未確定文字をクリア
    this.clearCompositionCharacters();

    // 新しい未確定文字を作成
    this.compositionState.text = data;
    this.compositionState.characters = [];

    // 各文字を個別に処理
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      if (char.trim()) {
        const characterId = `composing-${Date.now()}-${i}`;
        const character: Character = {
          id: characterId,
          char: char,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          isComposing: true
        };
        
        this.compositionState.characters.push(character);
        this.onCharacterAdd(char, true);
      }
    }

    this.onCompositionUpdate(this.compositionState);
  }

  private handleCompositionEnd(data: string): void {
    if (!data) {
      this.clearComposition();
      return;
    }

    // 未確定文字をクリア
    this.clearCompositionCharacters();

    // 確定文字として追加
    for (const char of data) {
      if (char.trim()) {
        this.onCharacterAdd(char, false);
      }
    }

    this.clearComposition();
    this.inputElement.value = '';
  }

  private clearCompositionCharacters(): void {
    // 未確定文字の削除は TypographicRenderer で処理される
    this.onCompositionUpdate({
      text: '',
      isComposing: false,
      characters: []
    });
  }

  private clearComposition(): void {
    this.compositionState = {
      text: '',
      isComposing: false,
      characters: []
    };
    this.inputElement.value = '';
  }

  private clearAll(): void {
    this.clearComposition();
    // Emit a clear event that the main app can listen to
    document.dispatchEvent(new CustomEvent('clearAll'));
  }

  public focus(): void {
    this.inputElement.focus();
  }
}
