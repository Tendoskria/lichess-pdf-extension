export function extractComment(): string {
  // Chercher le commentaire par différents sélecteurs
  const selectors = [
    '.comment',
    '.study__comments',
    '.analyse__comment',
    '[data-role="comment"]',
    '.comment-text',
    '.chapter-comment'
  ]
  
  let commentElement: Element | null = null
  
  for (const selector of selectors) {
    commentElement = document.querySelector(selector)
    if (commentElement) break
  }
  
  if (!commentElement) {
    console.warn("Aucun élément de commentaire trouvé")
    return ""
  }
  
  // Fonction pour extraire le texte proprement
  const extractText = (element: Element): string => {
    // Cloner l'élément pour ne pas modifier le DOM original
    const clone = element.cloneNode(true) as Element
    
    // Supprimer les éléments qui ne sont pas du texte (icônes, boutons, etc.)
    const unwantedSelectors = [
      'button', 'i', '.icon', '[data-icon]', 
      '.copy', '.edit', '.delete', '.actions'
    ]
    
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })
    
    // Récupérer le texte
    let text = clone.textContent?.trim() || ""
    
    // Nettoyer le texte
    text = text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Supprimer les caractères de contrôle
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
    
    return text
  }
  
  let comment = extractText(commentElement)
  
  // Si le commentaire est vide, essayer de récupérer le HTML et de le nettoyer
  if (!comment) {
    const html = commentElement.innerHTML
    comment = html
      .replace(/<[^>]*>/g, ' ') // Supprimer les tags HTML
      .replace(/&[^;]+;/g, ' ') // Supprimer les entités HTML
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  console.log("📝 Commentaire extrait avec extractComment():", comment)
  
  return comment
}