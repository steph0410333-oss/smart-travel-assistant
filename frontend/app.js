let map = null;
let placeCatalog = [];
let merchantMarkers = [];
let stationMarkers = [];
let hasActiveResult = false;
let lastAnalysisResult = null;
let lastRecommendationPayload = null;
let currentLanguage = "zh-Hant";
const DEFAULT_MAP_VIEW = { center: [25.0478, 121.517], zoom: 13 };

const translations = {
  "zh-Hant": {
    appTitle: "智慧出行小幫手", help: "說明", searchEntry: "搜尋地點，或告訴 AI 你想去哪裡",
    historicalEstimate: "歷史人流估算", dataGuide: "資料說明", helpTitle: "如何理解人流與舒適度？",
    helpIntro: "畫面提供的是歷史人流估算，適合用來比較不同車站與時段。",
    helpHistory: "資料期間為 2026 年 6 月，依車站、星期與小時整理歷史 OD 進出站資料。",
    helpRealtime: "結果不是即時站內人數，也不是官方容量或安全上限。",
    helpReliability: "目前只有一個月資料，同星期同時段約 4–5 筆樣本，因此仍屬初步估算。",
    helpComfort: "舒適度由歷史人流壓力反向換算，分數越高代表該時段相對舒適。",
    helpUse: "建議把結果當作錯峰與比較時段的參考，不應作為安全或營運判斷。",
    clearResult: "清除結果", defaultKicker: "尚未選擇地點", defaultTitle: "從地圖探索適合前往的時段",
    defaultDescription: "選擇目的地後，我們會依最近捷運站的歷史資料，協助你比較適合前往的時段。",
    normalSearch: "普通搜尋", aiRecommendation: "AI 推薦", startAnalysis: "開始分析",
    touristHelper: "FOR VISITORS", balanceTitle: "餘額智慧推薦",
    balanceDescription: "輸入模擬悠遊卡／悠遊付餘額，找出餘額可負擔的消費選擇。",
    balanceAction: "推薦", balanceDisclaimer: "未連接真實帳戶；餘額、商家與價格皆為 Prototype 模擬資料。",
    placePlaceholder: "輸入目的地，例如台北小巨蛋", balanceEmpty: "此餘額目前沒有可推薦的模擬消費選擇。",
    remaining: "估計消費後餘額", nearestStation: "最近捷運站", update: "更新",
  },
  en: {
    appTitle: "Smart Travel Assistant", help: "Help", searchEntry: "Search a place or tell AI where you want to go",
    historicalEstimate: "Historical crowd estimate", dataGuide: "ABOUT THE DATA", helpTitle: "How should I read crowd and comfort scores?",
    helpIntro: "The screen shows historical crowd estimates for comparing stations and travel times.",
    helpHistory: "The current dataset covers June 2026 and is grouped by station, weekday and hour from historical OD entries and exits.",
    helpRealtime: "Results are not real-time occupancy, official capacity or a safety limit.",
    helpReliability: "Only one month is available, with roughly 4–5 samples for the same weekday and hour, so this remains an early estimate.",
    helpComfort: "Comfort reverses historical crowd pressure: a higher score means the time is relatively more comfortable.",
    helpUse: "Use the result to compare times and avoid peaks, not for safety or operational decisions.",
    clearResult: "Clear result", defaultKicker: "No place selected", defaultTitle: "Explore a comfortable place to visit",
    defaultDescription: "Choose a destination to compare suitable travel times using historical data from its nearest metro station.",
    normalSearch: "Place Search", aiRecommendation: "AI Picks", startAnalysis: "Analyze",
    touristHelper: "FOR VISITORS", balanceTitle: "Balance-friendly picks",
    balanceDescription: "Enter a mock EasyCard/EasyWallet balance to find affordable spending ideas.",
    balanceAction: "Recommend", balanceDisclaimer: "Not connected to a real account. Balances, merchants and prices are prototype data.",
    placePlaceholder: "Enter a destination, e.g. Taipei Arena", balanceEmpty: "No prototype option is affordable with this balance.",
    remaining: "Estimated balance after spending", nearestStation: "Nearest metro", update: "updated",
  },
  ja: {
    appTitle: "スマート移動アシスタント", help: "ヘルプ", searchEntry: "場所を検索、またはAIに希望を伝える",
    historicalEstimate: "過去データによる混雑推定", dataGuide: "データについて", helpTitle: "混雑度と快適度の見方",
    helpIntro: "駅や時間帯を比較するための、過去データに基づく混雑推定です。",
    helpHistory: "2026年6月のOD入出場データを、駅・曜日・時間ごとに集計しています。",
    helpRealtime: "リアルタイム人数、公式収容人数、安全基準ではありません。",
    helpReliability: "現在は1か月分のみで、同じ曜日・時間帯の標本は約4～5件のため、初期推定です。",
    helpComfort: "快適度は過去の混雑圧力を反転した値で、高いほど相対的に快適です。",
    helpUse: "時間帯比較やピーク回避の参考として利用し、安全・運行判断には使用しないでください。",
    clearResult: "結果をクリア", defaultKicker: "場所が選択されていません", defaultTitle: "快適に行ける場所を探す",
    defaultDescription: "目的地を選ぶと、最寄りMRT駅の過去データから行きやすい時間帯を比較できます。",
    normalSearch: "場所検索", aiRecommendation: "AIおすすめ", startAnalysis: "分析する",
    touristHelper: "旅行者向け", balanceTitle: "残高でおすすめ",
    balanceDescription: "模擬EasyCard／EasyWallet残高を入力して、利用可能な候補を探します。",
    balanceAction: "おすすめ", balanceDisclaimer: "実際の口座には接続していません。残高・店舗・価格は試作データです。",
    placePlaceholder: "目的地を入力（例：台北アリーナ）", balanceEmpty: "この残高で利用できる模擬候補はありません。",
    remaining: "利用後の推定残高", nearestStation: "最寄りMRT", update: "更新",
  },
  ko: {
    appTitle: "스마트 여행 도우미", help: "도움말", searchEntry: "장소를 검색하거나 AI에게 원하는 곳을 말해 주세요",
    historicalEstimate: "과거 혼잡도 추정", dataGuide: "데이터 안내", helpTitle: "혼잡도와 쾌적도 읽는 법",
    helpIntro: "역과 시간대를 비교하기 위한 과거 데이터 기반 혼잡도 추정입니다.",
    helpHistory: "2026년 6월 OD 승하차 데이터를 역·요일·시간별로 정리했습니다.",
    helpRealtime: "실시간 인원, 공식 수용량 또는 안전 기준이 아닙니다.",
    helpReliability: "현재 한 달치만 있으며 같은 요일·시간대 표본은 약 4–5건이므로 초기 추정치입니다.",
    helpComfort: "쾌적도는 과거 혼잡 압력을 반대로 환산하며 점수가 높을수록 상대적으로 쾌적합니다.",
    helpUse: "시간대 비교와 혼잡 회피 참고용이며 안전·운영 판단에는 사용하지 마세요.",
    clearResult: "결과 지우기", defaultKicker: "선택한 장소 없음", defaultTitle: "지금 편하게 갈 수 있는 곳 찾기",
    defaultDescription: "목적지를 선택하면 가장 가까운 MRT역의 과거 데이터로 적합한 시간대를 비교할 수 있습니다.",
    normalSearch: "장소 검색", aiRecommendation: "AI 추천", startAnalysis: "분석하기",
    touristHelper: "여행자용", balanceTitle: "잔액 맞춤 추천",
    balanceDescription: "모의 EasyCard/EasyWallet 잔액을 입력해 이용 가능한 소비 선택지를 확인하세요.",
    balanceAction: "추천", balanceDisclaimer: "실제 계정과 연결되지 않았으며 잔액, 가맹점, 가격은 프로토타입 데이터입니다.",
    placePlaceholder: "목적지 입력 (예: 타이베이 아레나)", balanceEmpty: "이 잔액으로 이용 가능한 모의 추천이 없습니다.",
    remaining: "사용 후 예상 잔액", nearestStation: "가장 가까운 MRT", update: "업데이트",
  },
};

