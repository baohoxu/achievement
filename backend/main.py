import json
import logging
import os
import re
import time
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
import mysql.connector
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import errorcode, pooling
from passlib.context import CryptContext
from pydantic import BaseModel


CATEGORIES_LIST = ["学习/工作", "生活自律", "情绪管理", "人际关系", "小幸运"]
CATEGORIES = set(CATEGORIES_LIST)
COOKIE_NAME = "achievement_session"
JWT_ALGORITHM = "HS256"
SESSION_DAYS = 7
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,40}$")
BASE_DIR = Path(__file__).resolve().parent

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
app = FastAPI(title="Achievement Box API")


def env(name: str, default: str = "") -> str:
  return os.environ.get(name, default)


def parse_bool(value: str) -> bool:
  return value.strip().lower() in {"1", "true", "yes", "on"}


def configure_logging() -> logging.Logger:
  logger = logging.getLogger("achievement_box")
  if logger.handlers:
    return logger

  log_level = env("LOG_LEVEL", "INFO").upper()
  logger.setLevel(getattr(logging, log_level, logging.INFO))
  logger.propagate = False

  formatter = logging.Formatter(
    "%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
  )

  console_handler = logging.StreamHandler()
  console_handler.setFormatter(formatter)
  logger.addHandler(console_handler)

  if parse_bool(env("LOG_TO_FILE", "true")):
    log_file = Path(env("LOG_FILE", str(BASE_DIR / "logs" / "app.log")))
    log_file.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

  return logger


logger = configure_logging()


def parse_origins() -> list[str]:
  raw = env("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,null")
  return [origin.strip() for origin in raw.split(",") if origin.strip()]


def cors_origin_regex() -> str:
  return env(
    "CORS_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
  )


app.add_middleware(
  CORSMiddleware,
  allow_origins=parse_origins(),
  allow_origin_regex=cors_origin_regex(),
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
  request_id = uuid4().hex[:10]
  started_at = time.perf_counter()
  request.state.request_id = request_id
  logger.info("request.start id=%s method=%s path=%s", request_id, request.method, request.url.path)
  try:
    response = await call_next(request)
  except Exception:
    duration_ms = (time.perf_counter() - started_at) * 1000
    logger.exception(
      "request.error id=%s method=%s path=%s duration_ms=%.1f",
      request_id,
      request.method,
      request.url.path,
      duration_ms,
    )
    raise

  duration_ms = (time.perf_counter() - started_at) * 1000
  response.headers["X-Request-ID"] = request_id
  log_method = logger.warning if response.status_code >= 400 else logger.info
  log_method(
    "request.end id=%s method=%s path=%s status=%s duration_ms=%.1f",
    request_id,
    request.method,
    request.url.path,
    response.status_code,
    duration_ms,
  )
  return response


class RegisterRequest(BaseModel):
  username: str
  password: str
  nickname: str | None = None


class LoginRequest(BaseModel):
  username: str
  password: str


class AchievementCreateRequest(BaseModel):
  content: str
  category: str


class AchievementAiCreateRequest(BaseModel):
  content: str


_pool: pooling.MySQLConnectionPool | None = None


def get_pool() -> pooling.MySQLConnectionPool:
  global _pool
  if _pool is None:
    logger.info(
      "db.pool.create host=%s port=%s database=%s pool_size=%s",
      env("MYSQL_HOST", "127.0.0.1"),
      env("MYSQL_PORT", "3306"),
      env("MYSQL_DATABASE", "achievement_box"),
      env("MYSQL_POOL_SIZE", "5"),
    )
    _pool = pooling.MySQLConnectionPool(
      pool_name="achievement_box_pool",
      pool_size=int(env("MYSQL_POOL_SIZE", "5")),
      host=env("MYSQL_HOST", "127.0.0.1"),
      port=int(env("MYSQL_PORT", "3306")),
      user=env("MYSQL_USER", "root"),
      password=env("MYSQL_PASSWORD", ""),
      database=env("MYSQL_DATABASE", "achievement_box"),
      charset="utf8mb4",
      collation="utf8mb4_unicode_ci",
      autocommit=False,
    )
  return _pool


def get_db():
  connection = get_pool().get_connection()
  try:
    yield connection
  finally:
    connection.close()


def validate_username(username: str) -> str:
  normalized = username.strip()
  if not USERNAME_RE.fullmatch(normalized):
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail="账号需为 3-40 位字母、数字或下划线。",
    )
  return normalized


