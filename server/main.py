import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import mysql.connector
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import errorcode, pooling
from passlib.context import CryptContext
from pydantic import BaseModel


CATEGORIES = {"学习/工作", "生活自律", "情绪管理", "人际关系", "小幸运"}
COOKIE_NAME = "achievement_session"
JWT_ALGORITHM = "HS256"
SESSION_DAYS = 7
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,40}$")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
app = FastAPI(title="Achievement Box API")


def env(name: str, default: str = "") -> str:
  return os.environ.get(name, default)


def parse_origins() -> list[str]:
  raw = env("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,null")
  return [origin.strip() for origin in raw.split(",") if origin.strip()]


app.add_middleware(
  CORSMiddleware,
  allow_origins=parse_origins(),
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


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


_pool: pooling.MySQLConnectionPool | None = None


def get_pool() -> pooling.MySQLConnectionPool:
  global _pool
  if _pool is None:
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
  cursor = connection.cursor(dictionary=True)
  cursor.execute(
    "INSERT INTO achievements (user_id, content, category) VALUES (%s, %s, %s)",
    (user["id"], content, category),
  )
  achievement_id = cursor.lastrowid
  connection.commit()
  cursor.execute(
    """
    SELECT id, content, category, created_at, updated_at
    FROM achievements
    WHERE id = %s AND user_id = %s AND deleted_at IS NULL
    """,
    (achievement_id, user["id"]),
  )
  return {"record": serialize_achievement(cursor.fetchone())}


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