Object.assign(translations["zh-Hant"], {
  brand: "悠遊付", legendLow: "較少", legendMedium: "普通", legendHigh: "偏高", legendCritical: "擁擠",
  scoreUnit: "分", comfortScoreLabel: "出行舒適度", suitableQuestion: "查詢時段適合前往嗎？",
  defaultSummary: "完成搜尋後會在這裡顯示具體建議。", nearestCrowd: "最近捷運站人流",
  notAnalyzed: "尚未分析", dataBasis: "資料依據", aiResult: "AI 推薦結果",
  top3Title: "適合你的 Top 3", traceTitle: "查看 Travel Decision Agent 分析流程",
  nearby700: "目的地周邊 700 公尺", merchantsTitle: "悠遊付可用商家",
  merchantDisclaimer: "商家、營業時間及優惠皆為 Prototype 假設資料，不代表實際合作或活動。",
  placeLabel: "地點", timeLabel: "時間", purposeLabel: "目的", purposePlaceholder: "選擇出行目的",
  purposeEat: "吃飯", purposeShop: "逛街", purposeExhibition: "展覽", purposeDate: "約會", purposeEvent: "活動",
  otherConditions: "其他條件", multipleHint: "可複選，協助我們理解你的偏好", collapse: "收合", expand: "展開",
  prefCrowd: "不想太擠", prefMetro: "捷運方便", prefWalk: "少走路", prefIndoor: "室內為主",
  prefNature: "親近自然", prefOffer: "有悠遊付優惠", promptLabel: "描述你想去的地方",
  promptPlaceholder: "例如：今天下午想找一個不太擠、捷運可到、適合散步和喝咖啡的地方",
  interestTitle: "你可能感興趣", interestHint: "點選建議詞，快速組合需求",
  sugAvoidCrowd: "避開人潮", sugNature: "親近自然", sugPopular: "熱門景點", sugExhibition: "適合看展",
  sugDate: "適合約會", sugCoffee: "咖啡散步", sugFamily: "親子同樂", sugMetro: "捷運方便", sugRandom: "隨機推薦",
  historyTitle: "歷史搜尋", edit: "編輯", history25m: "25 分鐘前", historyYesterday: "昨天 18:20", history3d: "3 天前",
  crowdNoData: "無歷史資料", crowdVeryHigh: "非常擁擠", crowdHigh: "人流偏高", crowdMedium: "人流普通", crowdLow: "人流較少",
  decisionComfort: "適合前往", decisionOkay: "可以前往，留意人潮", decisionBusy: "建議錯峰或比較替代地點",
  decisionCrowded: "目前不建議前往", decisionNoData: "此時段沒有足夠歷史資料", viewResult: "請查看分析結果",
  resultKicker: "{place} · 最近捷運站", distanceToStation: "你搜尋的目的地距離最近捷運站約 {distance} 公尺。",
  adviceComfort: "歷史資料顯示此時段相對舒適，可依原計畫前往。",
  adviceOkay: "歷史人流屬中間區間，建議預留候車與步行時間。",
  adviceBusy: "歷史資料顯示此時段較擁擠，建議錯峰或比較鄰近替代站。",
  reasonPressure: "{weekday}{hour}:00 的歷史人流壓力為 {score} 分（{level}）",
  reasonPeriod: "依據 {start} 至 {end} OD 歷史資料估算", historyData: "歷史資料",
  updatedThrough: "至 {date} · {basis}",
  merchantNone: "此地點 700 公尺內目前沒有 Mock 商家資料。", nearbyFound: "附近找到 {count} 間：{categories}。",
  merchantCount: "{category} {count} 間", distanceWalk: "{distance} 公尺／步行約 {minutes} 分鐘",
  walletAvailable: "可使用悠遊付（模擬）", mockOffer: "提供 Prototype 模擬優惠",
  agentGemini: "GEMINI AI · OD 歷史人流", agentFallback: "規則備援 · OD 歷史人流",
  matchScore: "符合度 {score}", recommendationReason: "符合你選擇的條件與時段",
  topSummary: "首選為 {place}，可比較下列三個推薦地點。", traceCompleted: "已完成此步驟。",
  suggestionNearest: "最近捷運站：{station} · 約 {distance} 公尺",
  mapCrowd: "{station} · 歷史人流壓力 {score}", mapNoData: "{station} · 此時段無歷史資料",
  analysisFailed: "地點分析失敗", missingPlace: "尚未輸入地點", promptRequired: "請先描述你想去的地點或活動",
  aiFailed: "AI 推薦分析失敗",
  statusComfort: "舒適", statusOkay: "尚可", statusBusy: "偏擠", statusCrowded: "擁擠", statusNoData: "資料不足",
  categoryConvenience: "便利商店", categoryCoffee: "咖啡", categorySnack: "小吃", categoryCreative: "文創選物",
  categoryDessert: "甜點", categoryLifestyle: "生活百貨", categoryDrink: "飲料", categoryDining: "餐飲",
  historyPlaceTaipei: "台北車站", historyPlaceDaan: "大安森林公園", historyPlaceZhongshan: "中山站咖啡散步",
  mapLabel: "歷史 OD 人流推估地圖", back: "返回", switchLanguage: "切換語言", legendLabel: "人流顏色圖例",
  placeInfo: "地點資訊", sheetHandle: "拖曳或點擊調整資訊面板", travelDecision: "出行決策",
  balanceA11y: "旅客餘額推薦", mockBalance: "模擬餘額", backToMap: "返回地圖", accessibility: "輔助功能",
  searchMode: "搜尋模式", voiceUnavailable: "語音輸入，第一版尚未開放", submitAI: "送出 AI 推薦", close: "關閉",
});

