import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
export const projectRoot = path.resolve(serverDirectory, "..")
const dataDirectory = path.join(serverDirectory, "data")
const dataFile = path.join(dataDirectory, "content.json")
const sourceFile = path.join(projectRoot, "src", "content", "collection.md")
const uploadsDirectory = path.join(projectRoot, "public", "uploads")

const categoryDefinitions = [
  { id: "complete", start: "# 一、较完整诗稿", end: "# 二、无题诗、草稿与残句" },
  { id: "drafts", start: "# 二、无题诗、草稿与残句", end: "# 三、随笔、书信与创作笔记" },
  { id: "prose", start: "# 三、随笔、书信与创作笔记", end: "# 四、摘抄与引用（不计入原创）" },
]

const featuredMeta = new Map([
  [4, { date: "2019 · 12.17", excerpt: "而我只是失去了一场雪。除此，别无失，别无获。", image: "/manuscripts/snow-notes.jpg", imageAlt: "写在试卷答题纸上的手写诗稿" }],
  [2, { date: "2019 · 08.29", excerpt: "若故人不来，灯灭，便不等。", image: "/manuscripts/old-page.jpg", imageAlt: "旧纸页上的手写随笔" }],
  [5, { date: "2020 · 04.20", excerpt: "整座城都在熟睡，只有我在走。", image: "/manuscripts/old-page.jpg", imageAlt: "略有折痕的手写诗稿原页" }],
  [12, { date: "2020 · 04.24", excerpt: "把自己交给时间，任它漂流。", image: "/manuscripts/loose-sheet.jpg", imageAlt: "散页白纸上的两首手写诗稿" }],
  [20, { date: "2020", excerpt: "我们仰望同一片星空，却各自孤独。", image: "/manuscripts/snow-notes.jpg", imageAlt: "写满短句与诗行的试卷纸" }],
  [10, { date: "2019", excerpt: "夜里来愁，愁比夜长。", image: "/manuscripts/loose-sheet.jpg", imageAlt: "白纸上的手写诗歌原稿" }],
])
const featuredOrder = [4, 2, 5, 12, 20, 10]

function firstReadableLine(body) {
  return (
    body
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("###") && !line.startsWith(">") && !line.startsWith("[")) ?? ""
  )
}

async function createSeedContent() {
  const source = await readFile(sourceFile, "utf8")
  const poems = categoryDefinitions.flatMap((definition) => {
    const startIndex = source.indexOf(definition.start)
    const endIndex = source.indexOf(definition.end, startIndex + 1)
    const section = source.slice(startIndex, endIndex === -1 ? undefined : endIndex)
    const matches = [...section.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)]

    return matches.map((match, matchIndex) => {
      const number = Number(match[1])
      const contentStart = (match.index ?? 0) + match[0].length
      const contentEnd = matches[matchIndex + 1]?.index ?? section.length
      const body = section.slice(contentStart, contentEnd).replace(/^\n+|\n+$/g, "")
      const featured = featuredMeta.get(number)

      return {
        id: `poem-${String(number).padStart(2, "0")}`,
        number,
        title: match[2].trim(),
        body,
        categoryId: definition.id,
        date: featured?.date ?? "",
        excerpt: featured?.excerpt ?? firstReadableLine(body).slice(0, 80),
        image: featured?.image ?? "/manuscripts/old-page.jpg",
        imageAlt: featured?.imageAlt ?? "少年时期的手写诗稿原页",
        featured: Boolean(featured),
        featuredOrder: featured ? featuredOrder.indexOf(number) + 1 : null,
        published: true,
      }
    })
  })

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    site: {
      brand: "深博吟",
      period: "2018—2020",
      heroTitle: "我把少年时代，\n留在这些句子里。",
      heroDescription: "写于 2018—2020 年。关于雪、夜色、故乡，\n以及那些尚未学会告别的时刻。",
      heroImage: "/manuscripts/old-page.jpg",
      aboutTitle: "我写下的不是答案，\n只是曾经认真活过的痕迹。",
      aboutDescription: "这些诗写在试卷、草稿纸与旧笔记本上。\n多年以后，我把它们重新整理，让散落的字句再次相遇。",
      footerNote: "愿每一次重读，都像第一次经过那场雪。",
    },
    poems,
  }
}

function assertContent(content) {
  if (!content || typeof content !== "object" || !content.site || !Array.isArray(content.poems)) {
    throw new Error("内容格式不完整")
  }
  if (content.poems.length > 500) throw new Error("作品数量超过上限")

  const ids = new Set()
  for (const poem of content.poems) {
    if (!poem || typeof poem !== "object" || typeof poem.id !== "string") {
      throw new Error("存在无效作品")
    }
    if (ids.has(poem.id)) throw new Error("作品编号重复")
    ids.add(poem.id)
    if (!Number.isInteger(poem.number) || poem.number < 1 || poem.number > 9999) {
      throw new Error("作品序号无效")
    }
    if (typeof poem.title !== "string" || poem.title.length > 200) throw new Error("诗题无效")
    if (typeof poem.body !== "string" || poem.body.length > 100000) throw new Error("正文过长")
    if (!["complete", "drafts", "prose"].includes(poem.categoryId)) throw new Error("分类无效")
  }
}

export async function readContent() {
  try {
    const content = JSON.parse(await readFile(dataFile, "utf8"))
    assertContent(content)
    return content
  } catch (error) {
    if (error?.code !== "ENOENT") throw error
    const seed = await createSeedContent()
    await writeContent(seed)
    return seed
  }
}

export async function writeContent(input) {
  const content = structuredClone(input)
  content.version = 1
  content.updatedAt = new Date().toISOString()
  assertContent(content)
  await mkdir(dataDirectory, { recursive: true })
  const temporaryFile = `${dataFile}.${process.pid}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(content, null, 2)}\n`, "utf8")
  await rename(temporaryFile, dataFile)
  return content
}

export async function saveUpload({ name, type, data }) {
  const extensions = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
  ])
  const extension = extensions.get(type)
  if (!extension || typeof data !== "string") throw new Error("仅支持 JPG、PNG、WebP 或 GIF 图片")
  const match = data.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/)
  if (!match) throw new Error("图片数据无效")
  const buffer = Buffer.from(match[1], "base64")
  if (buffer.length > 8 * 1024 * 1024) throw new Error("图片不能超过 8 MB")
  const stem = String(name || "manuscript")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "manuscript"
  const filename = `${Date.now()}-${stem}${extension}`
  await mkdir(uploadsDirectory, { recursive: true })
  await writeFile(path.join(uploadsDirectory, filename), buffer)
  return `/uploads/${filename}`
}
