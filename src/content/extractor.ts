import html2canvas from "html2canvas"
import { extractComment } from "./comment-extractor"

/**
 * Builds a lightweight fingerprint of the current board state by reading
 * every <piece> element's class (piece type + colour) and its CSS transform
 * (position).  The result is a stable, sorted string that uniquely identifies
 * a board position without requiring a second canvas render.
 */
export function extractBoardFingerprint(): string {
  const cgBoard = document.querySelector('.analyse__board.main-board cg-board')
  if (!cgBoard) return ""

  const pieces = Array.from(cgBoard.querySelectorAll('piece'))
    // Exclude ghost pieces — they are visual-only overlays that don't reflect
    // the actual board state and persist across navigation steps.
    .filter(el => !el.classList.contains('ghost'))
    .map(el => {
      const cls = el.className                          // e.g. "white queen"
      const transform = (el as HTMLElement).style.transform   // e.g. "translate(336px, 168px)"
      return `${cls}@${transform}`
    })
    .sort()   // sort so fingerprint is independent of DOM insertion order

  return pieces.join("|")
}

export async function extractPage() {
  const board = document.querySelector('.analyse__board.main-board') as HTMLElement

  if (!board) throw new Error("Board not found")

  await new Promise(resolve => setTimeout(resolve, 100))

  const canvas = await html2canvas(board, {
    scale: 1.5,
    backgroundColor: "#ffffff",
    logging: false,
    useCORS: true
  })

  const img = canvas.toDataURL("image/jpeg", 0.82)
  const comment = extractComment()
  const boardFingerprint = extractBoardFingerprint()

  return { img, comment, boardFingerprint }
}