Object.assign(translations.en, {
  brand: "EasyWallet", legendLow: "Low", legendMedium: "Moderate", legendHigh: "High", legendCritical: "Crowded",
  scoreUnit: "pts", comfortScoreLabel: "Travel comfort", suitableQuestion: "Is this a good time to visit?",
  defaultSummary: "Your recommendation will appear here after a search.", nearestCrowd: "Nearest metro crowd",
  notAnalyzed: "Not analyzed", dataBasis: "Data basis", aiResult: "AI recommendations",
  top3Title: "Your Top 3", traceTitle: "View Travel Decision Agent workflow",
  nearby700: "Within 700 m", merchantsTitle: "EasyWallet merchants",
  merchantDisclaimer: "Merchants, hours and offers are prototype assumptions, not confirmed partnerships or promotions.",
  placeLabel: "Place", timeLabel: "Time", purposeLabel: "Purpose", purposePlaceholder: "Choose a travel purpose",
  purposeEat: "Dining", purposeShop: "Shopping", purposeExhibition: "Exhibition", purposeDate: "Date", purposeEvent: "Event",
  otherConditions: "Other preferences", multipleHint: "Choose more than one to personalize your result", collapse: "Collapse", expand: "Expand",
  prefCrowd: "Avoid crowds", prefMetro: "Metro access", prefWalk: "Less walking", prefIndoor: "Mostly indoors",
  prefNature: "Near nature", prefOffer: "EasyWallet offers", promptLabel: "Describe where you want to go",
  promptPlaceholder: "Example: a quiet, metro-accessible place for coffee and a walk this afternoon",
  interestTitle: "You may like", interestHint: "Tap keywords to build your request",
  sugAvoidCrowd: "Avoid crowds", sugNature: "Nature", sugPopular: "Popular sights", sugExhibition: "Exhibitions",
  sugDate: "Good for a date", sugCoffee: "Coffee walk", sugFamily: "Family outing", sugMetro: "Metro access", sugRandom: "Surprise me",
  historyTitle: "Recent searches", edit: "Edit", history25m: "25 min ago", historyYesterday: "Yesterday 18:20", history3d: "3 days ago",
  crowdNoData: "No historical data", crowdVeryHigh: "Very crowded", crowdHigh: "High crowd", crowdMedium: "Moderate crowd", crowdLow: "Low crowd",
  decisionComfort: "Good time to visit", decisionOkay: "Suitable, with some crowds", decisionBusy: "Consider another time or station",
  decisionCrowded: "Not recommended right now", decisionNoData: "Not enough historical data", viewResult: "View the analysis",
  resultKicker: "{place} · nearest metro", distanceToStation: "The nearest metro station is about {distance} m from your destination.",
  adviceComfort: "Historical data suggests this time is relatively comfortable.",
  adviceOkay: "Crowd pressure is moderate. Allow extra time for waiting and walking.",
  adviceBusy: "Historical data suggests a busy period. Consider traveling off-peak or using a nearby station.",
  reasonPressure: "Historical crowd pressure on {weekday} at {hour}:00 is {score} ({level}).",
  reasonPeriod: "Estimated from OD history between {start} and {end}.", historyData: "Historical data",
  updatedThrough: "Through {date} · {basis}",
  merchantNone: "No prototype merchant data within 700 m.", nearbyFound: "{count} nearby merchants: {categories}.",
  merchantCount: "{category}: {count}", distanceWalk: "{distance} m / about {minutes} min walk",
  walletAvailable: "EasyWallet available (mock)", mockOffer: "Prototype promotional offer",
  agentGemini: "GEMINI AI · OD HISTORY", agentFallback: "RULE FALLBACK · OD HISTORY",
  matchScore: "Match {score}", recommendationReason: "Matches your selected preferences and time",
  topSummary: "Top pick: {place}. Compare the three recommendations below.", traceCompleted: "Step completed.",
  suggestionNearest: "Nearest metro: {station} · about {distance} m",
  mapCrowd: "{station} · historical crowd pressure {score}", mapNoData: "{station} · no data for this time",
  analysisFailed: "Place analysis failed", missingPlace: "No destination entered", promptRequired: "Describe a place or activity first",
  aiFailed: "AI recommendation failed",
  statusComfort: "Comfortable", statusOkay: "Fair", statusBusy: "Busy", statusCrowded: "Crowded", statusNoData: "Insufficient data",
  categoryConvenience: "Convenience store", categoryCoffee: "Coffee", categorySnack: "Snacks", categoryCreative: "Design goods",
  categoryDessert: "Dessert", categoryLifestyle: "Lifestyle retail", categoryDrink: "Drinks", categoryDining: "Dining",
  historyPlaceTaipei: "Taipei Main Station", historyPlaceDaan: "Daan Forest Park", historyPlaceZhongshan: "Zhongshan coffee walk",
  mapLabel: "Historical OD crowd estimate map", back: "Back", switchLanguage: "Switch language", legendLabel: "Crowd color legend",
  placeInfo: "Place information", sheetHandle: "Drag or tap to resize the information panel", travelDecision: "Travel decision",
  balanceA11y: "Visitor balance recommendations", mockBalance: "Mock balance", backToMap: "Back to map", accessibility: "Accessibility",
  searchMode: "Search mode", voiceUnavailable: "Voice input is not available in this prototype", submitAI: "Send AI request", close: "Close",
});

