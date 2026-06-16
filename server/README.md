# 成就盒子 API

## 本地启动

1. 创建 MySQL 数据库和表：

```bash
mysql -u root -p < server/schema.sql
```

2. 创建后端 Conda 环境并安装依赖：

```bash
/opt/anaconda3/bin/conda create -p server/.conda python=3.11 pip -y
server/.conda/bin/pip install -r server/requirements.txt
```

3. 激活 Conda 环境，加载 `server/.env` 里的环境变量，然后启动 API：

```bash
source /opt/anaconda3/etc/profile.d/conda.sh
conda activate /Users/yanjinbin/Desktop/deeplearning/achievement/server/.conda
set -a
source server/.env
set +a
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

## 配置 AI 快捷新增

如果要使用“AI 分类并收藏”功能，需要先安装智谱官方 SDK，并在启动后端前配置 API Key：

```bash
server/.conda/bin/pip install -r server/requirements.txt
export ZHIPU_API_KEY="你的_智谱_api_key"
```

默认使用智谱 `GLM-4.7-Flash` 模型。也可以通过环境变量覆盖：

```bash
export ZHIPU_MODEL=GLM-4.7-Flash
export ZHIPU_THINKING=disabled
```

如果你的环境里已经统一使用 `AI_API_KEY`、`ZAI_API_KEY`、`API_KEY` 或 `APIKEY`，
后端也会自动读取。

如果 AI 新增太慢，可以开启本地极速分类模式。这个模式不会调用智谱 API，会直接用本地规则选择最接近的分类：

```bash
export AI_CLASSIFY_MODE=local
```

## 查看日志

后端默认会把日志同时输出到控制台和文件：

```text
server/logs/app.log
```

实时查看日志：

```bash
tail -f server/logs/app.log
```

可以通过环境变量调整日志行为：

```bash
export LOG_LEVEL=INFO
export LOG_TO_FILE=true
export LOG_FILE=server/logs/app.log
```

日志会记录请求方法、路径、状态码、耗时、AI 分类模式、模型、分类结果和数据库新增记录。日志不会记录 Cookie、密码或 API Key。

## 启动前端

前端可以单独用静态服务器启动：

```bash
python3 -m http.server 5173 -d product
```

然后在浏览器打开：

```text
http://127.0.0.1:5173
```

本地开发时，前端和后端尽量使用同一个 hostname。比如打开 `http://127.0.0.1:5173`
时，前端会请求 `http://127.0.0.1:8000`；打开 `http://localhost:5173` 时，前端会请求
`http://localhost:8000`。这样登录 Cookie 才能在后续 API 请求里正常携带。

## 手机访问同一局域网服务

如果要从手机访问电脑上启动的网站，需要让前后端都监听所有网络接口：

```bash
uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
python3 -m http.server 5173 -d product --bind 0.0.0.0
```

然后查看电脑的局域网 IP，例如 `10.162.63.83`，在手机浏览器打开：

```text
http://10.162.63.83:5173
```

前端会自动请求：

```text
http://10.162.63.83:8000
```

后端默认允许常见局域网地址访问，包括 `10.x.x.x`、`192.168.x.x` 和
`172.16.x.x` 到 `172.31.x.x`。如果你的网络地址段不在这些范围里，可以通过
`CORS_ORIGIN_REGEX` 或 `CORS_ORIGINS` 自定义允许的来源。
