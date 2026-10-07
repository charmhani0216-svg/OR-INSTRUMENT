// =============================================
// 사전학습 / 맞춤 재학습 화면(html/prelearn.html) 기능
// ---------------------------------------------
// 같은 화면이 두 가지 역할을 합니다.
//  - 전체 사전학습 : prelearn.html                  → 등록된 모든 기구
//  - 맞춤 재학습   : prelearn.html?reviewOf=학습결과번호 → 그 결과에서 틀린 기구만
//
// 기구 1개 학습 순서:
//   이미지 보기 → 🔊 기구명 듣기 → 🎤 따라 말하기 → 글자로 변환 → 허용 답변과 비교 → O/X → 다음 기구
// 사전학습에서는 몇 번이든 다시 말해 볼 수 있습니다.
// =============================================


// ---------- 이 화면에서 사용하는 값 ----------
const reviewOfId = getQueryParam("reviewOf");
const sourceSession = reviewOfId ? LearningData.getSession(reviewOfId) : null;
const isReview = Boolean(sourceSession);   // 맞춤 재학습이면 true

let learnList = [];        // 이번에 학습할 기구 목록
let currentIndex = 0;      // 지금 몇 번째 기구인지 (0부터 시작)
let session = null;        // 이번 학습 기록
let currentResult = null;  // 지금 기구의 기록
let attemptStartedAt = 0;  // 반응시간 측정 시작 시각
let isListening = false;   // 음성인식 중인지

const textInput = document.getElementById("text-input");


// ---------- 처음 화면 준비 ----------
function init() {
  setupDeviceCheck(document.getElementById("device-check"), { speaker: true, mic: true });

  // 음성인식을 지원하지 않는 브라우저에서는 입력칸을 대신 보여줍니다.
  if (!Speech.isRecognitionSupported()) {
    document.getElementById("text-fallback").hidden = false;
  }

  document.getElementById("btn-listen").addEventListener("click", playInstrumentName);
  document.getElementById("btn-speak").addEventListener("click", handleSpeak);
  document.getElementById("btn-next").addEventListener("click", goNext);
  textInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") handleSpeak();
  });

  if (reviewOfId && !sourceSession) {
    document.getElementById("intro-text").textContent =
      "재학습할 학습결과를 찾을 수 없습니다. 학습결과 화면에서 다시 시도해 주세요.";
    document.getElementById("btn-start-all").hidden = true;
    return;
  }

  if (isReview) {
    setupReviewIntro();
  } else {
    setupFullIntro();
  }
}

// 전체 사전학습 시작 안내
function setupFullIntro() {
  const readiness = LearningData.getReadiness(INSTRUMENTS);
  const startAll = document.getElementById("btn-start-all");

  document.getElementById("intro-title").textContent = "나의 학습 준비도";

  if (INSTRUMENTS.length === 0) {
    document.getElementById("intro-text").textContent =
      "등록된 기구가 없습니다. data/instruments.js 에 기구를 추가해 주세요.";
    startAll.disabled = true;
    return;
  }

  document.getElementById("intro-text").textContent =
    "등록된 기구 " + readiness.total + "개 중 " + readiness.successCount + "개 기구명 음성인식 성공 · " +
    "학습 준비도 " + readiness.percent + "% (기준 " + MASTERY_THRESHOLD + "%)";

  startAll.addEventListener("click", function () {
    startLearning(INSTRUMENTS.slice());
  });

  // 일부만 성공했다면 "아직 성공하지 못한 기구만 연습" 버튼도 보여줍니다.
  const failed = getUnsuccessfulInstruments();
  if (failed.length > 0 && failed.length < INSTRUMENTS.length) {
    const startFailed = document.getElementById("btn-start-failed");
    startFailed.textContent = "아직 성공하지 못한 기구만 연습 (" + failed.length + "개)";
    startFailed.hidden = false;
    startFailed.addEventListener("click", function () {
      startLearning(getUnsuccessfulInstruments());
    });
  }
}

// 맞춤 재학습 시작 안내
function setupReviewIntro() {
  const summary = LearningData.summarizeSession(sourceSession);
  const surgery = findSurgery(sourceSession.surgeryId);
  const wrongInstruments = summary.wrongInstrumentIds.map(findInstrument).filter(Boolean);
  const startAll = document.getElementById("btn-start-all");

  document.title = "맞춤 재학습 · OR Instrument Coach";
  document.getElementById("page-title").textContent = "맞춤 재학습";
  document.getElementById("page-desc").textContent =
    "학습결과에서 틀린 기구만 사전학습 방식으로 다시 익힙니다.";
  document.getElementById("intro-title").textContent = "재학습할 기구";

  if (wrongInstruments.length === 0) {
    document.getElementById("intro-text").textContent = "이 학습결과에는 다시 학습할 기구가 없습니다.";
    startAll.hidden = true;
    return;
  }

  document.getElementById("intro-text").textContent =
    modeLabel(sourceSession.mode) + " · " + (surgery ? surgery.nameKo : "") +
    " 학습결과에서 틀린 기구 " + wrongInstruments.length + "개: " +
    wrongInstruments.map(function (item) { return item.nameEn; }).join(", ");

  startAll.textContent = "맞춤 재학습 시작";
  startAll.addEventListener("click", function () {
    startLearning(wrongInstruments);
  });
}

