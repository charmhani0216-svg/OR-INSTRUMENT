// =============================================
// Scrub Mode 화면(html/scrub.html) 기능
// ---------------------------------------------
// 핵심 학습행동: 듣고 → 찾아서 → 선택하기
//
// 문제 1개 순서:
//   의사의 기구 요청 음성 듣기 → 여러 기구 이미지 확인 → 정확한 기구 선택 → 즉시 O/X 피드백
//
// ※ 요청 음성은 미리 제작·검토한 음성파일을 재생합니다. (실시간 AI 음성 생성 없음)
//   음성파일이 아직 없으면 "음성 준비 중"과 함께 요청 문구를 임시로 글자로 보여줍니다.
// =============================================

const quiz = prepareQuiz("scrub");   // js/main.js 의 문제 준비 기능

let session = null;         // 이번 학습 기록
let questionIndex = 0;      // 지금 몇 번째 문제인지 (0부터 시작)
let currentResult = null;   // 지금 문제의 기록
let questionShownAt = 0;    // 반응시간 측정 시작 시각


// ---------- 처음 화면 준비 ----------
function init() {
  if (quiz.surgery) {
    document.getElementById("page-title").textContent = "Scrub Mode · " + quiz.surgery.nameKo;
  }

  if (quiz.error) {
    document.getElementById("error-text").textContent = quiz.error;
    document.getElementById("error-panel").hidden = false;
    return;
  }

  document.getElementById("device-section").hidden = false;
  setupDeviceCheck(document.getElementById("device-check"), { speaker: true, mic: false });

  document.getElementById("intro-text").textContent =
    quiz.surgery.nameKo + " · 문제 " + quiz.questions.length + "개" +
    (quiz.sourceSession ? " (이전 학습결과에서 틀렸던 문제 다시 도전)" : "");
  const hasSample = quiz.questions.some(function (q) { return q.isSample; });
  document.getElementById("intro-sample").hidden = !hasSample;
  document.getElementById("intro-panel").hidden = false;

  document.getElementById("btn-start").addEventListener("click", startQuiz);
  document.getElementById("btn-play-request").addEventListener("click", playRequest);
  document.getElementById("btn-next").addEventListener("click", goNext);
}


// ---------- 시작 ----------
function startQuiz() {
  session = LearningData.createSession("scrub", quiz.surgery.id, {
    isRetry: Boolean(quiz.sourceSession),
    sourceSessionId: quiz.sourceSession ? quiz.sourceSession.sessionId : null
  });
  questionIndex = 0;

  document.getElementById("device-section").hidden = true;
  document.getElementById("intro-panel").hidden = true;
  document.getElementById("quiz-card").hidden = false;

  showQuestion();
}


// ---------- 문제 보여주기 ----------
function showQuestion() {
  const question = quiz.questions[questionIndex];
  currentResult = LearningData.startQuestion(session, question.id, question.answerInstrumentId);

  document.getElementById("progress-text").textContent =
    "문제 " + (questionIndex + 1) + " / " + quiz.questions.length;
  document.getElementById("sample-badge").hidden = !question.isSample;
  document.getElementById("status-text").textContent = "";
  document.getElementById("feedback").hidden = true;
  document.getElementById("btn-next").hidden = true;
  document.getElementById("btn-next").textContent =
    questionIndex === quiz.questions.length - 1 ? "결과 보기" : "다음 문제";

  // 1) 요청 음성: 파일이 있으면 재생, 없으면 "음성 준비 중" + 임시 글자 표시
  const playButton = document.getElementById("btn-play-request");
  const fallback = document.getElementById("request-fallback");
  if (question.requestAudio) {
    playButton.hidden = false;
    fallback.hidden = true;
    playRequest();
  } else {
    playButton.hidden = true;
    fallback.textContent = "🔊 음성 준비 중 · 임시 글자 표시: 「" + question.requestText + "」";
    fallback.hidden = false;
  }

  renderChoices(question);
  questionShownAt = Date.now();
  window.scrollTo(0, 0);
}

