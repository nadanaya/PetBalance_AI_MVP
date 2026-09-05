# SQLite 실행

```bash
sqlite3 app.db < sql/schema.sql
sqlite3 app.db < sql/seed.sql
sqlite3 app.db < sql/queries.sql
```

검증은 이 스킬의 `scripts/validate_sqlite.py`를 사용한다.
