// テスト環境のセットアップ
import { vi } from 'vitest';

// DOM APIs のモック
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000'
  }
});

// SVG要素のモック - 型エラーを避けるためanyを使用
(global as any).SVGElement = class MockSVGElement {
  setAttribute() {}
  getAttribute() { return null; }
  removeAttribute() {}
  appendChild(node: any) { return node; }
  removeChild(node: any) { return node; }
  style = {} as any;
  ownerSVGElement = null;
  viewportElement = null;
  className = '';
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
  detail: any;
  view: any;
  which: number;
  constructor(type: string, options: { data?: string } = {}) {
    super(type);
    this.data = options.data || '';
    this.detail = null;
    this.view = null;
    this.which = 0;
  }
  initCompositionEvent() {}
  initUIEvent() {}
};

// CustomEvent のモック
(global as any).CustomEvent = class MockCustomEvent extends Event {
  detail: any;
  constructor(type: string, options: { detail?: any } = {}) {
    super(type);
    this.detail = options.detail;
  }
  initCustomEvent() {}
};

// requestAnimationFrame のモック
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

// SVG namespace のモック
(document as any).createElementNS = vi.fn((namespace, tagName) => {
  const element = document.createElement(tagName);
  (element as any).ownerSVGElement = null;
  (element as any).viewportElement = null;
  return element;
});

// ResizeObserver のモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));
