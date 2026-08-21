import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { readContent, writeContent } from "../server/content-store.mjs"

const projectRoot = path.resolve(import.meta.dirname, "..")
const archivePath = path.resolve(
  projectRoot,
  "../微信公众号作品整理/公众号原始导出-深挚吟.json"
)
const screenshotPath = path.resolve(
  projectRoot,
  "../微信公众号作品整理/截图补充文章-深挚吟.json"
)
const documentPath = path.resolve(
  projectRoot,
  "../微信公众号作品整理/深挚吟公众号文学作品整理.md"
)
const managedPrefix = "wechat-"

const archive = JSON.parse(await readFile(archivePath, "utf8"))
const screenshotArchive = JSON.parse(await readFile(screenshotPath, "utf8"))

if (
  archive.account_name !== "深挚吟" ||
  archive.summary?.backend_original_contents !== 54 ||
  archive.summary?.backend_publish_records !== 64 ||
  archive.summary?.unique_urls !== 71 ||
  archive.summary?.succeeded !== 71 ||
  archive.summary?.failed !== 0 ||
  archive.items?.length !== 71 ||
  archive.deleted_items?.length !== 3
) {
  throw new Error("公众号原始档案不完整，拒绝继续导入")
}
if (
  screenshotArchive.account_name !== "深挚吟" ||
  screenshotArchive.items?.length !== 2
) {
  throw new Error("公众号截图补充档案不完整")
}

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const normalizeForComparison = (value) =>
  normalizeText(value)
    .replace(/^> 原载(?:公众号|微博)：.*$/gm, "")
    .replace(/^> 据公众号截图整理：.*$/gm, "")
    .replace(/^\[[^\n]+\]$/gm, "")
    .replace(/[\s#>*_`~，。！？：；、“”‘’（）()《》〈〉·.\/\\|—–-]+/g, "")

const itemAt = (sequence) => {
  const item = archive.items[sequence - 1]
  if (!item) throw new Error(`公众号序号 W${sequence} 不存在`)
  return item
}

const dateInfo = (isoLike) => {
  const iso = String(isoLike).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`无法识别日期：${isoLike}`)
  }
  const [year, month, day] = iso.split("-")
  return {
    iso,
    display: `${year} · ${month}.${day}`,
    chinese: `${year}年${month}月${day}日`,
  }
}

const articleDate = (item) => dateInfo(item.published_at || item.publish_label)

const sourceLine = (item) =>
  `> 原载公众号：${articleDate(item).chinese} · ${item.url}`

const removeExactFirstLine = (text, title) => {
  const lines = normalizeText(text).split("\n")
  const first = lines.findIndex((line) => line.trim())
  if (first >= 0 && lines[first].trim() === String(title).trim()) {
    lines.splice(first, 1)
  }
  return normalizeText(lines.join("\n"))
}

const between = (
  text,
  startMarker,
  endMarker,
  { includeStart = false, includeEnd = false, fromLast = false } = {}
) => {
  const source = normalizeText(text)
  const startIndex = fromLast
    ? source.lastIndexOf(startMarker)
    : source.indexOf(startMarker)
  if (startIndex < 0) throw new Error(`未找到分段起点：${startMarker}`)
  const contentStart = includeStart
    ? startIndex
    : startIndex + startMarker.length
  const endIndex = endMarker
    ? source.indexOf(endMarker, contentStart)
    : source.length
  if (endMarker && endIndex < 0) throw new Error(`未找到分段终点：${endMarker}`)
  const contentEnd = includeEnd ? endIndex + endMarker.length : endIndex
  return normalizeText(source.slice(contentStart, contentEnd))
}

const removeLines = (text, predicates) =>
  normalizeText(text)
    .split("\n")
    .filter((line) => !predicates.some((predicate) => predicate(line.trim())))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const appendBlock = (body, block) => {
  const normalizedBody = normalizeText(body)
  const normalizedBlock = normalizeText(block)
  if (!normalizedBlock || normalizedBody.includes(normalizedBlock))
    return normalizedBody
  return `${normalizedBody}\n\n${normalizedBlock}`.trim()
}

const withoutWechatSources = (body) =>
  normalizeText(body)
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("> 原载公众号：") &&
        !line.startsWith("> 据公众号截图整理：")
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const preservedSourceLines = (body) =>
  normalizeText(body)
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("> 原载微博：") ||
        line.startsWith("> 同文重发：") ||
        line.startsWith("> 原图：")
    )

const firstReadableLine = (body) =>
  normalizeText(body)
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !line.startsWith("#") &&
        !line.startsWith(">") &&
        !line.startsWith("[")
    ) ?? ""

const cleanFullArticle = (sequence) => {
  const item = itemAt(sequence)
  return removeExactFirstLine(item.body_text, item.title)
}