def validate_password(password: str) -> str:
  if not 6 <= len(password) <= 72:
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail="密码需为 6-72 位。",
    )
  return password


def normalize_nickname(nickname: str | None) -> str | None:
  if nickname is None:
    return None
  normalized = nickname.strip()
  if not normalized:
    return None
  if len(normalized) > 40:
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail="昵称最多 40 个字符。",
    )
  return normalized


def validate_achievement(payload: AchievementCreateRequest) -> tuple[str, str]:
  content = payload.content.strip()
  if not content:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="先写下一件值得庆祝的小事吧。")
  if len(content) > 200:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="内容有点长，可以稍微简短一点。")
  if payload.category not in CATEGORIES:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="请选择有效分类。")
  return content, payload.category


def validate_ai_content(content: str) -> str:
  normalized = content.strip()
  if not normalized:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="先写下一件值得庆祝的小事吧。")
  if len(normalized) > 200:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="内容有点长，可以稍微简短一点。")
  return normalized


def zhipu_api_key() -> str:
  return (
    env("ZHIPU_API_KEY")
    or env("ZAI_API_KEY")
    or env("AI_API_KEY")
    or env("API_KEY")
    or env("APIKEY")
  )


def zhipu_model() -> str:
  return env("ZHIPU_MODEL") or env("AI_MODEL") or "GLM-4.7-Flash"


def zhipu_thinking_mode() -> str:
  return env("ZHIPU_THINKING", "disabled")


def ai_classify_mode() -> str:
  return env("AI_CLASSIFY_MODE", "zhipu").strip().lower()


def get_zhipu_client_class():
  try:
    from zai import ZaiClient

    return ZaiClient
  except ImportError:
    try:
      from zai import ZhipuAiClient

      return ZhipuAiClient
    except ImportError as exc:
      raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="未安装智谱官方 SDK，请先运行：server/.conda/bin/pip install -r server/requirements.txt",
      ) from exc


def message_content(message: Any) -> str:
  if isinstance(message, str):
    return message
  if isinstance(message, dict):
    content = message.get("content")
  else:
    content = getattr(message, "content", None)

  if isinstance(content, list):
    parts: list[str] = []
    for part in content:
      if isinstance(part, dict):
        parts.append(str(part.get("text") or part.get("content") or ""))
      else:
        parts.append(str(getattr(part, "text", "") or getattr(part, "content", "") or part))
    return "".join(parts)
  if content is not None:
    return str(content)
  return str(message)


def extract_json_object(text: str) -> dict[str, Any]:
  try:
    parsed = json.loads(text)
  except json.JSONDecodeError:
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
      raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 没有返回可解析的分类结果。")
    try:
      parsed = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
      raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 没有返回可解析的分类结果。") from exc
  if not isinstance(parsed, dict):
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 没有返回可解析的分类结果。")
  return parsed


def normalize_ai_category(category: Any) -> str | None:
  if not isinstance(category, str):
    return None
  normalized = category.strip()
  if normalized in CATEGORIES:
    return normalized
  for option in CATEGORIES_LIST:
    if option in normalized:
      return option
  return None


def fallback_ai_category(content: str) -> str:
  if re.search(r"学|读|课|题|代码|项目|工作|面试|复习|考试|作业|论文|会议", content):
    return "学习/工作"
  if re.search(r"跑|走|睡|早起|运动|健身|整理|打扫|做饭|饮食|喝水", content):
    return "生活自律"
  if re.search(r"开心|难过|焦虑|生气|平静|情绪|放松|压力|哭|笑", content):
    return "情绪管理"
  if re.search(r"朋友|同事|家人|父母|聊天|沟通|回复|见面|关系", content):
    return "人际关系"
  return "小幸运"


