import collectionSource from "@/content/collection.md?raw"

export type CollectionLine = {
  kind: "line" | "space" | "subheading" | "note" | "source" | "signature"
  text: string
}

export type CollectionPoem = {
  number: number
  index: string
  title: string
  lines: CollectionLine[]
}

export type CollectionCategory = {
  id: "complete" | "drafts" | "prose"
  label: string
  englishLabel: string
  description: string
  count: number
  poems: CollectionPoem[]
}

const categoryDefinitions = [
  {
    id: "complete" as const,
    start: "# 一、较完整诗稿",
    end: "# 二、无题诗、草稿与残句",
    label: "较完整诗稿",
    englishLabel: "COLLECTED POEMS",
    description: "二十六篇较为完整的少年诗作，依照原稿整理次序全文收录。",
  },
  {
    id: "drafts" as const,
    start: "# 二、无题诗、草稿与残句",
    end: "# 三、随笔、书信与创作笔记",
    label: "草稿与残句",
    englishLabel: "DRAFTS & FRAGMENTS",
    description: "十二页未定稿、课堂片段与写在演算纸边缘的句子。",
  },
  {
    id: "prose" as const,
    start: "# 三、随笔、书信与创作笔记",
    end: "# 四、摘抄与引用（不计入原创）",
    label: "随笔与书信",
    englishLabel: "NOTES & LETTERS",
    description: "七篇随笔、书信与创作笔记，保留少年时期的真实语气。",
  },
]

function classifyLine(rawLine: string): CollectionLine {
  const text = rawLine.replace(/\s+$/, "")

  if (!text.trim()) return { kind: "space", text: "" }
  if (text.startsWith("### ")) {
    return { kind: "subheading", text: text.slice(4) }
  }
  if (text.startsWith("> 原图：")) {
    return { kind: "source", text: text.replace(/^>\s*/, "") }
  }
  if (text.startsWith("[") && text.endsWith("]")) {
    return { kind: "note", text }
  }
  if (text.startsWith("——")) {
    return { kind: "signature", text }
  }

  return { kind: "line", text }
}

function parseCategory(
  definition: (typeof categoryDefinitions)[number]
): CollectionCategory {
  const startIndex = collectionSource.indexOf(definition.start)
  const endIndex = collectionSource.indexOf(definition.end, startIndex + 1)
  const section = collectionSource.slice(startIndex, endIndex)
  const matches = [...section.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)]

  const poems = matches.map((match, matchIndex) => {
    const contentStart = (match.index ?? 0) + match[0].length
    const contentEnd = matches[matchIndex + 1]?.index ?? section.length
    const lines = section
      .slice(contentStart, contentEnd)
      .replace(/^\n+|\n+$/g, "")
      .split("\n")
      .map(classifyLine)

    const number = Number(match[1])
    return {
      number,
      index: String(number).padStart(2, "0"),
      title: match[2].trim(),
      lines,
    }
  })

  return {
    id: definition.id,
    label: definition.label,
    englishLabel: definition.englishLabel,
    description: definition.description,
    count: poems.length,
    poems,
  }
}

export const collectionCategories = categoryDefinitions.map(parseCategory)
export const collectionCount = collectionCategories.reduce(
  (total, category) => total + category.count,
  0
)

export type IndexedCollectionPoem = CollectionPoem & {
  categoryId: CollectionCategory["id"]
  categoryLabel: string
}

export const allCollectionPoems: IndexedCollectionPoem[] =
  collectionCategories.flatMap((category) =>
    category.poems.map((poem) => ({
      ...poem,
      categoryId: category.id,
      categoryLabel: category.label,
    }))
  )

export function getCollectionPoem(index: string) {
  return allCollectionPoems.find((poem) => poem.index === index)
}
