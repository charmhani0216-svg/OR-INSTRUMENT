// =============================================
// 학습결과 화면(html/result.html) 기능
// ---------------------------------------------
// 최종점수 하나만이 아니라 다음 내용을 함께 보여줍니다.
//  - 최초 시도 정답률 / 최종 성공률
//  - 총 시도 횟수 / 다시 말하기 횟수 (Doctor Mode)
//  - 평균 반응시간 / 재학습 필요 기구
//  - 기구별 수행결과 표
// 그리고 "틀린 기구 다시 학습"(맞춤 재학습) 으로 이어집니다.
// =============================================

function init() {
  // 주소에 학습결과 번호가 있으면 그 결과, 없으면 가장 최근 결과
  const sessionId = getQueryParam("session");
  const session = sessionId
    ? LearningData.getSession(sessionId)
    : LearningData.getFinishedSessions(["doctor", "scrub"])[0];

  if (!session || (session.mode !== "doctor" && session.mode !== "scrub")) {
    document.getElementById("empty-panel").hidden = false;
    return;
  }

  const summary = LearningData.summarizeSession(session);
  const surgery = findSurgery(session.surgeryId);

  document.getElementById("page-title").textContent = modeLabel(session.mode) + " 학습결과";
  document.getElementById("page-desc").textContent =
    (surgery ? surgery.nameKo + " (" + surgery.nameEn + ")" : "") +
    " · " + formatDateTime(session.endedAt || session.startedAt) +
    (session.isRetry ? " · 틀렸던 문제 다시 도전" : "");

  renderStats(session, summary);
  renderNextButtons(session, summary);
  renderTable(session);

  document.getElementById("result-area").hidden = false;
}


// ---------- 요약 수치 ----------
function renderStats(session, summary) {
  const stats = [
    {
      label: "최초 시도 정답률",
      value: formatPercent(summary.firstAttemptRate),
      note: summary.questionCount + "문제 중 " + summary.firstAttemptCorrectCount + "문제"
    },
    {
      label: "최종 성공률",
      value: formatPercent(summary.finalRate),
      note: summary.questionCount + "문제 중 " + summary.finalCorrectCount + "문제"
    },
    { label: "총 시도 횟수", value: summary.totalAttempts + "회", note: "" }
  ];

  // 다시 말하기는 Doctor Mode 에만 있습니다.
  if (session.mode === "doctor") {
    stats.push({ label: "다시 말하기", value: summary.retryCount + "회", note: "" });
  }

  stats.push(
    { label: "평균 반응시간", value: formatSeconds(summary.averageResponseTime), note: "최초 시도 기준" },
    { label: "재학습 필요 기구", value: summary.wrongInstrumentIds.length + "개", note: "최초 시도에서 틀린 기구" }
  );

  document.getElementById("stat-grid").innerHTML = stats.map(function (stat) {
    return (
      '<div class="stat">' +
        '<p class="stat-label">' + stat.label + '</p>' +
        '<p class="stat-value">' + stat.value + '</p>' +
        (stat.note ? '<p class="stat-note">' + stat.note + '</p>' : '') +
      '</div>'
    );
  }).join("");
}


// ---------- 다음 학습 버튼 ----------
function renderNextButtons(session, summary) {
  const buttons = document.getElementById("next-buttons");
  const wrongNames = summary.wrongInstrumentIds.map(function (id) {
    const instrument = findInstrument(id);
    return instrument ? instrument.nameEn : id;
  });

  if (wrongNames.length > 0) {
    document.getElementById("next-text").textContent =
      "재학습이 필요한 기구: " + wrongNames.join(", ") +
      " — 이 기구들만 사전학습 방식(보기 → 듣기 → 말하기)으로 다시 익힌 뒤, 틀렸던 문제에 다시 도전할 수 있습니다.";

    // 맞춤 재학습: 사전학습 화면에서 틀린 기구만 학습
    buttons.appendChild(makeButton("틀린 기구 다시 학습", "btn-prelearn", function () {
      location.href = "prelearn.html?reviewOf=" + encodeURIComponent(session.sessionId);
    }));
  } else {
    document.getElementById("next-text").textContent =
      "모든 문제를 최초 시도에 맞혔습니다. 다른 수술이나 다른 학습모드에 도전해 보세요.";
  }

  buttons.appendChild(makeButton("전체 다시 풀기", "btn-" + session.mode, function () {
    location.href = session.mode + ".html?surgery=" + encodeURIComponent(session.surgeryId);
  }));
  buttons.appendChild(makeButton("다른 수술 선택", "btn-outline", function () {
    location.href = "surgery-select.html?mode=" + session.mode;
  }));
  buttons.appendChild(makeButton("메인으로", "btn-outline", function () {
    location.href = "../index.html";
  }));
}


// ---------- 기구별 수행결과 표 ----------
function renderTable(session) {
  const isDoctor = session.mode === "doctor";

  const headers = ["번호", "정답 기구", isDoctor ? "1차 응답 (음성인식)" : "1차 선택", "최초 시도", "최종", "시도 횟수"];
  if (isDoctor) headers.push("다시 말하기");
  headers.push("반응시간(1차)");

  document.getElementById("table-head").innerHTML =
    "<tr>" + headers.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr>";

  function mark(value) {
    return value ? '<span class="mark-o">O</span>' : '<span class="mark-x">X</span>';
  }

  document.getElementById("table-body").innerHTML = session.questionResults.map(function (r, index) {
    const instrument = findInstrument(r.instrumentId);
    const cells = [
      index + 1,
      escapeHtml(instrument ? instrument.nameEn : r.instrumentId),
      r.firstResponseText === null ? "-" : escapeHtml(r.firstResponseText),
      mark(r.isFirstAttemptCorrect === true),
      mark(r.isFinalCorrect) + (r.answerRevealed ? " (정답 확인)" : ""),
      r.attemptCount + "회"
    ];
    if (isDoctor) cells.push(r.retryCount + "회");
    cells.push(formatSeconds(r.firstResponseTime));

    return "<tr>" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
  }).join("");
}


// ---------- 페이지가 열리면 실행 ----------
init();
