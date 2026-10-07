// =============================================
// 충수절제술 (Appendectomy) 문제 데이터
// ---------------------------------------------
// ※ 아래 문제는 화면이 제대로 움직이는지 확인하기 위한 "구조 확인용 샘플"입니다.
//   실제 수술 단계나 기구 사용순서가 아닙니다.
//   교육 담당자가 검토한 실제 문제를 입력한 뒤, isSample: true 인 샘플 문제는 지워 주세요.
//
// [Doctor Mode 문제 항목 설명]  보고 → 판단하고 → 말하기
//   id                   : 문제 고유 번호 (다른 문제와 겹치지 않게)
//   isSample             : 샘플 문제이면 true (화면에 "구조 확인용 샘플" 표시)
//   stepName             : 수술 단계 이름
//   situationText        : 수술 진행상황 설명
//   siteImage            : 수술부위 이미지 경로 (없으면 "" → "이미지 준비 중" 표시)
//                          예) "images/appendectomy/step1.jpg"
//   answerInstrumentId   : 정답 기구의 id (data/instruments.js 의 id)
//   extraAcceptedAnswers : 이 문제에서만 추가로 인정할 답변 (기구의 허용 답변은 자동 포함)
//
// [Scrub Mode 문제 항목 설명]  듣고 → 찾아서 → 선택하기
//   id                   : 문제 고유 번호
//   isSample             : 샘플 문제이면 true
//   requestAudio         : 의사 요청 음성파일 경로 (미리 제작·검토한 파일)
//                          예) "audio/appendectomy/request1.mp3"
//                          없으면 "" → "음성 준비 중" 표시 후 requestText 를 글자로 보여줌
//   requestText          : 요청 문구 (음성파일이 없을 때 임시로 화면에 표시)
//   answerInstrumentId   : 정답 기구의 id
//   choiceInstrumentIds  : 화면에 보여줄 선택지 기구 id 목록 (정답 포함)
//                          비워두면([]) 정답 기구의 confusableWith(혼동 기구)로 자동 구성
// =============================================

SURGERY_CONTENT.appendectomy = {
  doctorQuestions: [
    {
      id: "appendectomy-doctor-sample-1",
      isSample: true,
      stepName: "구조 확인용 샘플 1",
      situationText: "실제 수술 단계가 아닙니다. 화면 확인을 위해 '메첸바움'이라고 말해 보세요.",
      siteImage: "",
      answerInstrumentId: "metzenbaum",
      extraAcceptedAnswers: []
    },
    {
      id: "appendectomy-doctor-sample-2",
      isSample: true,
      stepName: "구조 확인용 샘플 2",
      situationText: "실제 수술 단계가 아닙니다. 화면 확인을 위해 '켈리'라고 말해 보세요.",
      siteImage: "",
      answerInstrumentId: "kelly",
      extraAcceptedAnswers: []
    }
  ],

  scrubQuestions: [
    {
      id: "appendectomy-scrub-sample-1",
      isSample: true,
      requestAudio: "",
      requestText: "Metzenbaum scissors",
      answerInstrumentId: "metzenbaum",
      choiceInstrumentIds: ["metzenbaum", "kelly", "babcock", "allis"]
    },
    {
      id: "appendectomy-scrub-sample-2",
      isSample: true,
      requestAudio: "",
      requestText: "Babcock forceps",
      answerInstrumentId: "babcock",
      choiceInstrumentIds: ["metzenbaum", "kelly", "babcock", "allis"]
    }
  ]
};
