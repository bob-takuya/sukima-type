import { Character } from './types.js';

export class TypographicRenderer {
  private svg: SVGSVGElement;
  private characters: Map<string, Character>;

  constructor(svgElement: SVGSVGElement) {
    this.svg = svgElement;
    this.characters = new Map();
    
    this.setupSVG();
  }

  private setupSVG(): void {
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    
    // リサイズ対応
    window.addEventListener('resize', () => {
      this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    });
  }

  /**
   * 文字を追加または更新
   */
  addOrUpdateCharacter(character: Character): void {
    console.log('🖼️ Renderer: addOrUpdateCharacter called', {
      char: character.char,
      x: character.x,
      y: character.y,
      scale: character.scale,
      rotation: character.rotation,
      isComposing: character.isComposing
    });
    
    // スケールが0または無効な場合はレンダリングしない
    if (character.scale <= 0 || !isFinite(character.scale)) {
      console.log('⚠️ Skipping render for invalid scale:', character.scale);
      return;
    }
    
    const existingCharacter = this.characters.get(character.id);
    
    if (existingCharacter) {
      // 既存の文字を更新
      console.log('🔄 Updating existing character');
      this.updateCharacterElement(existingCharacter, character);
    } else {
      // 新しい文字を作成
      console.log('✨ Creating new character element');
      this.createCharacterElement(character);
    }
    
    this.characters.set(character.id, character);
    console.log('✅ Character rendered successfully with scale:', character.scale);
  }

  /**
   * 新しい文字要素を作成
   */
  private createCharacterElement(character: Character): void {
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    
    textElement.setAttribute('id', character.id);
    textElement.setAttribute('x', character.x.toString());
    textElement.setAttribute('y', character.y.toString());
    textElement.setAttribute('font-family', 'Helvetica, "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", Meiryo, sans-serif');
    textElement.setAttribute('font-size', character.scale.toString());
    textElement.setAttribute('text-anchor', 'middle');
    textElement.setAttribute('dominant-baseline', 'central');
    textElement.setAttribute('fill', character.isComposing ? '#808080' : '#FFFFFF');
    textElement.setAttribute('user-select', 'none');
    textElement.textContent = character.char;
    
    // 回転変換を適用
    if (character.rotation !== 0) {
      textElement.setAttribute('transform', 
        `rotate(${character.rotation} ${character.x} ${character.y})`
      );
    }

    // アニメーション効果
    textElement.style.opacity = '0';
    this.svg.appendChild(textElement);
    
    // フェードイン
    requestAnimationFrame(() => {
      textElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      textElement.style.opacity = '1';
    });

    character.element = textElement;
  }

  /**
   * 既存の文字要素を更新
   */
  private updateCharacterElement(existingCharacter: Character, newCharacter: Character): void {
    const element = existingCharacter.element;
    if (!element) return;

    // 位置とスケールの変更をアニメーション
    const hasPositionChange = 
      existingCharacter.x !== newCharacter.x || 
      existingCharacter.y !== newCharacter.y ||
      existingCharacter.rotation !== newCharacter.rotation ||
      existingCharacter.scale !== newCharacter.scale;

    if (hasPositionChange) {
      element.style.transition = 'all 0.3s ease';
    }

    // 属性を更新
    element.setAttribute('x', newCharacter.x.toString());
    element.setAttribute('y', newCharacter.y.toString());
    element.setAttribute('font-size', newCharacter.scale.toString());
    element.setAttribute('fill', newCharacter.isComposing ? '#808080' : '#FFFFFF');
    
    if (newCharacter.rotation !== 0) {
      element.setAttribute('transform', 
        `rotate(${newCharacter.rotation} ${newCharacter.x} ${newCharacter.y})`
      );
    } else {
      element.removeAttribute('transform');
    }

    // 文字内容が変わった場合
    if (existingCharacter.char !== newCharacter.char) {
      element.textContent = newCharacter.char;
    }

    // 確定状態の変更
    if (existingCharacter.isComposing !== newCharacter.isComposing) {
      element.setAttribute('fill', newCharacter.isComposing ? '#808080' : '#FFFFFF');
    }
  }

  /**
   * 文字を削除
   */
  removeCharacter(characterId: string): void {
    const character = this.characters.get(characterId);
    if (!character || !character.element) return;

    // フェードアウトアニメーション
    character.element.style.transition = 'opacity 0.2s ease';
    character.element.style.opacity = '0';
    
    setTimeout(() => {
      if (character.element && character.element.parentNode) {
        character.element.parentNode.removeChild(character.element);
      }
      this.characters.delete(characterId);
    }, 200);
  }

  /**
   * 未確定文字をすべて削除（IME変換時）
   */
  clearComposingCharacters(): void {
    const composingIds: string[] = [];
    
    this.characters.forEach((character, id) => {
      if (character.isComposing) {
        composingIds.push(id);
      }
    });

    composingIds.forEach(id => this.removeCharacter(id));
  }

  /**
   * 未確定文字を確定文字に変換
   */
  confirmComposingCharacters(): void {
    this.characters.forEach((character) => {
      if (character.isComposing) {
        character.isComposing = false;
        if (character.element) {
          character.element.setAttribute('fill', '#FFFFFF');
        }
      }
    });
  }

  /**
   * 複数の文字を一括更新（再配置時）
   */
  updateMultipleCharacters(characters: Character[]): void {
    // バッチ更新でパフォーマンスを向上
    characters.forEach(character => {
      this.addOrUpdateCharacter(character);
    });
  }

  /**
   * すべての文字をクリア
   */
  clear(): void {
    this.characters.forEach((_, id) => {
      this.removeCharacter(id);
    });
    this.characters.clear();
  }

  /**
   * 現在の文字数を取得
   */
  getCharacterCount(): number {
    return this.characters.size;
  }

  /**
   * すべての文字を取得
   */
  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }
}
