import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { readContent, writeContent } from "../server/content-store.mjs"

const projectRoot = path.resolve(import.meta.dirname, "..")
const archivePath = path.resolve(
  projectRoot,
  "../微博作品整理/微博原始导出-7479263676.json"
)
const documentPath = path.resolve(
  projectRoot,
  "../微博作品整理/微博文学作品整理-7479263676.md"
)
const accountPrefix = "weibo-7479263676-"

const selections = [
  ["4640310103378376", "这货年纪轻轻怎么这么有才", "prose"],
]

const exclusions = [
  [
    "5243885282662441",
    "游戏应援与超话大赏活动文案，不作为独立文学作品。",
  ],
  ["5241368433656582", "王者荣耀战队战绩庆祝帖。"],
  ["5230835135678938", "赛事话题与表情反应，不构成文学文本。"],
  [
    "5230831895582837",
    "“回家吧孩子回家吧”处于狼队赛事超话语境，按粉丝即时感叹排除。",
  ],
  ["4665508472029797", "东京奥运会送奖牌互动活动模板。"],
]

const archive = JSON.parse(await readFile(archivePath, "utf8"))
if (
  archive.uid !== "7479263676" ||
  archive.source_endpoint !== "https://m.weibo.cn/api/container/getIndex" ||
  archive.reported_total !== 61 ||
  archive.items.length !== 61 ||
  archive.summary?.unique !== 61 ||
  archive.summary?.original !== 6 ||
  archive.summary?.retweets !== 55
) {
  throw new Error("第二账号微博原始档案不完整或尚未完成移动端时间线校正")
}
if (archive.long_text_failures?.length) {
  throw new Error("第二账号仍有未补齐的原创长微博")
}

const items = new Map(archive.items.map((item) => [item.idstr, item]))
const originalIds = archive.items
  .filter((item) => !item.retweeted)
  .map((item) => item.idstr)
  .sort()
const reviewedIds = [...selections.map(([id]) => id), ...exclusions.map(([id]) => id)].sort()
if (new Set(reviewedIds).size !== reviewedIds.length) {
  throw new Error("第二账号审校清单存在重复微博 ID")
}
if (JSON.stringify(originalIds) !== JSON.stringify(reviewedIds)) {
  throw new Error("第二账号原创微博尚未全部完成文学审校")
}

for (const id of reviewedIds) {
  const item = items.get(id)
  if (!item) throw new Error(`审校清单引用了不存在的微博：${id}`)
  if (item.retweeted) throw new Error(`审校清单误把转发列为原创：${id}`)
}

const normalizeText = (text) =>
  String(text ?? "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+$/g, "")
    .trim()

const dateParts = (createdAt) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(createdAt))
      .map((part) => [part.type, part.value])
  )
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    display: `${parts.year} · ${parts.month}.${parts.day}`,
    chinese: `${parts.year}年${parts.month}月${parts.day}日`,
  }
}

const sourceUrl = (item) => `https://weibo.com/${archive.uid}/${item.mblogid}`
const works = selections
  .map(([id, title, categoryId]) => {
    const item = items.get(id)
    return {
      id,
      title,
      categoryId,
      item,
      date: dateParts(item.created_at),
      text: normalizeText(item.text_full || item.text_raw),
    }
  })
  .sort((left, right) => left.date.iso.localeCompare(right.date.iso))

const current = await readContent()
const retainedPoems = current.poems.filter(
  (poem) => !poem.id.startsWith(accountPrefix)
)

const currentBodies = new Map(
  retainedPoems.map((poem) => [
    normalizeText(poem.body.split("\n\n> 原载微博：")[0]),
    poem,
  ])
)
for (const work of works) {
  const duplicate = currentBodies.get(work.text)
  if (duplicate) {
    throw new Error(
      `第二账号微博 ${work.id} 与网站作品 #${duplicate.number} 正文完全重复`
    )
  }
}

const firstNumber = Math.max(...retainedPoems.map((poem) => poem.number)) + 1
const importedPoems = works.map((work, index) => {
  const excerpt =
    work.text
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 80) ?? ""
  return {
    id: `${accountPrefix}${work.id}`,
    number: firstNumber + index,
    title: work.title,
    body: `${work.text}\n\n> 原载微博：${work.date.chinese} · ${sourceUrl(work.item)}`,
    categoryId: work.categoryId,
    date: work.date.display,
    excerpt,
    image: "/manuscripts/loose-sheet.jpg",
    imageAlt: "深挚吟微博作品数字存档",
    featured: false,
    featuredOrder: null,
    published: true,
  }
})

const lines = [
  "# 深挚吟微博文学作品整理（UID 7479263676）",
  "",
  `> 微博账号：@${archive.account_name}（UID ${archive.uid}）`,
  `> 采集时间：${archive.fetched_at}`,
  `> 原始微博：${archive.summary.unique} 条；原创 ${archive.summary.original} 条；转发 ${archive.summary.retweets} 条。`,
  `> 文学作品：${works.length} 篇；排除原创 ${exclusions.length} 条。`,
  "",
  "## 整理说明",
  "",
  "- 以移动端账号时间线为最终依据，准确区分本人原创与转发。桌面端 mymblog 接口会在部分转发中返回被转发原帖，不能据此判断作者归属。",
  "- 只收录原创诗歌、文学性片段、随笔、书信、读书与创作笔记；活动文案、赛事评论、生活闲聊与纯转发不计入。",
  "- 正文保留微博原貌，仅清除不可见的零宽字符；标题按原句拟定，不改写正文。",
  "- 本账号 61 条时间线均已取得；没有未恢复的原创长文。",
  "",
  "# 随笔、书信与创作笔记",
  "",
]

works.forEach((work, index) => {
  lines.push(`## ${index + 1}. ${work.title}`, "")
  lines.push(`> 日期：${work.date.chinese}`)
  lines.push(`> 原帖：${sourceUrl(work.item)}`)
  lines.push(`> 原始可见类型：${work.item.visible_type}`)
  lines.push("> 编校说明：关于本人长文与短句的创作自评，按“创作笔记”口径收录。")
  lines.push("", work.text, "")
})

lines.push("# 未收录的原创微博", "")
for (const [id, reason] of exclusions) {
  const item = items.get(id)
  const date = dateParts(item.created_at)
  lines.push(`## ${date.chinese} · ${item.mblogid}`, "")
  lines.push(`> 原帖：${sourceUrl(item)}`)
  lines.push(`> 处理：${reason}`, "")
  lines.push(normalizeText(item.text_full || item.text_raw), "")
}

lines.push(
  "# 转发审计",
  "",
  `其余 ${archive.summary.retweets} 条均由移动端时间线明确标记为转发，不作为本人文学作品收入网站。`,
  ""
)

await writeFile(documentPath, `${lines.join("\n").trim()}\n`, "utf8")

const nextContent = {
  ...current,
  poems: [...retainedPoems, ...importedPoems],
}
await writeContent(nextContent)

console.log(
  JSON.stringify(
    {
      sourceTotal: archive.summary.unique,
      originals: archive.summary.original,
      retweets: archive.summary.retweets,
      selected: importedPoems.length,
      excludedOriginals: exclusions.length,
      siteTotal: nextContent.poems.length,
      firstNumber,
      documentPath,
    },
    null,
    2
  )
)
