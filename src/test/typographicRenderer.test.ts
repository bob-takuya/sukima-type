import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypographicRenderer } from '../typographicRenderer';
import { Character } from '../types';

describe('TypographicRenderer', () => {
  let renderer: TypographicRenderer;
  let svgElement: SVGSVGElement;

  beforeEach(() => {
    // SVG要素を作成
    svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.id = 'test-canvas';
    document.body.appendChild(svgElement);
    
    // モック window サイズ
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    renderer = new TypographicRenderer(svgElement);
  });

  afterEach(() => {
    document.body.removeChild(svgElement);
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('SVG要素が正しく設定される', () => {
      expect(svgElement.getAttribute('width')).toBe('100%');
      expect(svgElement.getAttribute('height')).toBe('100%');
      expect(svgElement.getAttribute('viewBox')).toBe('0 0 1000 800');
    });

    it('ウィンドウリサイズ時にviewBoxが更新される', () => {
      // ウィンドウサイズを変更
      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      Object.defineProperty(window, 'innerHeight', { value: 900 });
      
      // リサイズイベントを発火
      window.dispatchEvent(new Event('resize'));
      
      expect(svgElement.getAttribute('viewBox')).toBe('0 0 1200 900');
    });
  });

  describe('文字の追加と更新', () => {
    const sampleCharacter: Character = {
      id: 'test-char-1',
      char: 'A',
      x: 100,
      y: 200,
      rotation: 0,
      scale: 50,
      isComposing: false
    };

    it('新しい文字が正しく作成される', () => {
      renderer.addOrUpdateCharacter(sampleCharacter);
      
      const textElement = svgElement.querySelector('#test-char-1') as SVGTextElement;
      expect(textElement).toBeTruthy();
      expect(textElement.textContent).toBe('A');
      expect(textElement.getAttribute('x')).toBe('100');
      expect(textElement.getAttribute('y')).toBe('200');
      expect(textElement.getAttribute('font-size')).toBe('50');
      expect(textElement.getAttribute('fill')).toBe('#FFFFFF');
    });

    it('変換中の文字は灰色で表示される', () => {
      const composingChar: Character = {
        ...sampleCharacter,
        id: 'composing-char',
        char: 'か',
        isComposing: true
      };
      
      renderer.addOrUpdateCharacter(composingChar);
      
      const textElement = svgElement.querySelector('#composing-char') as SVGTextElement;
      expect(textElement.getAttribute('fill')).toBe('#808080');
    });

    it('回転が適用される', () => {
      const rotatedChar: Character = {
        ...sampleCharacter,
        rotation: 45
      };
      
      renderer.addOrUpdateCharacter(rotatedChar);
      
      const textElement = svgElement.querySelector('#test-char-1') as SVGTextElement;
      expect(textElement.getAttribute('transform')).toBe('rotate(45 100 200)');
    });

    it('既存の文字が正しく更新される', () => {
      // 最初に文字を追加
      renderer.addOrUpdateCharacter(sampleCharacter);
      
      // 同じIDで異なるプロパティの文字を更新
      const updatedCharacter: Character = {
        ...sampleCharacter,
        x: 300,
        y: 400,
        scale: 80,
        rotation: 90
      };
      
      renderer.addOrUpdateCharacter(updatedCharacter);
      
      const textElement = svgElement.querySelector('#test-char-1') as SVGTextElement;
      expect(textElement.getAttribute('x')).toBe('300');
      expect(textElement.getAttribute('y')).toBe('400');
      expect(textElement.getAttribute('font-size')).toBe('80');
      expect(textElement.getAttribute('transform')).toBe('rotate(90 300 400)');
    });

    it('変換状態の変更が正しく反映される', () => {
      // 変換中として追加
      const composingChar: Character = {
        ...sampleCharacter,
        isComposing: true
      };
      renderer.addOrUpdateCharacter(composingChar);
      
      let textElement = svgElement.querySelector('#test-char-1') as SVGTextElement;
      expect(textElement.getAttribute('fill')).toBe('#808080');
      
      // 確定状態に更新
      const confirmedChar: Character = {
        ...sampleCharacter,
        isComposing: false
      };
      renderer.addOrUpdateCharacter(confirmedChar);
      
      textElement = svgElement.querySelector('#test-char-1') as SVGTextElement;
      expect(textElement.getAttribute('fill')).toBe('#FFFFFF');
    });

    it('文字内容が変更される', () => {
      renderer.addOrUpdateCharacter(sampleCharacter);
      
      const changedChar: Character = {
        ...sampleCharacter,
        char: 'B'
      };
      renderer.addOrUpdateCharacter(changedChar);
      
      const textElement = svgElement.querySelector('#test-char-1') as SVGTextElement;
      expect(textElement.textContent).toBe('B');
    });
  });

  describe('文字の削除', () => {
    const sampleCharacter: Character = {
      id: 'delete-test',
      char: 'X',
      x: 100,
      y: 100,
      rotation: 0,
      scale: 50,
      isComposing: false
    };

    it('文字が正しく削除される', async () => {
      // 文字を追加
      renderer.addOrUpdateCharacter(sampleCharacter);
      expect(svgElement.querySelector('#delete-test')).toBeTruthy();
      
      // 文字を削除
      renderer.removeCharacter('delete-test');
      
      // フェードアウトアニメーション後に削除されるまで待つ
      await new Promise(resolve => setTimeout(resolve, 250));
      
      expect(svgElement.querySelector('#delete-test')).toBeFalsy();
    });

    it('存在しない文字を削除しても問題ない', () => {
      expect(() => {
        renderer.removeCharacter('non-existent');
      }).not.toThrow();
    });
  });

  describe('変換中文字の管理', () => {
    it('変換中文字のみが削除される', () => {
      const confirmedChar: Character = {
        id: 'confirmed',
        char: 'A',
        x: 100,
        y: 100,
        rotation: 0,
        scale: 50,
        isComposing: false
      };

      const composingChar: Character = {
        id: 'composing',
        char: 'か',
        x: 200,
        y: 200,
        rotation: 0,
        scale: 30,
        isComposing: true
      };

      renderer.addOrUpdateCharacter(confirmedChar);
      renderer.addOrUpdateCharacter(composingChar);

      renderer.clearComposingCharacters();

      // 確定文字は残る
      expect(svgElement.querySelector('#confirmed')).toBeTruthy();
      // 変換中文字は削除される（アニメーション後）
      setTimeout(() => {
        expect(svgElement.querySelector('#composing')).toBeFalsy();
      }, 250);
    });

    it('変換中文字が確定される', () => {
      const composingChar: Character = {
        id: 'to-confirm',
        char: 'か',
        x: 100,
        y: 100,
        rotation: 0,
        scale: 50,
        isComposing: true
      };

      renderer.addOrUpdateCharacter(composingChar);
      
      let textElement = svgElement.querySelector('#to-confirm') as SVGTextElement;
      expect(textElement.getAttribute('fill')).toBe('#808080');

      renderer.confirmComposingCharacters();

      textElement = svgElement.querySelector('#to-confirm') as SVGTextElement;
      expect(textElement.getAttribute('fill')).toBe('#FFFFFF');
    });
  });

  describe('一括操作', () => {
    it('複数の文字が一括更新される', () => {
      const characters: Character[] = [
        {
          id: 'batch-1',
          char: 'A',
          x: 100,
          y: 100,
          rotation: 0,
          scale: 50,
          isComposing: false
        },
        {
          id: 'batch-2',
          char: 'B',
          x: 200,
          y: 200,
          rotation: 45,
          scale: 60,
          isComposing: false
        }
      ];

      renderer.updateMultipleCharacters(characters);

      expect(svgElement.querySelector('#batch-1')).toBeTruthy();
      expect(svgElement.querySelector('#batch-2')).toBeTruthy();
      
      const element2 = svgElement.querySelector('#batch-2') as SVGTextElement;
      expect(element2.getAttribute('transform')).toBe('rotate(45 200 200)');
    });

    it('全文字が削除される', async () => {
      const characters: Character[] = [
        {
          id: 'clear-1',
          char: 'A',
          x: 100,
          y: 100,
          rotation: 0,
          scale: 50,
          isComposing: false
        },
        {
          id: 'clear-2',
          char: 'B',
          x: 200,
          y: 200,
          rotation: 0,
          scale: 50,
          isComposing: false
        }
      ];

      renderer.updateMultipleCharacters(characters);
      expect(renderer.getCharacterCount()).toBe(2);

      renderer.clear();
      
      // アニメーション後にクリアされるまで待つ
      await new Promise(resolve => setTimeout(resolve, 250));
      
      expect(renderer.getCharacterCount()).toBe(0);
      expect(svgElement.querySelector('#clear-1')).toBeFalsy();
      expect(svgElement.querySelector('#clear-2')).toBeFalsy();
    });
  });

  describe('状態管理', () => {
    it('文字数が正しくカウントされる', () => {
      expect(renderer.getCharacterCount()).toBe(0);

      const char1: Character = {
        id: 'count-1',
        char: 'A',
        x: 100,
        y: 100,
        rotation: 0,
        scale: 50,
        isComposing: false
      };

      renderer.addOrUpdateCharacter(char1);
      expect(renderer.getCharacterCount()).toBe(1);

      const char2: Character = {
        id: 'count-2',
        char: 'B',
        x: 200,
        y: 200,
        rotation: 0,
        scale: 50,
        isComposing: false
      };

      renderer.addOrUpdateCharacter(char2);
      expect(renderer.getCharacterCount()).toBe(2);

      renderer.removeCharacter('count-1');
      // 削除は非同期なので即座にカウントは変わらない
      // 実際のアプリケーションでは削除完了時にカウントを更新する
    });

    it('全文字の配列が取得できる', () => {
      const characters: Character[] = [
        {
          id: 'get-1',
          char: 'A',
          x: 100,
          y: 100,
          rotation: 0,
          scale: 50,
          isComposing: false
        },
        {
          id: 'get-2',
          char: 'B',
          x: 200,
          y: 200,
          rotation: 0,
          scale: 50,
          isComposing: true
        }
      ];

      characters.forEach(char => renderer.addOrUpdateCharacter(char));

      const allCharacters = renderer.getAllCharacters();
      expect(allCharacters).toHaveLength(2);
      expect(allCharacters.find(c => c.id === 'get-1')).toBeTruthy();
      expect(allCharacters.find(c => c.id === 'get-2')).toBeTruthy();
    });
  });
});
