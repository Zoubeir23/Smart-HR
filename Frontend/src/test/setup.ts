/// <reference types="vitest/globals" />
import "@testing-library/jest-dom";

// Node 22+ expose un `localStorage` global natif (gated derrière --localstorage-file)
// qui masque celui de jsdom et casse `localStorage.getItem`. On installe un mock
// déterministe sur window ET globalThis pour garantir un Storage fonctionnel.
function createStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

Object.defineProperty(window, "localStorage", {
  configurable: true,
  writable: true,
  value: createStorageMock(),
});
Object.defineProperty(window, "sessionStorage", {
  configurable: true,
  writable: true,
  value: createStorageMock(),
});
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: window.localStorage,
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  writable: true,
  value: window.sessionStorage,
});

// jsdom n'implémente pas ResizeObserver — nécessaire pour tout composant
// utilisant Recharts (ResponsiveContainer l'utilise pour mesurer son conteneur).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
});
Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
});

// jsdom n'implémente pas IntersectionObserver — nécessaire pour framer-motion
// (`useInView`, utilisé par ex. par AnimatedCounter sur LandingPage).
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(window, "IntersectionObserver", {
  configurable: true,
  writable: true,
  value: IntersectionObserverMock,
});
Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  writable: true,
  value: IntersectionObserverMock,
});

// jsdom n'implémente pas Element.scrollIntoView — utilisé pour dérouler
// automatiquement le fil de discussion de la messagerie sur un nouveau message.
Object.defineProperty(window.Element.prototype, "scrollIntoView", {
  configurable: true,
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
