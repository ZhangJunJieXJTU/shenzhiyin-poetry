import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { writeContent } from "../server/content-store.mjs"

const sourceDirectory = process.argv[2]

if (!sourceDirectory) {
  throw new Error("请提供 Effie Markdown 文件夹路径")
}

const filenamePattern = /^(.*)（(\d{4})-(\d{2})-(\d{2})）\.md$/
const collator = new Intl.Collator("zh-CN")

const proseTitles = new Set([
  "神与人的迷惘之夜",
  "走着",
  "该怎样描述最近这几天",
  "坠入文学与诗的世界",
  "沈阳，竟是一个多雨的城",
  "呼吸之野",
  "论火锅里小料的作用",
  "千里咫尺",
  "想分享给你的歌",
  "德令哈小寺",
  "豁达，是对人类最大的惩罚",
  "好久没有更新公众号",
  "一切意外终会是如约而至的欢喜",
  "给我的A348与记忆纷飞",
  "列车",
  "一只云没的醒来后活着",
  "只道寻常",
  "秋夜记",
  "每一次的真实与确幸都值得纪念",
  "如果上帝再给我一次机会",
  "一个世界的生命与一个人的生活",
  "沈阳的雪",
  "孤单北半球的相聚",
  "映城",
  "你何时见到夕阳而低首",
  "你会在哪一刻突然思绪翻涌",
  "有没有那么一首歌，让你突然想起某一时刻",
  "总有些心语漫舞在夜里",
  "四月十四日凌晨",
  "Someone Like You——很像你的人",
  "深挚吟一周年",
  "这海纷扬起，何以忽地下满了雨",
  "给自己的大二下学期总结",
  "Rainbow Mile",
  "该怎样度过浑南突然的冬天",
  "爱是什么呀",
  "给王老师的生日信",
  "我们该怎样理解初雪",
  "关于过去日子的心路历程与未来规划",
  "请让我回应自己——致2022",
  "早晨从中午开始",
  "给柳老师交作业",
  "关于《瞬息全宇宙》",
  "咖啡店里的二月小记",
  "近百日小记",
  "六月小记",
  "一碗豆腐脑比星星更温暖",
  "实训结束之后",
  "520纪念",
  "文字是最疼我的",
  "在文章面前，我总是毫不遮掩自己",
])

const draftTitles = new Set(["用太多的经历", "我是谁呢", "不敢回看"])

function categoryFor(title) {
  if (draftTitles.has(title)) return "drafts"
  if (proseTitles.has(title)) return "prose"
  return "complete"
}

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

const knownTitles = new Set(works.map((work) => work.title))
const unknownClassifications = [...proseTitles, ...draftTitles].filter(
  (title) => !knownTitles.has(title)
)

if (unknownClassifications.length) {
  throw new Error(
    `分类清单中存在未知标题：${unknownClassifications.join("、")}`
  )
}

const current = JSON.parse(
  await readFile(
    new URL("../server/data/content.json", import.meta.url),
    "utf8"
  )
)
const retainedPoems = current.poems.filter(
  (poem) => !poem.id.startsWith("effie-")
)
const firstNumber = Math.max(0, ...retainedPoems.map((poem) => poem.number)) + 1

const importedPoems = works.map((work, index) => ({
  id: `effie-${work.isoDate}-${createHash("sha1").update(work.filename).digest("hex").slice(0, 8)}`,
  number: firstNumber + index,
  title: work.title,
  body: work.body,
  categoryId: categoryFor(work.title),
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

const counts = Object.entries(Object.groupBy(works, (work) => work.year)).map(
  ([year, matches]) => `${year}: ${matches.length}`
)

const categoryCounts = Object.entries(
  Object.groupBy(importedPoems, (poem) => poem.categoryId)
).map(([category, matches]) => `${category}: ${matches.length}`)

console.log(
  `已导入 ${importedPoems.length} 篇作品（${counts.join("，")}；${categoryCounts.join("，")}）`
)
