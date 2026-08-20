# 모아봄 (커뮤니티 인기글 모음)

여러 공개 커뮤니티의 게시글 제목·기본 메타데이터·직접 작성한 짧은 요약·원문 링크를 한곳에서 보여주는 모바일 우선 웹앱입니다. 원문 본문, 댓글 전체, 원문 이미지 파일은 저장하거나 복제하지 않습니다.

## 실행

```bash
npm install
npm run dev
```

## 환경변수

- `ADMIN_ACCESS_KEY`: `/admin` 수동 등록 화면에서 사용할 관리자 키
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: 영구 저장소를 연결할 때 사용
- `.env.local`은 저장소에 커밋하지 않습니다.

현재 1차 버전은 화면과 API 흐름 검증을 위해 수동 등록 게시글을 런타임 메모리에 저장합니다. 프로세스 재시작 시 초기화되므로 운영 전 `db/community-schema.sql`을 Supabase PostgreSQL에 적용하고 저장소 어댑터를 연결하세요.

## 주요 경로

- `/`: 인기순·최신순 통합 피드, 검색, 커뮤니티 필터
- `/community/{slug}`: 커뮤니티별 목록
- `/post/{community}/{externalId}`: 짧은 요약과 원문 링크 상세
- `/admin`: 관리자 키 인증 후 게시글 수동 등록
- `/sitemap.xml`, `/robots.txt`: SEO 기본 설정

## 수집기 추가

`collectors/types.ts`의 `CommunityCollector` 인터페이스를 구현하고 `collectors/bobae.ts`처럼 커뮤니티별 파일을 추가합니다. API가 제공되면 API를 우선하고, HTML 수집 전 robots.txt·이용약관·서비스 정책을 확인합니다. 요청 간격과 User-Agent를 명시하고, 제목/URL/시간/수치 등 최소 필드만 정규화합니다. 수집 실패는 전체 피드 실패로 전파하지 않고 `crawl_logs`에 기록합니다.

현재 보배드림 어댑터는 정책 확인 전까지 의도적으로 비활성화되어 있습니다.

## 배포

```bash
npm run build
npx wrangler deploy
```

Cloudflare Worker 또는 Sites 배포 시 관리자 키와 Supabase 연결값은 배포 환경의 비밀 변수로 설정하세요.

## 저작권·출처 원칙

- 카드와 상세에는 출처 커뮤니티명과 원문 링크를 표시합니다.
- 원문 전체 본문·댓글 전체·이미지 파일을 복제하거나 자동 재호스팅하지 않습니다.
- 삭제/비공개 원문은 비노출 처리할 수 있도록 `status`를 둡니다.
- 게시중단 요청과 문의 채널을 운영 전에 추가합니다.
