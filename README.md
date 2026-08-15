# 배당한눈

미국 배당주의 실제 최근 12개월 주당 배당금(TTM)을 기준으로 월평균·분기·연간 예상 배당금과 목표 투자금을 계산하는 한국어 웹 앱입니다.

지원 종목은 `lib/stocks.ts` 한 파일에서 관리합니다. 현재 XOM, CVX, AAPL, MSFT, KO를 제공하며, 검증된 설정을 추가하면 같은 구조의 종목 페이지와 SEO 메타데이터가 자동으로 생성됩니다.

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

1. `.env.example`을 참고해 프로젝트 루트의 `.env.local`에 FMP 키를 설정합니다.

   ```dotenv
   FMP_API_KEY=your_fmp_api_key
   ```

2. 의존성을 설치하고 개발 서버를 실행합니다.

   ```bash
   npm install
   npm run dev
   ```

`.env.local`은 Git에서 제외됩니다. 키는 서버 요청 헤더에서만 사용하며 URL, 클라이언트 번들, 로그와 화면에 포함하지 않습니다. 배포 환경에서는 호스팅 서비스의 비밀 환경변수에 같은 이름으로 등록하세요.

## 데이터와 캐시

공식 Financial Modeling Prep Stable API의 다음 경로만 사용합니다.

- `/stable/quote`
- `/stable/profile`
- `/stable/historical-price-eod/full`
- `/stable/dividends`

서버 캐시 시간은 현재가 1시간, USD/KRW 환율 6시간, 가격 이력 12시간, 배당 이력과 기업정보 24시간입니다. 배당금은 표시 수익률을 역산하지 않고 최근 365일 실제 조정 배당금 합계를 우선 사용합니다.

## 검증과 배포

```bash
npm run lint
npm test
npm run build
npm run deploy
```

기술 구성: Next.js App Router 호환 vinext, TypeScript, Tailwind CSS, Recharts, Cloudflare Workers.
