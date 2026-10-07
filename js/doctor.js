// =============================================
// Doctor Mode 화면(html/doctor.html) 기능
// ---------------------------------------------
// 핵심 학습행동: 보고 → 판단하고 → 말하기
//
// 문제 1개 순서:
//   수술 진행상황·수술부위 이미지 보기 → 필요한 기구 판단 → 🎤 기구명 말하기
//   → 글자로 변환 → 허용 답변과 비교 → 즉시 O/X 피드백
//
// [다시 말하기]
//   음성인식이 잘못된 경우를 위해 "다시 말하기"를 할 수 있습니다.
//   다시 말해도 1차 응답은 지워지지 않고 따로 저장됩니다.
//   (결과 화면에서 "최초 시도 정답률"과 "최종 성공률"을 따로 계산)
// =============================================

const quiz = prepareQuiz("doctor");   // js/main.js 의 문제 준비 기능

let session = null;         // 이번 학습 기록
let questionIndex = 0;      // 지금 몇 번째 문제인지 (0부터 시작)
let currentResult = null;   // 지금 문제의 기록
let attemptStartedAt = 0;   // 반응시간 측정 시작 시각
let isListening = false;    // 음성인식 중인지

const textInput = document.getElementById("text-input");


// ---------- 처음 화면 준비 ----------
function init() {
  if (quiz.surgery) {
    document.getElementById("page-title").textContent = "Doctor Mode · " + quiz.surgery.nameKo;
  }

  // 시작할 수 없는 경우 안내만 보여줍니다.
  if (quiz.error) {
    document.getElementById("error-text").textContent = quiz.error;
    document.getElementById("error-panel").hidden = false;
    return;
  }

  document.getElementById("device-section").hidden = false;
  setupDeviceCheck(document.getElementById("device-check"), { speaker: false, mic: true });

  // 시작 안내
  document.getElementById("intro-text").textContent =
    quiz.surgery.nameKo + " · 문제 " + quiz.questions.length + "개" +
    (quiz.sourceSession ? " (이전 학습결과에서 틀렸던 문제 다시 도전)" : "");
  const hasSample = quiz.questions.some(function (q) { return q.isSample; });
  document.getElementById("intro-sample").hidden = !hasSample;
  document.getElementById("intro-panel").hidden = false;

  if (!Speech.isRecognitionSupported()) {
    document.getElementById("text-fallback").hidden = false;
    document.getElementById("btn-speak").textContent = "입력한 기구명 확인";
    document.getElementById("btn-retry").textContent = "다시 입력하기";
  }

  document.getElementById("btn-start").addEventListener("click", startQuiz);
  document.getElementById("btn-speak").addEventListener("click", handleAnswer);
  document.getElementById("btn-retry").addEventListener("click", handleAnswer);
  document.getElementById("btn-reveal").addEventListener("click", revealAnswer);
  document.getElementById("btn-next").addEventListener("click", goNext);
  textInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") handleAnswer();
  });
}


// ---------- 시작 ----------
function startQuiz() {
  session = LearningData.createSession("doctor", quiz.surgery.id, {
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

  document.getElementById("site-image").innerHTML =
    imageOrPlaceholder(question.siteImage, "수술부위 이미지", "수술부위 이미지 준비 중");
  document.getElementById("step-name").textContent = question.stepName;
  document.getElementById("situation-text").textContent = question.situationText;

  document.getElementById("status-text").textContent = "";
  document.getElementById("feedback").hidden = true;
  setButtons("ready");

  attemptStartedAt = Date.now();
  window.scrollTo(0, 0);
}

// 버튼 보이기 / 숨기기
//  ready : 처음 말하기 전          → [기구명 말하기]
//  wrong : 오답 후                  → [다시 말하기] [정답 확인하기]
//  done  : 정답 또는 정답 확인 후   → [다음 문제]
function setButtons(state) {
  document.getElementById("btn-speak").hidden = state !== "ready";
  document.getElementById("btn-retry").hidden = state !== "wrong";
  document.getElementById("btn-reveal").hidden = state !== "wrong";
  document.getElementById("btn-next").hidden = state !== "done";
  document.getElementById("btn-next").textContent =
    questionIndex === quiz.questions.length - 1 ? "결과 보기" : "다음 문제";

  // 키보드 입력칸은 말하기 단계에서만 보여줍니다.
  if (!Speech.isRecognitionSupported()) {
    document.getElementById("text-fallback").hidden = state === "done";
  }
}


// ---------- 🎤 말하기 (처음 말하기 / 다시 말하기 공통) ----------
function handleAnswer() {
  if (isListening) return;
  if (document.getElementById("btn-next").hidden === false) return;  // 이미 끝난 문제

  const question = quiz.questions[questionIndex];
  const instrument = findInstrument(question.answerInstrumentId);
  const status = document.getElementById("status-text");
  const buttons = [document.getElementById("btn-speak"), document.getElementById("btn-retry")];

  isListening = true;
  buttons.forEach(function (b) { b.disabled = true; });
  if (Speech.isRecognitionSupported()) {
    buttons.forEach(function (b) { b.classList.add("is-listening"); });
    status.textContent = "듣고 있습니다... 필요한 기구의 이름을 말해 주세요.";
  }

  Speech.captureAnswer(textInput)
    .then(function (answer) {
      const check = Speech.checkAnswer(answer.alternatives, getAcceptedAnswers(question));
      const isVoice = answer.inputMethod === "voice";

      // 학습행동 기록 (1차 응답은 그대로 두고, 다시 말한 응답은 다음 순번으로 쌓입니다)
      LearningData.addAttempt(session, currentResult, {
        responseText: answer.text,
        speechRecognitionText: isVoice ? answer.text : null,
        speechAlternatives: isVoice ? answer.alternatives : [],
        inputMethod: answer.inputMethod,
        isCorrect: check.isCorrect,
        responseTime: Date.now() - attemptStartedAt
      });

      status.textContent = "";
      const said = '인식된 말: "' + escapeHtml(answer.text) + '"';

      if (check.isCorrect) {
        renderFeedback(document.getElementById("feedback"), true, "정답입니다", [
          said,
          "정답: " + escapeHtml(instrument ? instrument.nameEn : question.answerInstrumentId)
        ]);
        setButtons("done");
      } else {
        renderFeedback(document.getElementById("feedback"), false, "정답이 아닙니다", [
          said,
          "음성인식이 잘못되었다면 다시 말해 보세요. 모르겠다면 정답을 확인하세요."
        ]);
        setButtons("wrong");
      }
    })
    .catch(function (error) {
      // 말소리를 못 들은 경우 등은 시도로 기록하지 않습니다.
      status.textContent = error.message;
    })
    .finally(function () {
      isListening = false;
      buttons.forEach(function (b) {
        b.disabled = false;
        b.classList.remove("is-listening");
      });
      attemptStartedAt = Date.now();   // 다시 말하기의 반응시간은 이 시점부터 잽니다.
    });
}


// ---------- 정답 확인하기 ----------
function revealAnswer() {
  const question = quiz.questions[questionIndex];
  const instrument = findInstrument(question.answerInstrumentId);
  LearningData.markAnswerRevealed(session, currentResult);

  const feedback = document.getElementById("feedback");
  const reveal = document.createElement("p");
  reveal.className = "answer-reveal";
  reveal.textContent = "정답: " + (instrument ? instrument.nameEn + " (" + instrument.nameKo + ")" : question.answerInstrumentId);
  feedback.querySelector(".feedback-text").appendChild(reveal);

  setButtons("done");
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
