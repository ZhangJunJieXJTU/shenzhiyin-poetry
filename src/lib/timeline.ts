export type TimelineChapter = {
  year: string
  label: string
  title: string
  description: string
  note: string
  showWorkCount?: boolean
  image?: string
  imageAlt?: string
  future?: boolean
}

const editorialTimelineChapters: TimelineChapter[] = [
  {
    year: "2018",
    label: "THE BEGINNING",
    title: "最初的句子",
    description:
      "现存手稿中可辨年份最早的一页。写作还散落在课堂、试卷与随手记录里，像一条刚刚出现的细线。",
    note: "最早可辨日期 · 2018.11.04",
    image: "/manuscripts/old-page.jpg",
    imageAlt: "2018 年前后的少年诗稿原页",
  },
  {
    year: "2019",
    label: "SNOW & NIGHT",
    title: "雪落进诗里",
    description:
      "写作逐渐密集。雪、夜色、故乡与孤独反复出现，许多后来保留下来的标题在这一时期成形。",
    note: "《梧桐灯》《雪》《夜里来愁》",
    image: "/manuscripts/snow-notes.jpg",
    imageAlt: "写在试卷纸上的雪与夜色主题诗稿",
  },
  {
    year: "2020",
    label: "LETTERS & FAREWELLS",
    title: "告别少年时代",
    description:
      "诗、随笔与书信交织在一起。对家人、故乡和远方的凝望，成为这批高中诗稿最后的回声。",
    note: "《夜里的空城》《漂流》《望星》",
    image: "/manuscripts/loose-sheet.jpg",
    imageAlt: "2020 年前后的散页诗歌手稿",
  },
  {
    year: "2021",
    label: "A NEW CHAPTER",
    title: "写作走入生活",
    description:
      "离开高中手稿之后，诗歌、随笔与日常记录开始并行。远方、城市、相遇与自我追问，构成这一年的文字底色。",
    note: "本年有明确日期的作品",
    showWorkCount: true,
  },
  {
    year: "2022",
    label: "THE PROLIFIC YEAR",
    title: "句子密集生长",
    description:
      "这是现存作品最密集的一年。诗、书信、阶段总结与片刻心绪彼此穿插，留下最为密集的一组时间坐标。",
    note: "本年有明确日期的作品",
    showWorkCount: true,
  },
  {
    year: "2023",
    label: "NOTES OF CHANGE",
    title: "在变化中记录",
    description:
      "关于电影、城市、实训与生活的札记继续延展。写作不再只凝视远方，也开始安放正在发生的日常。",
    note: "本年有明确日期的作品",
    showWorkCount: true,
  },
  {
    year: "2024",
    label: "LOOKING BACK",
    title: "重读年轻的自己",
    description:
      "记忆、文字与人生转折重新进入文章。写作在这一年重新靠近日常，也为后来的远行与回望留出入口。",
    note: "本年有明确日期的作品",
    showWorkCount: true,
  },
  {
    year: "2025",
    label: "RETURN & RENEWAL",
    title: "在回望中重新出发",
    description:
      "远行、归来与对旧日生活的回望交织在一起。维港的夜色、沈阳的四季与重新辨认自己的时刻，让写作在停顿后再次向前。",
    note: "本年有明确日期的作品",
    showWorkCount: true,
  },
  {
    year: "20—",
    label: "TO BE CONTINUED",
    title: "时间仍在向后生长",
    description:
      "新的年份与作品会从这里继续。时间轴已经预留下一章，等待后来写下的句子。",
    note: "下一次落笔之后",
    future: true,
  },
]

export function getTimelineChapters(dates: Iterable<string>) {
  const chaptersByYear = new Map(
    editorialTimelineChapters
      .filter((chapter) => !chapter.future)
      .map((chapter) => [chapter.year, chapter])
  )
  const datedWorkCounts = new Map<string, number>()

  for (const date of dates) {
    const year = date.match(/^(\d{4})/)?.[1]
    if (!year) continue
    datedWorkCounts.set(year, (datedWorkCounts.get(year) ?? 0) + 1)
  }

  const years = new Set([...chaptersByYear.keys(), ...datedWorkCounts.keys()])
  const chapters = [...years]
    .sort((left, right) => Number(left) - Number(right))
    .map(
      (year): TimelineChapter =>
        chaptersByYear.get(year) ?? {
          year,
          label: "A NEW CHAPTER",
          title: "新的写作章节",
          description: `${year} 年的作品已经进入档案，写作时间轴从这里继续向后生长。`,
          note: "本年有明确日期的作品",
          showWorkCount: true,
        }
    )

  const futureChapter = editorialTimelineChapters.find(
    (chapter) => chapter.future
  )
  return futureChapter ? [...chapters, futureChapter] : chapters
}
