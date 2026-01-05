# Unveil

FFXIV Gear Recognition Frontend Service

## Development

### Requirements

- Node.js 18+
- npm / yarn / pnpm

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create `.env.local` file:

```env
# Dissector API address (gear segmentation service, default port 8000)
# Note: This is a server-side variable and will not be exposed to the frontend
DISSECTOR_API=http://localhost:8000

# Revelation API address (gear recognition service, default port 5000)
# Note: This is a server-side variable and will not be exposed to the frontend
REVELATION_API=http://localhost:5000
```

### Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Build Production Version

```bash
npm run build
npm start
```

## Deployment

### Nginx Configuration

项目根目录提供了 `nginx.conf` 配置文件，包含完整的 nginx 反向代理配置。

**使用方法：**

1. 将配置文件复制到 nginx 配置目录：
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/unveil
   ```

2. 创建符号链接启用配置：
   ```bash
   sudo ln -s /etc/nginx/sites-available/unveil /etc/nginx/sites-enabled/
   ```

3. 修改配置中的域名或 IP：
   ```bash
   sudo nano /etc/nginx/sites-available/unveil
   # 将 your-domain.com 替换为您的实际域名或 IP
   ```

4. 测试配置：
   ```bash
   sudo nginx -t
   ```

5. 重载 nginx：
   ```bash
   sudo systemctl reload nginx
   ```

**配置说明：**
- 默认监听 80 端口
- 代理到 `http://localhost:3000`（Next.js 默认端口）
- 支持 WebSocket 升级
- 文件上传大小限制：50M（可根据需要调整）
- 包含静态文件缓存配置
- 包含 HTTPS 配置示例（需要取消注释并配置 SSL 证书）

**注意事项：**
- 确保 Next.js 应用已构建并运行：`npm run build && npm start`
- 如需 HTTPS，请取消注释 HTTPS 配置部分并配置 SSL 证书
- 根据实际需求调整 `client_max_body_size`（文件上传大小限制）

## License

AGPL-3.0
