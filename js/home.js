// =============================================
// 메인 화면(index.html) 기능
// 1) 수술 카드 만들기  2) 수술 선택하기  3) 준비 중 안내 메시지
// =============================================

// 현재 선택된 수술 (처음에는 아무것도 선택되지 않음)
let selectedSurgery = null;


// ---------- 1) 수술 카드 만들기 ----------
// data/surgeries.js 의 SURGERIES 목록을 하나씩 꺼내서 카드로 만듭니다.
function renderSurgeryCards() {
  const list = document.getElementById("surgery-list");

  SURGERIES.forEach(function (surgery) {
    // 대표 이미지가 있으면 이미지를, 없으면 "이미지 준비 중" 빈 공간을 보여줍니다.
    let imageHtml;
    if (surgery.image) {
      imageHtml = '<img src="' + surgery.image + '" alt="' + surgery.nameKo + ' 대표 이미지">';
    } else {
      imageHtml = '<span class="image-empty">대표 이미지 준비 중</span>';
    }

    // 카드 한 장 만들기 (button 이라서 키보드로도 선택 가능)
    const card = document.createElement("button");
    card.type = "button";
    card.className = "surgery-card";
    card.innerHTML =
      '<div class="surgery-image">' + imageHtml + '</div>' +
      '<div class="surgery-info">' +
        '<h3 class="surgery-name">' + surgery.nameKo + '</h3>' +
        '<p class="surgery-en">' + surgery.nameEn + '</p>' +
        '<p class="surgery-summary">' + surgery.summary + '</p>' +
      '</div>';

    // 카드를 누르면 그 수술을 선택
    card.addEventListener("click", function () {
      selectSurgery(surgery, card);
    });

    list.appendChild(card);
  });
}


// ---------- 2) 수술 선택하기 ----------
function selectSurgery(surgery, card) {
  selectedSurgery = surgery;

  // 모든 카드의 선택 표시를 지우고, 누른 카드에만 선택 표시
  document.querySelectorAll(".surgery-card").forEach(function (c) {
    c.classList.remove("is-selected");
  });
  card.classList.add("is-selected");

  document.getElementById("selected-surgery").textContent =
    "선택한 수술: " + surgery.nameKo + " (" + surgery.nameEn + ")";
}


// ---------- 3) 준비 중 안내 메시지 ----------
// Doctor Mode / Scrub Mode 퀴즈 페이지는 아직 만들지 않았으므로 안내만 보여줍니다.
// (다음 단계에서 이 부분을 실제 페이지로 이동하도록 바꿀 예정)
function showNotice(message) {
  const notice = document.getElementById("notice");
  notice.textContent = message;
  notice.hidden = false;

  // 3초 뒤에 메시지 숨기기
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(function () {
    notice.hidden = true;
  }, 3000);
}

function setupModeButtons() {
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      const modeName = button.dataset.mode;
      let surgeryText = selectedSurgery ? selectedSurgery.nameKo + " · " : "";
      showNotice(surgeryText + modeName + " 학습 페이지는 다음 단계에서 제작됩니다.");
    });
  });
}


// ---------- 페이지가 열리면 실행 ----------
renderSurgeryCards();
setupModeButtons();
