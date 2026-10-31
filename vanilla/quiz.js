import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { createLifecycle } from "./shared/lifecycle.js";

const MODEL = "openai/gpt-oss-120b";

const BANK = {
  Physics: {
    Kinematics: [
      { q: "What is the SI unit of velocity?", options: ["m/s", "m/s²", "kg·m/s", "Newton"], answer: 0 },
      { q: "A body moving with constant velocity has zero:", options: ["Speed", "Displacement", "Acceleration", "Distance"], answer: 2 },
      { q: "Distance covered per unit time is called:", options: ["Velocity", "Speed", "Acceleration", "Momentum"], answer: 1 },
      { q: "The slope of a displacement-time graph gives:", options: ["Acceleration", "Velocity", "Force", "Energy"], answer: 1 },
      { q: "If a car decelerates uniformly, its acceleration is:", options: ["Positive", "Zero", "Negative", "Infinite"], answer: 2 },
      { q: "Free fall acceleration on Earth is approximately:", options: ["8.9 m/s²", "9.8 m/s²", "10.8 m/s²", "6.6 m/s²"], answer: 1 },
      { q: "Which equation relates v, u, a, t?", options: ["v = u + at", "v = u - at²", "v² = u + 2as", "v = ut²"], answer: 0 },
      { q: "A scalar quantity has:", options: ["Magnitude and direction", "Only direction", "Only magnitude", "Neither"], answer: 2 },
      { q: "The area under a velocity-time graph gives:", options: ["Acceleration", "Displacement", "Force", "Speed"], answer: 1 },
      { q: "Uniform acceleration means acceleration is:", options: ["Changing", "Zero", "Constant", "Random"], answer: 2 },
      { q: "Which is a vector quantity?", options: ["Mass", "Speed", "Displacement", "Time"], answer: 2 },
      { q: "Negative acceleration is also called:", options: ["Retardation", "Velocity", "Momentum", "Inertia"], answer: 0 },
    ],
    "Laws of Motion": [
      { q: "Newton's First Law is also called the law of:", options: ["Inertia", "Gravitation", "Energy", "Motion"], answer: 0 },
      { q: "F = ma represents Newton's:", options: ["First Law", "Second Law", "Third Law", "Zeroth Law"], answer: 1 },
      { q: "Every action has an equal and opposite reaction — this is Newton's:", options: ["First Law", "Second Law", "Third Law", "None"], answer: 2 },
      { q: "SI unit of force is:", options: ["Joule", "Newton", "Watt", "Pascal"], answer: 1 },
      { q: "Momentum is the product of:", options: ["Mass and velocity", "Mass and acceleration", "Force and time", "Force and distance"], answer: 0 },
      { q: "An object at rest stays at rest unless acted upon by:", options: ["Gravity only", "An external force", "Friction only", "Time"], answer: 1 },
      { q: "The law of conservation of momentum applies to:", options: ["Open systems only", "Isolated systems", "Rotating bodies only", "None"], answer: 1 },
      { q: "Friction acts in a direction:", options: ["Same as motion", "Opposite to motion", "Perpendicular to motion", "Random"], answer: 1 },
      { q: "Impulse equals change in:", options: ["Velocity", "Momentum", "Force", "Mass"], answer: 1 },
      { q: "Heavier objects fall faster than lighter ones in vacuum:", options: ["True", "False", "Depends on shape", "Depends on color"], answer: 1 },
    ],
  },
  Chemistry: {
    "Atomic Structure": [
      { q: "The nucleus of an atom contains:", options: ["Electrons only", "Protons and neutrons", "Protons only", "Neutrons only"], answer: 1 },
      { q: "The charge on an electron is:", options: ["Positive", "Negative", "Neutral", "Variable"], answer: 1 },
      { q: "Isotopes have the same number of:", options: ["Neutrons", "Protons", "Electrons and neutrons", "Mass number"], answer: 1 },
      { q: "Atomic number equals the number of:", options: ["Neutrons", "Protons", "Protons + neutrons", "Electrons + neutrons"], answer: 1 },
      { q: "Which subatomic particle has negligible mass?", options: ["Proton", "Neutron", "Electron", "Nucleus"], answer: 2 },
      { q: "The maximum electrons in the K-shell is:", options: ["2", "8", "18", "32"], answer: 0 },
      { q: "Who proposed the planetary model of the atom?", options: ["Dalton", "Bohr", "Thomson", "Rutherford"], answer: 1 },
      { q: "An ion with a negative charge is called:", options: ["Cation", "Anion", "Isotope", "Radical"], answer: 1 },
      { q: "Which particle was discovered using the gold foil experiment?", options: ["Electron", "Neutron", "Nucleus", "Photon"], answer: 2 },
      { q: "Mass number = protons +", options: ["Electrons", "Neutrons", "Ions", "Isotopes"], answer: 1 },
    ],
    "Chemical Bonding": [
      { q: "Ionic bonds form by transfer of:", options: ["Neutrons", "Protons", "Electrons", "Photons"], answer: 2 },
      { q: "A covalent bond involves:", options: ["Sharing of electrons", "Transfer of electrons", "Loss of protons", "Gain of neutrons"], answer: 0 },
      { q: "Water (H2O) has what type of bond?", options: ["Ionic", "Covalent", "Metallic", "Hydrogen only"], answer: 1 },
      { q: "NaCl is an example of a:", options: ["Covalent compound", "Ionic compound", "Metallic compound", "Network solid"], answer: 1 },
      { q: "A double bond consists of how many shared electron pairs?", options: ["1", "2", "3", "4"], answer: 1 },
      { q: "Metallic bonding involves a 'sea' of:", options: ["Protons", "Neutrons", "Electrons", "Ions only"], answer: 2 },
      { q: "Which element commonly forms hydrogen bonds with hydrogen?", options: ["Carbon", "Oxygen", "Sulfur", "Sodium"], answer: 1 },
      { q: "The octet rule refers to atoms wanting:", options: ["2 electrons", "8 valence electrons", "8 protons", "8 neutrons"], answer: 1 },
    ],
  },
  Biology: {
    "Cell Biology": [
      { q: "The powerhouse of the cell is the:", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"], answer: 1 },
      { q: "Which organelle synthesizes proteins?", options: ["Ribosome", "Lysosome", "Vacuole", "Nucleolus"], answer: 0 },
      { q: "The cell membrane is mainly composed of:", options: ["Cellulose", "Phospholipids", "Chitin", "Starch"], answer: 1 },
      { q: "DNA is found primarily in the:", options: ["Cytoplasm", "Nucleus", "Mitochondria", "Cell wall"], answer: 1 },
      { q: "Plant cells, unlike animal cells, have a:", options: ["Nucleus", "Cell wall", "Mitochondria", "Cell membrane"], answer: 1 },
      { q: "Which organelle is responsible for photosynthesis?", options: ["Chloroplast", "Mitochondria", "Nucleus", "Ribosome"], answer: 0 },
      { q: "Lysosomes are known as the cell's:", options: ["Powerhouse", "Suicide bags", "Control center", "Storage units"], answer: 1 },
      { q: "The process of cell division in somatic cells is called:", options: ["Meiosis", "Mitosis", "Osmosis", "Diffusion"], answer: 1 },
      { q: "Which structure controls what enters and exits the cell?", options: ["Cell wall", "Cell membrane", "Nucleus", "Cytoplasm"], answer: 1 },
      { q: "Ribosomes are found:", options: ["Only in nucleus", "Free in cytoplasm or on ER", "Only in mitochondria", "Only in chloroplasts"], answer: 1 },
    ],
    Genetics: [
      { q: "The basic unit of heredity is called a:", options: ["Chromosome", "Gene", "Allele", "Genome"], answer: 1 },
      { q: "Humans typically have how many chromosomes?", options: ["44", "46", "48", "23"], answer: 1 },
      { q: "A cross between two heterozygous parents gives what ratio (Mendel)?", options: ["1:1", "3:1", "9:3:3:1", "1:2:1"], answer: 1 },
      { q: "DNA stands for:", options: ["Deoxyribonucleic acid", "Dinucleic acid", "Diribose acid", "Deoxy nuclear acid"], answer: 0 },
      { q: "An organism's genetic makeup is its:", options: ["Phenotype", "Genotype", "Karyotype", "Allele"], answer: 1 },
      { q: "Dominant alleles are represented by:", options: ["Lowercase letters", "Uppercase letters", "Numbers", "Symbols only"], answer: 1 },
      { q: "Sex chromosomes in humans are:", options: ["XX and XY", "AA and BB", "XY only", "ZZ and ZW"], answer: 0 },
      { q: "A change in DNA sequence is called a:", options: ["Mutation", "Mitosis", "Meiosis", "Replication"], answer: 0 },
    ],
  },
  Mathematics: {
    Algebra: [
      { q: "Solve: 2x + 4 = 10. x =", options: ["2", "3", "4", "5"], answer: 1 },
      { q: "The value of (a+b)² is:", options: ["a²+b²", "a²+2ab+b²", "a²-b²", "2ab"], answer: 1 },
      { q: "If x² = 49, x =", options: ["±7", "7 only", "-7 only", "49"], answer: 0 },
      { q: "The roots of x² - 5x + 6 = 0 are:", options: ["2,3", "1,6", "-2,-3", "2,-3"], answer: 0 },
      { q: "Simplify: 3x + 2x", options: ["5x", "6x", "x", "5x²"], answer: 0 },
      { q: "The degree of polynomial 4x³+2x-1 is:", options: ["1", "2", "3", "4"], answer: 2 },
      { q: "If f(x)=2x+1, f(3) =", options: ["5", "6", "7", "8"], answer: 2 },
      { q: "A linear equation in one variable has degree:", options: ["0", "1", "2", "Variable"], answer: 1 },
    ],
    Trigonometry: [
      { q: "sin(90°) =", options: ["0", "1", "-1", "Undefined"], answer: 1 },
      { q: "cos(0°) =", options: ["0", "1", "-1", "Undefined"], answer: 1 },
      { q: "tan(45°) =", options: ["0", "1", "√3", "Undefined"], answer: 1 },
      { q: "sin²θ + cos²θ =", options: ["0", "1", "2", "tan θ"], answer: 1 },
      { q: "The value of sin(180°) is:", options: ["1", "-1", "0", "Undefined"], answer: 2 },
      { q: "In a right triangle, the longest side is the:", options: ["Adjacent", "Opposite", "Hypotenuse", "Base"], answer: 2 },
      { q: "tan θ = sin θ /", options: ["cos θ", "sec θ", "cot θ", "csc θ"], answer: 0 },
      { q: "cos(90° - θ) =", options: ["cos θ", "sin θ", "tan θ", "-sin θ"], answer: 1 },
    ],
  },
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

  let questions = [];
  let current = 0;
  let selectedIdx = null;
  let correctCount = 0;
  let answers = [];
  let subject = "";
  let topic = "";
  let quizMode = "standard";
  let submitting = false;
  let aiController = null;

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
    Object.keys(BANK).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      els.subjectSelect.appendChild(option);
    });
    populateTopics();
  }

  function populateTopics() {
    if (!els.subjectSelect || !els.topicSelect) return;
    const subjects = BANK[els.subjectSelect.value] || {};
    els.topicSelect.replaceChildren();
    Object.keys(subjects).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      els.topicSelect.appendChild(option);
    });
  }

  function selectOption(index, element) {
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
    if (quizMode === "standard") renderStandardQuestion();
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
      label.textContent = option;

      button.append(key, label);
      lifecycle.on(button, "click", () => selectOption(index, button));
      els.optionsList.appendChild(button);
    });
  }

  function renderAIQuestion() {
    const question = questions[current];
    if (!question) return;

    selectedIdx = null;
    if (els.qCounter) {
      els.qCounter.textContent = `Question ${current + 1} / ${questions.length}`;
    }
    if (els.qTopicLabel) els.qTopicLabel.textContent = subject;
    if (els.progressFill) {
      els.progressFill.style.width = `${((current + 1) / questions.length) * 100}%`;
    }
    if (els.qText) els.qText.textContent = question.q;
    if (els.submitBtn) {
      els.submitBtn.hidden = false;
      els.submitBtn.disabled = true;
    }
    if (els.nextBtn) els.nextBtn.hidden = true;
    if (els.feedbackBox) els.feedbackBox.hidden = true;

    if (els.optionsList) {
      els.optionsList.replaceChildren();
      els.optionsList.hidden = false;
    }
    if (els.answerInput) els.answerInput.hidden = true;
    const mcqRadio = root.querySelector('input[name="ansMode"][value="mcq"]');
    if (mcqRadio) mcqRadio.checked = true;

    if (!els.optionsList) return;
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";

      const key = document.createElement("span");
      key.className = "key";
      key.textContent = option.charAt(0);

      const label = document.createElement("span");
      label.textContent = option.replace(/^[A-D][).]\s*/, "");

      button.append(key, label);
      lifecycle.on(button, "click", () => selectOption(index, button));
      els.optionsList.appendChild(button);
    });
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  function startStandard() {
    if (!els.subjectSelect || !els.topicSelect || !els.startBtn) return;
    els.startBtn.disabled = true;
    subject = els.subjectSelect.value;
    topic = els.topicSelect.value;
    const count = parseInt(els.countSelect?.value || "10", 10);
    const pool = [...(BANK[subject]?.[topic] || [])];
    shuffle(pool);
    questions = pool.slice(0, Math.min(count, pool.length));
    current = 0;
    correctCount = 0;
    answers = [];
    emitQuizEvent("quiz_started", {
      payload: { mode: "standard", totalQ: questions.length },
    });
    showQuiz();
  }

  async function callGroq(prompt, temperature, maxTokens) {
    if (aiController) aiController.abort();
    aiController = new AbortController();
    const res = await ctx.authFetch("/api/groq-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: aiController.signal,
    });
    if (!res.ok) throw new Error(`Groq proxy ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async function loadAIQuestion() {
    const index = current;
    const name = els.aiName?.value.trim() || "Student";
    const difficulty = els.aiDifficulty?.value || "medium";
    const previous = answers.map((answer) => ({
      correct: answer.isCorrect,
      topic: answer.topic,
    }));
    const lastCorrect =
      answers.length > 0 ? answers[answers.length - 1].isCorrect : null;

    let adjusted = difficulty;
    if (answers.length >= 2) {
      const recent = answers.slice(-2);
      const bothCorrect = recent.every((answer) => answer.isCorrect);
      const bothWrong = recent.every((answer) => !answer.isCorrect);
      if (bothCorrect && difficulty !== "hard") {
        adjusted = difficulty === "easy" ? "medium" : "hard";
      }
      if (bothWrong && difficulty !== "easy") {
        adjusted = difficulty === "hard" ? "medium" : "easy";
      }
    }

    const prompt = `You are an exam coach for ${name}. Generate a ${adjusted} level question about "${subject}"${topic ? ` focusing on "${topic}"` : ""}.
 Previous performance: ${answers.length} questions answered, ${previous.filter((r) => r.correct).length} correct.
 ${lastCorrect === true ? "The last answer was correct — make this slightly harder." : ""}
 ${lastCorrect === false ? "The last was wrong — make this slightly easier." : ""}

 Format your response as a JSON object with these fields:
 {
  "q": "the question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "answer": "the correct option letter (A, B, C, or D)",
  "explanation": "brief explanation of the correct answer"
 }

 Return ONLY valid JSON, no other text.`;

    let question;
    try {
      const text = await callGroq(prompt, 0.7, 500);
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      question = {
        q: String(parsed.q || ""),
        options: Array.isArray(parsed.options) ? parsed.options.map(String) : [],
        answer: String(parsed.answer || ""),
        explanation: String(parsed.explanation || ""),
      };
      if (!question.q || !question.options.length || !question.answer) {
        throw new Error("Incomplete AI question");
      }
    } catch (err) {
      if (err?.name === "AbortError" || lifecycle.disposed) return;
      console.error("AI question generation error:", err);
      question = {
        q: "What is the primary function of mitochondria in a cell?",
        options: [
          "A) Protein synthesis",
          "B) Energy production",
          "C) Lipid storage",
          "D) DNA replication",
        ],
        answer: "B",
        explanation:
          "Mitochondria are known as the powerhouse of the cell — they produce ATP through cellular respiration.",
      };
    }

    if (lifecycle.disposed || index !== current) return;
    questions[index] = question;
    if (els.startAIBtn) {
      els.startAIBtn.disabled = false;
      els.startAIBtn.textContent = "Start AI quiz";
    }
    renderAIQuestion();
  }

  async function startAI() {
    if (!els.startAIBtn) return;
    els.startAIBtn.disabled = true;
    els.startAIBtn.textContent = "Generating first question…";
    subject = els.aiSubject?.value.trim() || "General Studies";
    topic = els.aiTopic?.value.trim() || "";
    const count = parseInt(els.aiCount?.value || "10", 10);
    questions = new Array(count).fill(null);
    current = 0;
    correctCount = 0;
    answers = [];

    emitQuizEvent("quiz_started", {
      payload: { mode: "ai", totalQ: count },
    });

    if (els.aiIndicator) els.aiIndicator.hidden = false;
    if (els.answerModeRow) els.answerModeRow.hidden = false;
    if (els.nextBtn) els.nextBtn.hidden = true;
    if (els.qText) els.qText.textContent = "Generating your first question…";
    showQuiz();
    await loadAIQuestion();
  }

  async function evaluateWrittenAnswer(question, options, userAnswer) {
    const currentQuestion = questions[current];
    const prompt = `You are an exam grader for a ${subject} quiz. Evaluate this student's written answer:

Question: "${question}"
${options && options.length ? `Correct answer: "${options.find((o) => o.charAt(0) === currentQuestion?.answer) || ""}"\nAll options: ${options.join(", ")}` : ""}
Student's answer: "${userAnswer}"

Respond with EXACTLY one of these:
- "CORRECT: [brief praise]" if the answer captures the key concepts correctly
- "PARTIAL: [what was good and what was missing]"
- "INCORRECT: [what was wrong and the correct answer]"

Be generous with partial credit — if the student shows understanding, mark it CORRECT or PARTIAL.`;

    try {
      return await callGroq(prompt, 0.3, 200);
    } catch {
      return "INCORRECT: Evaluation error.";
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
      state === "partial" ? "Partially correct" : state === "correct" ? "Correct" : "Incorrect";

    const body = document.createElement("div");
    body.textContent = detail || explanation || "";

    els.feedbackBox.append(label, body);
  }

  async function submitAIAnswer() {
    if (submitting) return;
    const question = questions[current];
    if (!question) return;
    submitting = true;

    try {
      const written = selectedAnswerMode() === "written";
      let isCorrect = false;
      let explanation = "";

      if (written) {
        const userAnswer = els.answerInput?.value.trim() || "";
        if (!userAnswer) return;
        const verdict = await evaluateWrittenAnswer(
          question.q,
          question.options,
          userAnswer
        );
        if (lifecycle.disposed) return;
        explanation = verdict;
        isCorrect = verdict.startsWith("CORRECT");
        answers.push({
          q: question.q,
          selected: userAnswer,
          correct: question.answer,
          isCorrect,
          mode: "written",
          topic,
        });
        if (isCorrect) correctCount += 1;
        showFeedback(
          /^PARTIAL/i.test(verdict) ? "partial" : isCorrect,
          verdict.replace(/^(CORRECT|PARTIAL|INCORRECT):?\s*/i, ""),
          question.explanation
        );
        emitQuizEvent(isCorrect ? "question_correct" : "question_incorrect", {
          questionId: `q_${current}`,
          payload: { correct: isCorrect, mode: "written", difficulty: null, hintCount: 0 },
        });
        emitQuizEvent("question_answered", {
          questionId: `q_${current}`,
          payload: { correct: isCorrect, mode: "written" },
        });
      } else {
        const selectedText = question.options[selectedIdx] || "";
        isCorrect = selectedText.charAt(0) === question.answer;
        if (isCorrect) correctCount += 1;
        answers.push({
          q: question.q,
          selected: selectedIdx,
          correct: question.answer,
          isCorrect,
          mode: "mcq",
          topic,
        });
        showFeedback(isCorrect, "", question.explanation);
        emitQuizEvent(isCorrect ? "question_correct" : "question_incorrect", {
          questionId: `q_${current}`,
          payload: { correct: isCorrect, mode: "mcq", hintCount: 0 },
        });
        emitQuizEvent("question_answered", {
          questionId: `q_${current}`,
          payload: { correct: isCorrect, mode: "mcq" },
        });
      }

      if (els.submitBtn) els.submitBtn.hidden = true;
      if (els.nextBtn) els.nextBtn.hidden = false;

      root.querySelectorAll("#optionsList .option").forEach((option) => {
        option.style.pointerEvents = "none";
        const isRight = option.querySelector(".key")?.textContent === question.answer;
        if (isRight) option.classList.add("correct");
        else if (option.classList.contains("selected")) option.classList.add("wrong");
      });
    } finally {
      submitting = false;
    }
  }

  function nextQuestion() {
    if (quizMode === "standard") {
      const question = questions[current];
      if (!question || selectedIdx === null) return;
      const isCorrect = selectedIdx === question.answer;
      if (isCorrect) correctCount += 1;
      answers.push({
        q: question.q,
        selected: selectedIdx,
        correct: question.answer,
        isCorrect,
        mode: "mcq",
        topic,
      });
      emitQuizEvent(isCorrect ? "question_correct" : "question_incorrect", {
        questionId: `q_${current}`,
        payload: { correct: isCorrect, mode: "mcq", hintCount: 0 },
      });
      emitQuizEvent("question_answered", {
        questionId: `q_${current}`,
        payload: { correct: isCorrect, mode: "mcq" },
      });
    }

    if (current < questions.length - 1) {
      current += 1;
      if (quizMode === "ai" && !questions[current]) {
        if (els.nextBtn) els.nextBtn.hidden = true;
        if (els.submitBtn) els.submitBtn.hidden = true;
        if (els.qText) els.qText.textContent = "Generating next question…";
        if (els.progressFill) {
          els.progressFill.style.width = `${((current + 1) / questions.length) * 100}%`;
        }
        loadAIQuestion();
      } else if (quizMode === "ai") {
        renderAIQuestion();
      } else {
        renderStandardQuestion();
      }
    } else {
      finishQuiz();
    }
  }

  async function finishQuiz() {
    els.quizPanel.hidden = true;
    els.resultPanel.hidden = false;

    const total = questions.length;
    const incorrect = total - correctCount;
    const percent = total ? Math.round((correctCount / total) * 100) : 0;

    if (els.resultEmoji) {
      els.resultEmoji.textContent = percent >= 75 ? "🎉" : percent >= 50 ? "👍" : "💪";
    }
    if (els.resultScore) els.resultScore.textContent = `${percent}%`;
    if (els.resultSub) {
      els.resultSub.textContent =
        percent >= 75
          ? "Excellent work!"
          : percent >= 50
          ? "Good effort, keep practising!"
          : "Review this topic and try again!";
    }
    if (els.rCorrect) els.rCorrect.textContent = String(correctCount);
    if (els.rIncorrect) els.rIncorrect.textContent = String(incorrect);
    if (els.rTotal) els.rTotal.textContent = String(total);

    emitQuizEvent("quiz_completed", {
      payload: {
        correct: correctCount,
        totalQ: total,
        incorrect,
        accuracy: total ? correctCount / total : 0,
        mode: quizMode,
      },
    });

    if (els.savingMsg) els.savingMsg.textContent = "Saving attempt…";
    try {
      if (!ctx.user) throw new Error("Not signed in");
      await addDoc(collection(ctx.db, "users", ctx.user.uid, "quizAttempts"), {
        subject,
        topic: topic || "AI Generated",
        title: topic ? `${topic} Quiz` : `${subject} Quiz`,
        totalQ: total,
        correct: correctCount,
        incorrect,
        skipped: 0,
        score: correctCount,
        maxScore: total,
        mode: quizMode,
        takenAt: serverTimestamp(),
      });
      if (els.savingMsg) els.savingMsg.textContent = "Saved — visible on your dashboard";
    } catch (err) {
      console.error(err);
      if (els.savingMsg) {
        els.savingMsg.textContent = `Could not save attempt: ${
          err?.message || "unknown error"
        }`;
      }
    }
  }

  function toConceptId(subjectValue, topicValue) {
    const clean = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60);
    const left = clean(subjectValue);
    const right = clean(topicValue);
    if (!left) return null;
    return right ? `${left}_${right}` : left;
  }

  function emitQuizEvent(type, extra = {}) {
    if (!type || !ctx.user) return;
    const conceptId = toConceptId(subject, topic);
    const payload = { hintCount: 0, ...(extra.payload || {}) };
    ctx
      .authFetch("/api/learning-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          conceptId,
          subject: subject || null,
          topic: topic || null,
          source: "quiz",
          questionId: extra.questionId || `q_${current}`,
          payload,
          confidence: extra.confidence ?? null,
        }),
      })
      .catch(() => {});
  }

  function resetQuizState() {
    current = 0;
    correctCount = 0;
    answers = [];
    questions = [];
    selectedIdx = null;
    submitting = false;
    if (els.startBtn) els.startBtn.disabled = false;
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
      window.location.reload();
    }
  });
  root.querySelectorAll('input[name="ansMode"]').forEach((radio) => {
    lifecycle.on(radio, "change", () => toggleAnswerMode(selectedAnswerMode()));
  });

  lifecycle.add(() => {
    if (aiController) aiController.abort();
  });

  populateSubjects();
  setMode("standard");

  return () => lifecycle.dispose();
}
