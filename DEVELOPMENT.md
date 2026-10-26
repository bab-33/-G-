# 开发与预览

需要 Node.js 20.19+ 或 22.12+，推荐 Node.js 24 LTS。

在项目根目录运行：

```sh
npm ci
npm run dev
```

本地浏览器访问 http://localhost:5173。编辑 `src/App.tsx` 可修改首页，编辑 `src/index.css` 可修改样式。

构建并预览生产版本：

```sh
npm run build
npm run preview
```

本地浏览器访问 http://localhost:4173。构建结果位于 `dist/`，可部署到静态网站托管服务。`preview` 用于本地检查构建结果。

在云环境中，npm 默认缓存目录可能不可写，可使用：

```sh
npm ci --cache /workspace/.npm-cache
```

开发与预览命令监听所有网络接口，方便容器端口转发。在云环境中需要平台提供端口转发能力才能通过浏览器访问。
