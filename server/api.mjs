import { readContent, saveUpload, writeContent } from "./content-store.mjs"

function sendJson(response, status, value) {
  response.statusCode = status
  response.setHeader("Content-Type", "application/json; charset=utf-8")
  response.setHeader("Cache-Control", "no-store")
  response.end(JSON.stringify(value))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 12 * 1024 * 1024) throw new Error("请求内容过大")
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null")
}

export async function handleApi(request, response) {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname
  if (!pathname.startsWith("/api/")) return false

  try {
    if (pathname === "/api/content" && request.method === "GET") {
      sendJson(response, 200, await readContent())
      return true
    }
    if (pathname === "/api/content" && request.method === "PUT") {
      sendJson(response, 200, await writeContent(await readJson(request)))
      return true
    }
    if (pathname === "/api/upload" && request.method === "POST") {
      sendJson(response, 201, { url: await saveUpload(await readJson(request)) })
      return true
    }
    sendJson(response, 404, { error: "接口不存在" })
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "请求处理失败",
    })
  }
  return true
}

export function contentApiPlugin() {
  return {
    name: "poetry-content-api",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        handleApi(request, response).then((handled) => {
          if (!handled) next()
        })
      })
    },
  }
}