Object.assign(translations.ja, {
  brand: "EasyWallet", legendLow: "少ない", legendMedium: "普通", legendHigh: "多い", legendCritical: "混雑",
  scoreUnit: "点", comfortScoreLabel: "移動快適度", suitableQuestion: "この時間帯は行きやすい？",
  defaultSummary: "検索後、ここにおすすめを表示します。", nearestCrowd: "最寄りMRTの混雑",
  notAnalyzed: "未分析", dataBasis: "データ基準", aiResult: "AIおすすめ",
  top3Title: "あなた向け Top 3", traceTitle: "Travel Decision Agent の処理を見る",
  nearby700: "目的地から700m以内", merchantsTitle: "EasyWallet対応店舗",
  merchantDisclaimer: "店舗・営業時間・特典は試作上の仮定で、実際の提携やキャンペーンではありません。",
  placeLabel: "場所", timeLabel: "時間", purposeLabel: "目的", purposePlaceholder: "移動目的を選択",
  purposeEat: "食事", purposeShop: "買い物", purposeExhibition: "展示", purposeDate: "デート", purposeEvent: "イベント",
  otherConditions: "その他の条件", multipleHint: "複数選択して希望を伝えられます", collapse: "閉じる", expand: "開く",
  prefCrowd: "混雑を避ける", prefMetro: "MRTに便利", prefWalk: "歩きを少なく", prefIndoor: "屋内中心",
  prefNature: "自然に近い", prefOffer: "EasyWallet特典", promptLabel: "行きたい場所を説明",
  promptPlaceholder: "例：午後に静かでMRTから近く、散歩とコーヒーを楽しめる場所",
  interestTitle: "おすすめキーワード", interestHint: "タップして希望を組み合わせます",
  sugAvoidCrowd: "混雑回避", sugNature: "自然", sugPopular: "人気スポット", sugExhibition: "展示",
  sugDate: "デート向け", sugCoffee: "カフェ散歩", sugFamily: "家族向け", sugMetro: "MRTに便利", sugRandom: "おまかせ",
  historyTitle: "最近の検索", edit: "編集", history25m: "25分前", historyYesterday: "昨日 18:20", history3d: "3日前",
  crowdNoData: "過去データなし", crowdVeryHigh: "非常に混雑", crowdHigh: "人流多め", crowdMedium: "人流普通", crowdLow: "人流少なめ",
  decisionComfort: "行きやすい時間です", decisionOkay: "移動可能、混雑に注意", decisionBusy: "時間帯や別駅の比較を推奨",
  decisionCrowded: "現在はおすすめしません", decisionNoData: "過去データが不足", viewResult: "分析結果を確認",
  resultKicker: "{place}・最寄りMRT", distanceToStation: "目的地から最寄りMRT駅まで約{distance}mです。",
  adviceComfort: "過去データでは、この時間帯は比較的快適です。",
  adviceOkay: "混雑は中程度です。待ち時間と徒歩時間に余裕を持ってください。",
  adviceBusy: "過去データでは混雑する時間帯です。ピークを避けるか近隣駅も比較してください。",
  reasonPressure: "{weekday} {hour}:00 の過去混雑圧力は {score}（{level}）です。",
  reasonPeriod: "{start}〜{end} のOD履歴から推定しています。", historyData: "過去データ",
  updatedThrough: "{date}まで・{basis}",
  merchantNone: "700m以内に試作店舗データがありません。", nearbyFound: "周辺に{count}店：{categories}。",
  merchantCount: "{category} {count}店", distanceWalk: "{distance}m／徒歩約{minutes}分",
  walletAvailable: "EasyWallet利用可（模擬）", mockOffer: "試作上の模擬特典",
  agentGemini: "GEMINI AI・OD履歴", agentFallback: "ルール予備・OD履歴",
  matchScore: "一致度 {score}", recommendationReason: "選択した条件と時間帯に合っています",
  topSummary: "第一候補は{place}です。下の3件を比較できます。", traceCompleted: "この処理を完了しました。",
  suggestionNearest: "最寄りMRT：{station}・約{distance}m",
  mapCrowd: "{station}・過去混雑圧力 {score}", mapNoData: "{station}・この時間帯のデータなし",
  analysisFailed: "場所の分析に失敗しました", missingPlace: "目的地が入力されていません", promptRequired: "場所や活動を先に入力してください",
  aiFailed: "AIおすすめの分析に失敗しました",
  statusComfort: "快適", statusOkay: "まずまず", statusBusy: "混雑気味", statusCrowded: "混雑", statusNoData: "データ不足",
  categoryConvenience: "コンビニ", categoryCoffee: "カフェ", categorySnack: "軽食", categoryCreative: "デザイン雑貨",
  categoryDessert: "デザート", categoryLifestyle: "生活雑貨", categoryDrink: "ドリンク", categoryDining: "飲食",
  historyPlaceTaipei: "台北駅", historyPlaceDaan: "大安森林公園", historyPlaceZhongshan: "中山駅カフェ散歩",
  mapLabel: "過去ODデータによる混雑推定マップ", back: "戻る", switchLanguage: "言語を切り替える", legendLabel: "混雑色の凡例",
  placeInfo: "場所情報", sheetHandle: "ドラッグまたはタップして情報パネルを調整", travelDecision: "移動判断",
  balanceA11y: "旅行者向け残高おすすめ", mockBalance: "模擬残高", backToMap: "地図に戻る", accessibility: "補助機能",
  searchMode: "検索モード", voiceUnavailable: "音声入力はこの試作版では利用できません", submitAI: "AIおすすめを送信", close: "閉じる",
});

