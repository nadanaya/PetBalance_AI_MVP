import { NextResponse } from 'next/server';
import { SESSION_COOKIE, checkAccessKey, sessionToken } from '../../../lib/auth';

export async function POST(req: Request) {
  let body; try { body = await req.json() as { key?: unknown } } catch { return new Response('Invalid JSON', { status: 400 }) }
  const key = typeof body.key === 'string' ? body.key : '';
  if (!key || !(await checkAccessKey(key))) {
    return NextResponse.json({ error: '접근 키가 올바르지 않습니다.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
