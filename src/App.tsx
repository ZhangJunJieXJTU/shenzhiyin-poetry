import { useEffect, useRef, useState } from "react"
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router"
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SiteSearch } from "@/components/site-search"
import {
  assetUrl,
  getCollectionCategories,
  getCollectionPoems,
  getFeaturedPoems,
  isStaticDeployment,
  type CollectionLine,
} from "@/lib/content"
import { ContentProvider, useContent } from "@/lib/content-context"
import { EditorPage } from "@/components/editor-page"
import { getTimelineChapters } from "@/lib/timeline"

function useReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]")
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (reducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: "0px 0px -10%", threshold: 0.1 }
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
}

function SiteHeader() {
  const { content } = useContent()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="深挚吟诗歌作品集首页">
        {content.site.brand}
      </Link>

      <nav className="desktop-nav" aria-label="主要导航">
        <Link to="/archive">作品索引</Link>
        <Link to="/timeline">时间轴</Link>
        <Link to="/#manuscripts">手迹</Link>
        <Link to="/#about">关于</Link>
        {!isStaticDeployment && <Link to="/editor">编校</Link>}
      </nav>

      <div className="header-actions">
        <SiteSearch />
        <Link className="catalog-link" to="/archive">
          目录
          <ArrowUpRight aria-hidden="true" />
        </Link>

        <Button
          aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="mobile-menu-button"
          size="icon"
          variant="ghost"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>

      <nav
        id="mobile-navigation"
        className="mobile-nav"
        data-open={menuOpen}
        aria-label="移动端导航"
      >
        <Link to="/archive" onClick={closeMenu}>
          作品索引 <span>01</span>
        </Link>
        <Link to="/timeline" onClick={closeMenu}>
          时间轴 <span>02</span>
        </Link>
        <Link to="/#manuscripts" onClick={closeMenu}>
          手迹 <span>03</span>
        </Link>
        <Link to="/#about" onClick={closeMenu}>
          关于 <span>04</span>
        </Link>
      </nav>
    </header>
  )
}

function Hero() {
  const { content } = useContent()
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = imageRef.current
    if (!node) return undefined
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined
    }

    let frame = 0
    const update = () => {
      frame = 0
      node.style.setProperty(
        "--parallax-y",
        `${Math.min(window.scrollY * 0.055, 42)}px`
      )
    }
    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-side-note" aria-hidden="true">
        <span>文学作品</span>
        <i />
        <span>{content.site.period}</span>
      </div>

      <div className="hero-copy">
        <h1 id="hero-title">{content.site.heroTitle}</h1>
        <p>{content.site.heroDescription}</p>
        <Link className="editorial-link" to="/archive">
          浏览作品索引
          <ArrowDownRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </div>

      <div ref={imageRef} className="hero-manuscript" id="manuscripts">
        <div className="manuscript-frame">
          <img
            src={assetUrl(content.site.heroImage)}
            alt="深挚吟少年时期的手写诗稿原页"
          />
        </div>
      </div>
    </section>
  )
}

