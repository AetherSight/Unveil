# Unveil

FFXIV 装备识别前端服务

## 功能特性

- 🖼️ 图片上传（支持拖拽和点击）
- ✂️ 装备部位分割（调用 Dissector 服务）
- 🔍 装备识别（调用 Revelation 服务）
- 🎨 简洁大方的白色设计风格
- ⚡ 全程异步处理，不阻塞 UI

## 技术栈

- **Next.js 16** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS 4** - 样式框架
- **React 19** - UI 库

## 开发

### 环境要求

- Node.js 18+
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
# Dissector API 地址（装备分割服务，默认端口 8000）
# 注意：这是服务端变量，不会暴露给前端
DISSECTOR_API=http://localhost:8000

# Revelation API 地址（装备识别服务，默认端口 5000）
# 注意：这是服务端变量，不会暴露给前端
REVELATION_API=http://localhost:5000
```

### 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
npm run build
npm start
```

## 部署

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API 服务

本项目依赖两个后端微服务：

- **[Dissector](https://github.com/AetherSight/Dissector)** - 装备分割服务（端口 8000）
- **[Revelation](https://github.com/AetherSight/Revelation)** - 装备识别服务（端口 5000）

请确保这两个服务已启动并运行。

## 项目结构

```
.
├── app/              # Next.js App Router
│   ├── page.tsx      # 主页面
│   ├── layout.tsx   # 布局
│   └── globals.css  # 全局样式
├── components/       # React 组件
│   ├── ImageUpload.tsx          # 图片上传组件
│   ├── SegmentResults.tsx        # 分割结果展示
│   ├── PredictionResults.tsx    # 识别结果展示
│   └── LoadingSpinner.tsx       # 加载动画
└── lib/              # 工具库
    ├── api.ts        # API 客户端
    └── types.ts      # 类型定义
```

## License

MIT
