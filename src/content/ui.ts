import { extractPage } from "./extractor"
import { extractComment, } from "./comment-extractor"
import { extractBoardFingerprint } from "./extractor"

type State = "idle" | "recording"

let state: State = "idle"
let session = { pages: [] as any[], title: "" }

/**
 * Returns true when the extension context is still alive.
 * After an extension reload/update, chrome.runtime.id becomes undefined and
 * any call to chrome.runtime.sendMessage throws "Extension context invalidated".
 */
function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

/**
 * Safe wrapper around chrome.runtime.sendMessage.
 * Shows a user-friendly message instead of throwing when the context is gone.
 */
function safeSendMessage(
  message: unknown,
  callback: (response: any) => void
): void {
  if (!isExtensionContextValid()) {
    alert(
      "L'extension a été rechargée. Veuillez rafraîchir la page (F5) pour continuer."
    )
    return
  }
  try {
    chrome.runtime.sendMessage(message, callback)
  } catch (err) {
    console.error("chrome.runtime.sendMessage failed:", err)
    alert(
      "L'extension a été rechargée. Veuillez rafraîchir la page (F5) pour continuer."
    )
  }
}

export function initUI() {
  const waitForElement = () => {
    const analyseUnderboard = document.querySelector('.analyse__underboard')
    if (analyseUnderboard) {
      injectExportBar(analyseUnderboard)
    } else {
      setTimeout(waitForElement, 500)
    }
  }
  waitForElement()
}

const EXPORT_ICON = "\uE01C"
const ADD_ICON = "\uE04A"
const ADDED_ICON = "\uE00D"

function makeIcon(glyph: string): HTMLElement {
  const i = document.createElement('i')
  i.setAttribute('data-icon', glyph)
  i.className = 'pdf-tile-icon'
  return i
}

function makeTile(icon: string, label: string, extraClass = ''): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = ['pdf-tile', extraClass].filter(Boolean).join(' ')
  btn.appendChild(makeIcon(icon))
  const span = document.createElement('span')
  span.textContent = label
  btn.appendChild(span)
  return btn
}

function injectExportBar(element: Element) {
  if (element.querySelector('.pdf-export-bar')) return

  const bar = document.createElement('div')
  bar.className = 'pdf-export-bar'

  const btn = makeTile(EXPORT_ICON, 'Export PDF')
  btn.classList.add('pdf-export-btn')
  btn.onclick = () => { if (state === "idle") startRecording(bar, element) }

  bar.appendChild(btn)
  element.insertBefore(bar, element.firstChild)
}

/**
 * Returns true if the current board position has already been captured.
 * A position is considered a duplicate only when BOTH the comment AND the
 * board fingerprint match a previously saved page.
 *
 * Special cases:
 *  - If the comment is non-empty but the fingerprint is empty (board not
 *    found), fall back to comment-only matching to stay safe.
 *  - If both are empty, never report as already-added (avoids false positives
 *    on blank positions).
 */
function isCurrentPositionAlreadyAdded(comment: string, fingerprint: string): boolean {
  if (!comment && !fingerprint) return false

  return session.pages.some(p => {
    const commentMatch = p.comment === comment
    const fingerprintMatch = p.boardFingerprint === fingerprint

    // Both fields populated → require both to match
    if (fingerprint && p.boardFingerprint) return commentMatch && fingerprintMatch

    // Fingerprint unavailable on one side → fall back to comment only
    return commentMatch
  })
}

/** Switches addBtn to the "Ajouté" (already-added) visual state */
function setAddedState(addBtn: HTMLButtonElement) {
  addBtn.classList.add('pdf-add-btn--added')
  const icon = addBtn.querySelector('.pdf-tile-icon')!
  icon.setAttribute('data-icon', ADDED_ICON)
  const span = addBtn.querySelector('span')!
  span.textContent = 'Ajouté'
  addBtn.disabled = true
}

/** Switches addBtn back to the normal "Ajouter" state */
function setNormalState(addBtn: HTMLButtonElement) {
  addBtn.classList.remove('pdf-add-btn--added')
  const icon = addBtn.querySelector('.pdf-tile-icon')!
  icon.setAttribute('data-icon', ADD_ICON)
  const span = addBtn.querySelector('span')!
  span.textContent = 'Ajouter'
  addBtn.disabled = false
}

function startRecording(bar: HTMLElement, gamebook: Element) {
  state = "recording"
  session = { pages: [], title: "" }
  bar.innerHTML = ''
  
  const counter = document.createElement('span')
  counter.className = 'pdf-controls__count'
  counter.textContent = '0'
  
  const addBtn = makeTile(ADD_ICON, 'Ajouter')
  addBtn.classList.add('pdf-add-btn')
  
  const genBtn = makeTile(EXPORT_ICON, 'Générer')
  genBtn.classList.add('pdf-gen-btn')
  
  bar.appendChild(counter)
  bar.appendChild(addBtn)
  bar.appendChild(genBtn)

  session.title = document.querySelector('title')?.textContent || "Lichess Analysis"

  // Poll the current position (comment + board) to keep the button state in
  // sync with the user navigating through moves.
  let pollInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
    // Stop polling silently if the extension context has been invalidated
    if (!isExtensionContextValid()) {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
      return
    }

    if (state !== "recording") {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
      return
    }
    // Don't override the "loading" disabled state (while a capture is in progress)
    if (addBtn.disabled && !addBtn.classList.contains('pdf-add-btn--added')) return

    const currentComment = extractComment()
    const currentFingerprint = extractBoardFingerprint()

    if (isCurrentPositionAlreadyAdded(currentComment, currentFingerprint)) {
      setAddedState(addBtn)
    } else {
      setNormalState(addBtn)
    }
  }, 300)

  addBtn.onclick = async (e) => {
    e.stopPropagation()
    if (addBtn.disabled) return

    // Temporarily disable while capturing (normal disabled, not "added")
    addBtn.classList.remove('pdf-add-btn--added')
    addBtn.disabled = true

    try {
      const data = await extractPage()
      session.pages.push(data)
      counter.textContent = String(session.pages.length)
      // After capture, mark as added immediately
      setAddedState(addBtn)
    } catch (err) {
      console.error("Erreur capture:", err)
      alert("Erreur lors de la capture de la position.")
      setNormalState(addBtn)
    }
  }

  genBtn.onclick = (e) => {
    e.stopPropagation()
    if (session.pages.length === 0) {
      alert("Aucune page enregistrée. Utilisez « Ajouter » pour capturer des positions.")
      return
    }
    const sessionCopy = { pages: [...session.pages], title: session.title }

    safeSendMessage({ action: "EXPORT_PDF", payload: sessionCopy }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Erreur lors de l'export du PDF:", chrome.runtime.lastError.message)
      } else if (response?.success) {
        console.log("PDF exporté avec succès.")
      }
    })

    setTimeout(() => {
      state = "idle"
      session = { pages: [], title: "" }
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
      bar.innerHTML = ''
      const btn = makeTile(EXPORT_ICON, 'Export PDF')
      btn.classList.add('pdf-export-btn')
      btn.onclick = () => { if (state === "idle") startRecording(bar, gamebook) }
      bar.appendChild(btn)
    }, 500)
  }
}