const makeWork = ({
  sequence,
  suffix = "",
  title,
  categoryId,
  text,
  editorNote,
  order = 0,
}) => {
  const item = itemAt(sequence)
  const date = articleDate(item)
  const stem = item.mid
    ? `${item.mid}-${item.idx || "1"}`
    : `public-${sequence}`
  const id = `${managedPrefix}${stem}${suffix ? `-${suffix}` : ""}`
  let body = removeExactFirstLine(text, title)
  if (!body) throw new Error(`W${sequence}「${title}」没有可导入正文`)
  if (editorNote) body = appendBlock(body, `[编校说明：${editorNote}]`)
  body = appendBlock(body, sourceLine(item))
  return {
    id,
    sourceSequence: sequence,
    sourceKind: "public",
    sourceTitle: item.title,
    order,
    title,
    body,
    categoryId,
    date,
  }
}

const w26ImagePoem = `我突然好想被这个夜晚吞噬

可能是占据沉默的空庭俯瞰路口
心里就突然被孤独迷晕

这夜晚太靠近我
我曾经努力远离一切尽力自由
被一个夜晚亲吻成凡夫俗子

我爱上了一件事
这件事让我的心越来越定
你看
好像那路灯下停靠的面包车

我一人独行
越来越忙碌地
学着怎么样与自我共处一室
共处在这个空旷的空庭

请你把我吞噬吧
晚夜
我的眼睛只能看见你身体里明亮的星星
和我这个肉体的自己

请你把我吞噬吧
晚夜
我无数次痛苦
忧郁
请你让我与这世界决裂
如果我孤独
落魄
请你收留我`

const w31 = itemAt(31).body_text
const w35 = itemAt(35).body_text
const w45 = itemAt(45).body_text
const w47 = itemAt(47).body_text
const w49 = itemAt(49).body_text
const w56 = itemAt(56).body_text
const w58 = itemAt(58).body_text
const w59 = itemAt(59).body_text
const w60 = itemAt(60).body_text
const w61 = itemAt(61).body_text
const w63 = itemAt(63).body_text
const w65 = itemAt(65).body_text
const w70 = itemAt(70).body_text

const w36Original = between(
  itemAt(36).body_text,
  "前几日一位朋友在QQ群分享了徐志摩的《私语》",
  "感谢关注",
  { includeStart: true }
)
const w36Body = `[引文说明：公众号原文开篇引录歌曲《Mr. Lonely》歌词与徐志摩《私语》；此处保留作者的阅读随笔和原创诗。]\n\n${w36Original}`

const w45PoemOne = removeLines(between(w45, "七夕遐想", "读《边城》"), [
  (line) => line === "文 || 深挚吟",
  (line) => /^—+$/.test(line),
])
const w45PoemTwo = removeLines(between(w45, "读《边城》", "1：15，落笔停歇"), [
  (line) => line === "文 || 深挚吟",
  (line) => /^—+$/.test(line),
])
const w45Prose = between(w45, "1：15，落笔停歇", "bye～读者朋友们", {
  includeStart: true,
})

const w47PoemOne = removeLines(between(w47, "我张开双手", "不语"), [
  (line) => line === "文 || 深挚吟",
])
const w47PoemTwo = removeLines(between(w47, "不语", null), [
  (line) => line === "文 || 深挚吟",
])

const w49Surge = between(w49, "《Surge》", "——7.23")
const w49Farewell = between(w49, "在一个傍晚与你告别", null, {
  includeStart: true,
})

const w56Moon = between(w56, "其一 ： 月尽", "其二： 星陨")
const w56Star = between(w56, "其二： 星陨", "其三：呢喃")
const w56Reflection = between(w56, "其三：呢喃", "苏三离了洪洞县")

const w58Sea = between(w58, "一片海", "DROWNING")
const w58Drowning = between(w58, "DROWNING", "怀念和期许")
const w58Memory = between(w58, "怀念和期许", "所谓将一些事情想通")
const w58ProseStart = w58.indexOf("所谓将一些事情想通")
const w58LyricsRepeat = w58.lastIndexOf("\n我还要遇见几个你\n")
if (w58ProseStart < 0 || w58LyricsRepeat <= w58ProseStart) {
  throw new Error("W58 散文分段失败")
}
const w58Prose = normalizeText(w58.slice(w58ProseStart, w58LyricsRepeat))

const w59Body = `[引文说明：首段引语出自《小王子》；公众号原文首尾另有歌曲《只对你有感觉》歌词，此处不作为作者正文收入。]\n\n${between(
  w59,
  "“正是因为我为我的玫瑰花花费的时光",
  "爱一个人\n唯一的玫瑰",
  { includeStart: true }
)}`

const w60Core = between(w60, "好看的皮囊是一文不值的", null, {
  includeStart: true,
})
const w60Body = w60Core.replace(
  "好看的皮囊是一文不值的，有趣的灵魂才是万里挑一。",
  "> 好看的皮囊是一文不值的，有趣的灵魂才是万里挑一。\n[引语：网络流行表达；公众号原文开篇另引《You Are My Sunshine》歌词。]"
)

