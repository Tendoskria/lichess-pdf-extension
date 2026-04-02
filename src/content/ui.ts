import { extractPage } from "./extractor"
import { extractComment } from "./comment-extractor"

type State = "idle" | "recording"

let state: State = "idle"
let session = { pages: [] as any[] }

export function initUI() {
  const waitForElement = () => {
    const gamebook = document.querySelector('.gamebook')
    if (gamebook) {
      injectExportBar(gamebook)
    } else {
      setTimeout(waitForElement, 500)
    }
  }
  waitForElement()
}

const EXPORT_ICON = "\uE01C"
const ADD_ICON    = "\uE04A"
const ADDED_ICON  = "\uE00D"

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

function injectExportBar(gamebook: Element) {
  if (gamebook.querySelector('.pdf-export-bar')) return

  const bar = document.createElement('div')
  bar.className = 'pdf-export-bar'

  const btn = makeTile(EXPORT_ICON, 'Export PDF')
  btn.classList.add('pdf-export-btn')
  btn.onclick = () => { if (state === "idle") startRecording(bar, gamebook) }

  bar.appendChild(btn)
  gamebook.appendChild(bar)
}

/** Returns true if the given comment is already present in session.pages */
function isCommentAlreadyAdded(comment: string): boolean {
  if (!comment) return false
  return session.pages.some(p => p.comment === comment)
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
  session = { pages: [] }
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

  // Poll the current comment to keep the button state in sync with navigation
  let pollInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (state !== "recording") {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
      return
    }
    // Don't override the "loading" disabled state (while a capture is in progress)
    if (addBtn.disabled && !addBtn.classList.contains('pdf-add-btn--added')) return

    const currentComment = extractComment()
    if (isCommentAlreadyAdded(currentComment)) {
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
    const sessionCopy = { pages: [...session.pages] }
    chrome.runtime.sendMessage({ action: "EXPORT_PDF", payload: sessionCopy }, (response) => {
      if (chrome.runtime.lastError) {
        alert("Erreur : " + chrome.runtime.lastError.message)
      } else if (response?.success) {
        console.log("PDF exporté avec succès.")
      }
    })
    setTimeout(() => {
      state = "idle"
      session = { pages: [] }
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
      bar.innerHTML = ''
      const btn = makeTile(EXPORT_ICON, 'Export PDF')
      btn.classList.add('pdf-export-btn')
      btn.onclick = () => { if (state === "idle") startRecording(bar, gamebook) }
      bar.appendChild(btn)
    }, 500)
  }
}