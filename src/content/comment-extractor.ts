export function extractComment(): string {
  const selectors = ['.comment']
  let commentElement: Element | null = null

  for (const selector of selectors) {
    commentElement = document.querySelector(selector)
    if (commentElement) break
  }

  if (!commentElement) {
    return ""
  }

  const extractText = (element: Element): string => {
    const clone = element.cloneNode(true) as Element

    // Supprimer les éléments indésirables (boutons, icônes, etc.)
    const unwantedSelectors = [
      'button', 'i', '.icon', '[data-icon]',
      '.copy', '.edit', '.delete', '.actions'
    ]
    unwantedSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove())
    })

    // Récupérer le HTML interne, convertir <br> en \n, puis supprimer les autres balises
    let html = clone.innerHTML
    let text = html.replace(/<br\s*\/?>/gi, '\n')   // <br> -> saut de ligne
    text = text.replace(/<[^>]+>/g, '')            // supprimer toutes les autres balises
    text = text.replace(/&nbsp;/g, ' ')            // remplacer &nbsp; par espace
    text = text.replace(/&[a-z]+;/gi, ' ')         // autres entités HTML simples

    // Nettoyer les espaces tout en préservant les \n
    text = text.replace(/[ \t]+/g, ' ')            // espaces/tabs multiples -> un espace
    text = text.replace(/[ \t]+\n/g, '\n')         // espaces avant \n -> \n seul
    text = text.replace(/\n[ \t]+/g, '\n')         // espaces après \n -> \n seul
    text = text.replace(/\n{3,}/g, '\n\n')         // max deux sauts de ligne consécutifs
    text = text.trim()

    return text
  }

  let comment = extractText(commentElement)
  return comment
}