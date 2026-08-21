import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 | 키워드랩",
  description: "키워드랩의 개인정보 처리, 쿠키, 광고 및 제3자 서비스 이용 방침입니다.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link href="/" className="legal-back">← 키워드랩으로 돌아가기</Link>
        <p className="legal-eyebrow">PRIVACY</p>
        <h1>개인정보처리방침</h1>
        <p>시행일: 2026년 8월 21일</p>
        <section>
          <h2>1. 수집하는 정보</h2>
          <p>
            키워드랩은 회원가입 없이 사용할 수 있습니다. 사용자가 검색창에 입력한 키워드는 검색 결과 제공을 위해 서버로 전송될 수 있습니다.
            또한 서비스 안정성, 보안, 오류 확인을 위해 접속 시간, 브라우저 정보, IP 주소 등 일반적인 서버 로그가 처리될 수 있습니다.
          </p>
        </section>
        <section>
          <h2>2. 이용 목적</h2>
          <ul>
            <li>키워드 검색량과 연관 키워드 결과 제공</li>
            <li>서비스 오류 분석과 보안 유지</li>
            <li>광고 노출, 부정 사용 방지, 서비스 품질 개선</li>
          </ul>
        </section>
        <section>
          <h2>3. 광고와 쿠키</h2>
          <p>
            본 사이트는 Google AdSense를 사용할 수 있습니다. Google 및 제3자 광고 사업자는 광고 제공, 빈도 제한, 부정 클릭 방지,
            맞춤 광고 제공 등을 위해 쿠키 또는 웹 비콘을 사용할 수 있습니다. 사용자는 브라우저 설정에서 쿠키를 차단하거나 삭제할 수 있으며,
            Google 광고 설정에서 맞춤 광고를 관리할 수 있습니다.
          </p>
          <p>
            자세한 내용은 Google의 광고 관련 개인정보 안내를 확인할 수 있습니다:
            {" "}
            <a href="https://policies.google.com/technologies/ads?hl=ko" rel="nofollow">Google 광고와 개인정보</a>
          </p>
        </section>
        <section>
          <h2>4. 제3자 서비스</h2>
          <p>
            키워드 검색량 제공을 위해 네이버 검색광고 API를 사용하며, 광고 송출을 위해 Google AdSense 스크립트가 로드될 수 있습니다.
            API 키와 광고 식별자는 서버 또는 사이트 설정에서 관리되며 화면에 노출하지 않습니다.
          </p>
        </section>
        <section>
          <h2>5. 보관과 파기</h2>
          <p>
            검색어와 서버 로그는 서비스 운영과 보안 목적에 필요한 기간 동안만 처리되며, 목적이 달성되면 합리적인 범위에서 삭제 또는 익명화합니다.
          </p>
        </section>
        <section>
          <h2>6. 문의</h2>
          <p>
            개인정보 또는 광고 관련 문의는 <a href="mailto:contact@fastincome.kr">contact@fastincome.kr</a> 로 보내주세요.
          </p>
        </section>
      </article>
    </main>
  );
}