function SelectedPoems() {
  const { content } = useContent()
  const poems = getFeaturedPoems(content)
  const [activeIndex, setActiveIndex] = useState(0)
  const safeActiveIndex = Math.min(activeIndex, Math.max(poems.length - 1, 0))
  const activePoem = poems[safeActiveIndex]

  if (!activePoem) return null

  return (
    <section className="poems-section" id="poems" aria-labelledby="poems-title">
      <div className="section-heading" data-reveal>
        <h2 id="poems-title">选读</h2>
        <span>01—{String(poems.length).padStart(2, "0")}</span>
      </div>

      <div className="featured-poem" data-reveal>
        <div className="featured-copy" aria-live="polite">
          <span className="featured-index">{activePoem.index}</span>
          <h3>{activePoem.title}</h3>
          <blockquote>
            {activePoem.lines
              .filter((line) => line.kind === "line")
              .slice(0, 3)
              .map((line, lineIndex) => (
                <span key={`${line.text}-${lineIndex}`}>{line.text}</span>
              ))}
          </blockquote>
          <span className="featured-date">{activePoem.date}</span>
          <Link
            className="featured-read-link"
            to={`/works/${activePoem.index}`}
          >
            阅读全文
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="featured-image-wrap">
          <img
            key={activePoem.image}
            src={assetUrl(activePoem.image)}
            alt={activePoem.imageAlt}
          />
          <span>手稿节选</span>
        </div>
      </div>

      <div className="poem-list" aria-label="诗歌选读目录">
        {poems.map((poem, index) => (
          <button
            key={poem.title}
            className="poem-row"
            data-active={index === safeActiveIndex}
            type="button"
            onClick={() => setActiveIndex(index)}
          >
            <span className="poem-index">{poem.index}</span>
            <strong>{poem.title}</strong>
            <span className="poem-excerpt">{poem.excerpt}</span>
            <time>{poem.date.split(" · ")[0]}</time>
            <ArrowRight aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}

function CollectionText({ lines }: { lines: CollectionLine[] }) {
  return (
    <div className="collection-text work-text">
      {lines.map((line, lineIndex) => {
        if (line.kind === "space") {
          return (
            <span
              key={`space-${lineIndex}`}
              className="collection-space"
              aria-hidden="true"
            />
          )
        }

        if (line.kind === "separator") {
          return (
            <span
              key={`separator-${lineIndex}`}
              className="collection-separator"
              aria-hidden="true"
            />
          )
        }

        return (
          <span
            key={`${line.kind}-${lineIndex}`}
            className={`collection-${line.kind}`}
          >
            {line.text}
          </span>
        )
      })}
    </div>
  )
}

function ArchiveIndexPage() {
  const { content } = useContent()
  const collectionCategories = getCollectionCategories(content)
  const collectionCount = getCollectionPoems(content).length
  useReveal()

  useEffect(() => {
    document.title = "作品索引｜深挚吟"
  }, [])

  return (
    <div id="top" className="page-shell route-shell">
      <SiteHeader />
      <main className="index-page">
        <header className="index-hero">
          <div>
            <span>WRITING ARCHIVE · {content.site.period}</span>
            <h1>作品索引</h1>
          </div>
          <div className="index-hero-meta">
            <strong>{String(collectionCount).padStart(2, "0")}</strong>
            <p>
              依照原稿与写作时间编排。
              <br />
              选择一篇，进入独立阅读页。
            </p>
          </div>
        </header>

        <nav
          className="collection-nav index-category-nav"
          aria-label="作品索引分类"
        >
          {collectionCategories.map((category) => (
            <a key={category.id} href={`#${category.id}`}>
              <span>{category.label}</span>
              <strong>{String(category.count).padStart(2, "0")}</strong>
              <ArrowDownRight aria-hidden="true" />
            </a>
          ))}
        </nav>

        <div className="index-categories">
          {collectionCategories.map((category) => (
            <section
              key={category.id}
              className="index-category"
              id={category.id}
              aria-labelledby={`${category.id}-index-title`}
            >
              <header className="index-category-heading" data-reveal>
                <div>
                  <span>{category.englishLabel}</span>
                  <h2 id={`${category.id}-index-title`}>{category.label}</h2>
                </div>
                <p>{category.description}</p>
              </header>

              <div className="index-list">
                {category.poems.map((poem) => {
                  const preview =
                    poem.lines.find((line) => line.kind === "line")?.text ?? ""

                  return (
                    <Link
                      key={poem.index}
                      className="index-row"
                      to={`/works/${poem.index}`}
                    >
                      <span>{poem.index}</span>
                      <div className="index-row-title">
                        <strong>{poem.title}</strong>
                        <time>{poem.date || "年份未详"}</time>
                      </div>
                      <p>{preview}</p>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function WorkPage() {
  const { content } = useContent()
  const allCollectionPoems = getCollectionPoems(content)
  const { index = "" } = useParams()
  const poem = allCollectionPoems.find((entry) => entry.index === index)
  const poemPosition = poem
    ? allCollectionPoems.findIndex((entry) => entry.index === poem.index)
    : -1
  const previousPoem =
    poemPosition > 0 ? allCollectionPoems[poemPosition - 1] : null
  const nextPoem =
    poemPosition >= 0 && poemPosition < allCollectionPoems.length - 1
      ? allCollectionPoems[poemPosition + 1]
      : null

  useEffect(() => {
    document.title = poem ? `${poem.title}｜深挚吟` : "未找到作品｜深挚吟"
  }, [poem])

  if (!poem) return <NotFoundPage />

  return (
    <div id="top" className="page-shell route-shell">
      <SiteHeader />
      <main className="work-page">
        <div className="work-breadcrumb">
          <Link to="/archive">
            <ArrowLeft aria-hidden="true" />
            返回作品索引
          </Link>
          <span>{poem.categoryLabel}</span>
        </div>

        <article className="work-article">
          <header className="work-heading">
            <div className="work-number">
              <span>{poem.index}</span>
              <i />
            </div>
            <h1>{poem.title}</h1>
            <p>
              第 {poem.index} 篇
              <br />
              {poem.categoryLabel}
              {poem.date && (
                <>
                  <br />
                  {poem.date}
                </>
              )}
            </p>
          </header>

          <div className="work-reading-layout">
            <aside aria-hidden="true">
              <span>深挚吟</span>
              <i />
              <span>{content.site.period}</span>
            </aside>
            <CollectionText lines={poem.lines} />
          </div>
        </article>

        <nav className="work-pagination" aria-label="上一篇与下一篇">
          {previousPoem ? (
            <Link to={`/works/${previousPoem.index}`}>
              <span>上一篇 · {previousPoem.index}</span>
              <strong>{previousPoem.title}</strong>
              <ArrowLeft aria-hidden="true" />
            </Link>
          ) : (
            <span className="work-pagination-empty" />
          )}
          {nextPoem ? (
            <Link to={`/works/${nextPoem.index}`}>
              <span>下一篇 · {nextPoem.index}</span>
              <strong>{nextPoem.title}</strong>
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/archive">
              <span>阅读完毕</span>
              <strong>返回作品索引</strong>
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </nav>
      </main>
      <SiteFooter />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div id="top" className="page-shell route-shell">
      <SiteHeader />
      <main className="not-found-page">
        <span>404</span>
        <h1>这一页还没有写下。</h1>
        <Link to="/archive">
          返回作品索引 <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    </div>
  )
}

function RouteScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (hash) {
        document.querySelector(hash)?.scrollIntoView({ block: "start" })
      } else {
        window.scrollTo({ top: 0 })
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [hash, pathname])

  return null
}

function TimelinePreview() {
  const { content } = useContent()
  const poems = getCollectionPoems(content)
  const timelineChapters = getTimelineChapters(poems.map((poem) => poem.date))
  const writingYearCount = timelineChapters.filter(
    (chapter) => !chapter.future
  ).length

  return (
    <section
      className="timeline-preview"
      id="timeline-preview"
      aria-labelledby="timeline-preview-title"
    >
      <div className="timeline-preview-heading" data-reveal>
        <div>
          <span>WRITING YEARS</span>
          <h2 id="timeline-preview-title">{content.site.period}</h2>
        </div>
        <div>
          <p>
            这些作品跨越 {writingYearCount} 个写作年份。
            <br />
            从纸页手稿，到后来持续写下的生活。
          </p>
          <Link to="/timeline">
            查看写作时间轴 <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="timeline-preview-rail" data-reveal>
        {timelineChapters.map((chapter) => (
          <article key={chapter.year} data-future={chapter.future || undefined}>
            <i aria-hidden="true" />
            <span>{chapter.year}</span>
            <strong>{chapter.title}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

function TimelinePage() {
  const { content } = useContent()
  const poems = getCollectionPoems(content)
  const collectionCount = poems.length
  const timelineChapters = getTimelineChapters(poems.map((poem) => poem.date))
  const worksByYear = new Map<string, typeof poems>()

  poems.forEach((poem) => {
    const year = poem.date.match(/^(\d{4})/)?.[1]
    if (!year) return
    const yearWorks = worksByYear.get(year) ?? []
    yearWorks.push(poem)
    worksByYear.set(year, yearWorks)
  })
  worksByYear.forEach((yearWorks) => {
    yearWorks.sort((left, right) => left.date.localeCompare(right.date))
  })
  useReveal()

  useEffect(() => {
    document.title = "写作时间轴｜深挚吟"
  }, [])

  return (
    <div id="top" className="page-shell route-shell">
      <SiteHeader />
      <main className="timeline-page">
        <header className="timeline-hero">
          <div>
            <span>{content.site.period} → TO BE CONTINUED</span>
            <h1>写作时间轴</h1>
          </div>
          <div className="timeline-hero-meta">
            <strong>{String(collectionCount).padStart(2, "0")}</strong>
            <p>
              现存作品始于 2018 年。
              <br />
              每一个新年份，都会成为新的章节。
            </p>
          </div>
        </header>

        <section className="timeline-story" aria-label="2018 至今的写作时间轴">
          {timelineChapters.map((chapter, chapterIndex) => {
            const chapterWorks = worksByYear.get(chapter.year) ?? []

            return (
              <article
                key={chapter.year}
                className="timeline-entry"
                id={chapter.future ? "year-next" : `year-${chapter.year}`}
                data-future={chapter.future || undefined}
                data-reveal
              >
                <div className="timeline-year">
                  <span>{String(chapterIndex + 1).padStart(2, "0")}</span>
                  <strong>{chapter.year}</strong>
                </div>

                <div className="timeline-axis" aria-hidden="true">
                  <i />
                </div>

                <div className="timeline-entry-content">
                  <div className="timeline-entry-copy">
                    <span>{chapter.label}</span>
                    <h2>{chapter.title}</h2>
                    <p>{chapter.description}</p>
                    <small>
                      {chapter.showWorkCount && chapterWorks.length > 0
                        ? `${chapterWorks.length} 篇有明确日期的作品`
                        : chapter.note}
                    </small>
                  </div>

                  <div className="timeline-entry-side">
                    {chapter.image && (
                      <figure>
                        <img
                          src={assetUrl(chapter.image)}
                          alt={chapter.imageAlt}
                        />
                      </figure>
                    )}

                    {chapterWorks.length > 0 && (
                      <div className="timeline-work-index">
                        <header>
                          <span>DATED WORKS</span>
                          <strong>{chapterWorks.length}</strong>
                        </header>
                        <div className="timeline-work-list">
                          {chapterWorks.map((poem) => (
                            <Link key={poem.id} to={`/works/${poem.index}`}>
                              <time>
                                {poem.date.replace(`${chapter.year} · `, "")}
                              </time>
                              <span>{poem.title}</span>
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {chapter.future && (
                      <div className="timeline-future-frame" aria-hidden="true">
                        <span>+</span>
                        <p>下一年</p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <div className="timeline-end" data-reveal>
          <span>{content.site.period} · 文学作品集</span>
          <h2>时间没有结束，诗也没有。</h2>
          <Link to="/archive">
            浏览这一时期的全部作品 <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function HomePage() {
  useReveal()

  useEffect(() => {
    document.title = "深挚吟｜文学作品集"
  }, [])

  return (
    <div id="top" className="page-shell">
      <SiteHeader />
      <main>
        <Hero />
        <SelectedPoems />
        <TimelinePreview />
        <ArchiveSection />
      </main>
      <SiteFooter />
    </div>
  )
}

function LegacyCollectionRedirect() {
  return <ArchiveIndexPage />
}

function ArchiveSection() {
  const { content } = useContent()
  const archiveGroups = getCollectionCategories(content).map((category) => ({
    label: category.shortLabel,
    count: String(category.count).padStart(2, "0"),
    href: `/archive#${category.id}`,
  }))
  return (
    <section
      className="archive-section"
      id="about"
      aria-labelledby="about-title"
    >
      <div className="about-layout" data-reveal>
        <div className="about-copy">
          <span className="quote-mark" aria-hidden="true">
            “
          </span>
          <h2 id="about-title">{content.site.aboutTitle}</h2>
          <p>{content.site.aboutDescription}</p>
        </div>

        <div className="about-images" aria-label="两页原始手稿">
          <figure>
            <img
              src={assetUrl("/manuscripts/loose-sheet.jpg")}
              alt="散页上的诗稿原件"
            />
          </figure>
          <figure>
            <img
              src={assetUrl("/manuscripts/old-page.jpg")}
              alt="带折痕的旧手稿原件"
            />
          </figure>
        </div>
      </div>

      <div className="archive-strip" id="archive" data-reveal>
        <div className="archive-label">
          <span>ARCHIVE</span>
          <h3>诗稿档案</h3>
        </div>
        <div className="archive-groups">
          {archiveGroups.map((group) => (
            <Link key={group.label} to={group.href} className="archive-item">
              <span>{group.label}</span>
              <strong>{group.count}</strong>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  const { content } = useContent()
  return (
    <footer className="site-footer">
      <div className="footer-brand" aria-hidden="true">
        {content.site.brand}
      </div>
      <div className="footer-content">
        <nav aria-label="页脚导航">
          <Link to="/">返回首页</Link>
          <Link to="/archive">作品索引</Link>
          <Link to="/timeline">写作时间轴</Link>
          <Link to="/#manuscripts">原始手迹</Link>
        </nav>
        <div className="footer-bottom">
          <span>© 2026 {content.site.brand}</span>
          <p>{content.site.footerNote}</p>
        </div>
      </div>
    </footer>
  )
}

export function App() {
  const routerBase =
    import.meta.env.BASE_URL === "/"
      ? undefined
      : import.meta.env.BASE_URL.replace(/\/$/, "")

  return (
    <ContentProvider>
      <BrowserRouter basename={routerBase}>
        <RouteScrollManager />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/archive" element={<ArchiveIndexPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/collection" element={<LegacyCollectionRedirect />} />
          <Route path="/works/:index" element={<WorkPage />} />
          <Route
            path="/editor"
            element={isStaticDeployment ? <NotFoundPage /> : <EditorPage />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ContentProvider>
  )
}

export default App
