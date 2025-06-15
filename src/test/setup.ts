// テスト環境のセットアップ
import { vi } from 'vitest';

// DOM APIs のモック
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000'
  }
});

// DOM要素追跡用のマップ
const domElementsById = new Map<string, any>();

// document.body のモック
Object.defineProperty(document, 'body', {
  value: {
    appendChild: vi.fn((element: any) => {
      if (element.id) {
        domElementsById.set(element.id, element);
      }
    }),
    removeChild: vi.fn((element: any) => {
      if (element.id) {
        domElementsById.delete(element.id);
      }
    }),
    childNodes: [],
    children: []
  }
});

// document.getElementById のモック
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = vi.fn((id: string) => {
  return domElementsById.get(id) || null;
});

// HTMLInputElement のモック拡張
Object.defineProperty(HTMLInputElement.prototype, 'focus', {
  value: vi.fn(),
  writable: true
});

// HTMLElement のモック拡張
Object.defineProperty(HTMLElement.prototype, 'focus', {
  value: vi.fn(),
  writable: true
});

// document.createElement のモック拡張
const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn((tagName: string) => {
  const element = originalCreateElement(tagName);
  const eventListeners = new Map<string, Set<Function>>();
  
  // focus メソッドを追加
  if (!element.focus) {
    element.focus = vi.fn();
  }
  
  // style プロパティを確実に存在させる（プロキシで動的プロパティをサポート）
  if (!element.style || typeof element.style !== 'object') {
    const styleStore: any = {};
    element.style = new Proxy(styleStore, {
      get(target: any, prop: string) {
        return target[prop];
      },
      set(target: any, prop: string, value: any) {
        target[prop] = value;
        return true;
      }
    });
  }
  
  // addEventListener メソッドを追加
  if (!element.addEventListener) {
    element.addEventListener = vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const fn = typeof listener === 'function' ? listener : listener.handleEvent;
      if (!eventListeners.has(type)) {
        eventListeners.set(type, new Set());
      }
      eventListeners.get(type)!.add(fn);
    });
  }
  
  // removeEventListener メソッドを追加
  if (!element.removeEventListener) {
    element.removeEventListener = vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const fn = typeof listener === 'function' ? listener : listener.handleEvent;
      if (eventListeners.has(type)) {
        eventListeners.get(type)!.delete(fn);
      }
    });
  }
  
  // dispatchEvent メソッドを追加
  if (!element.dispatchEvent) {
    element.dispatchEvent = vi.fn((event: Event) => {
      const type = event.type;
      if (eventListeners.has(type)) {
        eventListeners.get(type)!.forEach(listener => {
          try {
            listener.call(element, event);
          } catch (error) {
            console.error('Error in event listener:', error);
          }
        });
      }
      return true;
    });
  }
  
  // remove メソッドを追加（テストでのクリーンアップ用）
  if (!element.remove) {
    element.remove = vi.fn(() => {
      if (element.id) {
        domElementsById.delete(element.id);
      }
    });
  }
  
  // value プロパティ（入力要素用）
  if (tagName.toLowerCase() === 'input') {
    let value = '';
    Object.defineProperty(element, 'value', {
      get() { return value; },
      set(newValue: string) { value = newValue; },
      enumerable: true,
      configurable: true
    });
  }

  // canvas要素の特別処理
  if (tagName.toLowerCase() === 'canvas') {
    (element as any).width = 300;
    (element as any).height = 150;
    (element as any).getContext = vi.fn((contextType: string) => {
      if (contextType === '2d') {
        return {
          fillText: vi.fn(),
          measureText: vi.fn(() => ({ width: 100 })),
          clearRect: vi.fn(),
          getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(400) })),
          putImageData: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          arc: vi.fn(),
          rect: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          setTransform: vi.fn(),
          transform: vi.fn(),
          createLinearGradient: vi.fn(),
          createRadialGradient: vi.fn(),
          createPattern: vi.fn(),
          font: '',
          textAlign: 'left',
          textBaseline: 'top',
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          lineCap: 'butt',
          lineJoin: 'miter',
          miterLimit: 10,
          globalAlpha: 1,
          globalCompositeOperation: 'source-over'
        };
      }
      return null;
    });
  }
  
  return element;
});

// SVG要素のモック
(global as any).SVGElement = class MockSVGElement {
  setAttribute() {}
  getAttribute() { return null; }
  removeAttribute() {}
  appendChild() {}
  removeChild() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  style = {};
};

// Web Worker のモック
(global as any).Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null
}));

// CompositionEvent のモック
(global as any).CompositionEvent = class MockCompositionEvent extends Event {
  data: string;
  constructor(type: string, options: { data?: string } = {}) {
    super(type);
    this.data = options.data || '';
  }
};

