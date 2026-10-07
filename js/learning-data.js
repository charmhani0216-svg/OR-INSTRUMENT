// =============================================
// 학습행동 데이터 저장
// ---------------------------------------------
// 학습자가 문제를 풀 때마다 "어떻게 풀었는지"를 기록하는 파일입니다.
// 최종점수만 저장하지 않고, 모든 시도(1차 응답, 다시 말하기 등)를 따로 남깁니다.
//
// 현재는 이 컴퓨터의 브라우저 저장공간(localStorage)에 저장합니다.
// → 다른 컴퓨터나 다른 브라우저에서는 기록이 보이지 않습니다.
// → 나중에 Google Sheets, Supabase 등으로 옮길 때는 이 파일만 고치면 됩니다.
//   (화면을 만드는 다른 js 파일은 LearningData.○○() 만 부르기 때문)
//
// [저장되는 데이터는 두 종류입니다]
//
// 1) 시도 기록 (attempt) : 말하기·선택을 한 번 할 때마다 1줄씩 쌓이는 기록 (연구 분석용)
//    anonymousUserId       익명 학습자 번호 (이름 등 개인정보 없음)
//    sessionId             학습 1회(문제 세트 1번 풀기)의 번호
//    mode                  prelearn(사전학습) / review(맞춤 재학습) / doctor / scrub
//    surgeryId             수술 id (사전학습은 null)
//    questionId            문제 id (사전학습은 기구 id)
//    instrumentId          정답 기구 id
//    attemptNumber         이 문제에서 몇 번째 시도인지 (1 = 최초 시도)
//    responseText          판정에 사용한 학습자 응답 (말한 내용 / 입력한 글자 / 선택한 기구명)
//    speechRecognitionText 음성인식이 받아쓴 글자 그대로 (음성이 아니면 null)
//    speechAlternatives    음성인식이 제시한 다른 후보들
//    inputMethod           voice(음성) / keyboard(직접 입력) / select(이미지 선택)
//    selectedInstrumentId  Scrub Mode 에서 선택한 기구 id
//    isCorrect             이번 시도의 정답 여부
//    isFirstAttemptCorrect 이 문제의 최초 시도 정답 여부
//    isFinalCorrect        이번 시도까지 포함해 정답에 성공했는지
//    retryCount            이번 시도까지의 다시 말하기 횟수
//    responseTime          반응시간 (밀리초, 1000 = 1초)
//    hintUsed              힌트 사용 여부 (힌트 기능은 아직 없어서 항상 false)
//    timestamp             기록된 시각
//
// 2) 학습 1회 기록 (session) : 결과 화면에 쓰는 문제별 요약
//    questionResults 안에 문제마다 최초 시도 정답 여부, 최종 성공 여부,
//    시도 횟수, 다시 말하기 횟수, 1차 응답, 반응시간 등이 들어 있습니다.
// =============================================

