import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../db';
import { shelterState } from '../../../db/schema';
import { initial, validState } from '../../../lib/shelter';

export async function GET() {
  const db = getDb();
  await db.insert(shelterState).values({ id: 1, data: JSON.stringify(initial), revision: 1 }).onConflictDoNothing();
  const [row] = await db.select().from(shelterState).where(eq(shelterState.id, 1)).limit(1);
  return Response.json({ data: JSON.parse(row.data), revision: row.revision }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: Request) {
  const publicOrigin = process.env.PUBLIC_ORIGIN;
  if (!publicOrigin) return new Response('Server misconfigured: PUBLIC_ORIGIN not set', { status: 500 });
  const origin = req.headers.get('origin');
  if (origin && origin !== publicOrigin) return new Response('Forbidden', { status: 403 });
  if (Number(req.headers.get('content-length') || 0) > 2000000) return new Response('Too large', { status: 413 });
  let body; try { body = await req.json() as { data: unknown; revision: number } } catch { return new Response('Invalid JSON', { status: 400 }) }
  if (!Number.isInteger(body.revision) || !validState(body.data)) return new Response('Invalid data', { status: 400 });

  const db = getDb();
  const result = await db.update(shelterState)
    .set({ data: JSON.stringify(body.data), revision: sql`${shelterState.revision} + 1` })
    .where(and(eq(shelterState.id, 1), eq(shelterState.revision, body.revision)))
    .returning({ revision: shelterState.revision });
  if (!result.length) return Response.json({ error: '다른 직원이 먼저 수정했습니다. 새로고침 후 다시 저장해 주세요.' }, { status: 409 });
  return Response.json({ revision: result[0].revision });
}
