/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { fetchContent, persistContent, type SiteContent } from "@/lib/content"

type ContentContextValue = {
  content: SiteContent
  setContent: (content: SiteContent) => void
  saveContent: (content: SiteContent) => Promise<SiteContent>
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchContent()
      .then(setContent)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "内容读取失败")
      })
  }, [])

  if (error) {
    return (
      <main className="content-state" role="alert">
        <span>CONTENT API</span>
        <h1>暂时无法读取诗集内容</h1>
        <p>{error}。请使用项目的开发或启动命令访问网站。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新连接
        </button>
      </main>
    )
  }

  if (!content) {
    return (
      <main className="content-state" aria-live="polite">
        <span>深挚吟</span>
        <h1>正在展开诗稿…</h1>
      </main>
    )
  }

  const saveContent = async (nextContent: SiteContent) => {
    const savedContent = await persistContent(nextContent)
    setContent(savedContent)
    return savedContent
  }

  return (
    <ContentContext.Provider value={{ content, setContent, saveContent }}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContent() {
  const context = useContext(ContentContext)
  if (!context)
    throw new Error("useContent must be used inside ContentProvider")
  return context
}