const LearningData = (function () {

  // localStorage 에 저장할 때 쓰는 이름표
  const KEYS = {
    userId: "orcoach_anonymousUserId",
    sessions: "orcoach_sessions",
    attempts: "orcoach_attempts",
    prelearn: "orcoach_prelearnStatus"
  };


  // ---------- 저장공간 읽기 / 쓰기 (내부용) ----------
  // 저장공간을 쓸 수 없는 환경(사생활 보호 모드 등)에서도 화면이 멈추지 않게 합니다.
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("학습 기록을 저장하지 못했습니다.", error);
    }
  }

  function makeId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }


  // ---------- 익명 학습자 번호 ----------
  // 처음 접속할 때 무작위 번호를 만들어 계속 사용합니다. (로그인 없음)
  function getUserId() {
    let id = read(KEYS.userId, null);
    if (!id) {
      id = makeId("user");
      write(KEYS.userId, id);
    }
    return id;
  }


  // ---------- 학습 1회(session) ----------
  // options.sourceSessionId : 어떤 학습결과를 바탕으로 시작했는지 (재학습·재도전)
  // options.isRetry         : "틀렸던 문제 다시 도전"이면 true
  function createSession(mode, surgeryId, options) {
    options = options || {};
    const session = {
      sessionId: makeId("session"),
      anonymousUserId: getUserId(),
      mode: mode,
      surgeryId: surgeryId || null,
      isRetry: Boolean(options.isRetry),
      sourceSessionId: options.sourceSessionId || null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      questionResults: []
    };
    saveSession(session);
    return session;
  }

  function saveSession(session) {
    const all = read(KEYS.sessions, {});
    all[session.sessionId] = session;
    write(KEYS.sessions, all);
  }

  function getSession(sessionId) {
    const all = read(KEYS.sessions, {});
    return all[sessionId] || null;
  }

  // 끝까지 마친 학습 기록 목록 (최근 것이 앞)
  // modes 를 주면 그 모드만 가져옵니다. 예) ["doctor", "scrub"]
  function getFinishedSessions(modes) {
    const all = Object.values(read(KEYS.sessions, {}));
    return all
      .filter(function (s) { return s.endedAt && (!modes || modes.includes(s.mode)); })
      .sort(function (a, b) { return b.endedAt.localeCompare(a.endedAt); });
  }

  function finishSession(session) {
    session.endedAt = new Date().toISOString();
    saveSession(session);
  }


  // ---------- 문제 하나 시작 ----------
  function startQuestion(session, questionId, instrumentId) {
    const result = {
      questionId: questionId,
      instrumentId: instrumentId,
      attemptCount: 0,             // 시도 횟수
      retryCount: 0,               // 다시 말하기 횟수
      isFirstAttemptCorrect: null, // 최초 시도 정답 여부 (아직 시도 전이면 null)
      isFinalCorrect: false,       // 최종 성공 여부
      firstResponseText: null,     // 1차 응답 (다시 말하기를 해도 지워지지 않음)
      firstResponseTime: null,     // 1차 응답 반응시간
      finalResponseText: null,     // 마지막 응답
      hintUsed: false,             // 힌트 사용 여부 (아직 힌트 기능 없음)
      answerRevealed: false        // "정답 확인하기"를 눌렀는지
    };
    session.questionResults.push(result);
    saveSession(session);
    return result;
  }


  // ---------- 시도 1번 기록 ----------
  // info: { responseText, speechRecognitionText, speechAlternatives,
  //         inputMethod, selectedInstrumentId, isCorrect, responseTime }
  function addAttempt(session, questionResult, info) {
    questionResult.attemptCount += 1;
    const attemptNumber = questionResult.attemptCount;

    if (attemptNumber === 1) {
      // 최초 시도는 따로 보관하고, 이후 다시 말하기를 해도 바꾸지 않습니다.
      questionResult.isFirstAttemptCorrect = info.isCorrect;
      questionResult.firstResponseText = info.responseText;
      questionResult.firstResponseTime = info.responseTime;
    } else {
      // 두 번째 시도부터는 "다시 말하기"로 셉니다.
      questionResult.retryCount += 1;
    }

    // 한 번이라도 맞히면 최종 성공
    questionResult.isFinalCorrect = questionResult.isFinalCorrect || info.isCorrect;
    questionResult.finalResponseText = info.responseText;

    const attempt = {
      anonymousUserId: session.anonymousUserId,
      sessionId: session.sessionId,
      mode: session.mode,
      surgeryId: session.surgeryId,
      questionId: questionResult.questionId,
      instrumentId: questionResult.instrumentId,
      attemptNumber: attemptNumber,
      responseText: info.responseText,
      speechRecognitionText: info.speechRecognitionText || null,
      speechAlternatives: info.speechAlternatives || [],
      inputMethod: info.inputMethod,
      selectedInstrumentId: info.selectedInstrumentId || null,
      isCorrect: info.isCorrect,
      isFirstAttemptCorrect: questionResult.isFirstAttemptCorrect,
      isFinalCorrect: questionResult.isFinalCorrect,
      retryCount: questionResult.retryCount,
      responseTime: info.responseTime,
      hintUsed: questionResult.hintUsed,
      timestamp: new Date().toISOString()
    };

    const attempts = read(KEYS.attempts, []);
    attempts.push(attempt);
    write(KEYS.attempts, attempts);

    saveSession(session);
    return attempt;
  }

  function markAnswerRevealed(session, questionResult) {
    questionResult.answerRevealed = true;
    saveSession(session);
  }


  // ---------- 학습결과 요약 계산 ----------
  // 결과 화면과 메인 화면에서 사용합니다.
  // "재학습 필요"는 최초 시도에서 맞히지 못한 문제입니다.
  // (다시 말하기로 최종 성공했더라도 재학습 대상에 포함)
  function summarizeSession(session) {
    const results = session.questionResults;
    const count = results.length;

    const firstCorrect = results.filter(function (r) { return r.isFirstAttemptCorrect === true; }).length;
    const finalCorrect = results.filter(function (r) { return r.isFinalCorrect; }).length;

    let totalAttempts = 0;
    let retryCount = 0;
    const responseTimes = [];
    results.forEach(function (r) {
      totalAttempts += r.attemptCount;
      retryCount += r.retryCount;
      if (r.firstResponseTime !== null) responseTimes.push(r.firstResponseTime);
    });

    const wrongResults = results.filter(function (r) { return r.isFirstAttemptCorrect !== true; });
    const wrongInstrumentIds = [];
    wrongResults.forEach(function (r) {
      if (!wrongInstrumentIds.includes(r.instrumentId)) wrongInstrumentIds.push(r.instrumentId);
    });

    const sum = responseTimes.reduce(function (a, b) { return a + b; }, 0);

    return {
      questionCount: count,
      firstAttemptCorrectCount: firstCorrect,
      firstAttemptRate: count ? firstCorrect / count : null,
      finalCorrectCount: finalCorrect,
      finalRate: count ? finalCorrect / count : null,
      totalAttempts: totalAttempts,
      retryCount: retryCount,
      averageResponseTime: responseTimes.length ? sum / responseTimes.length : null,
      wrongQuestionIds: wrongResults.map(function (r) { return r.questionId; }),
      wrongInstrumentIds: wrongInstrumentIds
    };
  }


  // ---------- 사전학습: 기구별 음성인식 성공 기록 ----------
  // { metzenbaum: { success: true, attempts: 3 }, ... } 형태로 저장합니다.
  function getPrelearnStatus() {
    return read(KEYS.prelearn, {});
  }

  function updatePrelearnStatus(instrumentId, isCorrect) {
    const status = getPrelearnStatus();
    const item = status[instrumentId] || { success: false, attempts: 0 };
    item.attempts += 1;
    if (isCorrect) item.success = true;
    item.lastAt = new Date().toISOString();
    status[instrumentId] = item;
    write(KEYS.prelearn, status);
  }

  // 학습 준비도 = 음성인식에 성공한 기구 수 ÷ 전체 기구 수
  // 기준값은 js/config.js 의 MASTERY_THRESHOLD 를 사용합니다.
  function getReadiness(instruments) {
    const status = getPrelearnStatus();
    const total = instruments.length;
    const successCount = instruments.filter(function (item) {
      return status[item.id] && status[item.id].success;
    }).length;
    const ratio = total ? successCount / total : 0;

    return {
      total: total,
      successCount: successCount,
      ratio: ratio,
      percent: Math.floor(ratio * 100),   // 화면 표시용 (반올림으로 기준을 넘는 일이 없도록 버림)
      isMet: total > 0 && ratio * 100 >= MASTERY_THRESHOLD
    };
  }


  // ---------- 전체 기록 (나중에 내보내기·분석용) ----------
  function getAllAttempts() {
    return read(KEYS.attempts, []);
  }

  // 이 브라우저에 저장된 학습 기록 모두 지우기 (익명 번호는 유지)
  function clearAll() {
    try {
      localStorage.removeItem(KEYS.sessions);
      localStorage.removeItem(KEYS.attempts);
      localStorage.removeItem(KEYS.prelearn);
    } catch (error) {
      console.warn("학습 기록을 지우지 못했습니다.", error);
    }
  }


  // 다른 파일에서 쓸 수 있는 기능 목록
  return {
    getUserId: getUserId,
    createSession: createSession,
    getSession: getSession,
    getFinishedSessions: getFinishedSessions,
    finishSession: finishSession,
    startQuestion: startQuestion,
    addAttempt: addAttempt,
    markAnswerRevealed: markAnswerRevealed,
    summarizeSession: summarizeSession,
    getPrelearnStatus: getPrelearnStatus,
    updatePrelearnStatus: updatePrelearnStatus,
    getReadiness: getReadiness,
    getAllAttempts: getAllAttempts,
    clearAll: clearAll
  };
})();
