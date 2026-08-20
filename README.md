# 深博吟｜少年诗稿

带本地内容后端与编校台的 React/Vite 诗集网站。首次启动时，后端会从
`src/content/collection.md` 导入 45 篇初始内容，此后保存到
`server/data/content.json`。

## 本地开发

```bash
npm run dev
```

打开终端显示的本地地址；编校台位于 `/editor`。开发服务器同时提供内容 API，
不要直接双击 `index.html`。

## 构建与完整启动

```bash
npm run build
npm start
```

默认访问地址为 `http://127.0.0.1:4173`，可通过 `PORT` 环境变量修改端口。

## 内容接口

- `GET /api/content`：读取站点与全部作品内容。
- `PUT /api/content`：校验并原子保存内容。
- `POST /api/upload`：上传不超过 8 MB 的 JPG、PNG、WebP 或 GIF 手稿图。

保存动作会写入项目内的 `server/data/content.json`；手稿上传到
`public/uploads/`。请在部署时持久化这两个目录。

## GitHub Pages

仓库推送到 `ZhangJunJieXJTU/shenzhiyin-poetry` 后，GitHub Actions 会自动
构建并发布静态展示版本。线上地址为：

`https://zhangjunjiexjtu.github.io/shenzhiyin-poetry/`

Pages 版本从构建产物中的 `content.json` 读取内容，不提供在线保存与图片上传。
请在本地编校台完成修改并推送仓库，Actions 会自动发布最新内容。
