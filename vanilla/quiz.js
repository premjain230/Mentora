import { createLifecycle } from "./shared/lifecycle.js";

// Canonical subjects and topics for quiz selection
// The actual question bank with answers is strictly maintained on the server in server/_quiz.js
export const SUBJECT_TOPICS = {
  Physics: [
    "Kinematics",
    "Laws of Motion",
    "Work and Energy",
    "Gravitation",
    "Thermodynamics",
    "Optics",
  ],
  Chemistry: [
    "Atomic Structure",
    "Chemical Bonding",
    "Periodic Table",
    "Acids and Bases",
    "Stoichiometry",
    "Organic Chemistry",
  ],
  Biology: [
    "Cell Biology",
    "Genetics",
    "Human Physiology",
    "Plant Physiology",
    "Ecology",
    "Evolution",
  ],
  Mathematics: [
    "Algebra",
    "Trigonometry",
    "Calculus",
    "Coordinate Geometry",
    "Probability",
    "Vectors",
  ],
};

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();

  const els = {
    setupPanel: root.querySelector("#setupPanel"),
    quizPanel: root.querySelector("#quizPanel"),
    resultPanel: root.querySelector("#resultPanel"),
    modeStandard: root.querySelector("#modeStandard"),
    modeAI: root.querySelector("#modeAI"),
    standardSetup: root.querySelector("#standardSetup"),
    aiSetup: root.querySelector("#aiSetup"),
    subjectSelect: root.querySelector("#subjectSelect"),
    topicSelect: root.querySelector("#topicSelect"),
    countSelect: root.querySelector("#countSelect"),
    startBtn: root.querySelector("#startBtn"),
    startAIBtn: root.querySelector("#startAIBtn"),
    aiName: root.querySelector("#aiName"),
    aiSubject: root.querySelector("#aiSubject"),
    aiTopic: root.querySelector("#aiTopic"),
    aiDifficulty: root.querySelector("#aiDifficulty"),
    aiCount: root.querySelector("#aiCount"),
    qCounter: root.querySelector("#qCounter"),
    qTopicLabel: root.querySelector("#qTopicLabel"),
    aiIndicator: root.querySelector("#aiIndicator"),
    progressFill: root.querySelector("#progressFill"),
    answerModeRow: root.querySelector("#answerModeRow"),
    qText: root.querySelector("#qText"),
    optionsList: root.querySelector("#optionsList"),
    answerInput: root.querySelector("#answerInput"),
    feedbackBox: root.querySelector("#feedbackBox"),
    quitBtn: root.querySelector("#quitBtn"),
    submitBtn: root.querySelector("#submitBtn"),
    nextBtn: root.querySelector("#nextBtn"),
    resultEmoji: root.querySelector("#resultEmoji"),
    resultScore: root.querySelector("#resultScore"),
    resultSub: root.querySelector("#resultSub"),
    rCorrect: root.querySelector("#rCorrect"),
    rIncorrect: root.querySelector("#rIncorrect"),
    rTotal: root.querySelector("#rTotal"),
    retakeBtn: root.querySelector("#retakeBtn"),
    savingMsg: root.querySelector("#savingMsg"),
  };

  if (!els.setupPanel || !els.quizPanel || !els.resultPanel) {
    return () => lifecycle.dispose();
  }

  // Server-authoritative session state
  let currentSession = null; // { sessionId, totalQuestions, ... }
  let questions = [];        // Public question objects (NO answer keys)
  let current = 0;
  let selectedIdx = null;
  let correctCount = 0;
  let answers = [];
  let subject = "";
  let topic = "";
  let quizMode = "standard";
  let submitting = false;
  let dynamicSubjects = { ...SUBJECT_TOPICS };

  async function quizApi(body) {
    const fetchFn = ctx.authFetch || ctx.api || window.fetch;
    const res = await fetchFn("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || `Quiz request failed (${res.status})`);
    }
    return json;
  }

  function selectedAnswerMode() {
    const checked = root.querySelector('input[name="ansMode"]:checked');
    return checked?.value === "written" ? "written" : "mcq";
  }

  function setMode(mode) {
    quizMode = mode;
    els.modeStandard?.classList.toggle("active", mode === "standard");
    els.modeAI?.classList.toggle("active", mode === "ai");
    els.modeStandard?.setAttribute("aria-selected", mode === "standard" ? "true" : "false");
    els.modeAI?.setAttribute("aria-selected", mode === "ai" ? "true" : "false");
    if (els.standardSetup) els.standardSetup.hidden = mode !== "standard";
    if (els.aiSetup) els.aiSetup.hidden = mode !== "ai";
  }

  function populateSubjects() {
    if (!els.subjectSelect) return;
    els.subjectSelect.replaceChildren();
    Object.keys(dynamicSubjects).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      els.subjectSelect.appendChild(option);
    });
    populateTopics();
  }

  function populateTopics() {
    if (!els.subjectSelect || !els.topicSelect) return;
    const topics = dynamicSubjects[els.subjectSelect.value] || [];
    els.topicSelect.replaceChildren();
    topics.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      els.topicSelect.appendChild(option);
    });
  }

  // Load subject/topic list from server if possible, keeping local fallback
  async function loadSubjectBank() {
    try {
      const fetchFn = ctx.authFetch || ctx.api || window.fetch;
      const res = await fetchFn("/api/quiz?action=bank");
      if (res.ok) {
        const data = await res.json();
        if (data && data.subjects && Object.keys(data.subjects).length > 0) {
          dynamicSubjects = data.subjects;
          populateSubjects();
        }
      }
    } catch {
      // Keep static fallback
    }
  }

  function selectOption(index, element) {
    if (submitting) return;
    root.querySelectorAll("#optionsList .option").forEach((option) => {
      option.classList.remove("selected");
    });
    element.classList.add("selected");
    selectedIdx = index;
    if (quizMode === "standard") {
      if (els.nextBtn) els.nextBtn.disabled = false;
    } else if (els.submitBtn) {
      els.submitBtn.disabled = false;
    }
  }

  function checkAnswerReady() {
    const written = selectedAnswerMode() === "written";
    if (!els.submitBtn) return;
    if (written) {
      els.submitBtn.disabled = !(els.answerInput?.value.trim() || "");
    } else {
      els.submitBtn.disabled = selectedIdx === null;
    }
  }

  function toggleAnswerMode(mode) {
    if (!els.optionsList || !els.answerInput) return;
    const written = mode === "written";
    els.optionsList.hidden = written;
    els.answerInput.hidden = !written;
    if (written) els.answerInput.focus();
    checkAnswerReady();
  }

  function showQuiz() {
    els.setupPanel.hidden = true;
    els.resultPanel.hidden = true;
    els.quizPanel.hidden = false;
    if (quizMode === "standard") {
      renderStandardQuestion();
    } else {
      renderAIQuestion();
    }
  }

  function renderStandardQuestion() {
    selectedIdx = null;
    if (els.aiIndicator) els.aiIndicator.hidden = true;
    if (els.answerModeRow) els.answerModeRow.hidden = true;
    if (els.nextBtn) {
      els.nextBtn.hidden = false;
      els.nextBtn.disabled = true;
      els.nextBtn.textContent =
        current === questions.length - 1 ? "Finish" : "Next";
    }
    if (els.submitBtn) els.submitBtn.hidden = true;
    if (els.feedbackBox) els.feedbackBox.hidden = true;

    const question = questions[current];
    if (!question) return;
    if (els.qCounter) {
      els.qCounter.textContent = `Question ${current + 1} / ${questions.length}`;
    }
    if (els.qTopicLabel) els.qTopicLabel.textContent = `${subject} · ${topic}`;
    if (els.progressFill) {
      els.progressFill.style.width = `${((current + 1) / questions.length) * 100}%`;
    }
    if (els.qText) els.qText.textContent = question.q;

    if (!els.optionsList) return;
    els.optionsList.replaceChildren();
    els.optionsList.hidden = false;
    if (els.answerInput) els.answerInput.hidden = true;

    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";

      const key = document.createElement("span");
      key.className = "key";
      key.textContent = String.fromCharCode(65 + index);

      const label = document.createElement("span");
      // Strip any existing prefix like "A) "
      label.textContent = String(option).replace(/^[A-D][).]\s*/, "");

      button.append(key, label);
      lifecycle.on(button, "click", () => selectOption(index, button));
      els.optionsList.appendChild(button);
    });
  }

  function renderAIQuestion() {
    const question = questions[current];
    if (!question) return;

    selectedIdx = null;
    if (els.aiIndicator) els.aiIndicator.hidden = false;
    if (els.answerModeRow) els.answerModeRow.hidden = false;
    if (els.qCounter) {
      els.qCounter.textContent = `Question ${current + 1} / ${questions.length}`;
    }
    if (els.qTopicLabel) els.qTopicLabel.textContent = topic ? `${subject} · ${topic}` : subject;
    if (els.progressFill) {
      els.progressFill.style.width = `${((current + 1) / questions.length) * 100}%`;
    }
    if (els.qText) els.qText.textContent = question.q;
    if (els.submitBtn) {
      els.submitBtn.hidden = false;
      els.submitBtn.disabled = true;
      els.submitBtn.textContent = "Submit answer";
    }
    if (els.nextBtn) els.nextBtn.hidden = true;
    if (els.feedbackBox) els.feedbackBox.hidden = true;

    if (els.optionsList) {
      els.optionsList.replaceChildren();
      els.optionsList.hidden = false;
    }
    if (els.answerInput) {
      els.answerInput.hidden = true;
      els.answerInput.value = "";
    }
    const mcqRadio = root.querySelector('input[name="ansMode"][value="mcq"]');
    if (mcqRadio) mcqRadio.checked = true;

    if (!els.optionsList) return;
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";

      const key = document.createElement("span");
      key.className = "key";
      key.textContent = String.fromCharCode(65 + index);

      const label = document.createElement("span");
      label.textContent = String(option).replace(/^[A-D][).]\s*/, "");

      button.append(key, label);
      lifecycle.on(button, "click", () => selectOption(index, button));
      els.optionsList.appendChild(button);
    });
  }

  async function startStandard() {
    if (!els.subjectSelect || !els.topicSelect || !els.startBtn) return;
    els.startBtn.disabled = true;
    els.startBtn.textContent = "Starting quiz…";

    subject = els.subjectSelect.value;
    topic = els.topicSelect.value;
    const count = parseInt(els.countSelect?.value || "10", 10);

    try {
      const res = await quizApi({
        action: "start_quiz",
        mode: "standard",
        subject,
        topic,
        count,
      });

      const qList = res.questions || res.session?.questions;
      const sId = res.sessionId || res.session?.sessionId;
      if (!qList || !qList.length || !sId) {
        throw new Error(res.error || "Failed to initialize quiz session");
      }

      currentSession = { sessionId: sId, mode: res.mode || res.session?.mode || "standard", subject, topic };
      questions = qList;
      current = 0;
      correctCount = 0;
      answers = [];

      showQuiz();
    } catch (err) {
      console.error("Failed to start standard quiz:", err);
      alert(`Could not start quiz: ${err.message || "Network error"}`);
    } finally {
      if (els.startBtn) {
        els.startBtn.disabled = false;
        els.startBtn.textContent = "Start quiz";
      }
    }
  }

  async function startAI() {
    if (!els.startAIBtn) return;
    els.startAIBtn.disabled = true;
    els.startAIBtn.textContent = "Generating AI questions…";

    subject = els.aiSubject?.value.trim() || "General Studies";
    topic = els.aiTopic?.value.trim() || "";
    const difficulty = els.aiDifficulty?.value || "medium";
    const count = parseInt(els.aiCount?.value || "10", 10);
    const studentName = els.aiName?.value.trim() || ctx.userData?.displayName || "Student";

    try {
      const res = await quizApi({
        action: "start_quiz",
        mode: "ai",
        subject,
        topic,
        count,
        difficulty,
        studentName,
        name: studentName,
      });

      const qList = res.questions || res.session?.questions;
      const sId = res.sessionId || res.session?.sessionId;
      if (!qList || !qList.length || !sId) {
        throw new Error(res.error || "Failed to generate AI questions");
      }

      currentSession = { sessionId: sId, mode: res.mode || res.session?.mode || "ai", subject, topic };
      questions = qList;
      current = 0;
      correctCount = 0;
      answers = [];

      showQuiz();
    } catch (err) {
      console.error("Failed to start AI quiz:", err);
      alert(`Could not generate AI quiz: ${err.message || "Network error"}`);
    } finally {
      if (els.startAIBtn) {
        els.startAIBtn.disabled = false;
        els.startAIBtn.textContent = "Start AI quiz";
      }
    }
  }

  function showFeedback(kind, detail, explanation) {
    if (!els.feedbackBox) return;
    const state = kind === "partial" ? "partial" : kind ? "correct" : "incorrect";
    els.feedbackBox.hidden = false;
    els.feedbackBox.className = `feedback-box ${state}`;
    els.feedbackBox.replaceChildren();

    const label = document.createElement("div");
    label.className = "fb-label";
    label.textContent =
      state === "partial"
        ? "Partially correct"
        : state === "correct"
        ? "Correct"
        : "Incorrect";

    const body = document.createElement("div");
    body.textContent = detail || explanation || "";

    els.feedbackBox.append(label, body);
  }

  async function submitAIAnswer() {
    if (submitting || !currentSession) return;
    const question = questions[current];
    if (!question) return;

    submitting = true;
    if (els.submitBtn) {
      els.submitBtn.disabled = true;
      els.submitBtn.textContent = "Verifying…";
    }

    try {
      const written = selectedAnswerMode() === "written";

      if (written) {
        const userAnswer = els.answerInput?.value.trim() || "";
        if (!userAnswer) return;

        const res = await quizApi({
          action: "evaluate_written",
          sessionId: currentSession.sessionId,
          questionIndex: current,
          answer: userAnswer,
          userAnswer,
        });

        if (lifecycle.disposed) return;
        const isCorrect = Boolean(res.isCorrect ?? res.correct);
        if (isCorrect) correctCount += 1;
        answers.push({
          q: question.q,
          selected: userAnswer,
          isCorrect,
          mode: "written",
          topic,
        });

        const isPartial = Boolean(res.partial) || /^PARTIAL/i.test(res.verdict || "");
        showFeedback(
          isPartial ? "partial" : isCorrect,
          res.verdict ? res.verdict.replace(/^(CORRECT|PARTIAL|INCORRECT):?\s*/i, "") : "",
          res.explanation
        );
      } else {
        if (selectedIdx === null) return;

        const res = await quizApi({
          action: "submit_answer",
          sessionId: currentSession.sessionId,
          questionIndex: current,
          choice: selectedIdx,
        });

        if (lifecycle.disposed) return;
        const isCorrect = Boolean(res.isCorrect ?? res.correct);
        if (isCorrect) correctCount += 1;
        answers.push({
          q: question.q,
          selected: selectedIdx,
          isCorrect,
          mode: "mcq",
          topic,
        });

        showFeedback(isCorrect, "", res.explanation);

        // Highlight options based on server-verified answer
        const correctLetter = res.correctAnswer || res.answer;
        root.querySelectorAll("#optionsList .option").forEach((option, idx) => {
          option.style.pointerEvents = "none";
          const keyText = option.querySelector(".key")?.textContent;
          if (correctLetter && keyText === correctLetter) {
            option.classList.add("correct");
          } else if (idx === selectedIdx && !isCorrect) {
            option.classList.add("wrong");
          }
        });
      }

      if (els.submitBtn) els.submitBtn.hidden = true;
      if (els.nextBtn) {
        els.nextBtn.hidden = false;
        els.nextBtn.disabled = false;
        els.nextBtn.textContent =
          current === questions.length - 1 ? "Finish" : "Next";
      }
    } catch (err) {
      console.error("AI answer evaluation error:", err);
      alert(`Could not verify answer: ${err.message || "Network error"}`);
      if (els.submitBtn) {
        els.submitBtn.disabled = false;
        els.submitBtn.textContent = "Submit answer";
      }
    } finally {
      submitting = false;
    }
  }

  async function nextQuestion() {
    if (submitting || !currentSession) return;

    if (quizMode === "standard") {
      const question = questions[current];
      if (!question || selectedIdx === null) return;

      submitting = true;
      if (els.nextBtn) els.nextBtn.disabled = true;

      try {
        const res = await quizApi({
          action: "submit_answer",
          sessionId: currentSession.sessionId,
          questionIndex: current,
          choice: selectedIdx,
        });

        const isCorrect = Boolean(res.isCorrect ?? res.correct);
        if (isCorrect) correctCount += 1;
        answers.push({
          q: question.q,
          selected: selectedIdx,
          isCorrect,
          mode: "mcq",
          topic,
        });

        if (current < questions.length - 1) {
          current += 1;
          renderStandardQuestion();
        } else {
          await finishQuiz();
        }
      } catch (err) {
        console.error("Failed to submit standard answer:", err);
        alert(`Failed to save answer: ${err.message || "Network error"}`);
        if (els.nextBtn) els.nextBtn.disabled = false;
      } finally {
        submitting = false;
      }
    } else {
      // AI mode already submitted and showed feedback
      if (current < questions.length - 1) {
        current += 1;
        renderAIQuestion();
      } else {
        await finishQuiz();
      }
    }
  }

  async function finishQuiz() {
    els.quizPanel.hidden = true;
    els.resultPanel.hidden = false;
    if (els.savingMsg) els.savingMsg.textContent = "Finalizing verified score…";

    try {
      const res = await quizApi({
        action: "finish_quiz",
        sessionId: currentSession.sessionId,
      });

      const total = res.total ?? questions.length;
      const score = res.score ?? correctCount;
      const incorrect = res.incorrectCount ?? res.incorrect ?? (total - score);
      const percent = res.percentage ?? (total ? Math.round((score / total) * 100) : 0);

      if (els.resultEmoji) {
        els.resultEmoji.textContent = percent >= 75 ? "🎉" : percent >= 50 ? "👍" : "💪";
      }
      if (els.resultScore) els.resultScore.textContent = `${percent}%`;
      if (els.resultSub) {
        els.resultSub.textContent =
          percent >= 75
            ? "Excellent work! Verified mastery recorded."
            : percent >= 50
            ? "Good effort, keep practising!"
            : "Review this topic and try again!";
      }
      if (els.rCorrect) els.rCorrect.textContent = String(score);
      if (els.rIncorrect) els.rIncorrect.textContent = String(incorrect);
      if (els.rTotal) els.rTotal.textContent = String(total);
      if (els.savingMsg) els.savingMsg.textContent = "Verified attempt saved to your learning profile";
    } catch (err) {
      console.error("Failed to finish quiz session:", err);
      // Fallback display
      const total = questions.length;
      const incorrect = total - correctCount;
      const percent = total ? Math.round((correctCount / total) * 100) : 0;
      if (els.resultScore) els.resultScore.textContent = `${percent}%`;
      if (els.rCorrect) els.rCorrect.textContent = String(correctCount);
      if (els.rIncorrect) els.rIncorrect.textContent = String(incorrect);
      if (els.rTotal) els.rTotal.textContent = String(total);
      if (els.savingMsg) els.savingMsg.textContent = `Attempt finished with warning: ${err.message}`;
    }
  }

  function resetQuizState() {
    currentSession = null;
    current = 0;
    correctCount = 0;
    answers = [];
    questions = [];
    selectedIdx = null;
    submitting = false;
    if (els.startBtn) {
      els.startBtn.disabled = false;
      els.startBtn.textContent = "Start quiz";
    }
    if (els.startAIBtn) {
      els.startAIBtn.disabled = false;
      els.startAIBtn.textContent = "Start AI quiz";
    }
  }

  lifecycle.on(els.modeStandard, "click", () => setMode("standard"));
  lifecycle.on(els.modeAI, "click", () => setMode("ai"));
  lifecycle.on(els.subjectSelect, "change", populateTopics);
  lifecycle.on(els.startBtn, "click", startStandard);
  lifecycle.on(els.startAIBtn, "click", startAI);
  lifecycle.on(els.answerInput, "input", checkAnswerReady);
  lifecycle.on(els.submitBtn, "click", submitAIAnswer);
  lifecycle.on(els.nextBtn, "click", nextQuestion);
  lifecycle.on(els.retakeBtn, "click", () => {
    els.resultPanel.hidden = true;
    els.setupPanel.hidden = false;
    resetQuizState();
  });
  lifecycle.on(els.quitBtn, "click", () => {
    if (window.confirm("Quit this quiz? Your progress won't be saved.")) {
      els.quizPanel.hidden = true;
      els.resultPanel.hidden = true;
      els.setupPanel.hidden = false;
      resetQuizState();
    }
  });
  root.querySelectorAll('input[name="ansMode"]').forEach((radio) => {
    lifecycle.on(radio, "change", () => toggleAnswerMode(selectedAnswerMode()));
  });

  populateSubjects();
  setMode("standard");
  loadSubjectBank();

  return () => lifecycle.dispose();
}
