import { extractPage } from "./extractor"

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

  addBtn.onclick = async (e) => {
    e.stopPropagation()
    if (addBtn.disabled) return
    addBtn.disabled = true
    try {
      const data = await extractPage()
      session.pages.push(data)
      counter.textContent = String(session.pages.length)
    } catch (err) {
      console.error("Erreur capture:", err)
      alert("Erreur lors de la capture de la position.")
    } finally {
      addBtn.disabled = false
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
        alert(`PDF généré — ${sessionCopy.pages.length} page(s).`)
      }
    })
    setTimeout(() => {
      state = "idle"
      session = { pages: [] }
      bar.innerHTML = ''
      const btn = makeTile(EXPORT_ICON, 'Export PDF')
      btn.classList.add('pdf-export-btn')
      btn.onclick = () => { if (state === "idle") startRecording(bar, gamebook) }
      bar.appendChild(btn)
    }, 500)
  }
}