const w61Poem = between(w61, "如果要求明月一个神秘的方式", "感情写不完的", {
  includeStart: true,
})

const w63Body = `${between(
  w63,
  "害，果然，人矫情起来",
  "“爱一个人，没爱到又能怎么样。”",
  { includeStart: true }
)}\n\n[歌词摘录：公众号原文此处列有十八条歌曲歌词，详见原文链接；不作为深挚吟原创诗句。]\n\n${between(
  w63,
  "把一些事情要努力忘记",
  null,
  { includeStart: true }
).replace("面朝大海，春暖花开。", "> 面朝大海，春暖花开。（海子诗题及诗句）")}`

const w65Poem = between(w65, "小心一切", "为什么要在文章开头", {
  includeStart: false,
})
const w65Intro = between(w65, "悄悄奢望", "小心一切", {
  includeStart: true,
})
const w65Reflection = between(w65, "为什么要在文章开头", null, {
  includeStart: true,
})
const w65Prose = `${w65Intro}\n\n[中嵌诗《小心一切》已另收为独立作品。]\n\n${w65Reflection}`

const w70Poem = between(w70, "春天的诗", "打卡中街")
const w70ProseRaw = between(
  w70,
  "其实本来打算要沈阳故宫里走走",
  "作者/ 深挚吟",
  { includeStart: true }
)
const w70Prose = removeLines(w70ProseRaw, [
  (line) => line === "二零二一年/伍月",
  (line) => line === "2021 SPRING",
]).replace("春天的礼物", "### 春天的礼物")

