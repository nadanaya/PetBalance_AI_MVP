// 직원 전용 공유 링크 보호: 계정 시스템 없이 조직 내부 접근키 하나로 게이트만 건다(경량 MVP 수준).
export const SESSION_COOKIE = 'shelter_session';

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sessionToken(): Promise<string> {
  const key = process.env.SHELTER_ACCESS_KEY;
  if (!key) throw new Error('SHELTER_ACCESS_KEY가 설정되지 않았습니다.');
  return sha256Hex(key);
}

export async function checkAccessKey(candidate: string): Promise<boolean> {
  const key = process.env.SHELTER_ACCESS_KEY;
  if (!key) return false;
  return candidate === key;
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  try { return cookieValue === (await sessionToken()) } catch { return false }
}
