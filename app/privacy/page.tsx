import Link from "next/link";

export const metadata = {
  title: { absolute: "개인정보처리방침 | 키워드랩" },
  description: "키워드랩의 개인정보 수집 항목, 보관 기간, 쿠키, 광고 및 제3자 서비스 이용 방침입니다.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link href="/" className="legal-back">← 키워드랩으로 돌아가기</Link>
        <p className="legal-eyebrow">PRIVACY</p>
        <h1>개인정보처리방침</h1>
        <p>시행일: 2026년 8월 24일</p>
        <section>
          <h2>1. 수집 항목</h2>
          <p>
            키워드랩은 회원가입 없이 사용할 수 있으며 이름, 주민등록번호, 결제정보 같은 민감한 개인정보를 직접 요구하지 않습니다.
            다만 서비스 제공과 보안 관리를 위해 아래 정보가 처리될 수 있습니다.
          </p>
          <ul>
            <li>사용자가 검색창에 입력한 키워드와 요청한 페이지 주소</li>
            <li>접속 일시, IP 주소, 브라우저·기기 정보, 리퍼러 등 일반적인 서버 로그</li>
            <li>오류 원인 확인을 위한 API 응답 상태, 요청 시간, 비식별화된 진단 정보</li>
            <li>광고 노출과 빈도 제한을 위한 쿠키, 광고 식별자, 웹 비콘 정보</li>
          </ul>
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
            본 사이트는 Google AdSense 등 제3자 광고 제공업체의 광고를 게재할 수 있습니다. Google 및 제3자 광고 제공업체는
            광고 제공, 빈도 제한, 맞춤 광고, 광고 성과 측정, 부정 클릭 방지를 위해 쿠키 또는 웹 비콘을 사용할 수 있습니다.
            이러한 쿠키는 사용자의 이전 방문 기록이나 관심사에 기반한 광고 노출에 활용될 수 있습니다.
          </p>
          <p>
            사용자는 브라우저 설정에서 쿠키를 차단하거나 삭제할 수 있고,
            {" "}<a href="https://adssettings.google.com/" rel="nofollow noopener noreferrer" target="_blank">Google 광고 설정</a>
            에서 맞춤 광고 사용 여부를 관리할 수 있습니다. Google의 광고 쿠키 안내는
            {" "}<a href="https://policies.google.com/technologies/ads?hl=ko" rel="nofollow noopener noreferrer" target="_blank">Google 광고와 개인정보</a>
            문서에서 확인할 수 있습니다.
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
          <ul>
            <li>검색 키워드와 분석 요청 로그: 서비스 품질 개선과 오류 확인을 위해 최대 90일 보관</li>
            <li>서버 접속 로그: 보안과 장애 대응을 위해 최대 180일 보관</li>
            <li>문의 이메일: 답변과 분쟁 대응을 위해 처리 완료 후 최대 3년 보관</li>
            <li>광고 쿠키: Google 및 제3자 광고 제공업체의 정책과 사용자의 브라우저 설정에 따름</li>
          </ul>
          <p>보관 목적이 달성되거나 법령상 보관 필요가 없어진 정보는 삭제하거나 개인을 알아볼 수 없도록 익명화합니다.</p>
        </section>
        <section>
          <h2>6. 문의</h2>
          <p>
            개인정보, 쿠키, 광고 또는 데이터 처리 관련 문의는 <a href="mailto:contact@fastincome.kr">contact@fastincome.kr</a> 로 보내주세요.
            문의 시 요청 내용과 확인 가능한 페이지 주소를 함께 보내주시면 더 정확히 확인할 수 있습니다.
          </p>
        </section>
      </article>
    </main>
  );
}
