export const metadata = {
  title: { absolute: "이용약관 | 키워드랩" },
  description: "키워드랩 서비스 이용 조건과 데이터 이용 안내입니다.",
};

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <a href="/" className="legal-back">← 키워드랩으로 돌아가기</a>
        <p className="legal-eyebrow">TERMS</p>
        <h1>이용약관</h1>
        <p>시행일: 2026년 8월 24일</p>
        <section>
          <h2>1. 서비스 목적</h2>
          <p>
            키워드랩은 사용자가 입력한 키워드의 검색량과 연관 키워드 정보를 확인할 수 있도록 돕는 참고용 분석 도구입니다.
          </p>
        </section>
        <section>
          <h2>2. 데이터 이용 안내</h2>
          <p>
            표시되는 검색량, 경쟁도, 참고 점수는 외부 API 제공 데이터와 내부 계산식을 바탕으로 구성됩니다. 실제 광고 성과, 검색 노출,
            매출 또는 콘텐츠 성과를 보장하지 않습니다.
          </p>
          <p>
            지표의 의미와 산정 기준은 <a href="/methodology">데이터 산정 방식</a> 페이지에서 확인할 수 있습니다.
          </p>
        </section>
        <section>
          <h2>3. 금지 행위</h2>
          <ul>
            <li>자동화 도구를 이용한 과도한 요청</li>
            <li>서비스 장애를 유발하는 행위</li>
            <li>API 결과를 무단 대량 복제하거나 재판매하는 행위</li>
            <li>광고 클릭을 유도하거나 부정 클릭을 발생시키는 행위</li>
          </ul>
        </section>
        <section>
          <h2>4. 광고와 외부 링크</h2>
          <p>
            사이트에는 광고 또는 외부 링크가 포함될 수 있습니다. 광고와 외부 사이트의 내용, 정책, 거래에 대해서는 해당 제공자의 정책이 적용됩니다.
          </p>
        </section>
        <section>
          <h2>5. 지식재산권과 콘텐츠 이용</h2>
          <p>
            사이트의 화면 구성, 설명 문구, 자체 계산 지표와 편집 콘텐츠의 권리는 키워드랩 또는 정당한 권리자에게 있습니다.
            개인적인 참고 목적을 넘어 데이터를 대량 수집, 복제, 재배포하거나 상업적으로 재판매해서는 안 됩니다.
          </p>
        </section>
        <section>
          <h2>6. 책임 제한</h2>
          <p>
            키워드랩은 데이터의 정확성과 최신성을 높이기 위해 노력하지만, 외부 API 지연·오류·정책 변경으로 인해 일부 정보가 달라질 수 있습니다.
            사용자는 최종 의사결정 전에 원 제공처와 실제 광고 계정 데이터를 함께 확인해야 합니다.
          </p>
        </section>
        <section>
          <h2>7. 문의</h2>
          <p>약관, 데이터 이용, 광고 또는 오류 관련 문의는 <a href="mailto:contact@fastincome.kr">contact@fastincome.kr</a> 로 보내주세요.</p>
        </section>
      </article>
    </main>
  );
}
