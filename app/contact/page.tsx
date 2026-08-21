import Link from "next/link";

export const metadata = {
  title: "문의 | 키워드랩",
  description: "키워드랩 서비스, 개인정보, 광고, 오류 관련 문의 안내입니다.",
};

export default function ContactPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link href="/" className="legal-back">← 키워드랩으로 돌아가기</Link>
        <p className="legal-eyebrow">CONTACT</p>
        <h1>문의</h1>
        <p>
          서비스 오류, 개인정보, 광고, 데이터 출처, 삭제 요청 또는 제휴 문의는 아래 이메일로 보내주세요.
        </p>
        <section>
          <h2>연락처</h2>
          <p>
            이메일: <a href="mailto:contact@fastincome.kr">contact@fastincome.kr</a>
          </p>
          <p className="legal-note">
            도메인 메일 수신 설정이 완료되어 있어야 답변을 받을 수 있습니다. 운영자는 접수된 문의를 확인한 뒤 필요한 경우 순차적으로 답변합니다.
          </p>
        </section>
        <section>
          <h2>문의 시 포함하면 좋은 내용</h2>
          <ul>
            <li>문제가 발생한 페이지 주소</li>
            <li>검색한 키워드와 발생 시간</li>
            <li>오류 화면 또는 증상 설명</li>
            <li>개인정보·광고 관련 요청인 경우 요청 사유</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