def classify_achievement_with_ai(content: str) -> tuple[str, str]:
  if ai_classify_mode() == "local":
    started_at = time.perf_counter()
    category = fallback_ai_category(content)
    logger.info(
      "ai.classify mode=local category=%s content_len=%s duration_ms=%.1f",
      category,
      len(content),
      (time.perf_counter() - started_at) * 1000,
    )
    return category, f"已为你快速选择最接近的分类：{category}。"

  api_key = zhipu_api_key()
  if not api_key:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="智谱 API Key 还没有配置，请先设置 ZHIPU_API_KEY、ZAI_API_KEY 或 AI_API_KEY。",
    )

  category_text = "、".join(CATEGORIES_LIST)
  prompt = (
    f"从分类中选一个最接近用户输入的分类：{category_text}。"
    '只输出 JSON：{"category":"分类名","reason":"一句简短原因"}。'
    f"不要拒绝，不要返回 null。用户输入：{content}"
  )

  client_class = get_zhipu_client_class()
  client = client_class(api_key=api_key)
  started_at = time.perf_counter()
  model = zhipu_model()
  thinking = zhipu_thinking_mode()
  logger.info("ai.classify.start mode=zhipu model=%s thinking=%s content_len=%s", model, thinking, len(content))
  try:
    response = client.chat.completions.create(
      model=model,
      messages=[
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": prompt,
            }
          ],
        }
      ],
      thinking={
        "type": thinking,
      },
    )
    message = response.choices[0].message
  except Exception as exc:
    logger.warning(
      "ai.classify.error mode=zhipu model=%s duration_ms=%.1f error=%s",
      model,
      (time.perf_counter() - started_at) * 1000,
      str(exc)[:200],
    )
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"智谱 AI 调用失败：{str(exc)[:200]}") from exc

  try:
    parsed = extract_json_object(message_content(message))
  except HTTPException:
    parsed = {}

  category = normalize_ai_category(parsed.get("category")) or fallback_ai_category(content)
  reason = str(parsed.get("reason") or f"已为你选择最接近的分类：{category}。").strip()
  logger.info(
    "ai.classify.end mode=zhipu model=%s category=%s fallback=%s duration_ms=%.1f",
    model,
    category,
    "category" not in parsed,
    (time.perf_counter() - started_at) * 1000,
  )
  return category, reason


def serialize_user(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "id": str(row["id"]),
    "username": row["username"],
    "nickname": row.get("nickname"),
  }


def format_datetime(value: datetime) -> str:
  return value.strftime("%Y-%m-%dT%H:%M:%S")


def serialize_achievement(row: dict[str, Any]) -> dict[str, Any]:
  return {
    "id": str(row["id"]),
    "content": row["content"],
    "category": row["category"],
    "createdAt": format_datetime(row["created_at"]),
    "updatedAt": format_datetime(row["updated_at"]),
  }


def insert_achievement(connection, user_id: int, content: str, category: str) -> dict[str, Any]:
  started_at = time.perf_counter()
  cursor = connection.cursor(dictionary=True)
  cursor.execute(
    "INSERT INTO achievements (user_id, content, category) VALUES (%s, %s, %s)",
    (user_id, content, category),
  )
  achievement_id = cursor.lastrowid
  connection.commit()
  cursor.execute(
    """
    SELECT id, content, category, created_at, updated_at
    FROM achievements
    WHERE id = %s AND user_id = %s AND deleted_at IS NULL
    """,
    (achievement_id, user_id),
  )
  record = serialize_achievement(cursor.fetchone())
  logger.info(
    "achievement.create user_id=%s record_id=%s category=%s content_len=%s duration_ms=%.1f",
    user_id,
    record["id"],
    category,
    len(content),
    (time.perf_counter() - started_at) * 1000,
  )
  return record


def create_token(user_id: int) -> str:
  now = datetime.now(timezone.utc)
  payload = {
    "sub": str(user_id),
    "iat": now,
    "exp": now + timedelta(days=SESSION_DAYS),
  }
  return jwt.encode(payload, env("JWT_SECRET", "dev-only-change-me"), algorithm=JWT_ALGORITHM)


def set_session_cookie(response: Response, user_id: int) -> None:
  response.set_cookie(
    COOKIE_NAME,
    create_token(user_id),
    max_age=SESSION_DAYS * 24 * 60 * 60,
    httponly=True,
    secure=env("COOKIE_SECURE", "false").lower() == "true",
    samesite="lax",
    path="/",
  )


def get_user_by_username(connection, username: str) -> dict[str, Any] | None:
  cursor = connection.cursor(dictionary=True)
  cursor.execute(
    "SELECT id, username, password_hash, nickname FROM users WHERE username = %s",
    (username,),
  )
  return cursor.fetchone()


def get_user_by_id(connection, user_id: int) -> dict[str, Any] | None:
  cursor = connection.cursor(dictionary=True)
  cursor.execute(
    "SELECT id, username, nickname FROM users WHERE id = %s",
    (user_id,),
  )
  return cursor.fetchone()


