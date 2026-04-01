import html2canvas from "html2canvas"
import { extractComment } from "./comment-extractor"

export async function extractPage() {
  const board = document.querySelector('.analyse__board.main-board') as HTMLElement
  
  if (!board) throw new Error("Board not found")
  
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const canvas = await html2canvas(board, {
    scale: 2,
    backgroundColor: null,
    logging: false,
    useCORS: true
  })
  
  const img = canvas.toDataURL("image/png")
  
  let comment = extractComment()
  
  // Add chapter title if available
  const chapterTitle = document.querySelector('.study_chapter .name')?.textContent?.trim() || ""
  if (chapterTitle) {
    comment = `📖 ${chapterTitle}\n\n${comment}`
  }
  
  // Add move number if available
  const moveNumber = document.querySelector('.move')?.textContent?.trim() || ""
  if (moveNumber && moveNumber !== "?" && moveNumber !== "-" && moveNumber !== "") {
    comment = `🔢 ${moveNumber}\n${comment}`
  }
  
  console.log("📝 Commentaire final:", comment.substring(0, 100) + "...")
  
  return { img, comment }
}