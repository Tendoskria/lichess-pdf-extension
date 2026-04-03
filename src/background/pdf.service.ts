import { jsPDF } from "jspdf"
import type { Session } from "../shared/types"

/* ────────────────────────────────────────────────────────────
  PAGE & LAYOUT CONFIG
──────────────────────────────────────────────────────────── */
const PAGE = {
  width: 210,
  height: 297,
  margin: {
    outer: 14,
    top: 14,
    bottom: 10,
  },
  headerHeight: 8,
  columnGap: 8,
}

const COLUMN = {
  width: (PAGE.width - PAGE.margin.outer * 2 - PAGE.columnGap) / 2,
}

const BOARD = {
  size: Math.round(COLUMN.width * 0.5),
}

const TEXT = {
  fontSize: 8.5,
  lineHeight: 4,
  padding: 1,
}

const SPACING = {
  afterBoard: 4,
  afterBlock: 6,
}

const CONTENT = {
  top: PAGE.margin.top + PAGE.headerHeight,
  bottom: PAGE.height - PAGE.margin.bottom - 4,
}

/* ────────────────────────────────────────────────────────────
  HELPERS
──────────────────────────────────────────────────────────── */
const getColumnX = (col: 0 | 1) =>
  col === 0
    ? PAGE.margin.outer
    : PAGE.margin.outer + COLUMN.width + PAGE.columnGap

const getTextWidth = () => COLUMN.width - TEXT.padding * 2

const getImageFormat = (dataUri: string): "JPEG" | "PNG" =>
  dataUri.startsWith("data:image/jpeg") ? "JPEG" : "PNG"

/* ────────────────────────────────────────────────────────────
  TEXT SANITIZATION
──────────────────────────────────────────────────────────── */
function sanitize(text: string): string {
  return (text ?? "")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2212/g, "-")
    .replace(/\u00B1/g, "+/-")
    .replace(/[^\x20-\x7E\u00C0-\u00FF\u0100-\u017F\n\r]/g, "")
    .replace(/  +/g, " ")
    .trim()
}

/* ────────────────────────────────────────────────────────────
  TEXT LAYOUT
──────────────────────────────────────────────────────────── */
function wrapText(doc: jsPDF, text: string): string[] {
  const safeText = sanitize(text)
  if (!safeText) return []

  doc.setFont("helvetica", "normal")
  doc.setFontSize(TEXT.fontSize)

  const paragraphs = safeText.split("\n")

  return paragraphs.flatMap(p =>
    doc.splitTextToSize(p, getTextWidth())
  )
}

function computeBlockHeight(doc: jsPDF, comment: string): number {
  const lines = wrapText(doc, comment)
  const textHeight = lines.length
    ? SPACING.afterBoard + lines.length * TEXT.lineHeight
    : 0

  return BOARD.size + textHeight + SPACING.afterBlock
}

/* ────────────────────────────────────────────────────────────
  DRAWING UTILITIES
──────────────────────────────────────────────────────────── */
function drawPlaceholder(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(240, 240, 240)
  doc.rect(x, y, BOARD.size, BOARD.size, "FD")
}

function drawImage(doc: jsPDF, img: string | undefined, x: number, y: number) {
  if (!img) return drawPlaceholder(doc, x, y)

  try {
    doc.addImage(img, getImageFormat(img), x, y, BOARD.size, BOARD.size)
  } catch {
    drawPlaceholder(doc, x, y)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text("(image manquante)", x + BOARD.size / 2, y + BOARD.size / 2, {
      align: "center",
    })
    doc.setTextColor(0, 0, 0)
  }
}

function drawTextBlock(
  doc: jsPDF,
  textLines: string[],
  x: number,
  startY: number
): number {
  let y = startY

  if (!textLines.length) return y

  y += SPACING.afterBoard

  doc.setFont("helvetica", "normal")
  doc.setFontSize(TEXT.fontSize)
  doc.setTextColor(15, 15, 15)

  for (const line of textLines) {
    doc.text(line, x + TEXT.padding, y)
    y += TEXT.lineHeight
  }

  return y
}

function drawSeparator(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(x, y, x + COLUMN.width, y)
}