def current_user(request: Request, connection=Depends(get_db)) -> dict[str, Any]:
  token = request.cookies.get(COOKIE_NAME)
  if not token:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录。")
  try:
    payload = jwt.decode(token, env("JWT_SECRET", "dev-only-change-me"), algorithms=[JWT_ALGORITHM])
    user_id = int(payload["sub"])
  except (jwt.InvalidTokenError, KeyError, ValueError):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效，请重新登录。") from None

  user = get_user_by_id(connection, user_id)
  if not user:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效，请重新登录。")
  return user


@app.get("/api/health")
def health() -> dict[str, str]:
  return {"status": "ok"}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, connection=Depends(get_db)):
  username = validate_username(payload.username)
  password = validate_password(payload.password)
  nickname = normalize_nickname(payload.nickname)
  password_hash = pwd_context.hash(password)
  cursor = connection.cursor(dictionary=True)
  try:
    cursor.execute(
      "INSERT INTO users (username, password_hash, nickname) VALUES (%s, %s, %s)",
      (username, password_hash, nickname),
    )
    connection.commit()
  except mysql.connector.Error as exc:
    connection.rollback()
    if exc.errno == errorcode.ER_DUP_ENTRY:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="这个账号已经被注册了。") from exc
    raise

  user = {"id": cursor.lastrowid, "username": username, "nickname": nickname}
  set_session_cookie(response, int(user["id"]))
  return {"user": serialize_user(user)}


@app.post("/api/auth/login")
def login(payload: LoginRequest, response: Response, connection=Depends(get_db)):
  username = validate_username(payload.username)
  validate_password(payload.password)
  user = get_user_by_username(connection, username)
  if not user or not pwd_context.verify(payload.password, user["password_hash"]):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码不正确。")

  set_session_cookie(response, int(user["id"]))
  return {"user": serialize_user(user)}


@app.post("/api/auth/logout")
def logout(response: Response) -> dict[str, bool]:
  response.delete_cookie(COOKIE_NAME, path="/", samesite="lax")
  return {"ok": True}


@app.get("/api/auth/me")
def me(user=Depends(current_user)) -> dict[str, Any]:
  return {"user": serialize_user(user)}


@app.get("/api/achievements")
def list_achievements(
  category: str | None = Query(default=None),
  user=Depends(current_user),
  connection=Depends(get_db),
) -> dict[str, list[dict[str, Any]]]:
  if category and category not in CATEGORIES:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="请选择有效分类。")

  params: list[Any] = [user["id"]]
  sql = """
    SELECT id, content, category, created_at, updated_at
    FROM achievements
    WHERE user_id = %s AND deleted_at IS NULL
  """
  if category:
    sql += " AND category = %s"
    params.append(category)
  sql += " ORDER BY created_at DESC, id DESC"

  cursor = connection.cursor(dictionary=True)
  cursor.execute(sql, tuple(params))
  return {"records": [serialize_achievement(row) for row in cursor.fetchall()]}


@app.post("/api/achievements", status_code=status.HTTP_201_CREATED)
def create_achievement(
  payload: AchievementCreateRequest,
  user=Depends(current_user),
  connection=Depends(get_db),
) -> dict[str, dict[str, Any]]:
  content, category = validate_achievement(payload)
  return {"record": insert_achievement(connection, int(user["id"]), content, category)}


@app.post("/api/achievements/ai-create", status_code=status.HTTP_201_CREATED)
def create_achievement_with_ai(
  payload: AchievementAiCreateRequest,
  user=Depends(current_user),
  connection=Depends(get_db),
) -> dict[str, Any]:
  content = validate_ai_content(payload.content)
  category, reason = classify_achievement_with_ai(content)
  record = insert_achievement(connection, int(user["id"]), content, category)
  return {"record": record, "ai": {"category": category, "reason": reason}}


@app.get("/api/achievements/{achievement_id}")
def get_achievement(
  achievement_id: int,
  user=Depends(current_user),
  connection=Depends(get_db),
) -> dict[str, dict[str, Any]]:
  cursor = connection.cursor(dictionary=True)
  cursor.execute(
    """
    SELECT id, content, category, created_at, updated_at
    FROM achievements
    WHERE id = %s AND user_id = %s AND deleted_at IS NULL
    """,
    (achievement_id, user["id"]),
  )
  record = cursor.fetchone()
  if not record:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="没有找到这条记录。")
  return {"record": serialize_achievement(record)}
