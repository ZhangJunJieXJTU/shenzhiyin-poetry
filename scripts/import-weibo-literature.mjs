import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { readContent, writeContent } from "../server/content-store.mjs"

const projectRoot = path.resolve(import.meta.dirname, "..")
const archivePath = path.resolve(
  projectRoot,
  "../微博作品整理/微博原始导出-7729712900.json"
)
const documentPath = path.resolve(
  projectRoot,
  "../微博作品整理/微博文学作品整理.md"
)

const selections = [
  ["4727474439852777", "晚风扶心头", "complete"],
  ["4757621209301021", "在深夜思念一个人的感觉是恐怖的", "prose"],
  ["4757842777608804", "我是深挚吟，我永远是深挚吟", "prose"],
  ["4761202062528070", "亲爱的，想到没有缘分这件事", "complete"],
  ["4762297757339558", "无数次我泛滥的思绪", "drafts"],
  ["4762626167410888", "可你快把我撕裂了", "drafts"],
  ["4764139765105452", "我不该爱上你", "drafts"],
  ["4765274055639616", "小姐，如果你不爱我", "drafts"],
  ["4766579528567419", "不知道你在哪里", "drafts"],
  ["4767766849257763", "一个人活出自己", "complete"],
  ["4773733035676903", "我一生都在雨中", "complete"],
  ["4773924326081393", "听说会有人查微博", "drafts"],
  ["4776366060602281", "你是我碎掉的爱情", "complete"],
  ["4776368879961393", "除了写诗，我面对遗憾真的无能为力", "prose"],
  ["4777739464478975", "同学，我想我以后不会怎么主动联系你了", "drafts"],
  ["4780447693537473", "小心翼翼猜测", "drafts"],
  ["4787599287517421", "日落或朝霞", "complete"],
  ["4788994456162488", "这一时刻", "complete"],
  ["4819390144976717", "异地恋是一场劫难吧", "drafts"],
  ["4842589661961999", "喜欢一个人的感觉就是很突", "prose"],
  ["4854610609311971", "想到秋天就想到酒", "complete"],
  ["4874557872412093", "昏天暗地，我找不到我自己", "drafts"],
  ["4877806728646008", "可我明明深陷泥潭", "drafts"],
  ["4877809505275728", "我一直在赌", "prose"],
  ["4878799483178360", "还要多久才能进入你的心", "prose"],
  ["4878980799271645", "写给玉的道歉信", "prose"],
  ["4880338553673095", "关于 ChatGPT、知识继承与未来教育的思考", "prose"],
  ["4880452034235725", "谈恋爱原来还是一样孤独", "complete"],
  ["4880472611488519", "恋爱为何物", "drafts"],
  ["4880476731343045", "要猜着你的心", "drafts"],
  ["4880629240433917", "孤独，怎么句号又画在了这个词上", "complete"],
  ["4881664574752628", "心像悬着一碗水", "prose"],
  ["4881841649361156", "八个人就要各奔东西", "prose"],
  ["4882244268982324", "我祈求让我这青春疯狂一次", "drafts"],
  ["4882436234941869", "还没有做，就已经知道会是精彩回忆", "drafts"],
  ["4883344543713026", "有苦有甜，都是花的养分", "prose"],
  ["4883915560978315", "听的歌愈多，歌就愈像酒", "prose"],
  ["4884482723938410", "倘若明天是最后一天", "complete"],
  ["4885439544299565", "长沙旅人", "complete"],
  ["4886112843073156", "为什么我总要承担这悲楚", "drafts"],
  ["4886815095390871", "走过片片人海", "drafts"],
  ["4889299290425054", "生活果然不是诗", "drafts"],
  ["4890525520365213", "失望是人生常态吗", "prose"],
  ["4891669524908391", "面对流逝的事物无能狂怒", "drafts"],
  ["4895346515247408", "凌晨三点的硬座车厢", "drafts"],
  ["4898477940676260", "可我看见了荒原", "complete"],
  ["4900608798359613", "第六十届运动会", "prose"],
  ["4901671141117349", "把自己包裹", "prose"],
  ["4903445134574093", "远方是伊甸园或绝境", "complete"],
  ["4906428337489288", "午后，沈阳的黑夜来得特别早", "drafts"],
  ["4906518421702962", "每日去教室、回学校、坐大巴车", "complete"],
  ["4908985356913140", "什么是永恒呢", "prose"],
  ["4912610497530319", "黄永玉：这些记忆永远闪着光", "prose"],
  ["4916574727180942", "我不要做守门员", "drafts"],
  ["4918408200588735", "我们整个社会，真的撕裂很大", "prose"],
  ["4919590985663803", "接受突如其然地来，也接受突如其然地走", "drafts"],
  ["4919840646634217", "沈阳一直是个多雨的城市", "prose"],
  ["4920082347593628", "最好的人都会回到身边吗", "drafts"],
  ["4920229208261965", "每个人都是一座孤岛", "complete"],
  ["4938681051254586", "社会需要有态度的个体", "prose"],
  ["4939209590440219", "不会接通的铃声", "prose"],
  ["4939483356338065", "夜里的小南湖", "prose"],
  ["4942075327153829", "为什么好多人都消失在朋友圈了", "prose"],
  ["4945090528937754", "请把我推向新的高台", "drafts"],
  ["4947852021727755", "可能我真的很俗吧", "complete"],
  ["4947852968329769", "所有问题的本质都来源于狭隘", "drafts"],
  ["4948471071117870", "和情绪不稳定的人谈恋爱", "prose"],
  ["4948481241781288", "我的作品离了爱没有话题", "prose"],
  ["4950688783666535", "上苍，我这一颗心赤裸裸地乞求你", "drafts"],
  ["4952519630654028", "我必须做那一件事", "prose"],
  ["4952668234581620", "割掉没用的瘀血", "complete"],
  ["4959485808345210", "我不想反思了", "prose"],
  ["4959729287433864", "我的人生一直在说着对不起", "drafts"],
  ["4960169810462897", "偷走我的玫瑰", "complete"],
  ["4968809860171970", "一道题的悲剧", "complete"],
  ["4972852797507231", "我想我的一生都干干净净", "drafts"],
  ["4973120014780417", "流水抚舟夜满月", "complete"],
  ["4973342217999267", "痛苦太多，告诉别人都比不上一篇文章", "prose"],
  ["4973444041280654", "我揪着破碎的心", "drafts"],
  ["4995644806403563", "长沙吹乱了我孤独的面纱", "drafts"],
  ["4995646812063794", "回去的路像梦在逐渐醒", "complete"],
  ["4999959917367145", "爱像云", "complete"],
  ["5002741098747509", "你的冷漠，我怎么都领悟不透", "drafts"],
  ["5002756016571674", "我多想实现这种喧嚣", "complete"],
  ["5002941222358179", "生命一部分在丢失", "drafts"],
  ["5002949186552354", "人生海海", "drafts"],
  ["5003216330165927", "我似乎是一个天生的诗人", "prose"],
  ["5003216989719402", "巨型的泡沫", "drafts"],
  ["5003221164885422", "最无人关心的作者", "drafts"],
  ["5003271473728858", "皎月当空", "drafts"],
  ["5003519922537918", "有破洞的纸", "drafts"],
  ["5003529875883419", "我们现在一点都不一样", "complete"],
  ["5009644192009503", "命运给了我一巴掌", "complete"],
  ["5009788627061200", "好怀念那个自己", "drafts"],
  ["5021358182369078", "对于生活多了一种接受", "complete"],
  ["5024545540669838", "我们这些神的弃子", "complete"],
  ["5044602556645585", "情绪，果然如我一场梦", "complete"],
  ["5057190943524085", "最终气急败坏，假以自在", "drafts"],
  ["5077931357375879", "读《唐多令·芦叶满汀洲》", "prose", "开篇词作为阅读对象引录，作者为南宋刘过；后文为深挚吟读后感。"],
  ["5080463255012495", "如梦似幻，皆是泡影", "complete"],
  ["5084414721656521", "在柳巷，一杯酒告别二十三岁", "prose"],
  ["5105456420225379", "天空是紫色", "complete"],
  ["5210577339156963", "沈阳的春夏秋冬，埋葬我所有心动的地方", "complete"],
]

