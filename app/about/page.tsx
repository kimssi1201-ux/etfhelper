import Link from "next/link";

export const metadata = {
  title: "서비스 소개 | 키워드랩",
  description: "키워드랩은 네이버 검색광고 API 기반으로 키워드 검색량과 연관 키워드를 확인하는 분석 도구입니다.",
};

export default function AboutPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link href="/" className="legal-back">← 키워드랩으로 돌아가기</Link>
        <p className="legal-eyebrow">ABOUT</p>
        <h1>키워드랩 서비스 소개</h1>
        <p>
          키워드랩은 포털 검색 키워드의 월간 검색량, 모바일 비중, 연관 키워드, 경쟁도를 빠르게 확인할 수 있도록 만든 도구형 웹사이트입니다.
          콘텐츠 기획, 광고 키워드 검토, 블로그·쇼핑·서비스 아이디어 조사에 필요한 기본 지표를 간단한 화면으로 제공합니다.
        </p>
        <section>
          <h2>제공 기능</h2>
          <ul>
            <li>키워드별 PC·모바일 월간 검색량 확인</li>
            <li>관련 키워드 목록과 검색량 비교</li>
            <li>모바일 검색 비중과 경쟁도 참고 지표 제공</li>
            <li>키워드 기회 점수와 등급을 통한 빠른 우선순위 판단</li>
          </ul>
        </section>
        <section>
          <h2>데이터 기준</h2>
          <p>
            검색량 데이터는 네이버 검색광고 API에서 제공되는 범위 안에서 표시됩니다. API 제공 범위, 갱신 주기, 광고 계정 상태에 따라 실제 화면의 데이터가 지연되거나 일부 제한될 수 있습니다.
          </p>
        </section>
        <section>
          <h2>운영 원칙</h2>
          <p>
            키워드랩은 사용자가 원하는 키워드를 직접 입력해 확인하는 분석 도구입니다. 특정 검색엔진, 광고 플랫폼, 브랜드와 공식 제휴된 서비스가 아닙니다.
          </p>
        </section>
      </article>
    </main>
  );
}
