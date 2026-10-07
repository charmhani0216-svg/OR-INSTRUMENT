// =============================================
// 소리 듣기 / 말하기 기능
// ---------------------------------------------
// 1) 스피커 테스트 소리 재생
// 2) 미리 준비한 음성파일 재생
// 3) 음성인식: 학습자가 말한 내용을 글자로 바꾸기 (브라우저 기본 기능 사용)
// 4) 받아쓴 글자를 등록된 정답·허용 답변과 비교
//
// ※ 이 기능은 "발음이 얼마나 정확한지 %"를 재는 기능이 아닙니다.
//   받아쓴 글자가 등록된 기구명과 일치하는지만 O/X 로 판단합니다.
// ※ 음성인식은 Chrome 또는 Edge 브라우저에서 동작하며 인터넷 연결이 필요합니다.
// =============================================

const Speech = {

  // ---------- 음성인식 사용 가능 여부 ----------
  isRecognitionSupported: function () {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  },


  // ---------- 한 번 듣고 글자로 바꾸기 ----------
  // 성공하면 { text: "메첸바움", alternatives: ["메첸바움", "메첸 바움", ...] }
  listenOnce: function () {
    return new Promise(function (resolve, reject) {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        reject(new Error("이 브라우저는 음성인식을 지원하지 않습니다. Chrome 또는 Edge에서 열어 주세요."));
        return;
      }

      const recognition = new Recognition();
      recognition.lang = SPEECH_LANG;      // js/config.js 의 언어 설정
      recognition.interimResults = false;  // 말이 끝난 뒤 최종 결과만 받기
      recognition.maxAlternatives = 5;     // 비슷하게 들린 다른 후보도 함께 받기

      let finished = false;

      recognition.onresult = function (event) {
        finished = true;
        const result = event.results[0];
        const alternatives = [];
        for (let i = 0; i < result.length; i++) {
          alternatives.push(result[i].transcript.trim());
        }
        resolve({ text: alternatives[0] || "", alternatives: alternatives });
      };

      recognition.onerror = function (event) {
        finished = true;
        reject(new Error(Speech.errorMessage(event.error)));
      };

      // 아무 말도 인식되지 않고 끝난 경우
      recognition.onend = function () {
        if (!finished) {
          reject(new Error("말소리를 인식하지 못했습니다. 버튼을 다시 누르고 말해 주세요."));
        }
      };

      recognition.start();
    });
  },

  // 음성인식 오류를 이해하기 쉬운 말로 바꾸기
  errorMessage: function (code) {
    const messages = {
      "no-speech": "말소리가 들리지 않았습니다. 버튼을 다시 누르고 말해 주세요.",
      "audio-capture": "마이크를 찾을 수 없습니다. 마이크 연결을 확인해 주세요.",
      "not-allowed": "마이크 사용이 허용되지 않았습니다. 주소창 옆 자물쇠 아이콘에서 마이크를 '허용'으로 바꿔 주세요.",
      "network": "음성인식에 인터넷 연결이 필요합니다. 인터넷 연결을 확인해 주세요.",
      "aborted": "음성인식이 중단되었습니다. 다시 시도해 주세요."
    };
    return messages[code] || "음성인식 중 문제가 생겼습니다. 다시 시도해 주세요.";
  },


  // ---------- 답 받기 (음성 또는 키보드) ----------
  // 음성인식을 쓸 수 있으면 음성으로, 쓸 수 없는 브라우저면 입력칸(fallbackInput)의 글자를 사용합니다.
  // 결과: { text, alternatives, inputMethod: "voice" 또는 "keyboard" }
  captureAnswer: function (fallbackInput) {
    if (Speech.isRecognitionSupported()) {
      return Speech.listenOnce().then(function (result) {
        result.inputMethod = "voice";
        return result;
      });
    }

    const text = fallbackInput ? fallbackInput.value.trim() : "";
    if (!text) {
      return Promise.reject(new Error("입력칸에 기구명을 입력해 주세요."));
    }
    fallbackInput.value = "";
    return Promise.resolve({ text: text, alternatives: [text], inputMethod: "keyboard" });
  },


  // ---------- 정답 비교 ----------
  // 띄어쓰기, 대소문자, 문장부호를 지운 뒤 비교합니다.
  normalize: function (text) {
    return String(text).toLowerCase().replace(/[\s.,!?·'"~\-]/g, "");
  },

  // 음성인식 후보 중 하나라도 허용 답변을 포함하면 정답입니다.
  // 예) "메첸바움 주세요" 안에 "메첸바움"이 들어 있으므로 정답
  checkAnswer: function (alternatives, acceptedAnswers) {
    for (let i = 0; i < alternatives.length; i++) {
      const said = Speech.normalize(alternatives[i]);
      for (let j = 0; j < acceptedAnswers.length; j++) {
        const answer = Speech.normalize(acceptedAnswers[j]);
        if (answer && said.includes(answer)) {
          return { isCorrect: true, matchedText: alternatives[i] };
        }
      }
    }
    return { isCorrect: false, matchedText: null };
  },


  // ---------- 스피커 테스트 소리 ("삐-") ----------
  // 음성파일 없이 브라우저가 직접 만드는 짧은 테스트 소리입니다.
  playTestTone: function () {
    return new Promise(function (resolve, reject) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        reject(new Error("이 브라우저에서는 테스트 소리를 재생할 수 없습니다."));
        return;
      }
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const volume = context.createGain();

      oscillator.frequency.value = 660;  // 소리 높이
      volume.gain.value = 0.2;           // 소리 크기
      oscillator.connect(volume);
      volume.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.8);  // 0.8초 동안 재생
      oscillator.onended = function () {
        context.close();
        resolve();
      };
    });
  },


  // ---------- 음성파일 재생 ----------
  // 미리 제작·검토한 음성파일(mp3 등)을 재생합니다. 재생이 끝나면 완료됩니다.
  playAudioFile: function (path) {
    return new Promise(function (resolve, reject) {
      const audio = new Audio(assetUrl(path));
      audio.onended = resolve;
      audio.onerror = function () {
        reject(new Error("음성파일을 재생할 수 없습니다. 파일 경로를 확인해 주세요."));
      };
      audio.play().catch(function () {
        reject(new Error("음성을 재생하지 못했습니다. 버튼을 눌러 다시 들어 주세요."));
      });
    });
  }
};
