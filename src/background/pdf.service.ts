import { jsPDF } from "jspdf"
import type { Session } from "../shared/types"

export async function generatePDF(session: Session) {
  console.log("=== DÉBUT GÉNÉRATION PDF ===")
  console.log("Nombre de pages:", session.pages?.length)
  
  if (!session.pages || session.pages.length === 0) {
    console.warn("⚠️ Aucune page à exporter")
    return
  }
  
  console.log("✅ Génération du PDF avec", session.pages.length, "pages")
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  const imgWidth = pageWidth - 20
  const imgHeight = (imgWidth * 9) / 16
  const imgX = 10
  const imgY = 10
  
  const commentY = imgY + imgHeight + 10
  
  for (let i = 0; i < session.pages.length; i++) {
    const page = session.pages[i]
    
    if (i > 0) {
      doc.addPage()
    }
    
    try {
      if (!page.img) {
        console.error(`❌ Page ${i + 1}: pas d'image`)
        continue
      }
      
      doc.addImage(page.img, "PNG", imgX, imgY, imgWidth, imgHeight)
      
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      
      const comment = page.comment || "Pas de commentaire"
      const lines = doc.splitTextToSize(comment, imgWidth)
      doc.text(lines, imgX, commentY)
      
      doc.setFontSize(8)
      doc.text(
        `Page ${i + 1} / ${session.pages.length}`,
        pageWidth - 20,
        pageHeight - 10
      )
      
    } catch (error) {
      console.error(`❌ Erreur page ${i + 1}:`, error)
    }
  }
  
  const pdfData = doc.output('datauristring')
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `lichess-study-${timestamp}.pdf`
  
  console.log(`📥 Téléchargement du fichier: ${filename}`)
  
  try {
    await chrome.downloads.download({
      url: pdfData,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    })
    console.log(`✅ PDF téléchargé: ${filename}`)
  } catch (error) {
    console.error("❌ Erreur lors du téléchargement:", error)
    throw error
  }
  
  console.log("=== FIN GÉNÉRATION PDF ===")
}