function playRequest() {
  const question = quiz.questions[questionIndex];
  if (!question.requestAudio) return;

  const status = document.getElementById("status-text");
  status.textContent = "의사 요청을 재생하고 있습니다...";
  Speech.playAudioFile(question.requestAudio)
    .then(function () { status.textContent = ""; })
    .catch(function (error) { status.textContent = error.message; });
}


// ---------- 2) 선택지 만들기 ----------
// 우선순위: 문제에 적힌 선택지(choiceInstrumentIds)
//        → 정답 기구의 혼동 기구(confusableWith)
//        → 그래도 모자라면 다른 등록 기구로 채우기
function buildChoiceIds(question) {
  const answerId = question.answerInstrumentId;

  if (question.choiceInstrumentIds && question.choiceInstrumentIds.length > 0) {
    const ids = question.choiceInstrumentIds.slice();
    if (!ids.includes(answerId)) ids.push(answerId);
    return shuffle(ids);
  }

  const answer = findInstrument(answerId);
  let ids = [answerId].concat(answer ? answer.confusableWith : []);

  shuffle(INSTRUMENTS).forEach(function (item) {
    if (ids.length < SCRUB_CHOICE_COUNT && !ids.includes(item.id)) ids.push(item.id);
  });

  ids = ids.slice(0, SCRUB_CHOICE_COUNT);   // 정답은 맨 앞이라 잘리지 않음
  return shuffle(ids);
}

function renderChoices(question) {
  const grid = document.getElementById("choice-grid");
  grid.innerHTML = "";

  buildChoiceIds(question).forEach(function (id) {
    const instrument = findInstrument(id);
    if (!instrument) return;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "choice-card";
    card.dataset.instrumentId = id;

    // 이미지가 있으면 이미지만 보여주고(이름은 숨김),
    // 이미지가 없으면 임시로 기구명을 적은 "이미지 준비 중" 상자를 보여줍니다.
    card.innerHTML = instrument.image
      ? imageOrPlaceholder(instrument.image, "선택지 기구 이미지", "")
      : '<span class="image-empty">이미지 준비 중<br>' + escapeHtml(instrument.nameEn) + '</span>';

    card.addEventListener("click", function () {
      selectChoice(question, id);
    });
    grid.appendChild(card);
  });
}


// ---------- 3) 선택 → O/X ----------
function selectChoice(question, selectedId) {
  const isCorrect = selectedId === question.answerInstrumentId;
  const selected = findInstrument(selectedId);
  const answer = findInstrument(question.answerInstrumentId);

  LearningData.addAttempt(session, currentResult, {
    responseText: selected ? selected.nameEn : selectedId,
    inputMethod: "select",
    selectedInstrumentId: selectedId,
    isCorrect: isCorrect,
    responseTime: Date.now() - questionShownAt
  });

  // 선택한 카드와 정답 카드 표시, 더 이상 선택하지 못하게 잠그기
  document.querySelectorAll(".choice-card").forEach(function (card) {
    card.disabled = true;
    if (card.dataset.instrumentId === question.answerInstrumentId) card.classList.add("is-correct");
    else if (card.dataset.instrumentId === selectedId) card.classList.add("is-wrong");
  });

  const answerName = answer ? answer.nameEn : question.answerInstrumentId;
  if (isCorrect) {
    renderFeedback(document.getElementById("feedback"), true, "정답입니다", [
      "요청한 기구: " + escapeHtml(answerName)
    ]);
  } else {
    renderFeedback(document.getElementById("feedback"), false, "정답이 아닙니다", [
      "선택한 기구: " + escapeHtml(selected ? selected.nameEn : selectedId),
      "요청한 기구: " + escapeHtml(answerName) + " (초록색으로 표시)"
    ]);
  }

  document.getElementById("btn-next").hidden = false;
}


// ---------- 다음 문제 / 결과 ----------
function goNext() {
  questionIndex += 1;
  if (questionIndex >= quiz.questions.length) {
    LearningData.finishSession(session);
    location.href = "result.html?session=" + encodeURIComponent(session.sessionId);
  } else {
    showQuestion();
  }
}


// ---------- 페이지가 열리면 실행 ----------
init();
