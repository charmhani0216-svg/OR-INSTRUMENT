// =============================================
// 학습 전 장치 확인 (스피커 테스트 / 마이크 테스트)
// ---------------------------------------------
// 사전학습: 스피커 → 마이크 순서로 확인
// Doctor Mode: 마이크 확인 (기구명을 말해야 하므로)
// Scrub Mode: 스피커 확인 (요청 음성을 들어야 하므로)
//
// 사용 방법: setupDeviceCheck(넣을 위치, { speaker: true, mic: true })
// 장치 확인은 권장 사항이며, 확인하지 않아도 학습은 시작할 수 있습니다.
// =============================================

function setupDeviceCheck(container, options) {
  const useBoth = options.speaker && options.mic;
  let html = "";

  if (options.speaker) {
    html +=
      '<div class="panel">' +
        '<h3 class="panel-title device-step-title">' + (useBoth ? "① " : "") + '스피커 테스트</h3>' +
        '<p class="panel-text">버튼을 누르면 "삐-" 소리가 납니다. 소리가 잘 들리는지 확인하세요.</p>' +
        '<div class="btn-row">' +
          '<button type="button" class="btn btn-outline btn-small" id="btn-speaker-test">🔊 테스트 소리 재생</button>' +
        '</div>' +
        '<div class="btn-row" id="speaker-confirm" hidden>' +
          '<span class="panel-text">소리가 들렸나요?</span>' +
          '<button type="button" class="btn btn-outline btn-small" id="btn-speaker-yes">들렸어요</button>' +
          '<button type="button" class="btn btn-outline btn-small" id="btn-speaker-no">안 들렸어요</button>' +
        '</div>' +
        '<p class="device-status" id="speaker-status"></p>' +
      '</div>';
  }

  if (options.mic) {
    html +=
      '<div class="panel">' +
        '<h3 class="panel-title device-step-title">' + (useBoth ? "② " : "") + '마이크 테스트</h3>' +
        '<p class="panel-text">버튼을 누른 뒤 "테스트"라고 말해 보세요. 말한 내용이 글자로 나타나면 정상입니다.</p>' +
        '<div class="btn-row">' +
          '<button type="button" class="btn btn-outline btn-small" id="btn-mic-test"' + (useBoth ? " disabled" : "") + '>🎤 마이크 테스트</button>' +
        '</div>' +
        '<p class="device-status" id="mic-status">' + (useBoth ? "스피커 테스트를 먼저 진행해 주세요." : "") + '</p>' +
      '</div>';
  }

  container.innerHTML = html;

  // 상태 문구 바꾸기 (state: "ok" 성공 / "bad" 문제 / 없음)
  function setStatus(id, text, state) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.classList.toggle("is-ok", state === "ok");
    el.classList.toggle("is-bad", state === "bad");
  }

  // 스피커 테스트가 끝나면 마이크 테스트 버튼 열기
  function unlockMicTest() {
    const micButton = document.getElementById("btn-mic-test");
    if (micButton && micButton.disabled) {
      micButton.disabled = false;
      setStatus("mic-status", "", null);
    }
  }

  // ---------- 스피커 테스트 ----------
  if (options.speaker) {
    document.getElementById("btn-speaker-test").addEventListener("click", function () {
      setStatus("speaker-status", "소리를 재생하는 중입니다...", null);
      Speech.playTestTone()
        .then(function () {
          setStatus("speaker-status", "", null);
          document.getElementById("speaker-confirm").hidden = false;
        })
        .catch(function (error) {
          setStatus("speaker-status", error.message, "bad");
        });
    });

    document.getElementById("btn-speaker-yes").addEventListener("click", function () {
      document.getElementById("speaker-confirm").hidden = true;
      setStatus("speaker-status", "✓ 스피커 정상", "ok");
      unlockMicTest();
    });

    document.getElementById("btn-speaker-no").addEventListener("click", function () {
      document.getElementById("speaker-confirm").hidden = true;
      setStatus("speaker-status", "음량, 음소거, 이어폰 연결을 확인한 뒤 다시 재생해 보세요.", "bad");
      unlockMicTest();
    });
  }

  // ---------- 마이크 테스트 ----------
  if (options.mic) {
    if (!Speech.isRecognitionSupported()) {
      setStatus("mic-status", "이 브라우저에서는 음성인식을 쓸 수 없습니다. Chrome 또는 Edge를 사용하세요. (지금은 키보드 입력으로만 학습할 수 있습니다)", "bad");
      document.getElementById("btn-mic-test").disabled = true;
      return;
    }

    document.getElementById("btn-mic-test").addEventListener("click", function () {
      const button = this;
      button.disabled = true;
      button.classList.add("is-listening");
      setStatus("mic-status", "듣고 있습니다... 지금 말해 주세요.", null);

      Speech.listenOnce()
        .then(function (result) {
          setStatus("mic-status", '✓ 마이크 정상 · 인식된 말: "' + result.text + '"', "ok");
        })
        .catch(function (error) {
          setStatus("mic-status", error.message, "bad");
        })
        .finally(function () {
          button.disabled = false;
          button.classList.remove("is-listening");
        });
    });
  }
}
