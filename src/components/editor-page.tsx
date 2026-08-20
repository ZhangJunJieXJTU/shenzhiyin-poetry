import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Link } from "react-router"
import {
  ArrowLeft,
  Bold,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilePlus2,
  Image as ImageIcon,
  Italic,
  ListFilter,
  PanelLeftClose,
  PanelRightClose,
  Quote,
  Save,
  Search,
  Settings2,
  Trash2,
  Type,
  X,
} from "lucide-react"

import {
  assetUrl,
  categoryMeta,
  uploadManuscript,
  type CategoryId,
  type PoemRecord,
  type SiteContent,
} from "@/lib/content"
import { useContent } from "@/lib/content-context"

type SaveState = "saved" | "dirty" | "saving" | "error"
type Selection = { kind: "site" } | { kind: "poem"; id: string }

function plainTitle(title: string) {
  return title.replace(/^《([^》]+)》/, "$1")
}

function countCharacters(value: string) {
  return value.replace(/\s/g, "").length
}

export function EditorPage() {
  const { content, saveContent } = useContent()
  const [draft, setDraft] = useState<SiteContent>(() =>
    structuredClone(content)
  )
  const [selection, setSelection] = useState<Selection>(() => ({
    kind: "poem",
    id: content.poems[0]?.id ?? "",
  }))
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [saveMessage, setSaveMessage] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | CategoryId>("all")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [leftOpen, setLeftOpen] = useState(
    () => !window.matchMedia("(max-width: 900px)").matches
  )
  const [rightOpen, setRightOpen] = useState(
    () => !window.matchMedia("(max-width: 900px)").matches
  )
  const [uploading, setUploading] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const selectedPoem =
    selection.kind === "poem"
      ? (draft.poems.find((poem) => poem.id === selection.id) ?? null)
      : null

  const visiblePoems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return draft.poems
      .filter((poem) => filter === "all" || poem.categoryId === filter)
      .filter((poem) =>
        normalizedQuery
          ? `${poem.number} ${poem.title} ${poem.excerpt}`
              .toLowerCase()
              .includes(normalizedQuery)
          : true
      )
      .sort((left, right) => left.number - right.number)
  }, [draft.poems, filter, query])

  const markDirty = () => {
    setSaveState("dirty")
    setSaveMessage("")
  }

  const updatePoem = <Key extends keyof PoemRecord>(
    key: Key,
    value: PoemRecord[Key]
  ) => {
    if (!selectedPoem) return
    setDraft((current) => ({
      ...current,
      poems: current.poems.map((poem) =>
        poem.id === selectedPoem.id ? { ...poem, [key]: value } : poem
      ),
    }))
    markDirty()
  }

  const updateSite = <Key extends keyof SiteContent["site"]>(
    key: Key,
    value: SiteContent["site"][Key]
  ) => {
    setDraft((current) => ({
      ...current,
      site: { ...current.site, [key]: value },
    }))
    markDirty()
  }

  const handleSave = async () => {
    setSaveState("saving")
    setSaveMessage("")
    try {
      const saved = await saveContent(draft)
      setDraft(structuredClone(saved))
      setSaveState("saved")
    } catch (reason) {
      setSaveState("error")
      setSaveMessage(reason instanceof Error ? reason.message : "保存失败")
    }
  }

  useEffect(() => {
    const preventClose = (event: BeforeUnloadEvent) => {
      if (saveState !== "dirty" && saveState !== "error") return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", preventClose)
    return () => window.removeEventListener("beforeunload", preventClose)
  }, [saveState])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  })

  const createPoem = () => {
    const number = Math.max(0, ...draft.poems.map((poem) => poem.number)) + 1
    const poem: PoemRecord = {
      id: `poem-${Date.now()}`,
      number,
      title: "未题名",
      body: "",
      categoryId: "drafts",
      date: "",
      excerpt: "",
      image: "/manuscripts/old-page.jpg",
      imageAlt: "手写诗稿原页",
      featured: false,
      featuredOrder: null,
      published: false,
    }
    setDraft((current) => ({ ...current, poems: [...current.poems, poem] }))
    setSelection({ kind: "poem", id: poem.id })
    setFilter("all")
    markDirty()
  }

  const deletePoem = () => {
    if (
      !selectedPoem ||
      !window.confirm(`确定删除“${selectedPoem.title}”吗？保存前仍可刷新撤销。`)
    ) {
      return
    }
    const remaining = draft.poems.filter((poem) => poem.id !== selectedPoem.id)
    setDraft((current) => ({ ...current, poems: remaining }))
    setSelection({ kind: "poem", id: remaining[0]?.id ?? "" })
    markDirty()
  }

  const wrapSelection = (prefix: string, suffix = prefix) => {
    if (!selectedPoem || !bodyRef.current) return
    const textarea = bodyRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = selectedPoem.body.slice(start, end)
    const nextBody = `${selectedPoem.body.slice(0, start)}${prefix}${selectedText}${suffix}${selectedPoem.body.slice(end)}`
    updatePoem("body", nextBody)
    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    })
  }

  const prefixLines = (prefix: string) => {
    if (!selectedPoem || !bodyRef.current) return
    const textarea = bodyRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = selectedPoem.body.slice(start, end) || "正文"
    const replacement = selectedText
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n")
    updatePoem(
      "body",
      `${selectedPoem.body.slice(0, start)}${replacement}${selectedPoem.body.slice(end)}`
    )
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedPoem) return
    setUploading(true)
    setSaveMessage("")
    try {
      updatePoem("image", await uploadManuscript(file))
    } catch (reason) {
      setSaveMessage(reason instanceof Error ? reason.message : "图片上传失败")
      setSaveState("error")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const categoryCount = (categoryId: CategoryId) =>
    draft.poems.filter((poem) => poem.categoryId === categoryId).length

  const saveLabel = {
    saved: "所有更改已保存",
    dirty: "有未保存的更改",
    saving: "正在保存…",
    error: saveMessage || "保存失败",
  }[saveState]

  return (
    <div
      className="editor-shell"
      data-left-open={leftOpen}
      data-right-open={rightOpen}
    >
      <header className="editor-header">
        <div className="editor-brand">
          <strong>{draft.site.brand}</strong>
          <span>/</span>
          <span>编校台</span>
        </div>
        <div className="editor-actions">
          <Link to="/" className="editor-text-action">
            <ArrowLeft aria-hidden="true" /> <span>返回网站</span>
          </Link>
          <button
            className="editor-text-action"
            type="button"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye aria-hidden="true" /> <span>预览</span>
          </button>
          <span className="editor-save-state" data-state={saveState}>
            {saveState === "saved" && <Check aria-hidden="true" />}
            {saveLabel}
          </span>
          <button
            className="editor-save-button"
            type="button"
            disabled={saveState === "saving"}
            onClick={() => void handleSave()}
          >
            <Save aria-hidden="true" /> <span>保存更改</span>
          </button>
        </div>
      </header>

      <aside className="editor-left-panel" aria-label="作品目录">
        <div className="editor-panel-heading">
          <span>
            <BookOpen aria-hidden="true" /> 作品目录
          </span>
          <button
            type="button"
            aria-label="收起作品目录"
            onClick={() => setLeftOpen(false)}
          >
            <PanelLeftClose aria-hidden="true" />
          </button>
        </div>
        <button
          className="editor-site-row"
          data-active={selection.kind === "site"}
          type="button"
          onClick={() => {
            setSelection({ kind: "site" })
            if (window.matchMedia("(max-width: 900px)").matches)
              setLeftOpen(false)
          }}
        >
          <Settings2 aria-hidden="true" /> 网站文案与首页
        </button>
        <label className="editor-search">
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索诗题"
            aria-label="搜索诗题"
          />
        </label>
        <div className="editor-filters" aria-label="作品分类筛选">
          <button
            type="button"
            data-active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            <span>全部</span>
            <strong>{draft.poems.length}</strong>
          </button>
          {categoryMeta.map((category) => (
            <button
              key={category.id}
              type="button"
              data-active={filter === category.id}
              onClick={() => setFilter(category.id)}
            >
              <span>{category.label}</span>
              <strong>{categoryCount(category.id)}</strong>
            </button>
          ))}
        </div>
        <div className="editor-list-label">
          <ListFilter aria-hidden="true" /> 作品列表
        </div>
        <div className="editor-poem-list">
          {visiblePoems.map((poem) => (
            <button
              key={poem.id}
              type="button"
              data-active={selectedPoem?.id === poem.id}
              onClick={() => {
                setSelection({ kind: "poem", id: poem.id })
                if (window.matchMedia("(max-width: 900px)").matches)
                  setLeftOpen(false)
              }}
            >
              <span>{String(poem.number).padStart(2, "0")}</span>
              <div>
                <strong>{plainTitle(poem.title)}</strong>
                <small>{poem.date || "时间未录"}</small>
              </div>
              {!poem.published && <i>草稿</i>}
            </button>
          ))}
          {visiblePoems.length === 0 && (
            <p className="editor-empty-list">没有匹配的作品</p>
          )}
        </div>
        <button
          className="editor-new-button"
          type="button"
          onClick={createPoem}
        >
          <FilePlus2 aria-hidden="true" /> 新建作品
        </button>
      </aside>

      {!leftOpen && (
        <button
          className="editor-open-left"
          type="button"
          aria-label="展开作品目录"
          onClick={() => setLeftOpen(true)}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      )}

      <main className="editor-workspace">
        {selection.kind === "site" ? (
          <section
            className="site-copy-editor"
            aria-labelledby="site-copy-title"
          >
            <span>网站内容</span>
            <h1 id="site-copy-title">首页文案</h1>
            <p>这里的修改会同步到访客看到的首页。</p>
            <label>
              站点名称
              <input
                value={draft.site.brand}
                onChange={(event) => updateSite("brand", event.target.value)}
              />
            </label>
            <label>
              作品年份
              <input
                value={draft.site.period}
                onChange={(event) => updateSite("period", event.target.value)}
              />
            </label>
            <label>
              首页标题
              <textarea
                rows={3}
                value={draft.site.heroTitle}
                onChange={(event) =>
                  updateSite("heroTitle", event.target.value)
                }
              />
            </label>
            <label>
              首页说明
              <textarea
                rows={3}
                value={draft.site.heroDescription}
                onChange={(event) =>
                  updateSite("heroDescription", event.target.value)
                }
              />
            </label>
            <label>
              关于标题
              <textarea
                rows={3}
                value={draft.site.aboutTitle}
                onChange={(event) =>
                  updateSite("aboutTitle", event.target.value)
                }
              />
            </label>
            <label>
              关于说明
              <textarea
                rows={3}
                value={draft.site.aboutDescription}
                onChange={(event) =>
                  updateSite("aboutDescription", event.target.value)
                }
              />
            </label>
            <label>
              页脚寄语
              <input
                value={draft.site.footerNote}
                onChange={(event) =>
                  updateSite("footerNote", event.target.value)
                }
              />
            </label>
          </section>
        ) : selectedPoem ? (
          <section className="poem-editor" aria-labelledby="poem-editor-title">
            <span className="poem-editor-number">
              作品 {String(selectedPoem.number).padStart(2, "0")}
            </span>
            <input
              id="poem-editor-title"
              className="poem-title-input"
              value={selectedPoem.title}
              onChange={(event) => updatePoem("title", event.target.value)}
              aria-label="诗题"
            />
            <div className="poem-body-editor">
              <div className="poem-toolbar" aria-label="正文格式工具">
                <button
                  type="button"
                  title="小标题"
                  onClick={() => prefixLines("### ")}
                >
                  <Type aria-hidden="true" />
                </button>
                <i />
                <button
                  type="button"
                  title="粗体"
                  onClick={() => wrapSelection("**")}
                >
                  <Bold aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="斜体"
                  onClick={() => wrapSelection("*")}
                >
                  <Italic aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="引用"
                  onClick={() => prefixLines("> ")}
                >
                  <Quote aria-hidden="true" />
                </button>
              </div>
              <textarea
                ref={bodyRef}
                value={selectedPoem.body}
                onChange={(event) => updatePoem("body", event.target.value)}
                placeholder="在这里整理正文，换行会按诗行保留。"
                aria-label="诗歌正文"
                spellCheck={false}
              />
            </div>
            <div className="poem-editor-footer">
              共 {countCharacters(selectedPoem.body)} 字
            </div>
          </section>
        ) : (
          <section className="editor-no-selection">
            <h1>还没有作品</h1>
            <button type="button" onClick={createPoem}>
              新建第一篇作品
            </button>
          </section>
        )}
      </main>

      <aside className="editor-right-panel" aria-label="作品设置">
        <div className="editor-panel-heading">
          <span>{selection.kind === "site" ? "首页设置" : "作品设置"}</span>
          <button
            type="button"
            aria-label="收起设置"
            onClick={() => setRightOpen(false)}
          >
            <PanelRightClose aria-hidden="true" />
          </button>
        </div>
        {selection.kind === "site" ? (
          <div className="editor-inspector-fields">
            <label>
              首页手稿图
              <div className="editor-image-preview">
                <img src={assetUrl(draft.site.heroImage)} alt="当前首页手稿" />
              </div>
              <input
                value={draft.site.heroImage}
                onChange={(event) =>
                  updateSite("heroImage", event.target.value)
                }
              />
            </label>
            <p className="editor-field-help">
              可填写 public 目录下的图片路径，例如 /manuscripts/old-page.jpg。
            </p>
          </div>
        ) : selectedPoem ? (
          <div className="editor-inspector-fields">
            <label>
              分类
              <select
                value={selectedPoem.categoryId}
                onChange={(event) =>
                  updatePoem("categoryId", event.target.value as CategoryId)
                }
              >
                {categoryMeta.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              创作时间
              <input
                value={selectedPoem.date}
                onChange={(event) => updatePoem("date", event.target.value)}
                placeholder="例如 2020 · 04.20"
              />
            </label>
            <label>
              摘要
              <textarea
                rows={4}
                maxLength={200}
                value={selectedPoem.excerpt}
                onChange={(event) => updatePoem("excerpt", event.target.value)}
              />
              <small>{selectedPoem.excerpt.length} / 200</small>
            </label>
            <label>
              手稿图片
              <div className="editor-image-preview">
                <img
                  src={assetUrl(selectedPoem.image)}
                  alt={selectedPoem.imageAlt}
                />
              </div>
              <span className="editor-upload-button">
                <ImageIcon aria-hidden="true" />
                {uploading ? "正在上传…" : "更换图片"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading}
                  onChange={(event) => void handleImageUpload(event)}
                />
              </span>
            </label>
            <label className="editor-switch-row">
              <span>
                首页选读<small>最多建议选择 6 篇</small>
              </span>
              <input
                type="checkbox"
                checked={selectedPoem.featured}
                onChange={(event) =>
                  updatePoem("featured", event.target.checked)
                }
              />
            </label>
            <label>
              发布状态
              <select
                value={selectedPoem.published ? "published" : "draft"}
                onChange={(event) =>
                  updatePoem("published", event.target.value === "published")
                }
              >
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
              </select>
            </label>
            <button
              className="editor-delete-button"
              type="button"
              onClick={deletePoem}
            >
              <Trash2 aria-hidden="true" /> 删除这篇作品
            </button>
          </div>
        ) : null}
      </aside>

      {!rightOpen && (
        <button
          className="editor-open-right"
          type="button"
          aria-label="展开设置"
          onClick={() => setRightOpen(true)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
      )}

      {previewOpen && (
        <div
          className="editor-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="内容预览"
        >
          <div className="editor-preview-sheet">
            <button
              type="button"
              aria-label="关闭预览"
              onClick={() => setPreviewOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
            {selection.kind === "site" ? (
              <>
                <span>{draft.site.period}</span>
                <h1>{draft.site.heroTitle}</h1>
                <p>{draft.site.heroDescription}</p>
              </>
            ) : selectedPoem ? (
              <>
                <span>
                  第 {String(selectedPoem.number).padStart(2, "0")} 篇 ·{" "}
                  {
                    categoryMeta.find(
                      (category) => category.id === selectedPoem.categoryId
                    )?.label
                  }
                </span>
                <h1>{selectedPoem.title}</h1>
                <div>
                  {selectedPoem.body
                    .split("\n")
                    .map((line, index) =>
                      line ? (
                        <p key={`${line}-${index}`}>
                          {line.replace(/^###\s+/, "")}
                        </p>
                      ) : (
                        <br key={`space-${index}`} />
                      )
                    )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
