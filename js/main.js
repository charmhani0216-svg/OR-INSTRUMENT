// =============================================
// 모든 페이지에서 함께 쓰는 도구 모음
// ---------------------------------------------
// 주소에서 값 읽기, 기구/수술 찾기, 이미지 표시, 안내 메시지 등
// 여러 페이지에서 반복해서 쓰는 작은 기능들을 모아둔 파일입니다.
// =============================================


// ---------- 파일 경로 ----------
// html 폴더 안의 페이지는 <body data-root="../"> 로 표시해 두었습니다.
// 데이터 파일에 적힌 경로("images/..." 등)를 페이지 위치에 맞게 바꿔줍니다.
function assetUrl(path) {
  const root = document.body.dataset.root || "";
  return root + path;
}


// ---------- 주소(URL)에서 값 읽기 ----------
// 예) doctor.html?surgery=appendectomy → getQueryParam("surgery") 는 "appendectomy"
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}


// ---------- 글자를 화면에 안전하게 넣기 ----------
// 음성인식 결과처럼 그대로 넣으면 안 되는 글자(<, > 등)를 바꿔줍니다.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// ---------- 데이터 찾기 ----------
function findInstrument(id) {
  return INSTRUMENTS.find(function (item) { return item.id === id; }) || null;
}

function findSurgery(id) {
  return SURGERIES.find(function (item) { return item.id === id; }) || null;
}

// 수술의 문제 목록 가져오기 (mode: "doctor" 또는 "scrub")
function getQuestions(surgeryId, mode) {
  const content = SURGERY_CONTENT[surgeryId];
  if (!content) return [];
  return content[mode + "Questions"] || [];
}

// 문제의 정답으로 인정할 말 목록 (기구의 허용 답변 + 문제별 추가 답변)
function getAcceptedAnswers(question) {
  const instrument = findInstrument(question.answerInstrumentId);
  const base = instrument ? instrument.acceptedAnswers : [];
  return base.concat(question.extraAcceptedAnswers || []);
}


// ---------- 이미지 또는 "준비 중" 표시 ----------
// 이미지 경로가 있으면 이미지를, 없으면 "이미지 준비 중" 상자를 만듭니다.
function imageOrPlaceholder(src, altText, placeholderText) {
  if (src) {
    return '<img src="' + escapeHtml(assetUrl(src)) + '" alt="' + escapeHtml(altText) + '">';
  }
  return '<span class="image-empty">' + placeholderText + '</span>';
}


// ---------- O / X 피드백 표시 ----------
// element : 피드백을 넣을 상자,  isCorrect : 정답 여부
// title   : 굵은 제목,  lines : 아래에 보여줄 문장 목록
// ※ 학습자가 말한 내용은 escapeHtml() 로 감싸서 넣어 주세요.
function renderFeedback(element, isCorrect, title, lines) {
  element.className = "feedback " + (isCorrect ? "is-correct" : "is-wrong");
  element.innerHTML =
    '<span class="feedback-mark">' + (isCorrect ? "O" : "X") + '</span>' +
    '<div class="feedback-text">' +
      '<p><strong>' + title + '</strong></p>' +
      lines.map(function (line) { return "<p>" + line + "</p>"; }).join("") +
    '</div>';
  element.hidden = false;
}


// ---------- 버튼 만들기 ----------
// 학습 마침 화면처럼 버튼을 그때그때 만들어야 할 때 사용합니다.
function makeButton(label, className, onClick, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn " + className;
  button.textContent = label;
  button.disabled = Boolean(disabled);
  button.addEventListener("click", onClick);
  return button;
}


// ---------- 화면 아래 잠깐 뜨는 안내 메시지 ----------
// 페이지에 <div id="notice" class="notice" hidden></div> 가 있어야 합니다.
function showNotice(message) {
  const notice = document.getElementById("notice");
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = false;

  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(function () {
    notice.hidden = true;
  }, 3000);
}


// ---------- 표시 형식 ----------
function modeLabel(mode) {
  const labels = {
    prelearn: "사전학습",
    review: "맞춤 재학습",
    doctor: "Doctor Mode",
    scrub: "Scrub Mode"
  };
  return labels[mode] || mode;
}

// 0.857 → "86%"  (값이 없으면 "-")
function formatPercent(ratio) {
  if (ratio === null || ratio === undefined) return "-";
  return Math.round(ratio * 100) + "%";
}

// 3250 (밀리초) → "3.3초"
function formatSeconds(ms) {
  if (ms === null || ms === undefined) return "-";
  return (ms / 1000).toFixed(1) + "초";
}

// 저장된 시간 → "2026. 10. 7. 오후 9:30" 형식
function formatDateTime(isoText) {
  if (!isoText) return "-";
  return new Date(isoText).toLocaleString("ko-KR", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}


// ---------- 학습모드 이용 가능 여부 ----------
// 사전학습 준비도 기준(js/config.js 의 MASTERY_THRESHOLD)을 충족했는지 확인합니다.
function isModeUnlocked() {
  if (!REQUIRE_PRELEARN_FOR_MODES) return true;
  return LearningData.getReadiness(INSTRUMENTS).isMet;
}


// ---------- Doctor / Scrub 문제 준비 ----------
// 주소의 ?surgery=수술id 와 ?retryOf=학습결과번호 를 보고 풀 문제 목록을 만듭니다.
// retryOf 가 있으면 "틀렸던 문제 다시 도전" → 그 결과에서 최초 시도에 틀린 문제만 풉니다.
// 결과: { surgery, questions, sourceSession, error }  (문제가 있으면 error 에 안내 문구)
function prepareQuiz(mode) {
  const surgery = findSurgery(getQueryParam("surgery"));
  const retryOfId = getQueryParam("retryOf");
  const result = { surgery: surgery, questions: [], sourceSession: null, error: null };

  if (!surgery) {
    result.error = "수술을 찾을 수 없습니다. 수술 선택 화면에서 다시 선택해 주세요.";
    return result;
  }
  if (!isModeUnlocked()) {
    result.error = "사전학습의 학습 준비도가 " + MASTERY_THRESHOLD + "% 이상이 되면 이용할 수 있습니다.";
    return result;
  }

  let questions = getQuestions(surgery.id, mode);

  if (retryOfId) {
    const source = LearningData.getSession(retryOfId);
    if (!source) {
      result.error = "다시 도전할 학습결과를 찾을 수 없습니다.";
      return result;
    }
    const wrongIds = LearningData.summarizeSession(source).wrongQuestionIds;
    questions = questions.filter(function (q) { return wrongIds.includes(q.id); });
    result.sourceSession = source;
  }

  if (questions.length === 0) {
    result.error = retryOfId
      ? "다시 도전할 문제가 없습니다."
      : "이 수술의 " + modeLabel(mode) + " 문제는 아직 준비 중입니다.";
    return result;
  }

  result.questions = questions;
  return result;
}


// ---------- 배열 순서 섞기 ----------
function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
