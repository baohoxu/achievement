# 成就盒子更新部署指南

本文档记录以后迭代网站时的常用更新流程。当前线上结构是：

```text
Nginx :80
  /      -> /var/www/product
  /api/  -> http://127.0.0.1:8000

FastAPI backend.service -> /opt/backend/main.py
MySQL                  -> achievement_box
```

## 0. 先确认本地改动

在本地项目目录执行：

```bash
git status --short
```

如果只改了前端，一般会看到 `product/` 下文件变化。
如果改了后端，一般会看到 `server/` 下文件变化。

建议每次部署前先在本地过一遍基础检查：

```bash
node --check product/app.js
python3 -m py_compile server/main.py
```

## 1. 只更新前端

适用场景：

- 修改 `product/index.html`
- 修改 `product/app.js`
- 修改 `product/styles.css`
- 只调整页面、样式、交互文案，不改后端接口

如果修改了 `app.js` 或 `styles.css`，建议同步更新 `product/index.html` 里的版本号，例如：

```html
<link rel="stylesheet" href="./styles.css?v=20260617-2" />
<script src="./app.js?v=20260617-2"></script>
```

这样可以避免浏览器继续使用旧缓存。

上传前端文件：

```bash
scp -r product/* root@120.26.58.145:/var/www/product/
```

上传后验证：

```bash
curl -i http://120.26.58.145/
curl -i http://120.26.58.145/api/health
```

浏览器强制刷新：

```text
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

## 2. 只更新后端代码

适用场景：

- 修改 `server/main.py`
- 修改后端接口逻辑
- 修改 AI 调用逻辑
- 修改数据库读写逻辑，但没有新增依赖

推荐用 `rsync` 上传，避免把 `.env`、虚拟环境、日志传上去：

```bash
rsync -av \
  --exclude '.env' \
  --exclude '.conda' \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude 'logs' \
  server/ root@120.26.58.145:/opt/backend/
```

如果没有 `rsync`，也可以只传关键文件：

```bash
scp server/main.py server/requirements.txt server/schema.sql root@120.26.58.145:/opt/backend/
```

然后 SSH 到服务器重启后端：

```bash
ssh root@120.26.58.145
cd /opt/backend
sudo systemctl restart backend
```

验证：

```bash
sudo systemctl status backend --no-pager -l
curl -i http://127.0.0.1:8000/api/health
curl -i http://127.0.0.1/api/health
curl -i http://127.0.0.1/api/auth/me
```

正常情况下：

- `/api/health` 返回 `200 {"status":"ok"}`
- 未登录时 `/api/auth/me` 返回 `401 Unauthorized`

如果返回 `500` 或 `502`，看日志：

```bash
sudo journalctl -u backend -n 100 --no-pager
```

## 3. 后端新增或更新依赖

适用场景：

- 修改了 `server/requirements.txt`
- 新增 Python 包
- 升级 FastAPI、Uvicorn、智谱 SDK 等依赖

先上传后端文件，然后在服务器执行：

```bash
cd /opt/backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart backend
```

验证：

```bash
curl -i http://127.0.0.1:8000/api/health
sudo journalctl -u backend -n 80 --no-pager
```

## 4. 修改环境变量

线上环境变量文件在：

```text
/opt/backend/.env
```

编辑：

```bash
sudo nano /opt/backend/.env
```

常见配置：

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=achievement_app
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=achievement_box

JWT_SECRET=你的长随机字符串
COOKIE_SECURE=false

AI_CLASSIFY_MODE=zhipu
ZHIPU_API_KEY=你的智谱APIKey
ZHIPU_MODEL=GLM-4.7-Flash
ZHIPU_THINKING=disabled
```

保存后重启后端：

```bash
sudo systemctl restart backend
```

确认 systemd 已加载 `.env`：

```bash
sudo systemctl cat backend
```

应该能看到：

```ini
[Service]
EnvironmentFile=/opt/backend/.env
```

