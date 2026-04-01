import { extractPage } from "./extractor"

type State = "idle" | "recording"

let state: State = "idle"
let session = { pages: [] as any[] }

export function initUI() {
  const waitForElement = () => {
    const container = document.querySelector('.gamebook-buttons')
    if (container) {
      createButton(container)
    } else {
      setTimeout(waitForElement, 500)
    }
  }
  waitForElement()
}

const SVG_ADD = `<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor">
  <rect x="4.25" y="0" width="1.5" height="10" rx=".75"/>
  <rect x="0" y="4.25" width="10" height="1.5" rx=".75"/>
</svg>`

const SVG_STOP = `<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor">
  <rect x="1" y="1" width="8" height="8" rx="1"/>
</svg>`

function createButton(container: Element) {
  const wrapper = document.createElement("div")
  wrapper.className = "lichess-pdf-btn-wrapper fbt"

  const btn = document.createElement("button")
  btn.className = "lichess-pdf-btn"
  btn.innerHTML = `<span class="lichess-pdf-icon" data-icon="&#xe01c;"></span>Export PDF`

  btn.onclick = () => {
    if (state === "idle") startRecording(wrapper)
  }

  wrapper.appendChild(btn)
  container.appendChild(wrapper)
}

function startRecording(wrapper: HTMLElement) {
  state = "recording"
  session = { pages: [] }

  wrapper.innerHTML = `
    <div class="pdf-controls">
      <span class="pdf-controls__label">PDF</span>
      <span class="pdf-controls__count" id="pdf-count">0</span>
      <button class="pdf-controls__btn pdf-controls__btn--add" id="pdf-add" title="Capturer cette position">
        ${SVG_ADD} Ajouter
      </button>
      <button class="pdf-controls__btn pdf-controls__btn--generate" id="pdf-stop" title="Générer le PDF">
        ${SVG_STOP} Générer
      </button>
    </div>
  `

  const addBtn  = wrapper.querySelector("#pdf-add")  as HTMLButtonElement
  const stopBtn = wrapper.querySelector("#pdf-stop") as HTMLButtonElement
  const counter = wrapper.querySelector("#pdf-count") as HTMLSpanElement

  addBtn.onclick = async (e) => {
    e.stopPropagation()
    if (addBtn.disabled) return

    // Disable the button immediately to prevent multiple clicks while processing
    addBtn.disabled = true
    addBtn.classList.add("loading")

    try {
      const data = await extractPage()
      session.pages.push(data)
      counter.textContent = String(session.pages.length)

      addBtn.classList.remove("loading")
      addBtn.disabled = false

      console.log(`Page ajoutée (${session.pages.length} pages)`)
    } catch (err) {
      console.error("Erreur capture:", err)
      addBtn.classList.remove("loading")
      addBtn.disabled = false
      alert("Erreur lors de la capture de la position.")
    }
  }

  stopBtn.onclick = (e) => {
    e.stopPropagation()

    if (session.pages.length === 0) {
      alert("Aucune page enregistrée. Utilisez « Ajouter » pour capturer des positions.")
      return
    }

    const sessionCopy = { pages: [...session.pages] }

    chrome.runtime.sendMessage(
      { action: "EXPORT_PDF", payload: sessionCopy },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Erreur envoi:", chrome.runtime.lastError)
          alert("Erreur : " + chrome.runtime.lastError.message)
        } else if (response?.success) {
          alert(`PDF généré — ${sessionCopy.pages.length} page(s).`)
        }
      }
    )

    setTimeout(() => {
      state = "idle"
      session = { pages: [] }
      restoreButton(wrapper)
    }, 500)
  }
}

function restoreButton(wrapper: HTMLElement) {
  wrapper.innerHTML = ""
  const btn = document.createElement("button")
  btn.className = "lichess-pdf-btn"
  btn.innerHTML = `<span class="lichess-pdf-icon" data-icon="&#xe01c;"></span>Export PDF`
  btn.onclick = () => {
    if (state === "idle") startRecording(wrapper)
  }
  wrapper.appendChild(btn)
}