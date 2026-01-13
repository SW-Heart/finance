# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

# 部署文档

本项目的部署完全基于 Docker 和 Docker Compose。

## 先决条件

在服务器上安装：
*   **Docker**: [安装指南](https://docs.docker.com/engine/install/)
*   **Docker Compose**: [安装指南](https://docs.docker.com/compose/install/)

## 部署步骤

### 1. 准备代码

将项目代码上传到服务器：

```bash
git clone <your-repo-url>
cd finance
```

### 2. 配置环境变量

在服务器项目根目录下创建 `.env` 文件，并填入以下内容：

```bash
# === 数据库配置 ===
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=finance_vault

# === 域名配置 ===
# 前端访问地址 (告诉后端谁可以跨域访问)
ALLOW_ORIGINS=http://your-domain.com,https://your-domain.com

# 后端 API 地址 (告诉前端把请求发到哪里)
# 注意：构建时会被写入前端代码，改变此值需要重新构建
VITE_API_BASE_URL=http://your-domain.com:3001/api

# === 阿里云短信配置 ===
ALIYUN_ACCESS_KEY_ID=your_id
ALIYUN_ACCESS_KEY_SECRET=your_secret
SMS_SIGN_NAME=your_sign_name
SMS_TEMPLATE_CODE=your_template_code
SMS_SCHEME_NAME=FINANCE

# === AI 服务配置 ===
DEEPSEEK_API_KEY=your_key
```

### 3. 一键启动

运行以下命令构建镜像并启动服务：

```bash
docker compose -f compose.prod.yaml up -d --build
```

### 4. 初始化数据库

服务启动后，需要运行数据库迁移脚本来创建表结构和初始化数据：

```bash
# 进入后端容器
docker exec -it finance-backend bash

# 运行迁移
alembic upgrade head

# (可选) 退出容器
exit
```

### 5.1 准备 Nginx 配置 (HTTP)

我们需要创建一个**专用目录**来验证证书，避开权限问题。

```bash
# 1. 创建专用验证目录
mkdir -p /var/www/certbot

# 2. 写入 Nginx 配置 (指定该目录为验证根目录)
cat > /etc/nginx/conf.d/finance.conf << 'EOF'
server {
    listen 80;
    server_name assects.aigcog.com;

    # 专用验证通道
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 3. 重载配置
nginx -t && nginx -s reload
```

### 5.2 运行 Certbot (Webroot 模式)
现在我们明确告诉 Certbot 把验证文件写到那个专用目录里：

```bash
certbot certonly --webroot -w /var/www/certbot -d assects.aigcog.com
```

### 5.3 开启 HTTPS
证书申请成功后（会提示 Congratulations），我们需要再次修改配置开启 HTTPS：

```bash
cat > /etc/nginx/conf.d/finance.conf << 'EOF'
server {
    listen 80;
    server_name assects.aigcog.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name assects.aigcog.com;

    # === Certbot 证书路径 (通常是这个路径，请检查) ===
    ssl_certificate /etc/letsencrypt/live/assects.aigcog.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/assects.aigcog.com/privkey.pem;

    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;

    # Backend API 转发 (解决 Mixed Content 和 CORS)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend 转发
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

nginx -t && nginx -s reload
```

### 5.4 调整环境变量 (重要)

配置好 API 转发后，前端就不需要知道后端的绝对地址了，只需要访问 `/api` 即可。

1. 修改服务器上的 `.env` 文件：
```bash
# 原来可能是 http://assects-api...
VITE_API_BASE_URL=/api

# 后端允许的来源
ALLOW_ORIGINS=https://assects.aigcog.com
```

2. **必须重新构建前端** (因为 VITE 变量是在构建时打包进去的)：
```bash
# 这一步非常关键！
docker compose -f compose.prod.yaml up -d --build finance-frontend
```

## 常见维护操作

### 查看日志

```bash
# 查看所有服务日志
docker compose -f compose.prod.yaml logs -f

# 查看特定服务日志 (如后端)
docker compose -f compose.prod.yaml logs -f finance-backend
```

### 更新部署

当您修改了代码并推送到 GitHub 后，服务器更新步骤如下：

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并平滑重启
# 注意：如果修改了 .env 中的前端变量，必须加 --build
docker compose -f compose.prod.yaml up -d --build

# 3. (重要) 如果修改了数据库模型，必须运行迁移
docker exec -it finance-backend alembic upgrade head
```

> **小技巧**：如果发现代码没更新，可以尝试强制不使用缓存构建：
> `docker compose -f compose.prod.yaml build --no-cache finance-backend`

### 数据备份

数据库数据存储在 Docker Volume `finance_db_data` 中，即便删除容器数据也不会丢失。
建议定期备份该 Volume 或使用 `pg_dump` 备份数据。

## 常见问题排查

### 无法拉取镜像 (Connection Timeout)
如果这是国内服务器，连接 Docker Hub (`docker.io`) 可能会超时。请配置镜像加速器：

1. 修改/新建 `/etc/docker/daemon.json`：
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com"
  ]
}
EOF
```
2. 重启 Docker：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```
3. 重新尝试部署。