注意：不要把 `.env` 上传到 Git，也不要把 API Key、数据库密码发到聊天里。

## 5. 数据库结构更新

当前 `server/schema.sql` 主要用于首次创建数据库和表。以后如果要新增字段、索引或新表，建议单独写 SQL 变更语句，并先备份数据库。

备份：

```bash
mysqldump -u achievement_app -p achievement_box > /opt/backend/backup_$(date +%Y%m%d_%H%M%S).sql
```

执行新增 SQL 前，建议先登录 MySQL 看当前表：

```bash
mysql -h 127.0.0.1 -u achievement_app -p achievement_box
```

常用检查：

```sql
SHOW TABLES;
DESCRIBE users;
DESCRIBE achievements;
EXIT;
```

如果只是首次部署或确认表存在，可以执行：

```bash
sudo mysql < /opt/backend/schema.sql
```

如果是已有线上数据，不要随便执行会删除表或清空数据的 SQL。

## 6. Nginx 配置更新

Nginx 主要负责静态前端和 `/api/` 反代。配置修改后必须测试再 reload：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

检查状态：

```bash
sudo systemctl status nginx --no-pager
sudo ss -lntp | grep ':80'
```

当前推荐 `/api/` 配置：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 7. 每次部署后的完整验证清单

服务器内部验证：

```bash
curl -i http://127.0.0.1/
curl -i http://127.0.0.1:8000/api/health
curl -i http://127.0.0.1/api/health
curl -i http://127.0.0.1/api/auth/me
```

公网验证：

```bash
curl -i http://120.26.58.145/
curl -i http://120.26.58.145/api/health
```

服务状态：

```bash
sudo systemctl status nginx --no-pager -l
sudo systemctl status backend --no-pager -l
```

后端日志：

```bash
sudo journalctl -u backend -n 100 --no-pager
```

## 8. 常见问题

### 页面打不开

先确认公网 80 能进来：

```bash
curl -i http://120.26.58.145/
```

如果服务器内部 `curl http://127.0.0.1/` 正常，但公网不通，通常是阿里云安全组没有放行 TCP `80/80`。

### 页面提示后端没启动

先测：

```bash
curl -i http://127.0.0.1/api/health
curl -i http://127.0.0.1/api/auth/me
```

如果 `/api/health` 正常，但 `/api/auth/me` 是 `500`，通常是数据库或 `.env` 配置问题。

如果是 `502`，通常是 `backend` 服务没起来或 8000 端口没监听：

```bash
sudo systemctl status backend --no-pager -l
sudo ss -lntp | grep ':8000'
sudo journalctl -u backend -n 100 --no-pager
```

### 登录/注册失败

检查数据库连接和表：

```bash
mysql -h 127.0.0.1 -u achievement_app -p achievement_box
SHOW TABLES;
```

### AI 分类效果不好或失败

检查 `/opt/backend/.env`：

```env
AI_CLASSIFY_MODE=zhipu
ZHIPU_API_KEY=你的智谱APIKey
ZHIPU_MODEL=GLM-4.7-Flash
ZHIPU_THINKING=disabled
```

重启：

```bash
sudo systemctl restart backend
```

查看日志：

```bash
sudo journalctl -u backend -n 100 --no-pager
```

## 9. 简单回滚

如果只更新了前端，回滚就是重新上传上一版 `product/` 文件。

如果更新了后端，回滚就是重新上传上一版 `server/main.py`，然后：

```bash
sudo systemctl restart backend
```

如果更新了数据库结构，回滚会复杂很多。改数据库前务必先 `mysqldump` 备份。

## 10. 推荐的日常迭代顺序

1. 本地改代码。
2. 本地跑基础检查。
3. 先部署前端或后端中变化的一部分。
4. 重启必要服务。
5. 用 `curl` 验证接口。
6. 浏览器强刷验证页面。
7. 看 `backend` 日志确认没有隐藏错误。