// CustomEvent のモック
(global as any).CustomEvent = class MockCustomEvent extends Event {
  detail: any;
  constructor(type: string, options: { detail?: any } = {}) {
    super(type);
    this.detail = options.detail;
  }
};

// requestAnimationFrame のモック
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

// SVG namespace のモック
document.createElementNS = vi.fn((namespace: string, tagName: string) => {
  const attributes = new Map<string, string>();
  const children: any[] = [];
  const eventListeners = new Map<string, Set<Function>>();
  
  // 通常のHTMLElementを作成してSVG固有のプロパティを追加
  const element = {
    setAttribute: vi.fn((name: string, value: string) => {
      attributes.set(name, value);
      // IDや特定の属性は直接プロパティにも反映
      if (name === 'id') {
        element.id = value;
        // 既に作成済みの要素ならマップに追加
        if (element.id) {
          domElementsById.set(element.id, element);
        }
      }
      if (name === 'class') {
        element.className = value;
      }
    }),
    getAttribute: vi.fn((name: string) => {
      return attributes.get(name) || null;
    }),
    removeAttribute: vi.fn((name: string) => {
      attributes.delete(name);
      if (name === 'id') {
        if (element.id) {
          domElementsById.delete(element.id);
        }
        element.id = '';
      }
      if (name === 'class') {
        element.className = '';
      }
    }),
    appendChild: vi.fn((child: any) => {
      children.push(child);
      child.parentNode = element;
    }),
    removeChild: vi.fn((child: any) => {
      const index = children.indexOf(child);
      if (index > -1) {
        children.splice(index, 1);
        child.parentNode = null;
      }
    }),
    querySelector: vi.fn((selector: string) => {
      // 簡単なID セレクターをサポート
      if (selector.startsWith('#')) {
        const id = selector.substring(1);
        return children.find(child => child.id === id) || null;
      }
      // クラスセレクター
      if (selector.startsWith('.')) {
        const className = selector.substring(1);
        return children.find(child => child.className === className) || null;
      }
      // タグセレクター
      return children.find(child => child.tagName === selector.toUpperCase()) || null;
    }),
    querySelectorAll: vi.fn((selector: string) => {
      if (selector.startsWith('#')) {
        const id = selector.substring(1);
        return children.filter(child => child.id === id);
      }
      if (selector.startsWith('.')) {
        const className = selector.substring(1);
        return children.filter(child => child.className === className);
      }
      return children.filter(child => child.tagName === selector.toUpperCase());
    }),
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const fn = typeof listener === 'function' ? listener : listener.handleEvent;
      if (!eventListeners.has(type)) {
        eventListeners.set(type, new Set());
      }
      eventListeners.get(type)!.add(fn);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const fn = typeof listener === 'function' ? listener : listener.handleEvent;
      if (eventListeners.has(type)) {
        eventListeners.get(type)!.delete(fn);
      }
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const type = event.type;
      if (eventListeners.has(type)) {
        eventListeners.get(type)!.forEach(listener => {
          try {
            listener.call(element, event);
          } catch (error) {
            console.error('Error in event listener:', error);
          }
        });
      }
      return true;
    }),
    textContent: '',
    innerHTML: '',
    id: '',
    className: '',
    tagName: tagName.toUpperCase(),
    style: new Proxy({}, {
      get(target: any, prop: string) {
        return target[prop];
      },
      set(target: any, prop: string, value: any) {
        target[prop] = value;
        return true;
      }
    }),
    parentNode: null,
    // remove メソッドを追加
    remove: vi.fn(() => {
      if (element.id) {
        domElementsById.delete(element.id);
      }
    }),
    // SVG固有のプロパティ
    getBBox: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 })),
    getComputedTextLength: vi.fn(() => 100),
    ownerSVGElement: null,
    viewportElement: null
  };
  
  return element as any;
});

// ResizeObserver のモック
(global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Canvas のモック
(global.HTMLCanvasElement.prototype.getContext as any) = vi.fn((contextType: string) => {
  if (contextType === '2d') {
    return {
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(400) })),
      putImageData: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      setTransform: vi.fn(),
      transform: vi.fn(),
      createLinearGradient: vi.fn(),
      createRadialGradient: vi.fn(),
      createPattern: vi.fn(),
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over'
    };
  }
  return null;
});

// Font loading のモック
(global as any).FontFace = vi.fn().mockImplementation(() => ({
  load: vi.fn().mockResolvedValue(undefined),
  family: 'Arial',
  status: 'loaded'
}));

Object.defineProperty(document, 'fonts', {
  value: {
    add: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    load: vi.fn().mockResolvedValue([]),
    check: vi.fn(() => true),
    ready: Promise.resolve(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  },
  configurable: true
});
