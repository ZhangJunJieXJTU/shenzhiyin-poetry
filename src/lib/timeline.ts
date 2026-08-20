export type TimelineChapter = {
  year: string
  label: string
  title: string
  description: string
  note: string
  image?: string
  imageAlt?: string
  future?: boolean
}

// 新年份的作品可以直接追加在 future 节点之前，时间轴页面会自动延伸。
export const timelineChapters: TimelineChapter[] = [
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
    year: "20—",
    label: "TO BE CONTINUED",
    title: "时间仍在向后生长",
    description:
      "新的年份与作品会从这里继续。时间轴已经预留下一章，等待后来写下的句子。",
    note: "下一次落笔之后",
    future: true,
  },
]
