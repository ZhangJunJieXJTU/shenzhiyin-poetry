export type CategoryId = "complete" | "drafts" | "prose"

export type PoemRecord = {
  id: string
  number: number
  title: string
  body: string
  categoryId: CategoryId
  date: string
  excerpt: string
  image: string
  imageAlt: string
  featured: boolean
  featuredOrder: number | null
  published: boolean
}

export type SiteSettings = {
  brand: string
  period: string
  heroTitle: string
  heroDescription: string
  heroImage: string
  aboutTitle: string
  aboutDescription: string
  footerNote: string
}

export type SiteContent = {
  version: number
  updatedAt: string
  site: SiteSettings
  poems: PoemRecord[]
}

export type CollectionLine = {
  kind:
    | "line"
    | "space"
    | "subheading"
    | "quote"
    | "list"
    | "separator"
    | "note"
    | "source"
    | "signature"
  text: string
}

export const categoryMeta = [
  {
    id: "complete" as const,
    label: "较完整诗稿",
    shortLabel: "完整诗稿",
    englishLabel: "COLLECTED POEMS",
    description: "较为完整的诗歌作品，依照原稿与写作时间全文收录。",
  },
  {
    id: "drafts" as const,
    label: "草稿与残句",
    shortLabel: "草稿与残句",
    englishLabel: "DRAFTS & FRAGMENTS",
    description: "未定稿、课堂片段、清单与仍在生长的句子。",
  },
  {
    id: "prose" as const,
    label: "随笔与书信",
    shortLabel: "随笔与书信",
    englishLabel: "NOTES & LETTERS",
    description: "随笔、书信、小说与创作笔记，保留写作当时的真实语气。",
  },
]

export type CollectionPoem = PoemRecord & {
  index: string
  lines: CollectionLine[]
  categoryLabel: string
}

export type CollectionCategory = (typeof categoryMeta)[number] & {
  count: number
  poems: CollectionPoem[]
}

export const isStaticDeployment = import.meta.env.VITE_STATIC_DEPLOY === "true"

export function assetUrl(source: string) {
  if (!source || /^(?:https?:|data:|blob:)/.test(source)) return source
  return `${import.meta.env.BASE_URL}${source.replace(/^\/+/, "")}`
}

export function parsePoemLines(body: string): CollectionLine[] {
  return body.split("\n").map((rawLine) => {
    const text = rawLine.replace(/\s+$/, "")

    if (!text.trim()) return { kind: "space", text: "" }
    const heading = text.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      return { kind: "subheading", text: heading[1] }
    }
    if (text.startsWith("> 原图：")) {
      return { kind: "source", text: text.replace(/^>\s*/, "") }
    }
    if (text.startsWith(">")) {
      return { kind: "quote", text: text.replace(/^>\s?/, "") }
    }
    if (/^[-*+]\s+/.test(text)) {
      return { kind: "list", text: text.replace(/^[-*+]\s+/, "") }
    }
    if (/^---+$/.test(text.trim())) {
      return { kind: "separator", text: "" }
    }
    if (/^!\[[^\]]*\](?:\([^)]*\))?$/.test(text.trim())) {
      return { kind: "note", text: "[原文此处附图]" }
    }
    if (text.startsWith("[") && text.endsWith("]")) {
      return { kind: "note", text }
    }
    if (text.startsWith("——")) return { kind: "signature", text }

    return { kind: "line", text }
  })
}

export function getCollectionPoems(content: SiteContent): CollectionPoem[] {
  return content.poems
    .filter((poem) => poem.published)
    .sort((left, right) => left.number - right.number)
    .map((poem) => ({
      ...poem,
      index: String(poem.number).padStart(2, "0"),
      lines: parsePoemLines(poem.body),
      categoryLabel:
        categoryMeta.find((category) => category.id === poem.categoryId)
          ?.label ?? "未分类",
    }))
}

export function getCollectionCategories(
  content: SiteContent
): CollectionCategory[] {
  const poems = getCollectionPoems(content)
  return categoryMeta.map((category) => {
    const categoryPoems = poems.filter(
      (poem) => poem.categoryId === category.id
    )
    return { ...category, count: categoryPoems.length, poems: categoryPoems }
  })
}

export function getFeaturedPoems(content: SiteContent) {
  return getCollectionPoems(content)
    .filter((poem) => poem.featured)
    .sort(
      (left, right) =>
        (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.featuredOrder ?? Number.MAX_SAFE_INTEGER)
    )
}

export async function fetchContent(): Promise<SiteContent> {
  const endpoint = isStaticDeployment
    ? `${import.meta.env.BASE_URL}content.json`
    : "/api/content"
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
  })
  if (!response.ok) throw new Error("内容读取失败")
  return (await response.json()) as SiteContent
}

export async function persistContent(
  content: SiteContent
): Promise<SiteContent> {
  if (isStaticDeployment) {
    throw new Error("GitHub Pages 展示版不能在线保存，请使用本地编校台")
  }
  const response = await fetch("/api/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(content),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(error?.error ?? "保存失败")
  }
  return (await response.json()) as SiteContent
}

export async function uploadManuscript(file: File): Promise<string> {
  if (isStaticDeployment) {
    throw new Error("GitHub Pages 展示版不能上传图片，请使用本地编校台")
  }
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("无法读取图片"))
    reader.readAsDataURL(file)
  })
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name: file.name, type: file.type, data }),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(error?.error ?? "图片上传失败")
  }
  const result = (await response.json()) as { url: string }
  return result.url
}