const newWorks = [
  makeWork({
    sequence: 1,
    title: "新的生命踩着我的脚印",
    categoryId: "complete",
    text: removeExactFirstLine(itemAt(1).body_text, "新的生命踩着我的脚印"),
  }),
  makeWork({
    sequence: 11,
    title: "爱上你的四十个理由",
    categoryId: "prose",
    text: cleanFullArticle(11),
  }),
  makeWork({
    sequence: 13,
    title: "《最伟大的作品》",
    categoryId: "prose",
    text: cleanFullArticle(13),
  }),
  makeWork({
    sequence: 21,
    title: "请向黎明一样升起",
    categoryId: "prose",
    text: cleanFullArticle(21),
  }),
  makeWork({
    sequence: 26,
    suffix: "diary",
    title: "封校日记Ⅱ",
    categoryId: "prose",
    text: cleanFullArticle(26),
    editorNote:
      "原文末附图片诗《我突然好想被这个夜晚吞噬》，已据原图另列为作品。",
    order: 0,
  }),
  makeWork({
    sequence: 26,
    suffix: "night-swallow-me",
    title: "我突然好想被这个夜晚吞噬",
    categoryId: "complete",
    text: w26ImagePoem,
    editorNote: "据公众号原文末图逐行转录。",
    order: 1,
  }),
  makeWork({
    sequence: 31,
    suffix: "untitled-2",
    title: "夜晚的太阳·无题（二）",
    categoryId: "complete",
    text: between(w31, "无题-2", "无题-3"),
    order: 1,
  }),
  makeWork({
    sequence: 31,
    suffix: "untitled-3",
    title: "夜晚的太阳·无题（三）",
    categoryId: "complete",
    text: between(w31, "无题-3", "无题-4"),
    order: 2,
  }),
  makeWork({
    sequence: 31,
    suffix: "untitled-4",
    title: "夜晚的太阳·无题（四）",
    categoryId: "complete",
    text: between(w31, "无题-4", "每一副画都有自己的意义"),
    order: 3,
  }),
  makeWork({
    sequence: 35,
    suffix: "fog",
    title: "雾起雾散",
    categoryId: "complete",
    text: between(w35, "雾起雾散", "（9：53"),
    order: 1,
  }),
  makeWork({
    sequence: 36,
    title: "掉落在秋水秋波的秋晕里，一涡半转",
    categoryId: "prose",
    text: w36Body,
  }),
  makeWork({
    sequence: 39,
    title: "宿醉",
    categoryId: "complete",
    text: between(itemAt(39).body_text, "文 || 深挚吟", null),
  }),
  makeWork({
    sequence: 45,
    suffix: "qixi-reverie",
    title: "七夕遐想",
    categoryId: "complete",
    text: w45PoemOne,
    order: 0,
  }),
  makeWork({
    sequence: 45,
    suffix: "border-town",
    title: "读《边城》",
    categoryId: "complete",
    text: w45PoemTwo,
    order: 1,
  }),
  makeWork({
    sequence: 45,
    suffix: "night-rain",
    title: "七夕落雨不绝，今夜尚好",
    categoryId: "prose",
    text: w45Prose,
    order: 2,
  }),
  makeWork({
    sequence: 47,
    suffix: "open-arms",
    title: "我张开双手",
    categoryId: "complete",
    text: w47PoemOne,
    editorNote: "“重岩叠嶂，隐天蔽日”等句化用郦道元《三峡》。",
    order: 0,
  }),
  makeWork({
    sequence: 47,
    suffix: "silent",
    title: "不语",
    categoryId: "complete",
    text: w47PoemTwo,
    order: 1,
  }),
  makeWork({
    sequence: 49,
    suffix: "surge",
    title: "Surge",
    categoryId: "complete",
    text: w49Surge,
    editorNote:
      "2021年7月22日已删除稿为本诗早期异稿；此处采用7月23日公众号发布修订版。",
    order: 0,
  }),
  makeWork({
    sequence: 49,
    suffix: "sunset-farewell",
    title: "在一个傍晚与你告别",
    categoryId: "drafts",
    text: w49Farewell,
    order: 1,
  }),
  makeWork({
    sequence: 56,
    suffix: "moon-end",
    title: "月尽",
    categoryId: "complete",
    text: w56Moon,
    order: 0,
  }),
  makeWork({
    sequence: 56,
    suffix: "falling-star",
    title: "星陨",
    categoryId: "complete",
    text: w56Star,
    order: 1,
  }),
  makeWork({
    sequence: 57,
    title: "借 X 的自省与道歉",
    categoryId: "complete",
    text: cleanFullArticle(57),
  }),
  makeWork({
    sequence: 58,
    suffix: "sea",
    title: "一片海",
    categoryId: "complete",
    text: w58Sea,
    order: 0,
  }),
  makeWork({
    sequence: 58,
    suffix: "drowning",
    title: "Drowning",
    categoryId: "complete",
    text: w58Drowning,
    order: 1,
  }),
  makeWork({
    sequence: 58,
    suffix: "memory-and-hope",
    title: "怀念和期许",
    categoryId: "complete",
    text: w58Memory,
    order: 2,
  }),
  makeWork({
    sequence: 58,
    suffix: "return-to-self",
    title: "继续将一切还给自己",
    categoryId: "prose",
    text: w58Prose,
    editorNote:
      "公众号原文首尾引薛之谦《几个你》歌词，此处不作为作者正文收入。",
    order: 3,
  }),
  makeWork({
    sequence: 59,
    title: "六一里，再读一遍《小王子》",
    categoryId: "prose",
    text: w59Body,
  }),
  makeWork({
    sequence: 60,
    title: "千篇一律，与万里挑一",
    categoryId: "prose",
    text: w60Body,
  }),
  makeWork({
    sequence: 61,
    title: "一个神秘的方式",
    categoryId: "complete",
    text: w61Poem,
    editorNote:
      "公众号原文开篇引《私奔到月球》歌词，末行“感情写不完的”为版面尾注，均未并入诗正文。",
  }),
  makeWork({
    sequence: 62,
    title: "Little Diary",
    categoryId: "prose",
    text: cleanFullArticle(62),
    editorNote:
      "“坏人都被赶跑啦”引自《神兵小将》；“他都是诗人了……”原文自注出处待考。",
  }),
  makeWork({
    sequence: 63,
    title: "喂，收工了，那位先生",
    categoryId: "prose",
    text: w63Body,
  }),
  makeWork({
    sequence: 65,
    suffix: "be-careful",
    title: "小心一切",
    categoryId: "complete",
    text: w65Poem,
    order: 0,
  }),
  makeWork({
    sequence: 65,
    suffix: "choose-a-way",
    title: "选择一种方式",
    categoryId: "prose",
    text: w65Prose,
    editorNote: "开篇“幸存者偏差”定义属于概念释义，未作为作者原创正文收入。",
    order: 1,
  }),
  makeWork({
    sequence: 70,
    suffix: "spring-poem",
    title: "春天的诗",
    categoryId: "complete",
    text: w70Poem,
    order: 0,
  }),
  makeWork({
    sequence: 70,
    suffix: "spring-good-thing",
    title: "春天，一件美好的事情一定会发生",
    categoryId: "prose",
    text: w70Prose,
    editorNote: "“柳暗花明又一村”为陆游诗句，原文保留引号。",
    order: 1,
  }),
  makeWork({
    sequence: 71,
    title: "启程开始，岁月无限",
    categoryId: "prose",
    text: cleanFullArticle(71),
  }),
]

const screenshotWorks = screenshotArchive.items.map((item, index) => {
  const date = dateInfo(item.publish_date)
  const body = `${normalizeText(item.body_text)}\n\n[编校说明：${item.completeness}]\n\n> 据公众号截图整理：${date.chinese}`
  return {
    id: `${managedPrefix}${item.id}`,
    sourceSequence: 1000 + index,
    sourceKind: "screenshot",
    sourceTitle: item.title,
    order: index,
    title: item.title,
    body,
    categoryId: item.category,
    date,
  }
})

newWorks.push(...screenshotWorks)

