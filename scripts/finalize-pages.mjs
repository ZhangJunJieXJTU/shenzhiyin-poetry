import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { readContent } from "../server/content-store.mjs"

const projectRoot = path.resolve(import.meta.dirname, "..")
const distDirectory = path.join(projectRoot, "dist")

await mkdir(distDirectory, { recursive: true })
await writeFile(
  path.join(distDirectory, "content.json"),
  `${JSON.stringify(await readContent(), null, 2)}\n`,
  "utf8"
)
await copyFile(
  path.join(distDirectory, "index.html"),
  path.join(distDirectory, "404.html")
)
await writeFile(path.join(distDirectory, ".nojekyll"), "", "utf8")

const index = await readFile(path.join(distDirectory, "index.html"), "utf8")
if (!index.includes("/shenzhiyin-poetry/") && process.env.VITE_BASE_PATH) {
  throw new Error("GitHub Pages 子路径没有写入构建产物")
}

console.log("GitHub Pages 静态内容已写入 dist/content.json")
