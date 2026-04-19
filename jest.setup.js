// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.getComputedStyle for Ant Design Modal
const originalGetComputedStyle = window.getComputedStyle
window.getComputedStyle = (elt, pseudoElt) => {
  if (pseudoElt) {
    return originalGetComputedStyle(elt)
  }
  return originalGetComputedStyle(elt)
}
