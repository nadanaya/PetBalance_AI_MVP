"""Vercel Python 함수 진입점. 실제 앱은 backend/api.py의 ASGI 앱을 그대로 노출한다."""
from backend.api import APP as app
