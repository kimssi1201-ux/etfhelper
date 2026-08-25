import { gradeCriteria } from "@/lib/keyword-shared";

export const metadata = {
  title: { absolute: "데이터 산정 방식 | 키워드랩" },
  description: "키워드랩의 네이버 검색광고 API 데이터 출처, 검색량 계산, 등급 S~D 산정 기준, 광고 깊이 지표와 데이터 한계를 공개합니다.",
};

const scoreRows = [
  ["검색량 점수", "min(42, round(log10(max(월간 검색량, 10)) * 10))", "검색량이 클수록 점수가 올라가지만 과도하게 큰 키워드가 전체 점수를 지배하지 않도록 상한을 둡니다."],
  ["모바일 점수", "min(18, round(모바일 비중 / 6))", "모바일 검색 비중이 높은 키워드는 모바일 콘텐츠·쇼핑·로컬 탐색 가능성이 높다고 보고 가산합니다."],
  ["경쟁 보정", "40 - round(경쟁도 점수 / 3)", "경쟁도가 높을수록 진입 부담이 크므로 점수를 낮춥니다."],
  ["최종 점수", "clamp(검색량 점수 + 모바일 점수 + 경쟁 보정, 1, 100)", "합산 점수를 1~100 범위로 제한한 뒤 등급으로 변환합니다."],
];

