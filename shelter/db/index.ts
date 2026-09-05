import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Vercel Postgres(Neon) 연동: Vercel의 Postgres 스토리지를 프로젝트에 연결하면
// DATABASE_URL이 자동으로 주입됩니다(Neon 통합 기준). 다른 이름으로 연결했다면 맞춰 주세요.
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되지 않았습니다. Vercel 프로젝트에 Postgres(Neon) 스토리지를 연결하거나 .env.local에 DATABASE_URL을 넣어 주세요.',
    );
  }
  return drizzle(url, { schema });
}
