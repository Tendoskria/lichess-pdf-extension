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
      try {
        const data = await extractPage()
        session.pages.push(data)
        
        // Update the page count in the UI
        const counterSpan = wrapper.querySelector("span")
        if (counterSpan) {
          counterSpan.innerText = `${session.pages.length} page(s)`
        }
        
        console.log(`Page ajoutée (${session.pages.length} pages)`, session)
        
        // Visual feedback on button click
        const originalBg = playBtn.style.background
        playBtn.style.background = "#4caf50"
        setTimeout(() => {
          playBtn.style.background = originalBg
        }, 200)
      } catch (error) {
        console.error("Erreur lors de la capture:", error)
        alert("Erreur lors de la capture de la page")
      }
    }
  }
  
  if (stopBtn) {
    stopBtn.onclick = (e) => {
      e.stopPropagation()
      
      if (session.pages.length === 0) {
        alert("Aucune page enregistrée. Utilisez ▶️ pour ajouter des pages.")
        return
      }
      
      // Create a deep copy of the session to ensure immutability
      const sessionCopy = {
        pages: [...session.pages]
      }
      
      console.log("Envoi du message au background...", sessionCopy)
      
      // Send the session data to the background script for PDF generation
      chrome.runtime.sendMessage(
        {
          action: "EXPORT_PDF",
          payload: sessionCopy
        },
        (response) => {
          console.log("Réponse du background:", response)
          if (chrome.runtime.lastError) {
            console.error("Erreur d'envoi:", chrome.runtime.lastError)
            alert("Erreur: " + chrome.runtime.lastError.message)
          } else if (response && response.success) {
            alert(`PDF généré avec ${sessionCopy.pages.length} pages !`)
          }
        }
      )
      
      // Do not reset the session immediately to allow the background script to process it
      setTimeout(() => {
        state = "idle"
        session = { pages: [] }
        restoreButton(wrapper, originalText)
      }, 500)
    }
  }
}

function restoreButton(wrapper: HTMLElement, originalText: string) {
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