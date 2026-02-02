import '@testing-library/jest-dom/vitest';

// Next.js sometimes relies on these existing in the browser runtime.
// Vitest's jsdom is close, but these small shims reduce flaky tests.
if (!globalThis.TextEncoder) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('node:util');
  (globalThis as any).TextEncoder = TextEncoder;
  (globalThis as any).TextDecoder = TextDecoder;
}

// Basic matchMedia mock (useful for components that check color scheme)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