const mergePlans = [
  {
    sequence: 2,
    target: 259,
    mode: "replace",
    title: "橘色夜晚",
    categoryId: "prose",
    note: "公众号全文包含站内原有组诗（二），以完整发布稿合并。",
  },
  {
    sequence: 3,
    target: 155,
    mode: "source",
    note: "与《近百日小记》正文一致，保留原写作日期并补公众号来源。",
  },
  {
    sequence: 4,
    target: 150,
    mode: "replace",
    note: "《我想我应得一些苦痛》的公众号修订稿。",
  },
  {
    sequence: 5,
    target: 149,
    mode: "source",
    note: "与《早晨从中午开始》正文一致。",
  },
  {
    sequence: 6,
    target: 148,
    mode: "source",
    note: "与《请让我回应自己——致2022》正文一致。",
  },
  {
    sequence: 7,
    target: 147,
    mode: "replace",
    title: "解题",
    note: "公众号发布稿较完整，以《解题》为题合并。",
  },
  {
    sequence: 9,
    target: 145,
    mode: "source",
    note: "与《我们该怎样理解初雪》正文一致。",
  },
  {
    sequence: 10,
    target: 138,
    mode: "replace",
    note: "公众号稿补齐中秋诗的段落。",
  },
  {
    sequence: 12,
    target: 120,
    mode: "source",
    note: "与《给自己的大二下学期总结》为同一长文版本。",
  },
  {
    sequence: 15,
    target: 128,
    mode: "source",
    note: "图片页正文为完整《七月》，逐行与站内版本一致；页面短句只是图注。",
  },
  {
    sequence: 16,
    target: 127,
    mode: "replace",
    note: "公众号发布稿扩充了《你是落空的飞鸟，在漆黑停泊》。",
  },
  {
    sequence: 17,
    target: 173,
    mode: "replace",
    note: "公众号全文包含《我一生都在雨中》及写作引言。",
  },
  {
    sequence: 18,
    target: 111,
    mode: "source",
    note: "与《深挚吟一周年》正文一致。",
  },
  {
    sequence: 19,
    target: 109,
    mode: "source",
    note: "与《Someone Like You——很像你的人》正文一致。",
  },
  {
    sequence: 20,
    target: 107,
    mode: "source",
    note: "与《守门人和诗人》组诗正文一致。",
  },
  {
    sequence: 22,
    target: 104,
    mode: "source",
    note: "《明星、白石》为站内同作的发布版本。",
  },
  { sequence: 23, target: 96, mode: "source", note: "与站内同题诗正文一致。" },
  {
    sequence: 24,
    target: 95,
    mode: "source",
    note: "与《若春日翻涌处再遇见你》为同作；引诗不另计原创。",
  },
  {
    sequence: 25,
    target: 94,
    mode: "source",
    note: "与《总有些心语漫舞在夜里》为同作。",
  },
  { sequence: 27, target: 93, mode: "source", note: "正文逐字一致。" },
  {
    sequence: 28,
    target: 91,
    mode: "replace",
    note: "以较完整公众号发布稿更新。",
  },
  {
    sequence: 29,
    target: 90,
    mode: "source",
    note: "与《你何时见到夕阳而低首》正文一致。",
  },
  {
    sequence: 31,
    target: 163,
    mode: "source",
    note: "无题（一）即《晚风扶心头》；无题（二）至（四）另拆三篇。",
  },
  {
    sequence: 32,
    target: 86,
    mode: "replace",
    note: "公众号稿是《孤单北半球的相聚》的完整发布版。",
  },
  {
    sequence: 33,
    target: 82,
    mode: "source",
    note: "与《无从下落的风雪》合集相合；保留站内额外的《慨叹》。",
  },
  {
    sequence: 34,
    target: 80,
    mode: "replace",
    note: "公众号稿补齐《沈阳的雪》的发布正文。",
  },
  {
    sequence: 35,
    target: 78,
    mode: "source",
    note: "《深秋》并入原作，《雾起雾散》另拆一篇。",
  },
  {
    sequence: 37,
    target: 77,
    mode: "source",
    note: "与《一个世界的生命与一个人的生活》为同作。",
  },
  {
    sequence: 38,
    target: 76,
    mode: "replace",
    note: "公众号稿为较完整版本，清除关注引导尾文。",
  },
  { sequence: 40, target: 75, mode: "replace", note: "公众号稿扩充站内诗作。" },
  {
    sequence: 41,
    target: 74,
    mode: "replace",
    title: "做迎新志愿者的一天",
    note: "采用公众号发布稿，避免站内旧稿的重复段。",
  },
  {
    sequence: 42,
    target: 73,
    mode: "replace",
    note: "公众号稿补齐《秋夜记》。",
  },
  {
    sequence: 43,
    target: 72,
    mode: "replace",
    note: "公众号稿补齐《一只流浪的猫》。",
  },
  {
    sequence: 46,
    target: 71,
    mode: "source",
    title: "只道寻常·七夕",
    note: "同一七夕随笔的公众号修订稿；引诗保留原有归属。",
  },
  {
    sequence: 48,
    target: 68,
    mode: "source",
    title: "列车：奔赴就是宿命",
    note: "核心正文与《列车》一致；歌词与版式字样不并入作者正文。",
  },
  {
    sequence: 50,
    target: 65,
    mode: "source",
    note: "核心正文一致，公众号外层歌词不并入作者正文。",
  },
  {
    sequence: 52,
    target: 64,
    mode: "source",
    title: "一切意外终是欢喜如约而至",
    note: "同一篇发布修订稿；配套视频 W53/W54 仅归档。",
  },
  {
    sequence: 55,
    target: 62,
    mode: "source",
    title: "来自 New Boy 的简单随笔",
    note: "与站内随笔相同，歌曲歌词不并入作者正文。",
  },
  {
    sequence: 56,
    target: 61,
    mode: "reflection",
    note: "其三《呢喃》并入《豁达，是对人类最大的惩罚》；《月尽》《星陨》另拆。",
  },
  {
    sequence: 64,
    target: 57,
    mode: "source",
    note: "与《论火锅里小料的作用》核心正文一致。",
  },
  {
    sequence: 66,
    target: 63,
    mode: "source",
    date: "2021 · 05.10",
    note: "诗正文已完整收入《在平凡的生活里追寻》，校正公开发表日期。",
  },
  {
    sequence: 67,
    target: 56,
    mode: "source",
    note: "与《呼吸之野》为同篇文字变体；引文不另计原创。",
  },
  {
    sequence: 68,
    target: 55,
    mode: "source",
    title: "沈阳，竟是一个多雨的城市",
    note: "同篇修订稿，保留站内较明确的措辞。",
  },
  {
    sequence: 69,
    target: 54,
    mode: "dandong",
    title: "寻找放下·丹东",
    note: "恢复公众号明确的三章顺序与小标题。",
  },
]