const existingVariants = [
  ["4759722945152090", 107, "已收入《守门人和诗人》第 3 节"],
  ["4759758118323400", 107, "已收入《守门人和诗人》第 4 节"],
  ["4761597639655476", 107, "已收入《守门人和诗人》第 2 节"],
  ["4762006085435555", 107, "《守门人和诗人》的早期异稿"],
]

const duplicatePosts = new Map([
  ["4788994456162488", ["4815939567356901"]],
])

const archive = JSON.parse(await readFile(archivePath, "utf8"))
if (archive.total_reported !== archive.total_unique || archive.items.length !== 343) {
  throw new Error("微博原始档案不完整，拒绝继续导入")
}

const items = new Map(archive.items.map((item) => [item.idstr, item]))
const selectedIds = new Set(selections.map(([id]) => id))
if (selectedIds.size !== selections.length) throw new Error("整理清单存在重复微博 ID")

for (const [id] of [...selections, ...existingVariants]) {
  const item = items.get(id)
  if (!item) throw new Error(`整理清单引用了不存在的微博：${id}`)
  if (item.retweeted) throw new Error(`整理清单误收转发微博：${id}`)
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
  .map(([id, title, categoryId, editorNote]) => {
    const item = items.get(id)
    const date = dateParts(item.created_at)
    return {
      id,
      title,
      categoryId,
      editorNote,
      item,
      date,
      text: normalizeText(item.text_full || item.text_raw),
      duplicateIds: duplicatePosts.get(id) ?? [],
    }
  })
  .sort((left, right) => left.date.iso.localeCompare(right.date.iso) || left.id.localeCompare(right.id))

const current = await readContent()
const retainedPoems = current.poems.filter((poem) => !/^weibo-\d+$/.test(poem.id))
const firstNumber = Math.max(...retainedPoems.map((poem) => poem.number)) + 1

const importedPoems = works.map((work, index) => {
  const sourceLines = [
    `> 原载微博：${work.date.chinese} · ${sourceUrl(work.item)}`,
    ...work.duplicateIds.map((id) => {
      const duplicate = items.get(id)
      return `> 同文重发：${dateParts(duplicate.created_at).chinese} · ${sourceUrl(duplicate)}`
    }),
  ]
  const note = work.editorNote ? `\n\n[编校说明：${work.editorNote}]` : ""
  const body = `${work.text}${note}\n\n${sourceLines.join("\n")}`
  const excerpt = work.text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean)
    ?.slice(0, 80) ?? ""

  return {
    id: `weibo-${work.id}`,
    number: firstNumber + index,
    title: work.title,
    body,
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

const nextContent = {
  ...current,
  site: {
    ...current.site,
    period: "2018—2025",
    heroDescription:
      "写于 2018—2025 年。从少年诗稿到后来的随笔与微博短章，\n关于雪、夜色、故乡，以及一路生长的生活。",
    aboutDescription:
      "这些文字从试卷、草稿纸与旧笔记本开始，后来延伸到城市、旅途、公众号与微博。\n多年以后，我把它们重新整理，让散落在时间里的字句再次相遇。",
  },
  poems: [...retainedPoems, ...importedPoems],
}

await writeContent(nextContent)

const categoryMeta = [
  ["complete", "较完整诗稿"],
  ["drafts", "草稿与残句"],
  ["prose", "随笔、书信与创作笔记"],
]

const lines = [
  "# 深挚吟微博文学作品整理",
  "",
  `> 微博账号：@${archive.screen_name}（UID ${archive.uid}）`,
  `> 采集时间：${archive.fetched_at}`,
  `> 原始微博：${archive.total_unique} 条；原创 ${archive.items.filter((item) => !item.retweeted).length} 条；转发 ${archive.items.filter((item) => item.retweeted).length} 条。`,
  `> 文学作品：${works.length} 篇；另有 ${existingVariants.length} 条异稿已并入网站既有作品。`,
  "",
  "## 整理说明",
  "",
  "- 只收录原创诗歌、文学性片段、随笔、书信、读书与创作笔记；生活闲聊、学习清单、赛事评论、营销资料、纯转发及无法读取正文的内容不计入。",
  "- 正文保留微博原貌，仅清除不可见的零宽字符；标题为整理时据首句或主题拟定，不改写正文。",
  "- 同文重发合并为一篇并保留两个来源链接；与网站既有作品重复或属于同一作品异稿者列在文末，不重复建站。",
  "- 微博可见范围不同于网站。收录后将随作品集公开展示。",
]

for (const [categoryId, label] of categoryMeta) {
  const categoryWorks = works.filter((work) => work.categoryId === categoryId)
  lines.push("", `# ${label}`, "")
  categoryWorks.forEach((work, index) => {
    lines.push(`## ${index + 1}. ${work.title}`, "")
    lines.push(`> 日期：${work.date.chinese}`)
    lines.push(`> 原帖：${sourceUrl(work.item)}`)
    lines.push(`> 原始可见类型：${work.item.visible_type}`)
    for (const duplicateId of work.duplicateIds) {
      const duplicate = items.get(duplicateId)
      lines.push(`> 同文重发：${sourceUrl(duplicate)}`)
    }
    if (work.editorNote) lines.push(`> 编校说明：${work.editorNote}`)
    lines.push("", work.text, "")
  })
}

lines.push("", "# 已并入网站既有作品的微博异稿", "")
for (const [id, existingNumber, note] of existingVariants) {
  const item = items.get(id)
  const poem = current.poems.find((candidate) => candidate.number === existingNumber)
  lines.push(`## ${poem?.title ?? `作品 ${existingNumber}`} · 微博异稿`, "")
  lines.push(`> 日期：${dateParts(item.created_at).chinese}`)
  lines.push(`> 原帖：${sourceUrl(item)}`)
  lines.push(`> 处理：${note}，本次不重复新增。`, "")
  lines.push(normalizeText(item.text_full || item.text_raw), "")
}

await writeFile(documentPath, `${lines.join("\n").trim()}\n`, "utf8")

const counts = Object.fromEntries(
  categoryMeta.map(([id]) => [id, importedPoems.filter((poem) => poem.categoryId === id).length])
)
console.log(
  JSON.stringify(
    {
      sourceTotal: archive.total_unique,
      originals: archive.items.filter((item) => !item.retweeted).length,
      selected: importedPoems.length,
      variants: existingVariants.length,
      counts,
      siteTotal: nextContent.poems.length,
      documentPath,
    },
    null,
    2
  )
)
