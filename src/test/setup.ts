import '@testing-library/jest-dom'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Reset window.location.hash before each test
beforeEach(() => {
  window.location.hash = ''
  vi.clearAllMocks()
})

// Mock window.history.pushState to prevent navigation errors in tests
const originalPushState = window.history.pushState
beforeEach(() => {
  window.history.pushState = vi.fn((state, title, url) => {
    if (typeof url === 'string') {
      // Extract hash from URL and update location.hash
      const hashIndex = url.indexOf('#')
      if (hashIndex !== -1) {
        window.location.hash = url.slice(hashIndex)
      } else {
        window.location.hash = ''
      }
    }
    return originalPushState.call(window.history, state, title, url)
  })
})

afterEach(() => {
  window.history.pushState = originalPushState
})

// Mock window.history.replaceState similarly
const originalReplaceState = window.history.replaceState
beforeEach(() => {
  window.history.replaceState = vi.fn((state, title, url) => {
    if (typeof url === 'string') {
      const hashIndex = url.indexOf('#')
      if (hashIndex !== -1) {
        window.location.hash = url.slice(hashIndex)
      }
    }
    return originalReplaceState.call(window.history, state, title, url)
  })
})

afterEach(() => {
  window.history.replaceState = originalReplaceState
})