const exclusions = [
  { sequence: 8, reason: "职业与技术面试状态随记，不作为独立文学作品。" },
  {
    sequence: 14,
    reason: "两行致谢式微记录，保留档案但不足以安全判作独立文学作品。",
  },
  { sequence: 30, reason: "节日问候，公开页仅此一句。" },
  { sequence: 44, reason: "约110秒的风景视频，无可核实文字正文或转录。" },
  {
    sequence: 51,
    reason: "人生选择前的状态记录，相关句已在站内《深挚吟一周年》中回顾。",
  },
  {
    sequence: 53,
    reason: "W52《一切意外终是欢喜如约而至》的配套音乐喷泉视频，无文字正文。",
  },
  { sequence: 54, reason: "W52 的配套故事视频，无文字正文。" },
]

const publicNewSequences = new Set([
  1, 11, 13, 21, 26, 36, 39, 45, 47, 49, 57, 58, 59, 60, 61, 62, 63, 65, 70, 71,
])
const mergeSequences = new Set(mergePlans.map((plan) => plan.sequence))
const excludedSequences = new Set(exclusions.map((entry) => entry.sequence))
const reviewedSequences = new Set([
  ...publicNewSequences,
  ...mergeSequences,
  ...excludedSequences,
])
if (
  reviewedSequences.size !== 71 ||
  ![...Array(71)].every((_, index) => reviewedSequences.has(index + 1))
) {
  throw new Error("公众号 71 个公开页面尚未全部完成文学审校")
}
if (
  publicNewSequences.size !== 20 ||
  mergeSequences.size !== 44 ||
  excludedSequences.size !== 7 ||
  mergePlans.length !== mergeSequences.size
) {
  throw new Error("公众号审校分类数量异常")
}

const current = await readContent()
const retainedPoems = current.poems
  .filter((poem) => !poem.id.startsWith(managedPrefix))
  .map((poem) => structuredClone(poem))
const poemByNumber = new Map(retainedPoems.map((poem) => [poem.number, poem]))

