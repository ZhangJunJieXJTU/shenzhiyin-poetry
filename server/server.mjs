import { createReadStream } from "node:fs"
import { access, readFile } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"

import { handleApi } from "./api.mjs"
import { projectRoot } from "./content-store.mjs"

const port = Number(process.env.PORT || 4173)
const distDirectory = path.join(projectRoot, "dist")
const publicDirectory = path.join(projectRoot, "public")
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
])

async function existingFile(root, pathname) {
  const normalized = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, "")
  const candidate = path.join(root, normalized)
  if (!candidate.startsWith(root)) return null
  try {
    await access(candidate)
    return candidate
  } catch {
    return null
  }
}

const server = createServer(async (request, response) => {
  if (await handleApi(request, response)) return
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname
  const file =
    (pathname.startsWith("/uploads/") ? await existingFile(publicDirectory, pathname) : null) ??
    (await existingFile(distDirectory, pathname === "/" ? "/index.html" : pathname))

  if (file) {
    response.statusCode = 200
    response.setHeader("Content-Type", mimeTypes.get(path.extname(file)) ?? "application/octet-stream")
    createReadStream(file).pipe(response)
    return
  }

  response.statusCode = 200
  response.setHeader("Content-Type", "text/html; charset=utf-8")
  response.end(await readFile(path.join(distDirectory, "index.html")))
})

server.listen(port, "127.0.0.1", () => {
  console.log(`深挚吟已启动：http://127.0.0.1:${port}`)
})