// 아직 음성인식에 성공하지 못한 기구 목록
function getUnsuccessfulInstruments() {
  const status = LearningData.getPrelearnStatus();
  return INSTRUMENTS.filter(function (item) {
    return !(status[item.id] && status[item.id].success);
  });
}


// ---------- 학습 시작 ----------
function startLearning(list) {
  learnList = list;
  currentIndex = 0;
  session = LearningData.createSession(
    isReview ? "review" : "prelearn",
    isReview ? sourceSession.surgeryId : null,
    { sourceSessionId: isReview ? sourceSession.sessionId : null }
  );

  document.getElementById("device-section").hidden = true;
  document.getElementById("intro-panel").hidden = true;
  document.getElementById("done-panel").hidden = true;
  document.getElementById("learn-card").hidden = false;

  showInstrument();
  window.scrollTo(0, 0);
}


// ---------- 기구 1개 보여주기 ----------
function showInstrument() {
  const instrument = learnList[currentIndex];
  currentResult = LearningData.startQuestion(session, instrument.id, instrument.id);

  document.getElementById("progress-text").textContent =
    (currentIndex + 1) + " / " + learnList.length + (isReview ? " · 맞춤 재학습" : "");

  document.getElementById("instrument-image").innerHTML =
    imageOrPlaceholder(instrument.image, instrument.nameEn + " 이미지", "기구 이미지 준비 중");
  document.getElementById("instrument-name").textContent = instrument.nameEn;
  document.getElementById("instrument-name-ko").textContent = instrument.nameKo;

  // 음성파일이 없으면 듣기 버튼을 잠그고 "음성 준비 중"으로 표시
  const listenButton = document.getElementById("btn-listen");
  listenButton.disabled = !instrument.audio;
  listenButton.textContent = instrument.audio ? "🔊 기구명 듣기" : "🔊 음성 준비 중";

  setSpeakLabel(false);
  document.getElementById("status-text").textContent = "";
  document.getElementById("feedback").hidden = true;
  document.getElementById("btn-next").textContent =
    currentIndex === learnList.length - 1 ? "학습 마치기" : "다음 기구";

  attemptStartedAt = Date.now();
}

// 말하기 버튼 글자 (처음: 따라 말하기 / 한 번 말한 뒤: 다시 말하기)
function setSpeakLabel(hasAttempted) {
  const button = document.getElementById("btn-speak");
  if (Speech.isRecognitionSupported()) {
    button.textContent = hasAttempted ? "🎤 다시 말하기" : "🎤 따라 말하기";
  } else {
    button.textContent = "입력한 기구명 확인";
  }
}


// ---------- 🔊 기구명 듣기 ----------
function playInstrumentName() {
  const instrument = learnList[currentIndex];
  if (!instrument.audio) return;

  const status = document.getElementById("status-text");
  status.textContent = "기구명을 재생하고 있습니다...";
  Speech.playAudioFile(instrument.audio)
    .then(function () { status.textContent = ""; })
    .catch(function (error) { status.textContent = error.message; });
}


// ---------- 🎤 따라 말하기 → O/X ----------
function handleSpeak() {
  if (isListening) return;

  const instrument = learnList[currentIndex];
  const button = document.getElementById("btn-speak");
  const status = document.getElementById("status-text");

  isListening = true;
  button.disabled = true;
  if (Speech.isRecognitionSupported()) {
    button.classList.add("is-listening");
    status.textContent = "듣고 있습니다... 기구명을 말해 주세요.";
  }

  Speech.captureAnswer(textInput)
    .then(function (answer) {
      const check = Speech.checkAnswer(answer.alternatives, instrument.acceptedAnswers);
      const isVoice = answer.inputMethod === "voice";

      // 학습행동 기록 (다시 말해도 이전 시도는 지워지지 않고 차례로 쌓입니다)
      LearningData.addAttempt(session, currentResult, {
        responseText: answer.text,
        speechRecognitionText: isVoice ? answer.text : null,
        speechAlternatives: isVoice ? answer.alternatives : [],
        inputMethod: answer.inputMethod,
        isCorrect: check.isCorrect,
        responseTime: Date.now() - attemptStartedAt
      });
      LearningData.updatePrelearnStatus(instrument.id, check.isCorrect);

      status.textContent = "";
      showFeedback(check.isCorrect, answer.text, instrument);
      setSpeakLabel(true);
    })
    .catch(function (error) {
      // 말소리를 못 들은 경우 등은 시도로 기록하지 않습니다.
      status.textContent = error.message;
    })
    .finally(function () {
      isListening = false;
      button.disabled = false;
      button.classList.remove("is-listening");
      attemptStartedAt = Date.now();
    });
}

