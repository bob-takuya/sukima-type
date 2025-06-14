// テスト環境のセットアップ
import { vi } from 'vitest';

// DOM APIs のモック
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000'
  }
});

// SVG要素のモック
global.SVGElement = class MockSVGElement {
  setAttribute() {}
  getAttribute() { return null; }
  removeAttribute() {}
  appendChild() {}
  removeChild() {}
  style = {};
};

// Web Worker のモック
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null
}));

// CompositionEvent のモック
global.CompositionEvent = class MockCompositionEvent extends Event {
  data: string;
  constructor(type: string, options: { data?: string } = {}) {
    super(type);
    this.data = options.data || '';
  }
};

// CustomEvent のモック
global.CustomEvent = class MockCustomEvent extends Event {
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
document.createElementNS = vi.fn((namespace, tagName) => {
  const element = document.createElement(tagName);
  return element;
});

// ResizeObserver のモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));
