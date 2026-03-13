import '@testing-library/jest-dom';

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock hasPointerCapture for Radix UI components
Element.prototype.hasPointerCapture = function () {
  return false;
};

Element.prototype.releasePointerCapture = function () {};
Element.prototype.setPointerCapture = function () {};
Element.prototype.scrollIntoView = function () {};
