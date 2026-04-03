export interface PageData {
  img: string
  comment: string
  boardFingerprint: string
}

export interface Session {
  pages: PageData[]
  title: string
}