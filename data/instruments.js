// =============================================
// 수술기구 데이터
// ---------------------------------------------
// 사전학습, Doctor Mode, Scrub Mode 가 모두 이 목록을 함께 사용합니다.
//
// ※ 현재 들어 있는 4개 기구는 화면 확인용 "예시"입니다.
//   기구명, 허용 답변, 혼동 기구는 반드시 교육 담당자가 검토한 뒤
//   reviewed: true 로 바꾸고 사용하세요.
//
// id              : 영어 소문자 고유 이름 (다른 파일에서 이 기구를 부를 때 사용)
// nameEn          : 정확한 영어 기구명 (화면에 표시)
// nameKo          : 한글 발음 표기 (화면에 표시)
// acceptedAnswers : 정답으로 인정할 말 목록
//                   음성인식은 한국어로 받아쓰기 때문에 한글 표기를 꼭 넣어 주세요.
//                   띄어쓰기·대소문자는 자동으로 무시합니다.
//                   학습자가 "메첸바움 주세요"처럼 말해도, 목록의 말이 들어 있으면 정답입니다.
// image           : 기구 이미지 경로 (없으면 "" → 화면에 "이미지 준비 중" 표시)
//                   예) "images/instruments/metzenbaum.jpg"
// audio           : 정확한 기구명 발음 음성파일 경로 (없으면 "" → "음성 준비 중" 표시)
//                   예) "audio/instruments/metzenbaum.mp3"
// confusableWith  : 형태나 기능이 비슷해서 헷갈리기 쉬운 기구의 id 목록
//                   Scrub Mode 오답 선택지로 우선 사용됩니다. (검토 후 입력)
// reviewed        : 교육 담당자 검토 완료 여부
// =============================================

const INSTRUMENTS = [
  {
    id: "metzenbaum",
    nameEn: "Metzenbaum scissors",
    nameKo: "메첸바움 시저스",
    acceptedAnswers: [
      "Metzenbaum scissors",
      "Metzenbaum",
      "메첸바움",
      "메첸바움 가위",
      "메첸바움 시저",
      "메첸바움 시저스"
    ],
    image: "",
    audio: "",
    confusableWith: [],
    reviewed: false
  },
  {
    id: "kelly",
    nameEn: "Kelly forceps",
    nameKo: "켈리 포셉",
    acceptedAnswers: ["Kelly forceps", "Kelly", "켈리", "켈리 포셉"],
    image: "",
    audio: "",
    confusableWith: [],
    reviewed: false
  },
  {
    id: "babcock",
    nameEn: "Babcock forceps",
    nameKo: "뱁콕 포셉",
    acceptedAnswers: ["Babcock forceps", "Babcock", "뱁콕", "뱁콕 포셉"],
    image: "",
    audio: "",
    confusableWith: [],
    reviewed: false
  },
  {
    id: "allis",
    nameEn: "Allis forceps",
    nameKo: "앨리스 포셉",
    acceptedAnswers: ["Allis forceps", "Allis", "앨리스", "앨리스 포셉"],
    image: "",
    audio: "",
    confusableWith: [],
    reviewed: false
  }
];
