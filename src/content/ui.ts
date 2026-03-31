import { extractPage } from "./extractor"

type State = "idle" | "recording"

let state: State = "idle"
let session = { pages: [] as any[] }

export function initUI() {
  const btn = document.createElement("button")
  btn.innerText = "Créer un PDF"

  btn.style.position = "fixed"
  btn.style.bottom = "20px"
  btn.style.right = "20px"
  btn.style.zIndex = "9999"

  btn.onclick = async () => {
    if (state === "idle") {
      startRecording(btn)
    }
  }

  document.body.appendChild(btn)
}

function startRecording(btn: HTMLButtonElement) {
  state = "recording"

  btn.innerHTML = `
    Création du PDF<br/>
    <button id="play">▶️</button>
    <button id="stop">⏹️</button>
  `

  document.getElementById("play")!.onclick = async () => {
    const data = await extractPage()
    session.pages.push(data)
    console.log("Page ajoutée", session)
  }

  document.getElementById("stop")!.onclick = () => {
    chrome.runtime.sendMessage({
      action: "EXPORT_PDF",
      payload: session
    })

    state = "idle"
    session = { pages: [] }

    btn.innerText = "Créer un PDF"
  }
}