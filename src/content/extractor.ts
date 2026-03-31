import html2canvas from "html2canvas"

export async function extractPage() {
  const board = document.querySelector('.analyse__board.main-board') as HTMLElement
  const commentEl = document.querySelector('.comment')
  
  if (!board) throw new Error("Board not found")
  
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const canvas = await html2canvas(board, {
    scale: 2,
    backgroundColor: null,
    logging: false,
    useCORS: true
  })
  
  const img = canvas.toDataURL("image/png")
  
  // Get the comment, handling different formats (text or HTML)
  let comment = ""
  if (commentEl) {
    const commentText = commentEl.textContent?.trim() || ""
    const commentHtml = (commentEl as HTMLElement).innerHTML
    comment = commentText || commentHtml.replace(/<[^>]*>/g, '').trim()
  }
  
  const chapterTitle = document.querySelector('.study_chapter .name')?.textContent?.trim() || ""
  const moveNumber = document.querySelector('.move')?.textContent?.trim() || ""
  
  const fullComment = [
    chapterTitle && `📖 ${chapterTitle}`,
    moveNumber && `🔢 ${moveNumber}`,
    comment && `💬 ${comment}`
  ].filter(Boolean).join('\n')
  
  return { 
    img, 
    comment: fullComment || "Page sans commentaire" 
  }
}