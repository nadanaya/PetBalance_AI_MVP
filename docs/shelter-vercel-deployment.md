# 보호소 웹(shelter/) Vercel 배포

`shelter/`는 원래 Cloudflare Workers 전용 스캐폴드(vinext + wrangler + D1)였습니다. Vercel 배포를 위해 표준 Next.js + Vercel Postgres(Neon)로 이식했습니다.

## 사전 준비

1. Vercel 프로젝트를 만들고 Root Directory를 `shelter`로 지정합니다.
2. Storage 탭에서 Postgres(Neon 기반)를 연결합니다 — `DATABASE_URL`이 자동 주입됩니다.
3. 프로젝트 환경변수에 아래를 추가합니다.
   - `PUBLIC_ORIGIN`: 배포된 실제 주소(예: `https://shelter.example.com`, 끝에 `/` 없이). `PUT /api/state`의 CSRF 방어에 쓰입니다.
   - `SHELTER_ACCESS_KEY`: 직원에게만 공유할 접근 키. 로그인 화면(`/login`)에서 이 값을 입력해야 앱에 들어옵니다.
4. 최초 1회, `DATABASE_URL`을 로컬에 설정한 뒤 마이그레이션을 만들고 적용합니다.
   ```
   cd shelter
   npm install
   npm run db:generate   # drizzle/ 아래에 첫 마이그레이션 생성
   npm run db:migrate     # Neon에 shelter_state 테이블 생성
   ```

## 배포 후 확인

- `/login`에서 `SHELTER_ACCESS_KEY`로 로그인되는지
- 로스터 화면이 뜨고(첫 로드 시 데모 데이터가 자동 시드됨), 저장이 되는지
- 로그아웃 후 다시 `/`에 접근하면 `/login`으로 리다이렉트되는지
- 콘솔에서 `PUT /api/state`를 다른 origin에서 호출하면 403이 나는지(도구 등으로 수동 확인)

## 이식하며 바뀐 점

- DB: Cloudflare D1 → Vercel Postgres(Neon), `drizzle-orm/neon-http` 사용 ([db/index.ts](../shelter/db/index.ts), [db/schema.ts](../shelter/db/schema.ts) 참고).
- 빌드: `vinext`/`wrangler` → 표준 `next build`/`next start` ([package.json](../shelter/package.json)).
- 인증: 이전엔 API에 아무 보호도 없어 링크만 알면 누구나 읽기/쓰기가 가능했습니다. 지금은 [middleware.ts](../shelter/middleware.ts)가 모든 경로(로그인 페이지 제외)를 접근 키 세션 쿠키로 막습니다. 계정/직원별 구분은 없고 조직 단위 공유 키 하나입니다 — 필요하면 이후 직원별 계정으로 확장하세요.
- CSRF: `PUT /api/state`의 origin 검사가 `PUBLIC_ORIGIN` 미설정 시 자기 자신과 비교해 사실상 무력화되어 있던 버그를 고쳤습니다. 이제 `PUBLIC_ORIGIN`이 없으면 요청을 거부합니다(fail closed).

## 남은 제약 (그대로 유지됨)

- 여전히 단일 행(공유 상태 하나)에 낙관적 동시성(revision)만 있고, 직원별 변경 이력·권한 분리는 없습니다.
- 영양 기준·제품·가격은 기능 검증용 데모 데이터입니다.
