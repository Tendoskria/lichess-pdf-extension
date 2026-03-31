import { jsPDF } from "jspdf"
import type { Session } from "../shared/types"

export async function generatePDF(session: Session) {
  console.log("=== DÉBUT GÉNÉRATION PDF ===")
  console.log("Nombre de pages:", session.pages?.length)
  
  if (!session.pages || session.pages.length === 0) {
    console.warn("⚠️ Aucune page à exporter")
    return
  }
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  const margin = 15
  const imgWidth = pageWidth - (margin * 2)
  const imgHeight = 85
  const imgX = margin
  const imgY = margin
  
  const commentX = margin
  const commentY = imgY + imgHeight + 8
  const commentWidth = imgWidth
  const commentMaxHeight = pageHeight - commentY - margin
  
  for (let i = 0; i < session.pages.length; i++) {
    const page = session.pages[i]
    
    if (i > 0) {
      doc.addPage()
    }
    
    try {
      // Ajouter l'image
      if (page.img) {
        doc.addImage(page.img, "PNG", imgX, imgY, imgWidth, imgHeight)
      }
      
      // Ajouter le commentaire
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      
      let comment = page.comment || "Pas de commentaire"
      
      // Nettoyer le commentaire des caractères problématiques
      comment = comment
        .replace(/[^\x20-\x7E\u00C0-\u00FF\u0100-\u017F\u2018\u2019\u201C\u201D]/g, '')
        .replace(/[\u0000-\u001F]/g, '')
        .trim()
      
      // Découper le texte en lignes
      const lines = doc.splitTextToSize(comment, commentWidth)
      const lineHeight = 5
      
      // Calculer combien de lignes peuvent tenir
      const maxLines = Math.floor(commentMaxHeight / lineHeight)
      
      if (lines.length <= maxLines) {
        // Tout le texte tient
        doc.text(lines, commentX, commentY)
      } else {
        // Afficher les premières lignes et ajouter un indicateur
        const visibleLines = lines.slice(0, maxLines - 1)
        doc.text(visibleLines, commentX, commentY)
        
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        const remainingLines = lines.length - (maxLines - 1)
        doc.text(`... (${remainingLines} lignes supplémentaires dans l'étude originale)`, 
                 commentX, commentY + (maxLines - 1) * lineHeight + 2)
        doc.setTextColor(0, 0, 0)
      }
      
      // Numéro de page
      doc.setFontSize(8)
      doc.text(
        `${i + 1} / ${session.pages.length}`,
        pageWidth - margin,
        pageHeight - margin / 2,
        { align: "right" }
      )
      
    } catch (error) {
      console.error(`❌ Erreur page ${i + 1}:`, error)
    }
  }
  
  // Téléchargement
  const pdfData = doc.output('datauristring')
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `lichess-study-${timestamp}.pdf`
  
  try {
    await chrome.downloads.download({
      url: pdfData,
      filename: filename,
      conflictAction: 'uniquify'
    })
    console.log(`✅ PDF téléchargé: ${filename}`)
  } catch (error) {
    console.error("❌ Erreur téléchargement:", error)
  }
}