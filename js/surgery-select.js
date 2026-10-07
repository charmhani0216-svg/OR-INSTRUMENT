// =============================================
// 수술 선택 화면(html/surgery-select.html) 기능
// ---------------------------------------------
// 학습모드(Doctor / Scrub)를 먼저 고른 뒤, 그 모드 안에서 수술을 선택합니다.
// 주소의 ?mode=doctor 또는 ?mode=scrub 을 보고 화면을 만듭니다.
// =============================================

// 모드별 화면 문구
const MODE_TEXT = {
  doctor: {
    desc: "수술 진행상황과 수술부위 이미지를 보고 현재 단계에서 필요한 기구를 판단하여 직접 말합니다.",
    key: "보고 → 판단하고 → 말하기"
  },
  scrub: {
    desc: "의사가 요청하는 수술기구 이름을 듣고 여러 기구 이미지 중 정확한 기구를 선택합니다.",
    key: "듣고 → 찾아서 → 선택하기"
  }
};

const mode = getQueryParam("mode");


function init() {
  const info = document.getElementById("info-box");

  // 주소가 잘못된 경우
  if (!MODE_TEXT[mode]) {
    info.textContent = "학습모드를 찾을 수 없습니다. 메인 화면에서 학습모드를 다시 선택해 주세요.";
    info.hidden = false;
    return;
  }

  document.title = modeLabel(mode) + " 수술 선택 · OR Instrument Coach";
  document.getElementById("page-title").textContent = modeLabel(mode) + " · 수술 선택";
  document.getElementById("page-desc").textContent = MODE_TEXT[mode].desc;

  const key = document.getElementById("key-action");
  key.textContent = MODE_TEXT[mode].key;
  key.classList.add("key-" + mode);
  key.hidden = false;

  // 사전학습 준비도 기준을 충족하지 않았으면 카드를 잠급니다.
  const unlocked = isModeUnlocked();
  if (!unlocked) {
    info.innerHTML =
      "사전학습의 학습 준비도가 " + MASTERY_THRESHOLD + "% 이상이 되면 수술을 선택할 수 있습니다. " +
      '<a href="prelearn.html">사전학습으로 이동 →</a>';
    info.hidden = false;
  }

  renderSurgeryCards(unlocked);
}


// ---------- 수술 카드 만들기 ----------
// data/surgeries.js 의 SURGERIES 목록을 하나씩 꺼내서 카드로 만듭니다.
function renderSurgeryCards(unlocked) {
  const list = document.getElementById("surgery-list");

  SURGERIES.forEach(function (surgery) {
    const questions = getQuestions(surgery.id, mode);
    const sampleCount = questions.filter(function (q) { return q.isSample; }).length;

    // 문제 개수 안내
    let countText;
    if (questions.length === 0) {
      countText = "문제 준비 중";
    } else {
      countText = "문제 " + questions.length + "개";
      if (sampleCount > 0) countText += " (구조 확인용 샘플 " + sampleCount + "개)";
    }

    const card = document.createElement("button");
    card.type = "button";
    card.className = "surgery-card";
    card.disabled = !unlocked || questions.length === 0;
    card.innerHTML =
      '<div class="surgery-image">' +
        imageOrPlaceholder(surgery.image, surgery.nameKo + " 대표 이미지", "대표 이미지 준비 중") +
      '</div>' +
      '<div class="surgery-info">' +
        '<h3 class="surgery-name">' + surgery.nameKo + '</h3>' +
        '<p class="surgery-en">' + surgery.nameEn + '</p>' +
        '<p class="surgery-count">' + countText + '</p>' +
      '</div>';

    // 카드를 누르면 해당 모드 문제 화면으로 이동
    card.addEventListener("click", function () {
      location.href = mode + ".html?surgery=" + encodeURIComponent(surgery.id);
    });

    list.appendChild(card);
  });
}


// ---------- 페이지가 열리면 실행 ----------
init();
