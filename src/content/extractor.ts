import html2canvas from "html2canvas"
import { extractComment } from "./comment-extractor"

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

  let comment = extractComment()

  return { img, comment }
}