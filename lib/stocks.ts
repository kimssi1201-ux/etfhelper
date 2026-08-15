export type StockKind = "stock" | "etf" | "security";
export type PayoutFrequency = "weekly" | "monthly" | "quarterly" | "variable";

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

const featuredStocks = [
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

type StockSeed = readonly [
  symbol: string,
  nameKo: string,
  nameEn: string,
  kind: StockKind,
  payoutFrequency: PayoutFrequency,
];

const additionalStockSeeds = [
  // Broad-market and dividend-growth ETFs
  ["SPY", "SPY", "SPDR S&P 500 ETF Trust", "etf", "quarterly"],
  ["VOO", "VOO", "Vanguard S&P 500 ETF", "etf", "quarterly"],
  ["IVV", "IVV", "iShares Core S&P 500 ETF", "etf", "quarterly"],
  ["VTI", "VTI", "Vanguard Total Stock Market ETF", "etf", "quarterly"],
  ["VT", "VT", "Vanguard Total World Stock ETF", "etf", "quarterly"],
  ["QQQ", "QQQ", "Invesco QQQ Trust", "etf", "quarterly"],
  ["QQQM", "QQQM", "Invesco NASDAQ 100 ETF", "etf", "quarterly"],
  ["DIA", "DIA", "SPDR Dow Jones Industrial Average ETF Trust", "etf", "monthly"],
  ["IWM", "IWM", "iShares Russell 2000 ETF", "etf", "quarterly"],
  ["SPLG", "SPLG", "SPDR Portfolio S&P 500 ETF", "etf", "quarterly"],
  ["SCHB", "SCHB", "Schwab U.S. Broad Market ETF", "etf", "quarterly"],
  ["VIG", "VIG", "Vanguard Dividend Appreciation ETF", "etf", "quarterly"],
  ["VYM", "VYM", "Vanguard High Dividend Yield ETF", "etf", "quarterly"],
  ["DGRO", "DGRO", "iShares Core Dividend Growth ETF", "etf", "quarterly"],
  ["HDV", "HDV", "iShares Core High Dividend ETF", "etf", "quarterly"],
  ["SDY", "SDY", "SPDR S&P Dividend ETF", "etf", "quarterly"],
  ["NOBL", "NOBL", "ProShares S&P 500 Dividend Aristocrats ETF", "etf", "quarterly"],
  ["DVY", "DVY", "iShares Select Dividend ETF", "etf", "quarterly"],
  ["SPYD", "SPYD", "SPDR Portfolio S&P 500 High Dividend ETF", "etf", "quarterly"],
  ["SPHD", "SPHD", "Invesco S&P 500 High Dividend Low Volatility ETF", "etf", "monthly"],
  ["FDVV", "FDVV", "Fidelity High Dividend ETF", "etf", "quarterly"],
  ["RDVY", "RDVY", "First Trust Rising Dividend Achievers ETF", "etf", "quarterly"],
  ["FDL", "FDL", "First Trust Morningstar Dividend Leaders Index Fund", "etf", "quarterly"],
  ["FVD", "FVD", "First Trust Value Line Dividend Index Fund", "etf", "quarterly"],
  ["DGRW", "DGRW", "WisdomTree U.S. Quality Dividend Growth Fund", "etf", "monthly"],
  ["PEY", "PEY", "Invesco High Yield Equity Dividend Achievers ETF", "etf", "monthly"],
  ["DON", "DON", "WisdomTree U.S. MidCap Dividend Fund", "etf", "monthly"],
  ["DHS", "DHS", "WisdomTree U.S. High Dividend Fund", "etf", "monthly"],
  ["DLN", "DLN", "WisdomTree U.S. LargeCap Dividend Fund", "etf", "monthly"],
  ["DES", "DES", "WisdomTree U.S. SmallCap Dividend Fund", "etf", "monthly"],
  ["DTD", "DTD", "WisdomTree U.S. Total Dividend Fund", "etf", "monthly"],
  ["VIGI", "VIGI", "Vanguard International Dividend Appreciation ETF", "etf", "quarterly"],
  ["VYMI", "VYMI", "Vanguard International High Dividend Yield ETF", "etf", "quarterly"],
  ["SCHY", "SCHY", "Schwab International Dividend Equity ETF", "etf", "variable"],
  ["WDIV", "WDIV", "SPDR S&P Global Dividend ETF", "etf", "quarterly"],
  ["LVHI", "LVHI", "Franklin International Low Volatility High Dividend Index ETF", "etf", "quarterly"],

  // Covered-call, option-income, and high-distribution ETFs
  ["QYLD", "QYLD", "Global X Nasdaq 100 Covered Call ETF", "etf", "monthly"],
  ["XYLD", "XYLD", "Global X S&P 500 Covered Call ETF", "etf", "monthly"],
  ["RYLD", "RYLD", "Global X Russell 2000 Covered Call ETF", "etf", "monthly"],
  ["XYLG", "XYLG", "Global X S&P 500 Covered Call & Growth ETF", "etf", "monthly"],
  ["QYLG", "QYLG", "Global X Nasdaq 100 Covered Call & Growth ETF", "etf", "monthly"],
  ["DIVO", "DIVO", "Amplify CWP Enhanced Dividend Income ETF", "etf", "monthly"],
  ["IDVO", "IDVO", "Amplify International Enhanced Dividend Income ETF", "etf", "monthly"],
  ["SPYI", "SPYI", "NEOS S&P 500 High Income ETF", "etf", "monthly"],
  ["IWMI", "IWMI", "NEOS Russell 2000 High Income ETF", "etf", "monthly"],
  ["ISPY", "ISPY", "ProShares S&P 500 High Income ETF", "etf", "monthly"],
  ["GPIX", "GPIX", "Goldman Sachs S&P 500 Premium Income ETF", "etf", "monthly"],
  ["GPIQ", "GPIQ", "Goldman Sachs Nasdaq-100 Premium Income ETF", "etf", "monthly"],
  ["FEPI", "FEPI", "REX FANG & Innovation Equity Premium Income ETF", "etf", "weekly"],
  ["AIPI", "AIPI", "REX AI Equity Premium Income ETF", "etf", "weekly"],
  ["CEPI", "CEPI", "REX Crypto Equity Premium Income ETF", "etf", "weekly"],
  ["NUSI", "NUSI", "NEOS Nasdaq-100 Hedged Equity Income ETF", "etf", "monthly"],
  ["KNG", "KNG", "FT Vest S&P 500 Dividend Aristocrats Target Income ETF", "etf", "monthly"],
  ["KLIP", "KLIP", "KraneShares China Internet and Covered Call Strategy ETF", "etf", "monthly"],
  ["DJIA", "DJIA", "Global X Dow 30 Covered Call ETF", "etf", "monthly"],
  ["PUTW", "PUTW", "WisdomTree PutWrite Strategy Fund", "etf", "monthly"],
  ["TLTW", "TLTW", "iShares 20+ Year Treasury Bond BuyWrite Strategy ETF", "etf", "monthly"],
  ["HYGW", "HYGW", "iShares High Yield Corporate Bond BuyWrite Strategy ETF", "etf", "monthly"],
  ["LQDW", "LQDW", "iShares Investment Grade Corporate Bond BuyWrite Strategy ETF", "etf", "monthly"],
  ["YMAX", "YMAX", "YieldMax Universe Fund of Option Income ETFs", "etf", "weekly"],
  ["ULTY", "ULTY", "YieldMax Ultra Option Income Strategy ETF", "etf", "weekly"],
  ["LFGY", "LFGY", "YieldMax Crypto Industry & Tech Portfolio Option Income ETF", "etf", "weekly"],
  ["PLTY", "PLTY", "YieldMax PLTR Option Income Strategy ETF", "etf", "weekly"],
  ["CHPY", "CHPY", "YieldMax Semiconductor Portfolio Option Income ETF", "etf", "weekly"],
  ["YMAG", "YMAG", "YieldMax Magnificent 7 Fund of Option Income ETFs", "etf", "weekly"],
  ["XDTE", "XDTE", "Roundhill S&P 500 0DTE Covered Call Strategy ETF", "etf", "weekly"],
  ["QDTE", "QDTE", "Roundhill Innovation-100 0DTE Covered Call Strategy ETF", "etf", "weekly"],
  ["PLTW", "PLTW", "Roundhill PLTR WeeklyPay ETF", "etf", "weekly"],
  ["RDTE", "RDTE", "Roundhill Russell 2000 0DTE Covered Call Strategy ETF", "etf", "weekly"],
  ["TSLY", "TSLY", "YieldMax TSLA Option Income Strategy ETF", "etf", "weekly"],
  ["NVDY", "NVDY", "YieldMax NVDA Option Income Strategy ETF", "etf", "weekly"],
  ["CONY", "CONY", "YieldMax COIN Option Income Strategy ETF", "etf", "weekly"],
  ["MSTY", "MSTY", "YieldMax MSTR Option Income Strategy ETF", "etf", "weekly"],
  ["AMZY", "AMZY", "YieldMax AMZN Option Income Strategy ETF", "etf", "weekly"],
  ["APLY", "APLY", "YieldMax AAPL Option Income Strategy ETF", "etf", "weekly"],
  ["GOOY", "GOOY", "YieldMax GOOGL Option Income Strategy ETF", "etf", "weekly"],
  ["FBY", "FBY", "YieldMax META Option Income Strategy ETF", "etf", "weekly"],
  ["NFLY", "NFLY", "YieldMax NFLX Option Income Strategy ETF", "etf", "weekly"],
  ["AMDY", "AMDY", "YieldMax AMD Option Income Strategy ETF", "etf", "weekly"],
  ["XOMO", "XOMO", "YieldMax XOM Option Income Strategy ETF", "etf", "weekly"],
  ["JPMO", "JPMO", "YieldMax JPM Option Income Strategy ETF", "etf", "weekly"],
  ["MSFO", "MSFO", "YieldMax MSFT Option Income Strategy ETF", "etf", "weekly"],
  ["DISO", "DISO", "YieldMax DIS Option Income Strategy ETF", "etf", "weekly"],
  ["PYPY", "PYPY", "YieldMax PYPL Option Income Strategy ETF", "etf", "weekly"],

  // High-dividend, real-estate, preferred-stock, and income ETFs
  ["DIV", "DIV", "Global X SuperDividend U.S. ETF", "etf", "monthly"],
  ["SDIV", "SDIV", "Global X SuperDividend ETF", "etf", "monthly"],
  ["SDEM", "SDEM", "Global X MSCI SuperDividend Emerging Markets ETF", "etf", "monthly"],
  ["SRET", "SRET", "Global X SuperDividend REIT ETF", "etf", "monthly"],
  ["IYRI", "IYRI", "NEOS Real Estate High Income ETF", "etf", "monthly"],
  ["PFF", "PFF", "iShares Preferred and Income Securities ETF", "etf", "monthly"],
  ["PFFD", "PFFD", "Global X U.S. Preferred ETF", "etf", "monthly"],
  ["PGX", "PGX", "Invesco Preferred ETF", "etf", "monthly"],
  ["SPFF", "SPFF", "Global X SuperIncome Preferred ETF", "etf", "monthly"],
  ["KBWD", "KBWD", "Invesco KBW High Dividend Yield Financial ETF", "etf", "monthly"],
  ["KBWY", "KBWY", "Invesco KBW Premium Yield Equity REIT ETF", "etf", "monthly"],
  ["BIZD", "BIZD", "VanEck BDC Income ETF", "etf", "quarterly"],
  ["AMLP", "AMLP", "Alerian MLP ETF", "etf", "quarterly"],
  ["MLPA", "MLPA", "Global X MLP ETF", "etf", "quarterly"],
  ["VNQ", "VNQ", "Vanguard Real Estate ETF", "etf", "quarterly"],
  ["SCHH", "SCHH", "Schwab U.S. REIT ETF", "etf", "quarterly"],
  ["XLRE", "XLRE", "Real Estate Select Sector SPDR Fund", "etf", "quarterly"],
  ["USRT", "USRT", "iShares Core U.S. REIT ETF", "etf", "quarterly"],
  ["IYR", "IYR", "iShares U.S. Real Estate ETF", "etf", "quarterly"],
  ["RWR", "RWR", "SPDR Dow Jones REIT ETF", "etf", "quarterly"],
  ["REZ", "REZ", "iShares Residential and Multisector Real Estate ETF", "etf", "quarterly"],
  ["VNQI", "VNQI", "Vanguard Global ex-U.S. Real Estate ETF", "etf", "quarterly"],

  // Bond and cash-management ETFs
  ["BND", "BND", "Vanguard Total Bond Market ETF", "etf", "monthly"],
  ["AGG", "AGG", "iShares Core U.S. Aggregate Bond ETF", "etf", "monthly"],
  ["TLT", "TLT", "iShares 20+ Year Treasury Bond ETF", "etf", "monthly"],
  ["VGIT", "VGIT", "Vanguard Intermediate-Term Treasury ETF", "etf", "monthly"],
  ["IEF", "IEF", "iShares 7-10 Year Treasury Bond ETF", "etf", "monthly"],
  ["SHY", "SHY", "iShares 1-3 Year Treasury Bond ETF", "etf", "monthly"],
  ["SGOV", "SGOV", "iShares 0-3 Month Treasury Bond ETF", "etf", "monthly"],
  ["BIL", "BIL", "SPDR Bloomberg 1-3 Month T-Bill ETF", "etf", "monthly"],
  ["HYG", "HYG", "iShares iBoxx High Yield Corporate Bond ETF", "etf", "monthly"],
  ["JNK", "JNK", "SPDR Bloomberg High Yield Bond ETF", "etf", "monthly"],
  ["LQD", "LQD", "iShares iBoxx Investment Grade Corporate Bond ETF", "etf", "monthly"],
  ["VCIT", "VCIT", "Vanguard Intermediate-Term Corporate Bond ETF", "etf", "monthly"],
  ["VCSH", "VCSH", "Vanguard Short-Term Corporate Bond ETF", "etf", "monthly"],
  ["MUB", "MUB", "iShares National Muni Bond ETF", "etf", "monthly"],
  ["EMB", "EMB", "iShares J.P. Morgan USD Emerging Markets Bond ETF", "etf", "monthly"],
  ["ANGL", "ANGL", "VanEck Fallen Angel High Yield Bond ETF", "etf", "monthly"],
  ["FALN", "FALN", "iShares Fallen Angels USD Bond ETF", "etf", "monthly"],
  ["BITO", "BITO", "ProShares Bitcoin Strategy ETF", "etf", "monthly"],

  // Sector and international ETFs
  ["XLE", "XLE", "Energy Select Sector SPDR Fund", "etf", "quarterly"],
  ["FENY", "FENY", "Fidelity MSCI Energy Index ETF", "etf", "quarterly"],
  ["VDE", "VDE", "Vanguard Energy ETF", "etf", "quarterly"],
  ["XLF", "XLF", "Financial Select Sector SPDR Fund", "etf", "quarterly"],
  ["XLV", "XLV", "Health Care Select Sector SPDR Fund", "etf", "quarterly"],
  ["XLU", "XLU", "Utilities Select Sector SPDR Fund", "etf", "quarterly"],
  ["XLP", "XLP", "Consumer Staples Select Sector SPDR Fund", "etf", "quarterly"],
  ["XLI", "XLI", "Industrial Select Sector SPDR Fund", "etf", "quarterly"],
  ["XLK", "XLK", "Technology Select Sector SPDR Fund", "etf", "quarterly"],
  ["XLY", "XLY", "Consumer Discretionary Select Sector SPDR Fund", "etf", "quarterly"],
  ["XLB", "XLB", "Materials Select Sector SPDR Fund", "etf", "quarterly"],
  ["ITA", "ITA", "iShares U.S. Aerospace & Defense ETF", "etf", "quarterly"],
  ["PPA", "PPA", "Invesco Aerospace & Defense ETF", "etf", "quarterly"],
  ["DFEN", "DFEN", "Direxion Daily Aerospace & Defense Bull 3X Shares", "etf", "variable"],
  ["VEA", "VEA", "Vanguard FTSE Developed Markets ETF", "etf", "quarterly"],
  ["VWO", "VWO", "Vanguard FTSE Emerging Markets ETF", "etf", "quarterly"],
  ["IEFA", "IEFA", "iShares Core MSCI EAFE ETF", "etf", "variable"],
  ["EEM", "EEM", "iShares MSCI Emerging Markets ETF", "etf", "variable"],
  ["EWJ", "EWJ", "iShares MSCI Japan ETF", "etf", "variable"],

  // U.S. dividend stocks, REITs, utilities, and BDCs
  ["CVX", "셰브론", "Chevron Corporation", "stock", "quarterly"],
  ["COP", "코노코필립스", "ConocoPhillips", "stock", "quarterly"],
  ["OXY", "옥시덴털 페트롤리엄", "Occidental Petroleum Corporation", "stock", "quarterly"],
  ["KO", "코카콜라", "The Coca-Cola Company", "stock", "quarterly"],
  ["PEP", "펩시코", "PepsiCo, Inc.", "stock", "quarterly"],
  ["PG", "프록터앤드갬블", "The Procter & Gamble Company", "stock", "quarterly"],
  ["JNJ", "존슨앤드존슨", "Johnson & Johnson", "stock", "quarterly"],
  ["MCD", "맥도날드", "McDonald's Corporation", "stock", "quarterly"],
  ["WMT", "월마트", "Walmart Inc.", "stock", "quarterly"],
  ["COST", "코스트코", "Costco Wholesale Corporation", "stock", "quarterly"],
  ["LOW", "로우스", "Lowe's Companies, Inc.", "stock", "quarterly"],
  ["TGT", "타깃", "Target Corporation", "stock", "quarterly"],
  ["CL", "콜게이트 팜올리브", "Colgate-Palmolive Company", "stock", "quarterly"],
  ["KMB", "킴벌리클라크", "Kimberly-Clark Corporation", "stock", "quarterly"],
  ["SYY", "시스코", "Sysco Corporation", "stock", "quarterly"],
  ["ABBV", "애브비", "AbbVie Inc.", "stock", "quarterly"],
  ["MRK", "머크", "Merck & Co., Inc.", "stock", "quarterly"],
  ["PFE", "화이자", "Pfizer Inc.", "stock", "quarterly"],
  ["BMY", "브리스톨마이어스스큅", "Bristol-Myers Squibb Company", "stock", "quarterly"],
  ["AMGN", "암젠", "Amgen Inc.", "stock", "quarterly"],
  ["GILD", "길리어드 사이언스", "Gilead Sciences, Inc.", "stock", "quarterly"],
  ["MDT", "메드트로닉", "Medtronic plc", "stock", "quarterly"],
  ["ABT", "애보트", "Abbott Laboratories", "stock", "quarterly"],
  ["MO", "알트리아", "Altria Group, Inc.", "stock", "quarterly"],
  ["PM", "필립모리스", "Philip Morris International Inc.", "stock", "quarterly"],
  ["T", "AT&T", "AT&T Inc.", "stock", "quarterly"],
  ["VZ", "버라이즌", "Verizon Communications Inc.", "stock", "quarterly"],
  ["JPM", "JP모건", "JPMorgan Chase & Co.", "stock", "quarterly"],
  ["BAC", "뱅크오브아메리카", "Bank of America Corporation", "stock", "quarterly"],
  ["WFC", "웰스파고", "Wells Fargo & Company", "stock", "quarterly"],
  ["USB", "US 뱅코프", "U.S. Bancorp", "stock", "quarterly"],
  ["BLK", "블랙록", "BlackRock, Inc.", "stock", "quarterly"],
  ["GS", "골드만삭스", "The Goldman Sachs Group, Inc.", "stock", "quarterly"],
  ["MS", "모건스탠리", "Morgan Stanley", "stock", "quarterly"],
  ["IBM", "IBM", "International Business Machines Corporation", "stock", "quarterly"],
  ["CSCO", "시스코 시스템즈", "Cisco Systems, Inc.", "stock", "quarterly"],
  ["QCOM", "퀄컴", "QUALCOMM Incorporated", "stock", "quarterly"],
  ["AVGO", "브로드컴", "Broadcom Inc.", "stock", "quarterly"],
  ["TXN", "텍사스 인스트루먼트", "Texas Instruments Incorporated", "stock", "quarterly"],
  ["AAPL", "애플", "Apple Inc.", "stock", "quarterly"],
  ["NVDA", "엔비디아", "NVIDIA Corporation", "stock", "quarterly"],
  ["MSFT", "마이크로소프트", "Microsoft Corporation", "stock", "quarterly"],
  ["ORCL", "오라클", "Oracle Corporation", "stock", "quarterly"],
  ["CAT", "캐터필러", "Caterpillar Inc.", "stock", "quarterly"],
  ["DE", "디어", "Deere & Company", "stock", "quarterly"],
  ["MMM", "3M", "3M Company", "stock", "quarterly"],
  ["HON", "허니웰", "Honeywell International Inc.", "stock", "quarterly"],
  ["LMT", "록히드마틴", "Lockheed Martin Corporation", "stock", "quarterly"],
  ["RTX", "RTX", "RTX Corporation", "stock", "quarterly"],
  ["GD", "제너럴 다이내믹스", "General Dynamics Corporation", "stock", "quarterly"],
  ["NOC", "노스롭그루먼", "Northrop Grumman Corporation", "stock", "quarterly"],
  ["UPS", "UPS", "United Parcel Service, Inc.", "stock", "quarterly"],
  ["FDX", "페덱스", "FedEx Corporation", "stock", "quarterly"],
  ["NEE", "넥스트에라 에너지", "NextEra Energy, Inc.", "stock", "quarterly"],
  ["DUK", "듀크 에너지", "Duke Energy Corporation", "stock", "quarterly"],
  ["SO", "서던 컴퍼니", "The Southern Company", "stock", "quarterly"],
  ["ED", "콘솔리데이티드 에디슨", "Consolidated Edison, Inc.", "stock", "quarterly"],
  ["AEP", "아메리칸 일렉트릭 파워", "American Electric Power Company, Inc.", "stock", "quarterly"],
  ["XEL", "엑셀 에너지", "Xcel Energy Inc.", "stock", "quarterly"],
  ["WEC", "WEC 에너지", "WEC Energy Group, Inc.", "stock", "quarterly"],
  ["O", "리얼티인컴", "Realty Income Corporation", "stock", "monthly"],
  ["ADC", "어그리 리얼티", "Agree Realty Corporation", "stock", "monthly"],
  ["STAG", "스태그 인더스트리얼", "STAG Industrial, Inc.", "stock", "monthly"],
  ["EPR", "EPR 프로퍼티즈", "EPR Properties", "stock", "monthly"],
  ["AGNC", "AGNC 인베스트먼트", "AGNC Investment Corp.", "stock", "monthly"],
  ["LTC", "LTC 프로퍼티즈", "LTC Properties, Inc.", "stock", "monthly"],
  ["MAIN", "메인 스트리트 캐피털", "Main Street Capital Corporation", "stock", "monthly"],
  ["GAIN", "글래드스톤 인베스트먼트", "Gladstone Investment Corporation", "stock", "monthly"],
  ["VICI", "비시 프로퍼티즈", "VICI Properties Inc.", "stock", "quarterly"],
  ["WPC", "W. P. 캐리", "W. P. Carey Inc.", "stock", "quarterly"],
  ["SPG", "사이먼 프로퍼티", "Simon Property Group, Inc.", "stock", "quarterly"],
  ["PLD", "프로로지스", "Prologis, Inc.", "stock", "quarterly"],
  ["AMT", "아메리칸 타워", "American Tower Corporation", "stock", "quarterly"],
  ["DLR", "디지털 리얼티", "Digital Realty Trust, Inc.", "stock", "quarterly"],
  ["ARCC", "아레스 캐피털", "Ares Capital Corporation", "stock", "quarterly"],
  ["OBDC", "블루 아울 캐피털", "Blue Owl Capital Corporation", "stock", "quarterly"],
  ["BXSL", "블랙스톤 시큐어드 렌딩", "Blackstone Secured Lending Fund", "stock", "quarterly"],
  ["HTGC", "허큘리스 캐피털", "Hercules Capital, Inc.", "stock", "quarterly"],
  ["FSK", "FS KKR 캐피털", "FS KKR Capital Corp.", "stock", "quarterly"],
  ["CSWC", "캐피털 사우스웨스트", "Capital Southwest Corporation", "stock", "quarterly"],
] as const satisfies readonly StockSeed[];

const payoutCopy: Record<PayoutFrequency, string> = {
  weekly: "주 단위",
  monthly: "월 단위",
  quarterly: "분기 단위",
  variable: "공시 일정에 따른",
};

function createStockConfig(seed: StockSeed): StockConfig {
  const [symbol, nameKo, nameEn, kind, payoutFrequency] = seed;
  const kindLabel = kind === "etf" ? "ETF" : kind === "stock" ? "배당주" : "미국 상장 종목";
  const payoutLabel = payoutCopy[payoutFrequency];

  return {
    slug: symbol.toLowerCase(),
    symbol,
    kind,
    payoutFrequency,
    nameKo,
    nameEn,
    headline: `${nameKo}의 예상 배당 현금흐름을 간단히 계산해 보세요.`,
    description: `${nameEn}(${symbol})은 미국 시장에서 거래되는 ${kindLabel}입니다. 이 페이지는 FMP가 제공하는 가격과 실제 배당 이력을 바탕으로 최근 12개월 배당금과 예상 현금흐름을 계산합니다.`,
    features: [
      `${payoutLabel} 분배·배당 이력을 기준으로 계산`,
      "현재가와 기간별 가격 흐름을 한 화면에서 확인",
      "최근 12개월 실제 주당 배당금 합계(TTM)를 우선 사용",
    ],
    cautions: [
      "배당금과 지급 주기는 운용사 또는 기업의 결정에 따라 변경될 수 있습니다.",
      "주가, 환율, 세금, 운용보수는 실제 투자 결과에 영향을 줍니다.",
      "높은 배당수익률만으로 원금 보전이나 미래 총수익을 판단할 수 없습니다.",
    ],
    faqs: [
      {
        question: `${symbol}의 예상 배당금은 어떻게 계산하나요?`,
        answer: "최근 12개월 실제 주당 배당금 합계에 보유 수량을 곱하고, 월평균은 연간 예상액을 12로 나눠 계산합니다.",
      },
      {
        question: `${symbol}의 배당금과 지급 주기는 고정인가요?`,
        answer: "아닙니다. 기업·운용사의 정책과 시장 상황에 따라 지급액과 일정이 달라질 수 있으므로 최신 공시를 함께 확인해야 합니다.",
      },
      {
        question: "표시된 세후 금액이 실제 수령액과 같은가요?",
        answer: "미국 원천징수 15%만 단순 적용한 예상값입니다. 계좌 유형, 상품 구조, 거주자 여부와 추가 과세에 따라 실제 금액은 달라질 수 있습니다.",
      },
    ],
  };
}

const configuredStocks: readonly StockConfig[] = [
  ...featuredStocks,
  ...additionalStockSeeds.map(createStockConfig),
];

const verifiedSymbols = ["XOM", "CVX", "AAPL", "MSFT", "KO"] as const;

export const stocks: readonly StockConfig[] = verifiedSymbols
  .map((symbol) => configuredStocks.find((stock) => stock.symbol === symbol))
  .filter((stock): stock is StockConfig => stock !== undefined);

export const stockSlugs = stocks.map((stock) => stock.slug);

export function getStockBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  return stocks.find((stock) => stock.slug === normalized);
}

export function getStockBySymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return stocks.find((stock) => stock.symbol === normalized);
}
