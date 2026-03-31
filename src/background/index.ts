import { generatePDF } from "./pdf.service"

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("📨 Background a reçu un message:", msg.action)
  console.log("📦 Payload reçu:", msg.payload)
  console.log("📄 Nombre de pages dans le payload:", msg.payload?.pages?.length)
  
  if (msg.action === "EXPORT_PDF") {
    try {
      if (!msg.payload || !msg.payload.pages || msg.payload.pages.length === 0) {
        console.error("❌ Payload invalide ou vide")
        sendResponse({ success: false, error: "No pages to export" })
        return true
      }
      
      console.log("✅ Lancement de la génération PDF...")
      generatePDF(msg.payload)
      console.log("✅ PDF généré avec succès")
      sendResponse({ success: true, pageCount: msg.payload.pages.length })
    } catch (error) {
      console.error("❌ Erreur lors de la génération du PDF:", error)
      sendResponse({ success: false, error: String(error) })
    }
    return true
  }
})

console.log("Background service worker démarré et à l'écoute des messages...")