Object.assign(translations.ko, {
  brand: "EasyWallet", legendLow: "적음", legendMedium: "보통", legendHigh: "많음", legendCritical: "혼잡",
  scoreUnit: "점", comfortScoreLabel: "이동 쾌적도", suitableQuestion: "이 시간에 방문하기 좋을까요?",
  defaultSummary: "검색 후 이곳에 추천 결과가 표시됩니다.", nearestCrowd: "가장 가까운 MRT 혼잡도",
  notAnalyzed: "분석 전", dataBasis: "데이터 기준", aiResult: "AI 추천 결과",
  top3Title: "맞춤 Top 3", traceTitle: "Travel Decision Agent 처리 과정 보기",
  nearby700: "목적지 700m 이내", merchantsTitle: "EasyWallet 사용 가능 매장",
  merchantDisclaimer: "매장, 영업시간 및 혜택은 프로토타입 가정이며 실제 제휴나 행사와 다릅니다.",
  placeLabel: "장소", timeLabel: "시간", purposeLabel: "목적", purposePlaceholder: "이동 목적 선택",
  purposeEat: "식사", purposeShop: "쇼핑", purposeExhibition: "전시", purposeDate: "데이트", purposeEvent: "행사",
  otherConditions: "기타 조건", multipleHint: "여러 항목을 선택해 선호를 알려 주세요", collapse: "접기", expand: "펼치기",
  prefCrowd: "혼잡 피하기", prefMetro: "MRT 접근성", prefWalk: "걷기 줄이기", prefIndoor: "실내 중심",
  prefNature: "자연과 가까움", prefOffer: "EasyWallet 혜택", promptLabel: "가고 싶은 곳 설명",
  promptPlaceholder: "예: 오늘 오후 조용하고 MRT로 갈 수 있는 산책과 커피 장소",
  interestTitle: "추천 키워드", interestHint: "키워드를 눌러 요청을 조합하세요",
  sugAvoidCrowd: "혼잡 피하기", sugNature: "자연", sugPopular: "인기 명소", sugExhibition: "전시",
  sugDate: "데이트", sugCoffee: "커피 산책", sugFamily: "가족 나들이", sugMetro: "MRT 접근성", sugRandom: "무작위 추천",
  historyTitle: "최근 검색", edit: "편집", history25m: "25분 전", historyYesterday: "어제 18:20", history3d: "3일 전",
  crowdNoData: "과거 데이터 없음", crowdVeryHigh: "매우 혼잡", crowdHigh: "인파 많음", crowdMedium: "인파 보통", crowdLow: "인파 적음",
  decisionComfort: "방문하기 좋은 시간", decisionOkay: "방문 가능, 혼잡 주의", decisionBusy: "다른 시간이나 역 비교 권장",
  decisionCrowded: "현재는 권장하지 않음", decisionNoData: "과거 데이터 부족", viewResult: "분석 결과 확인",
  resultKicker: "{place} · 가장 가까운 MRT", distanceToStation: "목적지에서 가장 가까운 MRT역까지 약 {distance}m입니다.",
  adviceComfort: "과거 데이터상 이 시간대는 비교적 쾌적합니다.",
  adviceOkay: "혼잡 압력이 보통입니다. 대기와 도보 시간을 여유 있게 잡으세요.",
  adviceBusy: "과거 데이터상 혼잡한 시간입니다. 피크 시간을 피하거나 인근 역도 비교하세요.",
  reasonPressure: "{weekday} {hour}:00의 과거 혼잡 압력은 {score}({level})입니다.",
  reasonPeriod: "{start}~{end} OD 이력으로 추정했습니다.", historyData: "과거 데이터",
  updatedThrough: "{date}까지 · {basis}",
  merchantNone: "700m 이내에 프로토타입 매장 데이터가 없습니다.", nearbyFound: "주변 {count}곳: {categories}.",
  merchantCount: "{category} {count}곳", distanceWalk: "{distance}m / 도보 약 {minutes}분",
  walletAvailable: "EasyWallet 사용 가능(모의)", mockOffer: "프로토타입 모의 혜택",
  agentGemini: "GEMINI AI · OD 이력", agentFallback: "규칙 대체 · OD 이력",
  matchScore: "적합도 {score}", recommendationReason: "선택한 조건과 시간대에 적합합니다",
  topSummary: "첫 번째 추천은 {place}입니다. 아래 세 장소를 비교해 보세요.", traceCompleted: "이 단계를 완료했습니다.",
  suggestionNearest: "가장 가까운 MRT: {station} · 약 {distance}m",
  mapCrowd: "{station} · 과거 혼잡 압력 {score}", mapNoData: "{station} · 이 시간대 데이터 없음",
  analysisFailed: "장소 분석에 실패했습니다", missingPlace: "목적지를 입력하지 않았습니다", promptRequired: "장소나 활동을 먼저 입력해 주세요",
  aiFailed: "AI 추천 분석에 실패했습니다",
  statusComfort: "쾌적", statusOkay: "보통", statusBusy: "혼잡한 편", statusCrowded: "혼잡", statusNoData: "데이터 부족",
  categoryConvenience: "편의점", categoryCoffee: "커피", categorySnack: "간식", categoryCreative: "디자인 소품",
  categoryDessert: "디저트", categoryLifestyle: "생활용품", categoryDrink: "음료", categoryDining: "외식",
  historyPlaceTaipei: "타이베이 메인역", historyPlaceDaan: "다안삼림공원", historyPlaceZhongshan: "중산역 커피 산책",
  mapLabel: "과거 OD 데이터 혼잡 추정 지도", back: "뒤로", switchLanguage: "언어 전환", legendLabel: "혼잡 색상 범례",
  placeInfo: "장소 정보", sheetHandle: "드래그하거나 눌러 정보 패널 크기 조절", travelDecision: "이동 판단",
  balanceA11y: "여행자 잔액 추천", mockBalance: "모의 잔액", backToMap: "지도로 돌아가기", accessibility: "접근성",
  searchMode: "검색 모드", voiceUnavailable: "이 프로토타입에서는 음성 입력을 사용할 수 없습니다", submitAI: "AI 추천 요청 보내기", close: "닫기",
});

function t(key) {
  return translations[currentLanguage]?.[key] || translations["zh-Hant"][key] || key;
}

function tf(key, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    t(key),
  );
}

function localizedStatus(status) {
  return t({
    舒適: "statusComfort",
    尚可: "statusOkay",
    偏擠: "statusBusy",
    擁擠: "statusCrowded",
    資料不足: "statusNoData",
  }[status] || "statusNoData");
}

function localizedCategory(category) {
  return t({
    便利商店: "categoryConvenience",
    咖啡: "categoryCoffee",
    小吃: "categorySnack",
    文創選物: "categoryCreative",
    甜點: "categoryDessert",
    生活百貨: "categoryLifestyle",
    飲料: "categoryDrink",
    餐飲: "categoryDining",
  }[category] || category);
}

