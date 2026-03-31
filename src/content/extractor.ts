import html2canvas from "html2canvas"

export async function extractPage() {
  const board = document.querySelector('.analyse__board.main-board') as HTMLElement
  const commentEl = document.querySelector('.comment')

  if (!board) throw new Error("Board not found")

  const canvas = await html2canvas(board)
  const img = canvas.toDataURL("image/png")

  const comment = commentEl?.textContent?.trim() || ""

  return { img, comment }
}