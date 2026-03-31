import { jsPDF } from "jspdf"
import type { Session } from "../shared/types"

export function generatePDF(session: Session) {
  if (!session.pages.length) {
    console.warn("Aucune page à exporter")
    return
  }
  
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
  const commentHeight = pageHeight - commentY - 10
  
  session.pages.forEach((page, i) => {
    if (i > 0) {
      doc.addPage()
    }
    
    try {
      doc.addImage(page.img, "PNG", imgX, imgY, imgWidth, imgHeight)
      
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      
      // Manage long comments by splitting them into lines and truncating if necessary
      const lines = doc.splitTextToSize(page.comment, imgWidth)
      const maxLines = Math.floor(commentHeight / 7)
      
      if (lines.length > maxLines) {
        const truncated = lines.slice(0, maxLines - 1)
        truncated.push("...")
        doc.text(truncated, imgX, commentY)
      } else {
        doc.text(lines, imgX, commentY)
      }
      
      // Add page number at the bottom right
      doc.setFontSize(8)
      doc.text(
        `Page ${i + 1} sur ${session.pages.length}`,
        pageWidth - 20,
        pageHeight - 10
      )
      
    } catch (error) {
      console.error(`Erreur lors de l'ajout de la page ${i + 1}:`, error)
    }
  })
  
  // Save the PDF with a timestamped filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  doc.save(`lichess-study-${timestamp}.pdf`)
}