/* ────────────────────────────────────────────────────────────
  BLOCK RENDERING
──────────────────────────────────────────────────────────── */
function drawBlock(
  doc: jsPDF,
  columnX: number,
  startY: number,
  img: string | undefined,
  comment: string
): number {
  const boardX = columnX + (COLUMN.width - BOARD.size) / 2

  drawImage(doc, img, boardX, startY)

  let y = startY + BOARD.size

  const lines = wrapText(doc, comment)
  y = drawTextBlock(doc, lines, columnX, y)

  y += 2
  drawSeparator(doc, columnX, y)

  return y + (SPACING.afterBlock - 2)
}

/* ────────────────────────────────────────────────────────────
  HEADER & FOOTER
──────────────────────────────────────────────────────────── */
function drawHeader(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "italic")
  doc.setFontSize(7.5)
  doc.setTextColor(90, 90, 90)

  doc.text(title, PAGE.width / 2, PAGE.margin.top, { align: "center" })

  doc.setDrawColor(130, 130, 130)
  doc.setLineWidth(0.3)
  doc.line(
    PAGE.margin.outer,
    PAGE.margin.top + 2.5,
    PAGE.width - PAGE.margin.outer,
    PAGE.margin.top + 2.5
  )

  doc.setTextColor(0, 0, 0)
}

function drawPageNumber(doc: jsPDF, current: number, total: number) {
  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)

  doc.text(
    `${current} / ${total}`,
    PAGE.width - PAGE.margin.outer,
    PAGE.height - PAGE.margin.bottom / 2,
    { align: "right" }
  )

  doc.setTextColor(0, 0, 0)
}

/* ────────────────────────────────────────────────────────────
  COVER PAGE
──────────────────────────────────────────────────────────── */
function drawCoverPage(doc: jsPDF, title: string) {
  const centerX = PAGE.width / 2
  const centerY = PAGE.height / 2

  // Dark background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, PAGE.width, PAGE.height, "F")

  // Wrap title lines
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  const titleLines: string[] = doc.splitTextToSize(title, PAGE.width - PAGE.margin.outer * 4)
  const lineSpacing = 10
  const totalTextHeight = (titleLines.length - 1) * lineSpacing
  const titleTop = centerY - totalTextHeight / 2

  // Decorative top line
  doc.setDrawColor(180, 150, 80)
  doc.setLineWidth(0.5)
  doc.line(PAGE.margin.outer, titleTop - 12, PAGE.width - PAGE.margin.outer, titleTop - 12)

  // Title text
  doc.setTextColor(20, 20, 20)
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, centerX, titleTop + i * lineSpacing, { align: "center" })
  })

  // Decorative bottom line
  const titleBottom = titleTop + totalTextHeight
  doc.line(PAGE.margin.outer, titleBottom + 10, PAGE.width - PAGE.margin.outer, titleBottom + 10)

  // Date subtitle
  const date = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(130, 120, 100)
  doc.text(date, centerX, titleBottom + 18, { align: "center" })

  // Reset
  doc.setTextColor(0, 0, 0)
}

/* ────────────────────────────────────────────────────────────
  MAIN GENERATOR
──────────────────────────────────────────────────────────── */
export async function generatePDF(session: Session) {
  if (!session.pages?.length) {
    console.warn("⚠️ No content to export")
    return
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const title = sanitize(session.title || "Lichess Study")

  // Cover page (page 1 — not numbered)
  drawCoverPage(doc, title)
  doc.addPage()

  let pageNumber = 1
  let columnIndex: 0 | 1 = 0
  let cursorY: [number, number] = [CONTENT.top, CONTENT.top]

  drawHeader(doc, title)

  for (const block of session.pages) {
    const comment = block.comment ?? ""
    const height = computeBlockHeight(doc, comment)

    // Handle overflow
    if (cursorY[columnIndex] + height > CONTENT.bottom) {
      if (columnIndex === 0) {
        columnIndex = 1
      } else {
        doc.addPage()
        pageNumber++
        drawHeader(doc, title)

        cursorY = [CONTENT.top, CONTENT.top]
        columnIndex = 0
      }
    }

    const newY = drawBlock(
      doc,
      getColumnX(columnIndex),
      cursorY[columnIndex],
      block.img,
      comment
    )

    cursorY[columnIndex] = newY
  }

  // Page numbers (skip cover page which is doc page 1)
  for (let i = 1; i <= pageNumber; i++) {
    doc.setPage(i + 1) // offset by 1 to skip the cover
    drawPageNumber(doc, i, pageNumber)
  }

  const pdf = doc.output("datauristring")
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")

  await chrome.downloads.download({
    url: pdf,
    filename: `lichess-study-${timestamp}.pdf`,
    conflictAction: "uniquify",
  })
}