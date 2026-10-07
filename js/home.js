// =============================================
// 메인 화면(index.html) 기능
// 1) 사전학습 준비도 표시
// 2) 학습모드 버튼 잠금 / 열림
// 3) 최근 학습결과 목록
// 4) 학습 기록 지우기
// =============================================


// ---------- 1) 사전학습 준비도 표시 ----------
function renderReadiness() {
  const readiness = LearningData.getReadiness(INSTRUMENTS);

  document.getElementById("readiness-value").textContent = readiness.percent + "%";
  document.getElementById("readiness-bar").style.width = readiness.percent + "%";
  document.getElementById("readiness-text").textContent =
    "등록된 기구 " + readiness.total + "개 중 " + readiness.successCount + "개 기구명 음성인식 성공 · " +
    "기준 " + MASTERY_THRESHOLD + "% " + (readiness.isMet ? "충족 ✓" : "미충족");

  // 도움말 안의 기준값 표시
  document.querySelectorAll(".js-threshold").forEach(function (el) {
    el.textContent = MASTERY_THRESHOLD + "%";
  });
}


// ---------- 2) 학습모드 버튼 잠금 / 열림 ----------
// 사전학습 준비도 기준을 충족하기 전에는 "수술 선택하기" 버튼을 잠급니다.
// (js/config.js 의 REQUIRE_PRELEARN_FOR_MODES 가 false 이면 항상 열림)
function setupModeLinks() {
  if (isModeUnlocked()) return;

  const info = document.getElementById("mode-lock-info");
  info.textContent =
    "사전학습의 학습 준비도가 " + MASTERY_THRESHOLD + "% 이상이 되면 학습모드를 시작할 수 있습니다. 먼저 사전학습을 진행해 주세요.";
  info.hidden = false;

  document.querySelectorAll("[data-mode-link]").forEach(function (link) {
    link.classList.add("is-disabled");
    link.setAttribute("aria-disabled", "true");
    link.textContent = "사전학습 기준 충족 후 이용 가능";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      showNotice("사전학습 준비도 " + MASTERY_THRESHOLD + "% 이상이 필요합니다.");
    });
  });
}


// ---------- 3) 최근 학습결과 목록 ----------
function renderResults() {
  const list = document.getElementById("result-list");
  const sessions = LearningData.getFinishedSessions(["doctor", "scrub"]).slice(0, 5);

  if (sessions.length === 0) {
    document.getElementById("result-empty").hidden = false;
    return;
  }

  sessions.forEach(function (session) {
    const surgery = findSurgery(session.surgeryId);
    const summary = LearningData.summarizeSession(session);

    const item = document.createElement("li");
    item.className = "result-item";
    item.innerHTML =
      '<div>' +
        '<p class="result-item-title">' +
          '<span class="chip chip-' + session.mode + '">' + modeLabel(session.mode) + '</span> ' +
          (surgery ? surgery.nameKo : session.surgeryId) +
          (session.isRetry ? ' · 틀렸던 문제 재도전' : '') +
        '</p>' +
        '<p class="result-item-meta">' +
          formatDateTime(session.endedAt) +
          ' · 최초 시도 정답률 ' + formatPercent(summary.firstAttemptRate) +
          ' · 최종 성공률 ' + formatPercent(summary.finalRate) +
          ' · 재학습 필요 기구 ' + summary.wrongInstrumentIds.length + '개' +
        '</p>' +
      '</div>' +
      '<a class="btn btn-outline btn-small" href="html/result.html?session=' + encodeURIComponent(session.sessionId) + '">결과 보기</a>';

    list.appendChild(item);
  });
}


// ---------- 4) 학습 기록 지우기 ----------
function setupClearButton() {
  document.getElementById("btn-clear-data").addEventListener("click", function () {
    const ok = confirm("이 브라우저에 저장된 사전학습 기록과 학습결과를 모두 지울까요?\n지운 기록은 되돌릴 수 없습니다.");
    if (!ok) return;
    LearningData.clearAll();
    location.reload();
  });
}


// ---------- 페이지가 열리면 실행 ----------
renderReadiness();
setupModeLinks();
renderResults();
setupClearButton();