for (const plan of mergePlans) {
  const poem = poemByNumber.get(plan.target)
  if (!poem)
    throw new Error(`W${plan.sequence} 的合并目标 #${plan.target} 不存在`)
  const item = itemAt(plan.sequence)
  const oldSources = preservedSourceLines(poem.body)
  let body

  if (plan.mode === "source") {
    body = appendBlock(withoutWechatSources(poem.body), sourceLine(item))
  } else if (plan.mode === "replace") {
    let replacement = cleanFullArticle(plan.sequence)
    if (plan.sequence === 2) {
      replacement = replacement
        .replace(/^组诗（一）$/gm, "### 组诗（一）")
        .replace(/^组诗（二）$/gm, "### 组诗（二）")
    }
    if (plan.sequence === 38 && replacement.includes("感谢关注")) {
      replacement = normalizeText(
        replacement.slice(0, replacement.indexOf("感谢关注"))
      )
    }
    body = [replacement, ...oldSources, sourceLine(item)]
      .filter(Boolean)
      .join("\n\n")
  } else if (plan.mode === "reflection") {
    body = [w56Reflection, ...oldSources, sourceLine(item)]
      .filter(Boolean)
      .join("\n\n")
  } else if (plan.mode === "dandong") {
    const raw = item.body_text
    const first = between(raw, "挚吟\n你找到那个答案了吗", "\n\n寻找与放下\n", {
      includeStart: true,
    })
    const second = between(raw, "将军的烈火在这里上膛", "\n\n▼\n\n再见\n丹东", {
      includeStart: true,
    })
    const third = between(raw, "车厢突然奏响的", "▼\n\n未完待续", {
      includeStart: true,
    })
    body = [
      "### 寻找与放下",
      first,
      "### 生生不息",
      second,
      "### 再见，丹东",
      third,
      ...oldSources,
      sourceLine(item),
    ]
      .filter(Boolean)
      .join("\n\n")
  } else {
    throw new Error(`未知合并模式：${plan.mode}`)
  }

  poem.body = normalizeText(body)
  if (plan.title) poem.title = plan.title
  if (plan.categoryId) poem.categoryId = plan.categoryId
  if (plan.date) poem.date = plan.date
  poem.excerpt = firstReadableLine(poem.body).slice(0, 80)
}

const importedWorks = newWorks
  .sort(
    (left, right) =>
      left.date.iso.localeCompare(right.date.iso) ||
      left.sourceSequence - right.sourceSequence ||
      left.order - right.order ||
      left.id.localeCompare(right.id)
  )
  .map((work, index) => ({
    id: work.id,
    number: Math.max(...retainedPoems.map((poem) => poem.number)) + index + 1,
    title: work.title,
    body: work.body,
    categoryId: work.categoryId,
    date: work.date.display,
    excerpt: firstReadableLine(work.body).slice(0, 80),
    image: "/manuscripts/loose-sheet.jpg",
    imageAlt: "深挚吟公众号作品数字存档",
    featured: false,
    featuredOrder: null,
    published: true,
    _sourceSequence: work.sourceSequence,
    _sourceKind: work.sourceKind,
  }))

if (importedWorks.length !== 38) {
  throw new Error(
    `公众号新增作品数量异常：期望 38，实际 ${importedWorks.length}`
  )
}

const idSet = new Set()
const numberSet = new Set()
for (const poem of [...retainedPoems, ...importedWorks]) {
  if (idSet.has(poem.id)) throw new Error(`作品 ID 重复：${poem.id}`)
  if (numberSet.has(poem.number))
    throw new Error(`作品序号重复：${poem.number}`)
  idSet.add(poem.id)
  numberSet.add(poem.number)
}

const retainedBodies = new Map(
  retainedPoems.map((poem) => [normalizeForComparison(poem.body), poem])
)
for (const poem of importedWorks) {
  const duplicate = retainedBodies.get(normalizeForComparison(poem.body))
  if (duplicate) {
    throw new Error(
      `公众号新增「${poem.title}」与站内 #${duplicate.number} 正文完全重复`
    )
  }
}

const publicWorkTitles = new Map()
for (const poem of importedWorks.filter(
  (poem) => poem._sourceKind === "public"
)) {
  const titles = publicWorkTitles.get(poem._sourceSequence) ?? []
  titles.push(poem.title)
  publicWorkTitles.set(poem._sourceSequence, titles)
}

const lines = [
  "# 深挚吟公众号文学作品整理",
  "",
  `> 公众号：${archive.account_name}`,
  `> 采集时间：${archive.fetched_at}`,
  `> 后台发表记录：${archive.summary.backend_publish_records} 条；公开文章页面：${archive.summary.unique_urls} 个；后台“原创内容”：${archive.summary.backend_original_contents} 个。`,
  `> 抓取成功：${archive.summary.succeeded}/${archive.summary.unique_urls}；正文恢复：${archive.summary.with_text}/${archive.summary.unique_urls}；失败：${archive.summary.failed}。`,
  `> 网站处理：新增 ${importedWorks.length} 条独立作品（其中公开页面拆分 ${importedWorks.length - screenshotWorks.length} 条、截图补录 ${screenshotWorks.length} 条），合并更新 ${mergePlans.length} 条既有作品，${exclusions.length} 个页面仅归档不入站。`,
  "",
  "## 整理原则",
  "",
  "- 以公众号后台发表记录为总目录，以公开文章页正文为主；公开页不回传文字时，用后台可见全文或原图复核。",
  "- 同一作品的公众号修订稿与网站既有稿合并，不重复建卡；明确的组诗、合集按小标题拆分，保留原公众号链接。",
  "- 歌词、古典诗文、他人作品和网络流行语按引文处理，不冒充作者原创；公众号运营字样与版式噪声不进入网站正文。",
  "- 视频、节日问候、求职/学习状态和作者已删除的非文学动态保留在档案，但不擅自公开为文学作品。",
  "- 原始抓取内容未被覆盖，完整保存在《公众号全部作品原始整理-深挚吟.md》与 JSON 档案中。",
  "",
  "# 一、网站新增作品",
  "",
]

