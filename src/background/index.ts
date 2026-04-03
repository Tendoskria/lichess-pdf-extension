import { generatePDF } from "./pdf.service"

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "EXPORT_PDF") {
    try {
      if (!msg.payload || !msg.payload.pages || msg.payload.pages.length === 0 || msg.payload.title === undefined) {
        console.error("❌ Payload invalide ou vide")
        sendResponse({ success: false, error: "No pages to export" })
        return true
      }

      generatePDF(msg.payload).then(() => {
        console.log("✅ PDF généré avec succès")
        sendResponse({ success: true, pageCount: msg.payload.pages.length })
      })
    } catch (error) {
      console.error("❌ Erreur lors de la génération du PDF:", error)
      sendResponse({ success: false, error: String(error) })
    }
    return true
  }
})
