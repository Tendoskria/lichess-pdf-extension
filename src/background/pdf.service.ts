import { jsPDF } from "jspdf"
import type { Session } from "../shared/types"

export function generatePDF(session: Session) {
  const doc = new jsPDF()

  session.pages.forEach((page, i) => {
    doc.addImage(page.img, "PNG", 10, 10, 180, 100)
    doc.text(page.comment, 10, 120)

    if (i < session.pages.length - 1) {
      doc.addPage()
    }
  })

  doc.save("lichess-study.pdf")
}