function localizedWeekday(number) {
  const names = {
    "zh-Hant": ["", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
    en: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    ja: ["", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"],
    ko: ["", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"],
  };
  return names[currentLanguage]?.[number] || names["zh-Hant"][number] || "";
}

if (typeof L !== "undefined") {
  map = L.map("map", { zoomControl: false }).setView([25.0478, 121.517], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
}

const searchScreen = document.querySelector("#search-screen");
const searchTitle = document.querySelector("#search-title");
const normalPanel = document.querySelector("#normal-panel");
const aiPanel = document.querySelector("#ai-panel");
const bottomSheet = document.querySelector(".bottom-sheet");
const sheetHandle = document.querySelector("#sheet-handle");

function setSheetState(state) {
  bottomSheet.classList.remove("is-collapsed", "is-half", "is-expanded");
  bottomSheet.classList.add(`is-${state}`);
  bottomSheet.dataset.sheetState = state;
  sheetHandle.setAttribute("aria-expanded", String(state !== "collapsed"));
  if (state !== "collapsed") bottomSheet.style.height = "";
  window.setTimeout(() => map?.invalidateSize(), 260);
}

function cycleSheetState() {
  const next = { collapsed: "half", half: "expanded", expanded: "collapsed" }[bottomSheet.dataset.sheetState] || "half";
  setSheetState(next);
}

function setupSheetDrag() {
  let startY = 0;
  let startHeight = 0;
  let moved = false;
  sheetHandle.addEventListener("pointerdown", (event) => {
    startY = event.clientY;
    startHeight = bottomSheet.getBoundingClientRect().height;
    moved = false;
    bottomSheet.classList.add("is-dragging");
    sheetHandle.setPointerCapture(event.pointerId);
  });
  sheetHandle.addEventListener("pointermove", (event) => {
    if (!bottomSheet.classList.contains("is-dragging")) return;
    const delta = startY - event.clientY;
    if (Math.abs(delta) > 4) moved = true;
    const minHeight = 150;
    const maxHeight = window.innerHeight - 150;
    bottomSheet.style.height = `${Math.max(minHeight, Math.min(maxHeight, startHeight + delta))}px`;
  });
  sheetHandle.addEventListener("pointerup", (event) => {
    bottomSheet.classList.remove("is-dragging");
    sheetHandle.releasePointerCapture(event.pointerId);
    const height = bottomSheet.getBoundingClientRect().height;
    bottomSheet.style.height = "";
    if (!moved) return cycleSheetState();
    if (height < window.innerHeight * 0.3) setSheetState("collapsed");
    else if (height > window.innerHeight * 0.62) setSheetState("expanded");
    else setSheetState("half");
  });
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "zh-Hant";
  document.documentElement.lang = currentLanguage;
  document.title = t("appTitle");
  document.querySelector(".top-bar h1").textContent = t("appTitle");
  document.querySelector("#open-search span:last-child").textContent = t("searchEntry");
  document.querySelector("#map-language-button").textContent = { "zh-Hant": "繁中", en: "EN", ja: "日本語", ko: "한국어" }[currentLanguage];
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  document.querySelector('[data-mode="normal"]').textContent = t("normalSearch");
  document.querySelector('[data-mode="ai"]').textContent = t("aiRecommendation");
  document.querySelector("#normal-submit").textContent = t("startAnalysis");
  document.querySelector("#place-input").placeholder = t("placePlaceholder");
  document.querySelector("#ai-prompt").placeholder = t("promptPlaceholder");
  document.querySelectorAll("#language-menu button").forEach((button) => button.classList.toggle("is-active", button.dataset.language === currentLanguage));
  setMode(aiPanel.hidden ? "normal" : "ai");
  refreshMapTooltips();
  if (!hasActiveResult) {
    resetResult(false);
  } else if (lastAnalysisResult) {
    renderAnalysis(lastAnalysisResult);
    if (lastRecommendationPayload) renderRecommendations(lastRecommendationPayload);
  }
}

function toggleLanguageMenu() {
  const menu = document.querySelector("#language-menu");
  menu.hidden = !menu.hidden;
}

function openSearch() {
  searchScreen.classList.add("is-open");
  searchScreen.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSearch() {
  searchScreen.classList.remove("is-open");
  searchScreen.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function openHelp() {
  const dialog = document.querySelector("#help-dialog");
  if (!dialog.open) dialog.showModal();
}

function closeHelp() {
  document.querySelector("#help-dialog").close();
}

function setMode(mode) {
  const isAiMode = mode === "ai";
  searchTitle.textContent = isAiMode ? t("aiRecommendation") : t("normalSearch");
  normalPanel.hidden = isAiMode;
  aiPanel.hidden = !isAiMode;

  document.querySelectorAll(".mode-tab").forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function showPrototypeResult(title, description) {
  document.querySelector("#sheet-kicker").textContent = "PROTOTYPE RESULT";
  document.querySelector("#sheet-title").textContent = title;
  document.querySelector("#sheet-description").textContent = description;
  closeSearch();
}

function crowdColor(index) {
  if (index >= 75) return "#d44d3f";
  if (index >= 55) return "#ee9b35";
  if (index >= 35) return "#e4c34f";
  return "#39a875";
}

function crowdPresentation(index) {
  if (!Number.isFinite(Number(index))) return { label: t("crowdNoData"), level: "level-medium", people: 0 };
  if (index >= 80) return { label: t("crowdVeryHigh"), level: "level-critical", people: 4 };
  if (index >= 60) return { label: t("crowdHigh"), level: "level-high", people: 3 };
  if (index >= 40) return { label: t("crowdMedium"), level: "level-medium", people: 2 };
  return { label: t("crowdLow"), level: "level-low", people: 1 };
}

function comfortPresentation(status) {
  const presentations = {
    舒適: { level: "level-low" },
    尚可: { level: "level-medium" },
    偏擠: { level: "level-high" },
    擁擠: { level: "level-critical" },
    資料不足: { level: "level-medium" },
  };
  return presentations[status] || { level: "level-medium" };
}

function decisionPresentation(status) {
  const decisions = {
    舒適: t("decisionComfort"),
    尚可: t("decisionOkay"),
    偏擠: t("decisionBusy"),
    擁擠: t("decisionCrowded"),
    資料不足: t("decisionNoData"),
  };
  return decisions[status] || t("viewResult");
}

function localizedAdvice(status) {
  if (status === "舒適") return t("adviceComfort");
  if (status === "尚可") return t("adviceOkay");
  if (status === "偏擠" || status === "擁擠") return t("adviceBusy");
  return t("decisionNoData");
}

function localizedReasons(comfort) {
  const estimate = comfort.crowd_estimate;
  if (!estimate?.available) return [t("decisionNoData")];
  return [
    tf("reasonPressure", {
      weekday: localizedWeekday(estimate.weekday_num),
      hour: String(estimate.hour).padStart(2, "0"),
      score: Math.round(estimate.crowd_score),
      level: crowdPresentation(estimate.crowd_score).label,
    }),
    tf("reasonPeriod", {
      start: estimate.data_period_start,
      end: estimate.data_period_end,
    }),
  ];
}

function setMetricLevel(element, level) {
  element.classList.remove("level-low", "level-medium", "level-high", "level-critical");
  element.classList.add(level);
}

function renderAnalysis(result) {
  lastAnalysisResult = result;
  const station = result.nearest_station;
  const comfort = result.comfort;
  const crowd = crowdPresentation(comfort.factors.effective_crowd_index);
  const comfortDisplay = comfortPresentation(comfort.status);
  hasActiveResult = true;
  document.querySelector("#reset-map").hidden = false;
  document.querySelector("#sheet-kicker").textContent = tf("resultKicker", { place: result.resolved_place.place_name });
  document.querySelector("#sheet-title").textContent = station.station_name;
  document.querySelector("#sheet-description").textContent = tf("distanceToStation", { distance: station.distance_m });
  document.querySelector("#decision-label").textContent = decisionPresentation(comfort.status);
  document.querySelector("#decision-summary").textContent = currentLanguage === "zh-Hant"
    ? comfort.advice
    : localizedAdvice(comfort.status);
  const reasons = document.querySelector("#comfort-reasons");
  const userFacingReasons = currentLanguage === "zh-Hant"
    ? comfort.reasons.filter((reason) => !reason.includes("可靠度低"))
    : localizedReasons(comfort);
  reasons.replaceChildren(...userFacingReasons.slice(0, 3).map((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    return item;
  }));
  reasons.hidden = false;
  const crowdCard = document.querySelector("#crowd-status");
  const comfortCard = document.querySelector("#comfort-status");
  setMetricLevel(crowdCard, crowd.level);
  setMetricLevel(comfortCard, comfortDisplay.level);
  document.querySelector("#crowd-visual").dataset.level = String(crowd.people);
  document.querySelector("#crowd-label").textContent = crowd.label;
  const hasComfortScore = Number.isFinite(Number(comfort.comfort_score));
  document.querySelector("#comfort-score").textContent = hasComfortScore ? comfort.comfort_score : "--";
  document.querySelector("#comfort-gauge").style.setProperty(
    "--score-angle",
    hasComfortScore ? `${comfort.comfort_score * 3.6}deg` : "0deg",
  );
  comfortCard.setAttribute(
    "aria-label",
    hasComfortScore
      ? `${t("comfortScoreLabel")} ${comfort.comfort_score} ${t("scoreUnit")} · ${localizedStatus(comfort.status)}`
      : localizedStatus(comfort.status),
  );
  crowdCard.setAttribute("aria-label", `${t("nearestCrowd")} · ${crowd.label}`);
  const estimate = comfort.crowd_estimate;
  document.querySelector("#updated-time").textContent = estimate
    ? tf("updatedThrough", {
      date: estimate.data_period_end.replaceAll("-", "/"),
      basis: t("historicalEstimate"),
    })
    : t("historyData");
  document.querySelector("#recommendation-section").hidden = true;
  renderMerchants(result.nearby_merchants || [], result.merchant_summary);
  if (map) map.setView([station.latitude, station.longitude], 15);
  setSheetState("half");
  closeSearch();
}

function resetResult(clearInputs = true) {
  hasActiveResult = false;
  lastAnalysisResult = null;
  lastRecommendationPayload = null;
  document.querySelector("#reset-map").hidden = true;
  document.querySelector("#sheet-kicker").textContent = t("defaultKicker");
  document.querySelector("#sheet-title").textContent = t("defaultTitle");
  document.querySelector("#sheet-description").textContent = t("defaultDescription");
  document.querySelector("#decision-label").textContent = t("defaultKicker");
  document.querySelector("#decision-summary").textContent = t("defaultDescription");
  document.querySelector("#comfort-score").textContent = "--";
  document.querySelector("#comfort-gauge").style.setProperty("--score-angle", "0deg");
  document.querySelector("#crowd-visual").dataset.level = "0";
  document.querySelector("#crowd-label").textContent = "--";
  document.querySelector("#updated-time").textContent = "--";
  document.querySelector("#comfort-reasons").hidden = true;
  document.querySelector("#merchant-section").hidden = true;
  document.querySelector("#recommendation-section").hidden = true;
  if (clearInputs) {
    document.querySelector("#place-input").value = "";
    document.querySelector("#ai-prompt").value = "";
    document.querySelectorAll(".choice-chip.is-selected, .suggestion-chip.is-selected").forEach((item) => item.classList.remove("is-selected"));
  }
  map?.setView(DEFAULT_MAP_VIEW.center, DEFAULT_MAP_VIEW.zoom);
  setSheetState("collapsed");
}

async function recommendBalance() {
  const balance = Number(document.querySelector("#balance-input").value);
  if (!Number.isFinite(balance) || balance < 0) return;
  const response = await fetch("/api/balance-recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ balance, limit: 3 }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Balance recommendation failed");
  const results = document.querySelector("#balance-results");
  results.replaceChildren();
  if (!payload.recommendations.length) {
    const empty = document.createElement("p");
    empty.className = "balance-result";
    empty.textContent = t("balanceEmpty");
    results.append(empty);
  } else {
    payload.recommendations.forEach((item) => {
      const card = document.createElement("div");
      card.className = "balance-result";
      card.innerHTML = `<strong>${item.merchant_name}</strong><span>${localizedCategory(item.category)} · ${item.price_range}</span><span>${t("remaining")}: NT$${item.estimated_remaining}</span>`;
      results.append(card);
    });
  }
  results.hidden = false;
  setSheetState("expanded");
}

function merchantSummaryText(merchants, summary) {
  if (!merchants.length) return t("merchantNone");
  const counts = summary?.category_counts || merchants.reduce((result, merchant) => {
    result[merchant.category] = (result[merchant.category] || 0) + 1;
    return result;
  }, {});
  const categoryText = Object.entries(counts)
    .map(([category, count]) => tf("merchantCount", { category: localizedCategory(category), count }))
    .join(currentLanguage === "en" ? ", " : "、");
  return tf("nearbyFound", { count: merchants.length, categories: categoryText });
}

function renderMerchants(merchants, summary = null) {
  const section = document.querySelector("#merchant-section");
  const list = document.querySelector("#merchant-list");
  document.querySelector("#merchant-summary").textContent = merchantSummaryText(merchants, summary);
  list.replaceChildren();

  merchants.forEach((merchant) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "merchant-card";
    const distanceText = Number.isFinite(merchant.distance_m)
      ? ` · ${tf("distanceWalk", { distance: merchant.distance_m, minutes: merchant.walking_minutes })}`
      : "";
    const offer = merchant.discount_available
      ? (currentLanguage === "zh-Hant" ? merchant.discount_text : t("mockOffer"))
      : t("walletAvailable");
    card.innerHTML = `
      <span class="merchant-logo" aria-hidden="true">悠</span>
      <span>
        <h4>${merchant.merchant_name}</h4>
        <p class="merchant-meta">${localizedCategory(merchant.category)}${distanceText}</p>
        <p class="merchant-meta">${merchant.price_range} · ${merchant.business_hours}</p>
        <p class="merchant-offer">${offer}</p>
      </span>
    `;
    card.addEventListener("click", () => {
      if (map) map.setView([merchant.latitude, merchant.longitude], 17);
      const marker = merchantMarkers.find((item) => item.merchantId === merchant.merchant_id);
      marker?.marker.openTooltip();
    });
    list.append(card);
  });
  section.hidden = false;
}

function renderRecommendations(payload, activeIndex = 0) {
  lastRecommendationPayload = payload;
  const section = document.querySelector("#recommendation-section");
  const list = document.querySelector("#recommendation-list");
  const modeBadge = document.querySelector("#agent-mode-badge");
  modeBadge.textContent = payload.llm_enabled ? t("agentGemini") : t("agentFallback");
  modeBadge.title = currentLanguage === "zh-Hant" ? (payload.limitations || "") : t("helpUse");
  document.querySelector("#agent-summary").textContent = currentLanguage === "zh-Hant"
    ? (payload.personalized_summary || "")
    : tf("topSummary", { place: payload.recommendations[0]?.resolved_place.place_name || "" });
  const traceList = document.querySelector("#agent-trace-list");
  traceList.replaceChildren(...(payload.workflow_trace || []).map((step) => {
    const item = document.createElement("li");
    const tool = document.createElement("strong");
    tool.textContent = `${step.tool}：`;
    item.append(
      tool,
      document.createTextNode(currentLanguage === "zh-Hant" ? step.summary : t("traceCompleted")),
    );
    return item;
  }));
  list.replaceChildren();

  payload.recommendations.forEach((item, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `recommendation-card${index === activeIndex ? " is-active" : ""}`;
    card.innerHTML = `
      <span class="rank">TOP ${index + 1} · ${tf("matchScore", { score: item.recommendation_score })}</span>
      <h4>${item.resolved_place.place_name}</h4>
      <p class="station-line">${item.nearest_station.station_name} · ${localizedStatus(item.comfort.status)}</p>
      <p class="reason-line">${currentLanguage === "zh-Hant" ? item.recommendation_reasons.slice(0, 2).join("；") : t("recommendationReason")}</p>
    `;
    card.addEventListener("click", () => {
      renderAnalysis(item);
      renderRecommendations(payload, index);
    });
    list.append(card);
  });
  section.hidden = false;
}

async function analyzePlace(placeName) {
  const response = await fetch("/api/analyze-place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      place: placeName,
      time: document.querySelector('input[type="time"]').value,
      preferences: [...document.querySelectorAll(".choice-chip.is-selected")].map((item) => item.dataset.value),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(currentLanguage === "zh-Hant" ? (result.detail || t("analysisFailed")) : t("analysisFailed"));
  lastRecommendationPayload = null;
  renderAnalysis(result);
}

function renderPlaceSuggestions(query = "") {
  const panel = document.querySelector("#place-suggestions");
  const normalized = query.trim().toLowerCase();
  const matches = placeCatalog
    .filter((place) => !normalized || place.place_name.toLowerCase().includes(normalized) || place.aliases.some((alias) => alias.toLowerCase().includes(normalized)))
    .slice(0, 6);

  panel.replaceChildren();
  matches.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-suggestion";
    button.innerHTML = `<span class="place-suggestion-icon">⌖</span><span><strong>${place.place_name}</strong><small>${tf("suggestionNearest", {
      station: place.nearest_station,
      distance: place.station_distance_m,
    })}</small></span>`;
    button.addEventListener("click", () => {
      document.querySelector("#place-input").value = place.place_name;
      panel.hidden = true;
    });
    panel.append(button);
  });
  panel.hidden = matches.length === 0;
}

async function loadPrototypeData() {
  const [placesResponse, stationsResponse, merchantsResponse] = await Promise.all([
    fetch("/api/places"),
    fetch("/api/stations"),
    fetch("/api/merchants"),
  ]);
  const placesData = await placesResponse.json();
  const stationsData = await stationsResponse.json();
  const merchantsData = await merchantsResponse.json();
  placeCatalog = placesData.places;

  if (!map) return;
  stationsData.stations.forEach((station) => {
    const hasCrowdScore = Number.isFinite(Number(station.crowd_index));
    const color = hasCrowdScore ? crowdColor(station.crowd_index) : "#94a3b8";
    L.circle([station.latitude, station.longitude], {
      radius: hasCrowdScore ? 280 + station.crowd_index * 5 : 280,
      color,
      fillColor: color,
      fillOpacity: 0.22,
      weight: 1,
    }).addTo(map);

    const stationMarker = L.circleMarker([station.latitude, station.longitude], {
      radius: 7,
      color: "#ffffff",
      fillColor: color,
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(map)
      .on("click", () => analyzePlace(station.station_name).catch((error) => window.alert(error.message)));
    stationMarker.bindTooltip(
      hasCrowdScore
        ? tf("mapCrowd", { station: station.station_name, score: Math.round(station.crowd_index) })
        : tf("mapNoData", { station: station.station_name }),
    );
    stationMarkers.push({ station, marker: stationMarker, hasCrowdScore });
  });

  merchantsData.merchants.forEach((merchant) => {
    const icon = L.divIcon({
      className: "",
      html: '<span class="merchant-map-icon">悠</span>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const marker = L.marker([merchant.latitude, merchant.longitude], { icon })
      .addTo(map)
      .bindTooltip(`${merchant.merchant_name} · ${localizedCategory(merchant.category)}`)
      .on("click", () => renderMerchants([merchant]));
    merchantMarkers.push({ merchantId: merchant.merchant_id, merchant, marker });
  });
}

function refreshMapTooltips() {
  stationMarkers.forEach(({ station, marker, hasCrowdScore }) => {
    marker.setTooltipContent(
      hasCrowdScore
        ? tf("mapCrowd", { station: station.station_name, score: Math.round(station.crowd_index) })
        : tf("mapNoData", { station: station.station_name }),
    );
  });
  merchantMarkers.forEach(({ merchant, marker }) => {
    marker.setTooltipContent(`${merchant.merchant_name} · ${localizedCategory(merchant.category)}`);
  });
}

document.querySelector("#open-search").addEventListener("click", openSearch);
document.querySelector("#close-search").addEventListener("click", closeSearch);
document.querySelector("#reset-map").addEventListener("click", () => resetResult(true));
document.querySelector("#balance-submit").addEventListener("click", () => recommendBalance().catch((error) => window.alert(error.message)));
document.querySelectorAll(".help-button").forEach((button) => button.addEventListener("click", openHelp));
document.querySelector("#close-help").addEventListener("click", closeHelp);
document.querySelector("#help-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeHelp();
});
document.querySelector("#map-language-button").addEventListener("click", toggleLanguageMenu);
document.querySelector("#search-language-button").addEventListener("click", toggleLanguageMenu);
document.querySelectorAll("#language-menu button").forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.language);
    document.querySelector("#language-menu").hidden = true;
  });
});

document.querySelectorAll(".mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

document.querySelectorAll(".choice-chip").forEach((chip) => {
  chip.addEventListener("click", () => chip.classList.toggle("is-selected"));
});

document.querySelector("#place-input").addEventListener("focus", (event) => renderPlaceSuggestions(event.target.value));
document.querySelector("#place-input").addEventListener("input", (event) => renderPlaceSuggestions(event.target.value));

document.querySelectorAll(".suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("is-selected");
    const selected = [...document.querySelectorAll(".suggestion-chip.is-selected")].map((item) => item.textContent);
    document.querySelector("#ai-prompt").value = selected.join(currentLanguage === "en" ? ", " : "、");
  });
});

document.querySelector("#toggle-conditions").addEventListener("click", (event) => {
  const chips = document.querySelector("#condition-chips");
  const shouldHide = !chips.hidden;
  chips.hidden = shouldHide;
  event.currentTarget.textContent = shouldHide ? t("expand") : t("collapse");
});

document.querySelector("#normal-submit").addEventListener("click", async () => {
  const place = document.querySelector("#place-input").value.trim();
  if (!place) {
    window.alert(t("missingPlace"));
    return;
  }
  try {
    await analyzePlace(place);
  } catch (error) {
    window.alert(error.message);
  }
});

document.querySelector("#ai-submit").addEventListener("click", async () => {
  const prompt = document.querySelector("#ai-prompt").value.trim();
  if (!prompt) {
    window.alert(t("promptRequired"));
    return;
  }

  try {
    const response = await fetch("/api/agent/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(currentLanguage === "zh-Hant" ? (payload.detail || t("aiFailed")) : t("aiFailed"));
    renderAnalysis(payload.recommendations[0]);
    renderRecommendations(payload);
  } catch (error) {
    window.alert(error.message);
  }
});

setupSheetDrag();
applyLanguage("zh-Hant");
loadPrototypeData().catch((error) => console.error("無法載入 Prototype 資料", error));
