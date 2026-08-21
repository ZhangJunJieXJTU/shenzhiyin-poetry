import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { readContent, writeContent } from "../server/content-store.mjs"

const sourceDirectory = process.argv[2]

if (!sourceDirectory) {
  throw new Error("请提供 Effie Markdown 文件夹路径")
}

const filenamePattern = /^(.*)（(\d{4})-(\d{2})-(\d{2})）\.md$/
const collator = new Intl.Collator("zh-CN")

function validateDate(year, month, day, filename) {
  const isoDate = `${year}-${month}-${day}`
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== isoDate
  ) {
    throw new Error(`文件名日期无效：${filename}`)
  }
  return isoDate
}

function firstReadableLine(body) {
  return (
    body
      .split("\n")
      .map((line) => line.trim())
      .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^>\s?/, ""))
      .find(
        (line) =>
          line &&
          !/^---+$/.test(line) &&
          !/^\d{4}(?:年|\/|-)/.test(line) &&
          !/^!\[/.test(line)
      ) ?? ""
  )
}

const files = (await readdir(sourceDirectory)).filter((filename) =>
  filename.endsWith(".md")
)

const works = await Promise.all(
  files.map(async (filename) => {
    const match = filename.match(filenamePattern)
    if (!match) {
      throw new Error(`文件名不符合“标题（YYYY-MM-DD）.md”：${filename}`)
    }

    const [, title, year, month, day] = match
    const isoDate = validateDate(year, month, day, filename)
    const body = (await readFile(path.join(sourceDirectory, filename), "utf8"))
      .replace(/\r\n?/g, "\n")
      .trim()

    if (!body) throw new Error(`作品正文为空：${filename}`)

    return { filename, title: title.trim(), isoDate, year, month, day, body }
  })
)

works.sort(
  (left, right) =>
    left.isoDate.localeCompare(right.isoDate) ||
    collator.compare(left.title, right.title)
)

const duplicateTitles = Object.entries(
  Object.groupBy(works, (work) => work.title)
).filter(([, matches]) => matches.length > 1)

if (duplicateTitles.length) {
  throw new Error(
    `存在重复标题：${duplicateTitles.map(([title]) => title).join("、")}`
  )
}

const current = await readContent()
const retainedPoems = current.poems.filter(
  (poem) => !poem.id.startsWith("effie-")
)
const firstNumber = Math.max(0, ...retainedPoems.map((poem) => poem.number)) + 1

const importedPoems = works.map((work, index) => ({
  id: `effie-${work.isoDate}-${createHash("sha1").update(work.filename).digest("hex").slice(0, 8)}`,
  number: firstNumber + index,
  title: work.title,
  body: work.body,
  categoryId: "later",
  date: `${work.year} · ${work.month}.${work.day}`,
  excerpt: firstReadableLine(work.body).slice(0, 80),
  image: "/manuscripts/old-page.jpg",
  imageAlt: "深挚吟作品集手稿原页",
  featured: false,
  featuredOrder: null,
  published: true,
}))

const nextContent = {
  ...current,
  site: {
    ...current.site,
    period: "2018—2024",
    heroTitle: "我把这些年，\n留在这些句子里。",
    heroDescription:
      "写于 2018—2024 年。从少年诗稿到后来的随笔，\n关于雪、夜色、故乡，以及一路生长的生活。",
    aboutDescription:
      "这些文字从试卷、草稿纸与旧笔记本开始，后来延伸到城市、旅途与日常。\n多年以后，我把它们重新整理，让散落在时间里的字句再次相遇。",
  },
  poems: [...retainedPoems, ...importedPoems],
}

await writeContent(nextContent)

const counts = Object.entries(
  Object.groupBy(works, (work) => work.year)
).map(([year, matches]) => `${year}: ${matches.length}`)

console.log(`已导入 ${importedPoems.length} 篇作品（${counts.join("，")}）`)