const displayTitleOverrides = new Map([
  [8, "百度实习生面试记录"],
  [14, "心中只有感激之情"],
  [51, "GOOD LUCK：选择的路"],
])
const displayArticleTitle = (sequence, title) =>
  displayTitleOverrides.get(sequence) ??
  String(title).replace(/\\n/g, " ").replace(/\s+/g, " ").trim()

for (const poem of importedWorks) {
  lines.push(`## ${poem.number}. ${poem.title}`, "")
  lines.push(`> 分类：${poem.categoryId}`)
  lines.push(`> 网站 ID：${poem.id}`, "")
  lines.push(poem.body, "")
}

lines.push("# 二、与网站既有作品合并的公众号文章", "")
for (const plan of mergePlans.sort(
  (left, right) => left.sequence - right.sequence
)) {
  const item = itemAt(plan.sequence)
  const target = poemByNumber.get(plan.target)
  const splits = publicWorkTitles.get(plan.sequence) ?? []
  lines.push(
    `## W${String(plan.sequence).padStart(2, "0")} · ${displayArticleTitle(plan.sequence, item.title)}`,
    ""
  )
  lines.push(`> 公众号日期：${articleDate(item).chinese}`)
  lines.push(`> 原文：${item.url}`)
  lines.push(
    `> 合并至网站：#${target.number}《${target.title}》（${target.id}）`
  )
  if (splits.length)
    lines.push(
      `> 同页另拆新作：${splits.map((title) => `《${title}》`).join("、")}`
    )
  lines.push(`> 编校处理：${plan.note}`, "")
  lines.push(normalizeText(item.body_text), "")
}

lines.push("# 三、仅归档、不作为文学作品上站的页面", "")
for (const entry of exclusions) {
  const item = itemAt(entry.sequence)
  lines.push(
    `## W${String(entry.sequence).padStart(2, "0")} · ${displayArticleTitle(entry.sequence, item.title)}`,
    ""
  )
  lines.push(`> 日期：${articleDate(item).chinese}`)
  lines.push(`> 原文：${item.url}`)
  lines.push(`> 处理：${entry.reason}`, "")
  lines.push(normalizeText(item.body_text), "")
}

lines.push("# 四、后台已删除记录", "")
const deletedTreatments = [
  "课程清单与三行状态微记，仅存档，不恢复上站。",
  "单句入学状态微记，仅存档，不恢复上站。",
  "《Surge》的2021年7月22日早期异稿；以7月23日发布修订版为定稿，不另建卡。",
]
archive.deleted_items.forEach((item, index) => {
  lines.push(`## D${index + 1} · ${item.title}`, "")
  lines.push(`> 处理：${deletedTreatments[index]}`, "")
  lines.push(normalizeText(item.body_text), "")
})

lines.push(
  "# 五、完整性核验",
  "",
  `- 64 条后台发表记录已逐页遍历，因部分批次一次发布多篇文章，共得到 71 个唯一公开页面。`,
  `- 71 个页面全部取得可审校文字：63 个来自公开页正文，8 个由后台发表记录补回。`,
  `- 后台标记原创 54 个，与抓取结果中的 copyright_stat=1 数量一致。`,
  `- 3 条已删除记录另列；临时后台地址未写入归档。`,
  `- 另据用户提供截图补录《风浪-1874》《夕阳维港》2 篇；两篇不在本次 71 个公开页面中。`,
  `- 本轮处理后网站作品总数：${retainedPoems.length + importedWorks.length}。`,
  ""
)

await writeFile(documentPath, `${lines.join("\n").trim()}\n`, "utf8")

const cleanImportedWorks = importedWorks.map(
  ({ _sourceKind, _sourceSequence, ...poem }) => poem
)
const nextContent = {
  ...current,
  site: {
    ...current.site,
    period: "2018—2025",
  },
  poems: [...retainedPoems, ...cleanImportedWorks],
}
await writeContent(nextContent)

console.log(
  JSON.stringify(
    {
      publicPages: archive.summary.unique_urls,
      backendOriginalContents: archive.summary.backend_original_contents,
      reviewedNewPages: publicNewSequences.size,
      mergedPages: mergePlans.length,
      excludedPages: exclusions.length,
      publicWorksAdded: importedWorks.length - screenshotWorks.length,
      screenshotWorksAdded: screenshotWorks.length,
      totalWorksAdded: importedWorks.length,
      siteTotal: nextContent.poems.length,
      firstNumber: cleanImportedWorks[0]?.number,
      lastNumber: cleanImportedWorks.at(-1)?.number,
      documentPath,
    },
    null,
    2
  )
)
