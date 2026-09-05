"""사용자 인증 (F-028) — 온라인 계정 · 사용자별 데이터 분리.

의존성 없이 표준 라이브러리만 사용한다:
- 비밀번호: PBKDF2-HMAC-SHA256 (사용자별 salt, 210k iterations)
- 세션 토큰: secrets.token_urlsafe → sessions 테이블에 만료시각과 함께 저장

백엔드가 곧 계정 서버다. 설치형 앱은 각자 로컬 백엔드를 쓰지만, 같은 백엔드
URL(설정에서 지정)을 공유하면 여러 기기가 같은 계정을 쓴다.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import sqlalchemy as sa

from backend.database import _session

_ITERATIONS = 210_000
_TOKEN_TTL = timedelta(days=30)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_password(password: str, salt: str) -> str:
    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _ITERATIONS
    )
    return dk.hex()


def register(
    email: str, password: str, display_name: str | None = None, db_path: Path | None = None
) -> dict[str, Any]:
    email = email.strip().lower()
    if "@" not in email or len(email) < 5:
        raise ValueError("올바른 이메일을 입력하세요.")
    if len(password) < 8:
        raise ValueError("비밀번호는 8자 이상이어야 합니다.")
    salt = secrets.token_hex(16)
    pwd_hash = _hash_password(password, salt)
    with _session(db_path) as conn:
        exists = conn.execute(
            sa.text("SELECT 1 FROM users WHERE email=:e"), {"e": email}
        ).fetchone()
        if exists:
            raise ValueError("이미 가입된 이메일입니다.")
        r = conn.execute(
            sa.text(
                "INSERT INTO users(email, password_hash, password_salt, display_name, created_at) "
                "VALUES (:e, :h, :s, :n, :c)"
            ),
            {
                "e": email,
                "h": pwd_hash,
                "s": salt,
                "n": display_name or email.split("@")[0],
                "c": _now().isoformat(),
            },
        )
        conn.commit()
        user_id = int(r.lastrowid)
    return {"user_id": user_id, "email": email, "display_name": display_name or email.split("@")[0]}


def login(email: str, password: str, db_path: Path | None = None) -> dict[str, Any]:
    email = email.strip().lower()
    with _session(db_path) as conn:
        row = conn.execute(
            sa.text(
                "SELECT user_id, password_hash, password_salt, display_name FROM users WHERE email=:e"
            ),
            {"e": email},
        ).fetchone()
        if row is None:
            raise ValueError("이메일 또는 비밀번호가 올바르지 않습니다.")
        candidate = _hash_password(password, row.password_salt)
        if not hmac.compare_digest(candidate, row.password_hash):
            raise ValueError("이메일 또는 비밀번호가 올바르지 않습니다.")
        token = secrets.token_urlsafe(32)
        conn.execute(
            sa.text(
                "INSERT INTO sessions(token, user_id, created_at, expires_at) "
                "VALUES (:t, :u, :c, :x)"
            ),
            {
                "t": token,
                "u": row.user_id,
                "c": _now().isoformat(),
                "x": (_now() + _TOKEN_TTL).isoformat(),
            },
        )
        conn.commit()
        return {
            "token": token,
            "user": {
                "user_id": row.user_id,
                "email": email,
                "display_name": row.display_name,
            },
        }


def logout(token: str, db_path: Path | None = None) -> None:
    with _session(db_path) as conn:
        conn.execute(sa.text("DELETE FROM sessions WHERE token=:t"), {"t": token})
        conn.commit()


def user_for_token(token: str, db_path: Path | None = None) -> dict[str, Any] | None:
    if not token:
        return None
    with _session(db_path) as conn:
        row = conn.execute(
            sa.text(
                "SELECT s.user_id, s.expires_at, u.email, u.display_name "
                "FROM sessions s JOIN users u ON u.user_id = s.user_id "
                "WHERE s.token=:t"
            ),
            {"t": token},
        ).fetchone()
        if row is None:
            return None
        try:
            expires = datetime.fromisoformat(row.expires_at)
        except ValueError:
            expires = _now() - timedelta(seconds=1)
        if expires < _now():
            conn.execute(sa.text("DELETE FROM sessions WHERE token=:t"), {"t": token})
            conn.commit()
            return None
        return {
            "user_id": row.user_id,
            "email": row.email,
            "display_name": row.display_name,
        }
