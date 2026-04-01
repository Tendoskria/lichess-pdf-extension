import { jsPDF } from "jspdf"
import type { Session } from "../shared/types"

// ─── A4 page dimensions (mm) ──────────────────────────────────────────────────
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_OUTER = 14
const MARGIN_TOP = 14
const MARGIN_BOTTOM = 10
const COL_GAP = 8
const HEADER_H = 8

const COL_W = (PAGE_W - MARGIN_OUTER * 2 - COL_GAP) / 2  // ≈ 83 mm
const CONTENT_TOP = MARGIN_TOP + HEADER_H
const CONTENT_BOT = PAGE_H - MARGIN_BOTTOM - 4

const BOARD_W = Math.round(COL_W * 0.5)
const BOARD_H = BOARD_W

const FONT_SIZE = 8.5
const LINE_H = 4.0   // mm per line
const TEXT_PADDING = 1          // mm, ensures text stays inside column
const TEXT_W = COL_W - TEXT_PADDING * 2  // wrap width accounts for left+right padding
const AFTER_BOARD = 4     // gap board → text (increased padding)
const AFTER_BLOCK = 6     // gap text → next block

function colX(col: 0 | 1): number {
  return col === 0 ? MARGIN_OUTER : MARGIN_OUTER + COL_W + COL_GAP
}

function sanitise(text: string): string {
  return (text ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2212/g, "-")
    .replace(/\u00B1/g, "+/-")
    .replace(/[^\x20-\x7E\u00C0-\u00FF\u0100-\u017F]/g, "")
    .replace(/  +/g, " ")
    .trim()
}

function wrapComment(doc: jsPDF, comment: string): string[] {
  const safe = sanitise(comment)
  if (!safe) return []
  // Font must be set before splitTextToSize so jsPDF measures with correct metrics
  doc.setFontSize(FONT_SIZE)
  doc.setFont("helvetica", "normal")
  return doc.splitTextToSize(safe, TEXT_W) as string[]
}

// blockHeight and drawBlock use IDENTICAL arithmetic — no drift possible
function blockHeight(doc: jsPDF, comment: string): number {
  const lines = wrapComment(doc, comment)
  const textH = lines.length > 0 ? AFTER_BOARD + lines.length * LINE_H : 0
  // board + text + separator(2) + trailing gap(AFTER_BLOCK-2) = board + text + AFTER_BLOCK
  return BOARD_H + textH + AFTER_BLOCK
}

function drawBlock(
  doc: jsPDF,
  x: number,
  y: number,
  imgData: string | undefined,
  comment: string
): number {
  // Center the board horizontally within the column
  const boardX = x + (COL_W - BOARD_W) / 2

  // Board
  if (imgData) {
    try {
      doc.addImage(imgData, "PNG", boardX, y, BOARD_W, BOARD_H)
    } catch {
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(240, 240, 240)
      doc.rect(boardX, y, BOARD_W, BOARD_H, "FD")
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text("(image manquante)", boardX + BOARD_W / 2, y + BOARD_H / 2, { align: "center" })
      doc.setTextColor(0, 0, 0)
    }
  } else {
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(240, 240, 240)
    doc.rect(boardX, y, BOARD_W, BOARD_H, "FD")
  }

  let curY = y + BOARD_H

  // Comment
  const lines = wrapComment(doc, comment)
  if (lines.length > 0) {
    curY += AFTER_BOARD
    doc.setFontSize(FONT_SIZE)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(15, 15, 15)
    for (const line of lines) {
      doc.text(line, x + TEXT_PADDING, curY)
      curY += LINE_H
    }

  }

  // Separator rule
  curY += 2
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(x, curY, x + COL_W, curY)
  curY += (AFTER_BLOCK - 2)

  return curY
}

function drawPageHeader(doc: jsPDF, title: string): void {
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(90, 90, 90)
  doc.text(title, PAGE_W / 2, MARGIN_TOP, { align: "center" })
  doc.setDrawColor(130, 130, 130)
  doc.setLineWidth(0.3)
  doc.line(MARGIN_OUTER, MARGIN_TOP + 2.5, PAGE_W - MARGIN_OUTER, MARGIN_TOP + 2.5)
  doc.setTextColor(0, 0, 0)
}

function drawPageNumber(doc: jsPDF, current: number, total: number): void {
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(130, 130, 130)
  doc.text(`${current} / ${total}`, PAGE_W - MARGIN_OUTER, PAGE_H - MARGIN_BOTTOM / 2, { align: "right" })
  doc.setTextColor(0, 0, 0)
}

export async function generatePDF(session: Session) {
  console.log("=== DÉBUT GÉNÉRATION PDF (2-colonnes) ===")
  console.log("Nombre de blocs:", session.pages?.length)

  if (!session.pages || session.pages.length === 0) {
    console.warn("⚠️ Aucune page à exporter")
    return
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const title = sanitise("Lichess Study")
  const blocks = session.pages

  let currentPdfPage = 1
  let currentCol: 0 | 1 = 0
  let colY: [number, number] = [CONTENT_TOP, CONTENT_TOP]

  drawPageHeader(doc, title)

  for (let i = 0; i < blocks.length; i++) {
    const page = blocks[i]
    const comment = page.comment ?? ""
    const bh = blockHeight(doc, comment)

    if (colY[currentCol] + bh > CONTENT_BOT) {
      if (currentCol === 0) {
        currentCol = 1
      } else {
        doc.addPage()
        currentPdfPage++
        drawPageHeader(doc, title)
        colY = [CONTENT_TOP, CONTENT_TOP]
        currentCol = 0
      }
    }

    const newY = drawBlock(doc, colX(currentCol), colY[currentCol], page.img, comment)
    colY[currentCol] = newY
  }

  const totalPdfPages = currentPdfPage
  for (let p = 1; p <= totalPdfPages; p++) {
    doc.setPage(p)
    drawPageNumber(doc, p, totalPdfPages)
  }

  const pdfData = doc.output("datauristring")
  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  const filename = `lichess-study-${ts}.pdf`

  try {
    await chrome.downloads.download({ url: pdfData, filename, conflictAction: "uniquify" })
    console.log(`✅ PDF téléchargé: ${filename}`)
  } catch (error) {
    console.error("❌ Erreur téléchargement:", error)
  }
}