export default function MethodologyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card methodology-card">
        <a href="/" className="legal-back">← 키워드랩으로 돌아가기</a>
        <p className="legal-eyebrow">METHODOLOGY</p>
        <h1>데이터 산정 방식</h1>
        <p>
          키워드랩은 사용자가 입력한 키워드를 기준으로 네이버 검색광고 API에서 제공하는 키워드 도구 데이터를 조회하고,
          검색량·모바일 비중·경쟁도·광고 깊이 지표를 사용자가 이해하기 쉬운 형태로 재구성합니다.
          이 페이지는 각 지표의 출처와 계산 방식을 공개하기 위한 문서입니다.
        </p>

        <section>
          <h2>1. 데이터 출처</h2>
          <p>
            핵심 검색량 데이터는 네이버 검색광고 API의 키워드 도구 엔드포인트에서 가져옵니다.
            API 응답의 관련 키워드 목록에서 다음 항목을 읽어 화면에 표시합니다.
          </p>
          <ul>
            <li><strong>relKeyword</strong>: 관련 키워드명</li>
            <li><strong>monthlyPcQcCnt</strong>: 월간 PC 검색량</li>
            <li><strong>monthlyMobileQcCnt</strong>: 월간 모바일 검색량</li>
            <li><strong>compIdx</strong>: 네이버 검색광고 기준 경쟁도</li>
            <li><strong>plAvgDepth</strong>: 광고 노출 지면의 평균 깊이</li>
          </ul>
          <p className="legal-note">
            키워드랩은 네이버, Google 또는 광고 플랫폼과 공식 제휴된 서비스가 아닙니다.
            원천 API의 제공 범위, 계정 권한, 정책 변경, 일시적 장애에 따라 데이터가 비어 있거나 지연될 수 있습니다.
          </p>
        </section>

        <section>
          <h2>2. 검색량과 비중 계산</h2>
          <p>
            월간 검색량은 PC 검색량과 모바일 검색량을 합산해 계산합니다.
            모바일 비중은 모바일 검색량을 전체 검색량으로 나눈 뒤 백분율로 반올림합니다.
          </p>
          <div className="legal-formula">
            <code>월간 검색량 = monthlyPcQcCnt + monthlyMobileQcCnt</code>
            <code>모바일 비중(%) = round(monthlyMobileQcCnt / 월간 검색량 * 100)</code>
          </div>
          <p>
            API가 <code>&lt; 10</code> 형태로 낮은 검색량을 반환하는 경우에는 최소 구간을 구분하기 위해 내부적으로 9로 처리합니다.
            이는 작은 키워드를 화면에서 완전히 0처럼 보이게 하지 않기 위한 표시 목적의 보정입니다.
          </p>
        </section>

        <section>
          <h2>3. 경쟁도와 등급 S~D</h2>
          <p>
            네이버 검색광고 API의 경쟁도 값은 <code>LOW</code>, <code>MID</code>, <code>HIGH</code>를 각각 낮음, 중간, 높음으로 바꿔 표시합니다.
            키워드 등급은 단순 검색량 순위가 아니라 검색량, 모바일 비중, 경쟁 부담을 함께 반영한 참고 점수입니다.
          </p>
          <div className="legal-table" role="table" aria-label="점수 계산 공식">
            {scoreRows.map(([name, formula, note]) => (
              <div role="row" key={name}>
                <strong role="cell">{name}</strong>
                <code role="cell">{formula}</code>
                <span role="cell">{note}</span>
              </div>
            ))}
          </div>
          <p>경쟁도 점수는 낮음 24점, 중간 52점, 높음 82점으로 환산합니다. 최종 점수에 따른 등급 기준은 다음과 같습니다.</p>
          <div className="legal-grade-grid">
            {gradeCriteria.map((item) => (
              <div key={item.grade}>
                <strong>{item.grade}</strong>
                <span>{item.label}</span>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>4. 광고 깊이와 광고 효율</h2>
          <p>
            광고 깊이는 네이버 검색광고 API의 <code>plAvgDepth</code> 값을 표시한 지표입니다.
            특정 키워드에서 광고가 어느 정도 깊이까지 노출되는지 보는 참고값이며, 실제 클릭 단가나 입찰가를 의미하지 않습니다.
            값이 클수록 광고 노출 지면이 더 깊게 형성되어 있을 가능성이 있어 경쟁 검토가 필요합니다.
          </p>
          <p>
            검색 광고 효율 카드는 현재 경쟁도가 낮음이면 좋음, 중간이면 보통, 높음이면 주의로 표시합니다.
            이 값은 광고 집행 성과를 보장하는 예측치가 아니라 키워드 선별을 빠르게 돕는 신호입니다.
          </p>
        </section>

        <section>
          <h2>5. 갱신 주기</h2>
          <p>
            개별 키워드 조회 결과는 요청 시점에 네이버 검색광고 API에서 가져오며, 서버와 CDN 캐시 정책에 따라 짧은 시간 같은 결과가 재사용될 수 있습니다.
            랭킹 데이터는 후보 키워드 목록을 하루 1회 새벽 시간대에 수집해 저장하는 구조입니다.
          </p>
          <ul>
            <li>개별 키워드: 사용자가 검색할 때 조회, 키워드별 캐시 분리</li>
            <li>랭킹 데이터: 하루 1회 수집 기준, 날짜별 이력 저장</li>
            <li>추이 그래프: 최근 30일 저장 이력이 7일 이상일 때 표시</li>
          </ul>
        </section>

        <section>
          <h2>6. 데이터 한계</h2>
          <ul>
            <li>검색량은 네이버 검색광고 API가 제공하는 월간 조회 범위에 기반하며 실시간 검색량이 아닙니다.</li>
            <li>경쟁도는 광고 플랫폼의 기준이므로 자연검색 SEO 난이도와 완전히 같지 않습니다.</li>
            <li>API 인증 오류, 호출 제한, 원천 서비스 장애가 발생하면 해당 키워드의 데이터를 표시하지 않을 수 있습니다.</li>
            <li>검색량이 매우 낮은 키워드는 작은 변화에도 비율이 크게 흔들릴 수 있어 상승률 해석에 주의해야 합니다.</li>
            <li>키워드랩의 점수와 등급은 참고용이며 광고 성과, 매출, 검색 순위, 콘텐츠 노출을 보장하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2>7. 오류와 정정 요청</h2>
          <p>
            데이터가 명백히 잘못 표시되거나 설명이 부족한 지표가 있다면 <a href="/contact">문의 페이지</a> 또는
            {" "}<a href="mailto:contact@fastincome.kr">contact@fastincome.kr</a> 로 알려주세요.
            확인 가능한 키워드, 페이지 URL, 조회 시각을 함께 보내주시면 재현과 정정에 도움이 됩니다.
          </p>
        </section>
      </article>
    </main>
  );
}
