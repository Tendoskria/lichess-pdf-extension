import { extractPage } from "./extractor"

type State = "idle" | "recording"

let state: State = "idle"
let session = { pages: [] as any[] }

export function initUI() {
  // Wait for the element to be available in the DOM
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

function createButton(container: Element) {
  // Create a wrapper for the button to manage state and controls
  const btnWrapper = document.createElement("div")
  btnWrapper.className = "fbt"
  btnWrapper.style.position = "relative"
  btnWrapper.style.display = "inline-block"
  
  const btn = document.createElement("button")
  btn.innerText = "Créer un PDF"
  btn.style.background = "none"
  btn.style.border = "none"
  btn.style.color = "inherit"
  btn.style.font = "inherit"
  btn.style.cursor = "pointer"
  btn.style.padding = "0.5rem 1rem"
  btn.style.borderRadius = "4px"
  btn.style.transition = "background 0.2s"
  
  btn.onmouseenter = () => {
    btn.style.background = "rgba(0,0,0,0.1)"
  }
  btn.onmouseleave = () => {
    btn.style.background = "none"
  }
  
  btn.onclick = async () => {
    if (state === "idle") {
      startRecording(btn, btnWrapper)
    }
  }
  
  btnWrapper.appendChild(btn)
  container.appendChild(btnWrapper)
}

function startRecording(btn: HTMLButtonElement, wrapper: HTMLElement) {
  state = "recording"
  
  // Save the original button text to restore it later
  const originalText = btn.innerText
  
  // Replace the button with recording controls
  wrapper.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center; padding: 0.5rem 1rem;">
      <span style="font-size: 14px;">Création PDF</span>
      <button id="play" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;" title="Ajouter la page">▶️</button>
      <button id="stop" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;" title="Générer le PDF">⏹️</button>
    </div>
  `
  
  const playBtn = wrapper.querySelector("#play") as HTMLButtonElement
  const stopBtn = wrapper.querySelector("#stop") as HTMLButtonElement
  
  if (playBtn) {
    playBtn.onclick = async (e) => {
      e.stopPropagation()
      const data = await extractPage()
      session.pages.push(data)
      console.log(`Page ajoutée (${session.pages.length} pages)`, session)
      
      const originalBg = playBtn.style.background
      playBtn.style.background = "#4caf50"
      setTimeout(() => {
        playBtn.style.background = originalBg
      }, 200)
    }
  }
  
  if (stopBtn) {
    stopBtn.onclick = (e) => {
      e.stopPropagation()
      
      if (session.pages.length === 0) {
        alert("Aucune page enregistrée. Utilisez ▶️ pour ajouter des pages.")
        return
      }
      
      chrome.runtime.sendMessage({
        action: "EXPORT_PDF",
        payload: session
      })
      
      state = "idle"
      session = { pages: [] }
      
      // Restore the original button
      wrapper.innerHTML = ""
      const newBtn = document.createElement("button")
      newBtn.innerText = originalText
      newBtn.style.background = "none"
      newBtn.style.border = "none"
      newBtn.style.color = "inherit"
      newBtn.style.font = "inherit"
      newBtn.style.cursor = "pointer"
      newBtn.style.padding = "0.5rem 1rem"
      newBtn.style.borderRadius = "4px"
      
      newBtn.onmouseenter = () => {
        newBtn.style.background = "rgba(0,0,0,0.1)"
      }
      newBtn.onmouseleave = () => {
        newBtn.style.background = "none"
      }
      newBtn.onclick = async () => {
        if (state === "idle") {
          startRecording(newBtn, wrapper)
        }
      }
      
      wrapper.appendChild(newBtn)
    }
  }
}