function showFeedback(isCorrect, saidText, instrument) {
  const said = '인식된 말: "' + escapeHtml(saidText) + '"';

  if (isCorrect) {
    renderFeedback(document.getElementById("feedback"), true, "기구명 음성인식 성공", [
      said,
      "다음 기구로 넘어가거나, 한 번 더 연습해 보세요."
    ]);
  } else {
    renderFeedback(document.getElementById("feedback"), false, "기구명 음성인식 실패", [
      said,
      instrument.audio
        ? "🔊 기구명을 다시 듣고 한 번 더 말해 보세요."
        : "화면의 기구명을 확인하고 한 번 더 말해 보세요."
    ]);
  }
}


// ---------- 다음 기구 ----------
function goNext() {
  currentIndex += 1;
  if (currentIndex >= learnList.length) {
    finishLearning();
  } else {
    showInstrument();
  }
}


// ---------- 학습 마침 ----------
function finishLearning() {
  LearningData.finishSession(session);

  document.getElementById("learn-card").hidden = true;
  document.getElementById("done-panel").hidden = false;
  document.getElementById("done-buttons").innerHTML = "";

  if (isReview) {
    renderReviewDone();
  } else {
    renderPrelearnDone();
  }
  window.scrollTo(0, 0);
}

// 전체 사전학습을 마쳤을 때
function renderPrelearnDone() {
  const summary = LearningData.summarizeSession(session);
  const readiness = LearningData.getReadiness(INSTRUMENTS);
  const failed = getUnsuccessfulInstruments();
  const buttons = document.getElementById("done-buttons");

  document.getElementById("done-title").textContent = "사전학습을 마쳤습니다";
  document.getElementById("done-text").innerHTML =
    '<p class="summary-big">학습 준비도 ' + readiness.percent + '%</p>' +
    '<p>이번 학습: ' + summary.questionCount + '개 기구 중 ' + summary.finalCorrectCount + '개 기구명 음성인식 성공</p>' +
    '<p>전체: 등록된 기구 ' + readiness.total + '개 중 ' + readiness.successCount + '개 성공 · 기준 ' + MASTERY_THRESHOLD + '%</p>' +
    (readiness.isMet
      ? '<p>기준을 충족했습니다. 학습모드를 선택해 시작하세요.</p>'
      : '<p>아직 기준에 도달하지 않았습니다. 성공하지 못한 기구를 다시 연습해 보세요.</p>');

  // 기준을 충족해야 활성화되는 "학습모드 선택하기" 버튼
  buttons.appendChild(makeButton("학습모드 선택하기", "btn-brand", function () {
    location.href = "../index.html#modes";
  }, !isModeUnlocked()));

  if (failed.length > 0) {
    buttons.appendChild(makeButton("성공하지 못한 기구 다시 연습 (" + failed.length + "개)", "btn-prelearn", function () {
      startLearning(getUnsuccessfulInstruments());
    }));
  }

  buttons.appendChild(makeButton("전체 다시 학습", "btn-outline", function () {
    startLearning(INSTRUMENTS.slice());
  }));
}

// 맞춤 재학습을 마쳤을 때
function renderReviewDone() {
  const summary = LearningData.summarizeSession(session);
  const buttons = document.getElementById("done-buttons");
  const retryUrl =
    sourceSession.mode + ".html?surgery=" + encodeURIComponent(sourceSession.surgeryId) +
    "&retryOf=" + encodeURIComponent(sourceSession.sessionId);

  document.getElementById("done-title").textContent = "맞춤 재학습을 마쳤습니다";
  document.getElementById("done-text").innerHTML =
    '<p>재학습한 기구 ' + summary.questionCount + '개 중 ' + summary.finalCorrectCount + '개 기구명 음성인식 성공</p>' +
    '<p>이제 틀렸던 문제에 다시 도전해 보세요.</p>';

  buttons.appendChild(makeButton("틀렸던 문제 다시 도전", "btn-" + sourceSession.mode, function () {
    location.href = retryUrl;
  }));
  buttons.appendChild(makeButton("맞춤 재학습 한 번 더", "btn-prelearn", function () {
    startLearning(learnList);
  }));
  buttons.appendChild(makeButton("학습결과로 돌아가기", "btn-outline", function () {
    location.href = "result.html?session=" + encodeURIComponent(sourceSession.sessionId);
  }));
}


// ---------- 페이지가 열리면 실행 ----------
init();
