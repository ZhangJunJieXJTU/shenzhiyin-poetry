import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowRight, Search, X } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { useContent } from "@/lib/content-context"
import { getCollectionPoems, type CollectionPoem } from "@/lib/content"

const RESULT_LIMIT = 8

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s\p{P}\p{S}]+/gu, "")
}

function cleanSearchLine(value: string) {
  return value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^---+$/, "")
    .trim()
}

function getResultExcerpt(poem: CollectionPoem, terms: string[]) {
  const lines = poem.body.split("\n").map(cleanSearchLine).filter(Boolean)
  const normalizedTitle = normalizeSearchText(poem.title)
  if (terms.every((term) => normalizedTitle.includes(term))) {
    return poem.excerpt ?? lines[0] ?? ""
  }
  const matchingLine = lines.find((line) => {
    const normalizedLine = normalizeSearchText(line)
    return terms.some((term) => normalizedLine.includes(term))
  })

  return matchingLine ?? poem.excerpt ?? lines[0] ?? ""
}

function highlightMatch(text: string, query: string): ReactNode {
  const exactQuery = query.trim()
  if (!exactQuery) return text

  const index = text
    .toLocaleLowerCase("zh-CN")
    .indexOf(exactQuery.toLocaleLowerCase("zh-CN"))
  if (index < 0) return text

  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + exactQuery.length)}</mark>
      {text.slice(index + exactQuery.length)}
    </>
  )
}

function scorePoem(poem: CollectionPoem, query: string, terms: string[]) {
  const title = normalizeSearchText(poem.title)
  const body = normalizeSearchText(poem.body)
  const date = normalizeSearchText(poem.date)
  const category = normalizeSearchText(poem.categoryLabel)
  const normalizedQuery = normalizeSearchText(query)
  const haystack = `${title}${body}${date}${category}`

  if (!terms.every((term) => haystack.includes(term))) return null

  let score = 0
  if (title === normalizedQuery) score += 120
  if (title.startsWith(normalizedQuery)) score += 80
  if (title.includes(normalizedQuery)) score += 60
  if (body.includes(normalizedQuery)) score += 30
  if (date.includes(normalizedQuery)) score += 24
  if (category.includes(normalizedQuery)) score += 18
  score += terms.filter((term) => title.includes(term)).length * 12
  score += terms.filter((term) => body.includes(term)).length * 4

  return score
}

export function SiteSearch() {
  const { content } = useContent()
  const poems = useMemo(() => getCollectionPoems(content), [content])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const closeSearch = (restoreFocus = true) => {
    setOpen(false)
    setQuery("")
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable

      if (
        (event.key.toLocaleLowerCase() === "k" &&
          (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !isTyping)
      ) {
        event.preventDefault()
        setOpen(true)
      }

      if (event.key === "Escape" && open) {
        event.preventDefault()
        closeSearch()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      if (dialog?.open) dialog.close()
    }
  }, [open])

  const trimmedQuery = query.trim()
  const terms = useMemo(
    () =>
      normalizeSearchText(trimmedQuery)
        ? trimmedQuery.split(/\s+/).map(normalizeSearchText).filter(Boolean)
        : [],
    [trimmedQuery]
  )
  const results = useMemo(() => {
    if (!trimmedQuery || terms.length === 0) return []

    return poems
      .map((poem) => ({
        poem,
        score: scorePoem(poem, trimmedQuery, terms),
      }))
      .filter(
        (entry): entry is { poem: CollectionPoem; score: number } =>
          entry.score !== null
      )
      .sort(
        (left, right) =>
          right.score - left.score || left.poem.number - right.poem.number
      )
  }, [poems, terms, trimmedQuery])

  return (
    <>
      <button
        ref={triggerRef}
        className="header-search-button"
        type="button"
        aria-label="全局搜索"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Meta+K Control+K /"
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" />
        <span>搜索</span>
        <kbd>⌘ K</kbd>
      </button>

      {open &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="search-overlay"
            aria-labelledby="global-search-title"
            onCancel={(event) => {
              event.preventDefault()
              closeSearch()
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSearch()
            }}
          >
            <section className="search-panel">
              <header className="search-panel-heading">
                <div>
                  <span>SEARCH THE ARCHIVE</span>
                  <h2 id="global-search-title">全局搜索</h2>
                </div>
                <Button
                  className="search-close-button"
                  size="icon"
                  variant="ghost"
                  aria-label="关闭搜索"
                  onClick={() => closeSearch()}
                >
                  <X aria-hidden="true" />
                </Button>
              </header>

              <label className="search-input-wrap">
                <Search aria-hidden="true" />
                <span className="sr-only">搜索诗名、诗句、年份或分类</span>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  placeholder="搜索诗名、诗句、年份……"
                  autoComplete="off"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <kbd>ESC</kbd>
              </label>

              <div className="search-results" aria-live="polite">
                {!trimmedQuery && (
                  <div className="search-empty-state">
                    <p>
                      从 {poems.length} 篇作品中寻找一句诗、一个标题或某个年份。
                    </p>
                    <span>输入关键词开始检索</span>
                  </div>
                )}

                {trimmedQuery && results.length === 0 && (
                  <div className="search-empty-state">
                    <p>没有找到“{trimmedQuery}”</p>
                    <span>可以尝试更短的诗句、标题或年份</span>
                  </div>
                )}

                {results.length > 0 && (
                  <>
                    <div className="search-results-meta">
                      <span>找到 {results.length} 篇作品</span>
                      {results.length > RESULT_LIMIT && (
                        <span>显示前 {RESULT_LIMIT} 篇</span>
                      )}
                    </div>
                    <div className="search-results-list">
                      {results.slice(0, RESULT_LIMIT).map(({ poem }) => {
                        const excerpt = getResultExcerpt(poem, terms)
                        return (
                          <Link
                            key={poem.id}
                            to={`/works/${poem.index}`}
                            className="search-result"
                            onClick={() => closeSearch(false)}
                          >
                            <span className="search-result-index">
                              {poem.index}
                            </span>
                            <div>
                              <strong>
                                {highlightMatch(poem.title, trimmedQuery)}
                              </strong>
                              <p>{highlightMatch(excerpt, trimmedQuery)}</p>
                              <small>
                                {poem.categoryLabel}
                                {poem.date ? ` · ${poem.date}` : ""}
                              </small>
                            </div>
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>
          </dialog>,
          document.body
        )}
    </>
  )
}
