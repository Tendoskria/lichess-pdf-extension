import { generatePDF } from "./pdf.service"

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "EXPORT_PDF") {
    generatePDF(msg.payload)
  }
})