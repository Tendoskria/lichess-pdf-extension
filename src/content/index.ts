import { initUI } from "./ui"

// Wait for the DOM to be fully loaded before initializing the UI
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initUI()
  })
} else {
  initUI()
}