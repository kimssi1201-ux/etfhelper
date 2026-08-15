export type StockKind = "stock" | "etf";
export type PayoutFrequency = "monthly" | "quarterly";

export type StockFaq = {
  question: string;
  answer: string;
};

export type StockConfig = {
  slug: string;
  symbol: string;
  kind: StockKind;
  payoutFrequency: PayoutFrequency;
  nameKo: string;
  nameEn: string;
  headline: string;
  description: string;
  features: readonly string[];
  cautions: readonly string[];
  faqs: readonly StockFaq[];
};

export const stocks = [
  {
    slug: "xom",
    symbol: "XOM",
    kind: "stock",
    payoutFrequency: "quarterly",
    nameKo: "엑슨모빌",
    nameEn: "Exxon Mobil Corporation",
    headline: "글로벌 에너지 기업의 분기 배당을 계산해 보세요.",
    description:
      "엑슨모빌은 원유·천연가스 탐사와 생산, 정제, 화학 사업을 함께 운영하는 글로벌 에너지 기업입니다. 이 페이지는 실제 최근 12개월 배당 이력을 기준으로 예상 현금흐름을 계산합니다.",
    features: [
      "분기 단위로 배당을 지급하는 미국 대형주",
      "탐사·생산부터 정제·화학까지 이어지는 통합 사업 구조",
      "에너지 가격과 현금흐름 변화가 배당 여력에 큰 영향을 주는 종목",
    ],
    cautions: [
      "국제 유가와 천연가스 가격에 따라 실적과 주가 변동성이 커질 수 있습니다.",
      "대규모 설비투자, 환경 규제, 에너지 전환 비용이 현금흐름에 영향을 줄 수 있습니다.",
      "과거 배당 이력은 미래 배당을 보장하지 않으며 분기별 지급액은 달라질 수 있습니다.",
    ],
    faqs: [
      {
        question: "XOM의 배당금은 어떻게 계산하나요?",
        answer:
          "FMP가 제공하는 최근 12개월의 실제 주당 배당금 합계를 보유 수량에 곱합니다. 월평균은 연간 예상액을 12로, 분기 예상액은 4로 나눠 표시합니다.",
      },
      {
        question: "유가가 하락하면 배당금도 바로 줄어드나요?",
        answer:
          "반드시 동시에 움직이는 것은 아니지만 에너지 가격 하락이 장기간 이어지면 수익성과 현금흐름이 약해질 수 있습니다. 배당 결정은 회사 이사회가 하므로 최신 공시를 함께 확인해야 합니다.",
      },
      {
        question: "표시된 세후 금액이 실제 수령액과 같은가요?",
        answer:
          "미국 원천징수 15%만 단순 적용한 예상값입니다. 계좌 유형, 거주자 여부, 추가 과세와 환전 비용에 따라 실제 금액은 달라질 수 있습니다.",
      },
    ],
  },
  {
    slug: "jepi",
    symbol: "JEPI",
    kind: "etf",
    payoutFrequency: "monthly",
    nameKo: "JEPI",
    nameEn: "JPMorgan Equity Premium Income ETF",
    headline: "월 분배형 ETF의 예상 현금흐름을 확인하세요.",
    description:
      "JEPI는 미국 대형주 포트폴리오와 옵션 프리미엄 전략을 결합해 정기적인 인컴을 추구하는 ETF입니다. 실제 최근 12개월 분배금 합계를 사용해 예상 배당금을 계산합니다.",
    features: [
      "월 단위 분배를 지향하는 인컴형 ETF",
      "미국 대형주와 옵션 프리미엄 전략의 결합",
      "주가 상승 참여와 정기 현금흐름의 균형을 추구",
    ],
    cautions: [
      "옵션 전략으로 강한 상승장에서 지수 대비 상승 폭이 제한될 수 있습니다.",
      "월별 분배금은 옵션 프리미엄과 시장 상황에 따라 달라질 수 있습니다.",
      "운용보수, 환율, 세금이 실제 투자 성과에 영향을 줍니다.",
    ],
    faqs: [
      {
        question: "JEPI 분배금은 매달 같은가요?",
        answer: "아닙니다. 포트폴리오 배당과 옵션 프리미엄이 변하므로 월별 분배금도 달라질 수 있습니다.",
      },
      {
        question: "배당수익률은 어떤 값으로 계산하나요?",
        answer: "최근 12개월 실제 주당 분배금 합계를 현재가로 나눈 TTM 수익률을 사용합니다.",
      },
      {
        question: "환율이 오르면 원화 배당금은 늘어나나요?",
        answer: "달러 배당금이 같다면 원화 환산액은 커질 수 있지만, 환율은 매수 원가와 평가금액에도 함께 영향을 줍니다.",
      },
    ],
  },
  {
    slug: "jepq",
    symbol: "JEPQ",
    kind: "etf",
    payoutFrequency: "monthly",
    nameKo: "JEPQ",
    nameEn: "JPMorgan Nasdaq Equity Premium Income ETF",
    headline: "나스닥 중심 월 분배 ETF를 숫자로 살펴보세요.",
    description:
      "JEPQ는 나스닥 대형 성장주 포트폴리오와 옵션 프리미엄 전략을 활용해 월 단위 인컴을 추구하는 ETF입니다.",
    features: [
      "월 단위 분배를 지향하는 나스닥 중심 ETF",
      "성장주 노출과 옵션 프리미엄 전략의 결합",
      "실제 분배 이력을 이용한 TTM 배당 계산",
    ],
    cautions: [
      "기술주 비중과 나스닥 변동성의 영향을 크게 받을 수 있습니다.",
      "옵션 전략은 상승 잠재력 일부를 제한할 수 있습니다.",
      "분배금과 배당수익률은 매월 달라질 수 있습니다.",
    ],
    faqs: [
      {
        question: "JEPQ와 JEPI의 가장 큰 차이는 무엇인가요?",
        answer: "JEPQ는 나스닥 성장주 노출이 더 두드러지고, JEPI는 상대적으로 폭넓은 미국 대형주 포트폴리오를 사용합니다.",
      },
      {
        question: "월 분배금으로 생활비를 예상해도 되나요?",
        answer: "월별 분배금은 변동될 수 있으므로 최근 한 달 금액보다 최근 12개월 합계와 변동 범위를 함께 보는 편이 안전합니다.",
      },
      {
        question: "세후 계산에는 어떤 세율을 적용하나요?",
        answer: "이 계산기는 미국 원천징수 15%만 적용합니다. 개인별 세금은 별도로 확인해야 합니다.",
      },
    ],
  },
  {
    slug: "schd",
    symbol: "SCHD",
    kind: "etf",
    payoutFrequency: "quarterly",
    nameKo: "SCHD",
    nameEn: "Schwab U.S. Dividend Equity ETF",
    headline: "미국 배당성장 ETF의 분기 배당을 계산하세요.",
    description:
      "SCHD는 재무 지표와 배당 특성을 기준으로 선별된 미국 배당주에 투자하는 지수형 ETF입니다. 최근 12개월 실제 분배금으로 예상액을 계산합니다.",
    features: [
      "분기 단위 분배를 지급하는 미국 배당주 ETF",
      "배당의 질과 기업 기초체력을 함께 고려하는 지수 전략",
      "장기 배당 성장과 총수익을 함께 추구",
    ],
    cautions: [
      "지수 구성과 섹터 비중 변화에 따라 성과가 달라질 수 있습니다.",
      "편입 기업의 배당 삭감은 ETF 분배금에도 영향을 줍니다.",
      "원화 투자자는 달러 환율 변동에 노출됩니다.",
    ],
    faqs: [
      {
        question: "SCHD는 언제 분배금을 지급하나요?",
        answer: "일반적으로 분기 단위로 지급하지만 정확한 기준일과 지급일은 운용사 공지를 확인해야 합니다.",
      },
      {
        question: "배당성장 ETF도 분배금이 줄어들 수 있나요?",
        answer: "가능합니다. 편입 기업의 배당 정책, 지수 변경, 시장 상황에 따라 분기별 분배금은 변동될 수 있습니다.",
      },
      {
        question: "목표 배당금 계산은 무엇을 가정하나요?",
        answer: "현재가, 현재 환율, 최근 12개월 주당 분배금, 미국 원천징수 15%가 유지된다고 단순 가정합니다.",
      },
    ],
  },
  {
    slug: "qqqi",
    symbol: "QQQI",
    kind: "etf",
    payoutFrequency: "monthly",
    nameKo: "QQQI",
    nameEn: "NEOS Nasdaq-100 High Income ETF",
    headline: "나스닥 고인컴 ETF의 월 분배 흐름을 확인하세요.",
    description:
      "QQQI는 나스닥-100 주식 노출과 옵션 기반 인컴 전략을 결합해 높은 월 단위 현금흐름을 추구하는 ETF입니다.",
    features: [
      "월 단위 분배를 지향하는 나스닥-100 인컴 ETF",
      "주식 포트폴리오와 옵션 전략을 함께 운용",
      "가격·분배금 이력을 기간별로 비교 가능",
    ],
    cautions: [
      "상장 이력이 짧은 상품은 장기 배당 데이터가 제한될 수 있습니다.",
      "옵션 프리미엄과 시장 변동성에 따라 분배금 편차가 커질 수 있습니다.",
      "높은 분배율만으로 원금 보전이나 총수익을 판단할 수 없습니다.",
    ],
    faqs: [
      {
        question: "QQQI의 배당 이력이 짧게 보일 수 있는 이유는 무엇인가요?",
        answer: "상장 이후 실제 지급된 데이터만 사용하므로 선택한 기간보다 기록이 짧을 수 있습니다.",
      },
      {
        question: "높은 분배금은 높은 수익을 뜻하나요?",
        answer: "분배금은 총수익의 한 부분입니다. 주가 변동, 운용보수, 세금까지 함께 살펴야 합니다.",
      },
      {
        question: "계산 결과가 실제 입금액과 다른 이유는 무엇인가요?",
        answer: "분배금, 환율, 세금, 지급 시점이 바뀔 수 있고 증권사 환전 조건도 다르기 때문입니다.",
      },
    ],
  },
] as const satisfies readonly StockConfig[];

export const stockSlugs = stocks.map((stock) => stock.slug);

export function getStockBySlug(slug: string) {
  return stocks.find((stock) => stock.slug === slug.toLowerCase());
}

export function getStockBySymbol(symbol: string) {
  return stocks.find((stock) => stock.symbol === symbol.toUpperCase());
}
