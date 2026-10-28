"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";
import { VisualLesson } from "../../components/learning/VisualLesson";
import {
  AdaptiveRail,
  CheckCard,
  CompletionCard,
  MasteryMeter,
  PrerequisiteChips,
  TeachingContent,
} from "../../components/learning/LessonBlocks";
import {
  callTutor,
  emitLearningEvent,
  formatRelativeRevision,
  TutorError,
  type CatalogChapter,
  type CatalogResponse,
  type CheckQuestion,
  type Evaluation,
  type EvaluationResponse,
  type HubLast,
  type Lesson,
  type LessonAttempt,
  type LessonResponse,
  type MasterySummary,
  type SessionSummary,
  type StateResponse,
} from "../../lib/learning/types";

interface Selection {
  track: string;
  classNum: number | null;
  subject: string;
  query: string;
}

const EMPTY_SELECTION: Selection = { track: "", classNum: null, subject: "", query: "" };

function contextFromConceptId(conceptId: string): { track: string; classNum: number | null } {
  const parts = String(conceptId || "").split(".");
  if (parts[0] === "jee") return { track: parts[1] === "advanced" ? "jee_advanced" : "jee_main", classNum: null };
  if (parts[0] === "neet") return { track: "neet", classNum: null };
  if (parts[0] === "cbse" || parts[0] === "maharashtra") {
    return { track: parts[0], classNum: Number(parts[1]) || null };
  }
  return { track: "", classNum: null };
}

function sourceLabel(source: string): string {
  if (source === "authored") return "Reviewed lesson";
  if (source === "ai") return "AI-generated, not yet reviewed";
  if (source === "unavailable") return "Curriculum outline only";
  return source;
}

export default function LearningHubPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [catalog, setCatalog] = useState<CatalogResponse["catalog"] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [continueTopic, setContinueTopic] = useState<HubLast | null>(null);
  const [query, setQuery] = useState("");

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [check, setCheck] = useState<CheckQuestion | null>(null);
  const [pendingNext, setPendingNext] = useState<CheckQuestion | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [attempts, setAttempts] = useState<LessonAttempt[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [mastery, setMastery] = useState<MasterySummary | null>(null);
  const [review, setReview] = useState<StateResponse["review"]>(null);
  const [nextChapter, setNextChapter] = useState<StateResponse["nextChapter"]>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [progressNotice, setProgressNotice] = useState<string | null>(null);
  const [reteachNotice, setReteachNotice] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestedConceptRef = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchCatalog = useCallback(
    async (next: Selection) => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const payload: Record<string, unknown> = {};
        if (next.track) payload.track = next.track;
        if (next.classNum) payload.classNum = next.classNum;
        if (next.subject) payload.subject = next.subject;
        if (next.query) payload.query = next.query;
        const res = await callTutor<CatalogResponse>(getToken, "catalog", payload);
        setCatalog(res.catalog);
        if (res.hub?.last) setContinueTopic(res.hub.last);
        setSelection((prev) => ({
          ...next,
          classNum: res.catalog.classNum ?? next.classNum,
          subject: res.catalog.subject ?? next.subject,
          query: next.query ?? prev.query,
        }));
      } catch (err) {
        setCatalogError(err instanceof TutorError ? err.message : "The curriculum could not be loaded. Please retry.");
      } finally {
        setCatalogLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    void fetchCatalog(EMPTY_SELECTION);
  }, [user, fetchCatalog]);

  const refreshState = useCallback(
    async (conceptId: string) => {
      try {
        const res = await callTutor<StateResponse>(getToken, "state", {
          conceptId,
          track: selection.track || undefined,
          classNum: selection.classNum || undefined,
        });
        setMastery(res.mastery);
        setReview(res.review);
        setNextChapter(res.nextChapter);
      } catch (_) {
        /* Progress display is best-effort; the lesson itself must keep working. */
      }
    },
    [getToken, selection.track, selection.classNum]
  );

  const loadLesson = useCallback(
    async (conceptId: string, opts: { mode?: "start" | "reteach"; focus?: string; keepAttempts?: boolean } = {}) => {
      setLessonLoading(true);
      setLessonError(null);
      requestedConceptRef.current = conceptId;
      setEvaluation(null);
      setPendingNext(null);
      setReteachNotice(null);
      setProgressNotice(null);
      try {
        const useAttempts = opts.mode === "reteach" && opts.keepAttempts ? attempts : [];
        const res = await callTutor<LessonResponse>(getToken, "lesson", {
          conceptId,
          track: selection.track || undefined,
          classNum: selection.classNum || undefined,
          subject: selection.subject || undefined,
          mode: opts.mode || "start",
          focus: opts.focus || undefined,
          attempts: useAttempts,
          surface: "hub",
          persistGenerated: false,
        });
        setLesson(res.lesson);
        setCheck(res.lesson.check);
        setAttempts(useAttempts);
        setSessionSummary(res.lesson.session || null);
        setMastery(res.state.mastery);
        setReview(res.state.review);
        setNextChapter(res.lesson.nextStep?.nextChapter || null);
        setLessonLoading(false);
        window.setTimeout(() => headingRef.current?.focus(), 60);
      } catch (err) {
        setLessonLoading(false);
        const message = err instanceof TutorError ? err.message : "This chapter could not be prepared. Please retry.";
        setLessonError(message);
      }
    },
    [attempts, getToken, selection]
  );

  const openChapter = (chapter: { conceptId: string; name: string; subject?: string }) => {
    setSelection((prev) => ({ ...prev, subject: chapter.subject || prev.subject, query: "" }));
    void loadLesson(chapter.conceptId, { mode: "start" });
  };

  const resumeTopic = (topic: HubLast) => {
    const derived = contextFromConceptId(topic.conceptId);
    setSelection((prev) => ({ ...prev, track: derived.track || prev.track, classNum: derived.classNum ?? prev.classNum, subject: topic.subject || prev.subject }));
    void loadLesson(topic.conceptId, { mode: "start" });
  };

  const submitAnswer = async (answer: string) => {
    if (!lesson || !check || evaluating) return;
    setEvaluating(true);
    setProgressNotice(null);
    try {
      const data = await callTutor<EvaluationResponse>(getToken, "evaluate", {
        conceptId: lesson.conceptId,
        track: selection.track || undefined,
        classNum: selection.classNum || undefined,
        subject: lesson.subject || selection.subject || undefined,
        topic: lesson.name,
        question: check.prompt,
        questionId: check.questionId,
        difficulty: check.difficulty,
        level: lesson.level,
        answer,
        attempts,
        attemptCount: attempts.length,
        surface: "hub",
        cacheKey: (check as CheckQuestion & { cacheKey?: string }).cacheKey || lesson.cacheKey || undefined,
      });
      setEvaluation(data.evaluation);
      setAttempts(data.attempts);
      setPendingNext(data.nextQuestion);
      setSessionSummary(data.session);
      if (data.nextLevel && data.nextLevel !== lesson.level) {
        setLesson((prev) => (prev ? { ...prev, level: data.nextLevel } : prev));
      }
      if (data.learningEvent) {
        const saved = await emitLearningEvent(getToken, {
          ...data.learningEvent,
          eventId: `hub_${lesson.conceptId}_${Date.now()}`,
          source: "study_session",
        });
        if (!saved) {
          setProgressNotice("Your feedback is shown, but this answer could not be saved to long-term progress. Retrying will not create duplicates.");
        } else {
          await refreshState(lesson.conceptId);
        }
      }
    } catch (err) {
      const message = err instanceof TutorError ? err.message : "Your answer could not be checked. Please retry.";
      throw new TutorError(message, { status: err instanceof TutorError ? err.status : 0 });
    } finally {
      setEvaluating(false);
    }
  };

  const advanceToNextQuestion = () => {
    if (!pendingNext) return;
    setCheck(pendingNext);
    setPendingNext(null);
    setEvaluation(null);
    setReteachNotice(null);
    window.setTimeout(() => headingRef.current?.focus(), 40);
  };

  const reteach = () => {
    if (!lesson) return;
    const focus =
      evaluation?.misconception?.label ||
      evaluation?.missing[0] ||
      "The student needs a different explanation of this idea";
    setReteachNotice(focus);
    void loadLesson(lesson.conceptId, { mode: "reteach", focus, keepAttempts: true });
  };

  const closeSession = () => {
    setLesson(null);
    setCheck(null);
    setEvaluation(null);
    setPendingNext(null);
    setSessionSummary(null);
    setLessonError(null);
    setReteachNotice(null);
    if (selection.track) void fetchCatalog(selection);
  };

  const activeRail = sessionSummary?.completed
    ? 6
    : evaluation
    ? pendingNext && evaluation.verdict !== "correct"
      ? 5
      : 4
    : check
    ? 3
    : lesson
    ? 2
    : 1;

  const revisionAt = review?.nextReviewAt || lesson?.revision?.nextReviewAt || null;
  const revisionLabel = formatRelativeRevision(revisionAt);

  const showBack = () => {
    if (selection.subject && catalog?.step === "chapter") {
      void fetchCatalog({ ...selection, subject: "", query: "" });
      setQuery("");
      return;
    }
    if (selection.classNum && catalog?.step === "subject") {
      void fetchCatalog({ ...selection, classNum: null, subject: "", query: "" });
      return;
    }
    if (selection.track) {
      void fetchCatalog({ ...EMPTY_SELECTION });
      setQuery("");
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>AI Learning Hub</span>
          </div>
          <span className="chat-topbar-tag">Adaptive loop</span>
        </div>
      </div>

      <div className="lh-content">
        <div className="lh-wrap hub-shell">
          {lesson || lessonLoading ? (
            <section className="hub-session" aria-busy={lessonLoading}>
              <button type="button" className="hub-back" onClick={closeSession}>
                ← Back to chapters
              </button>

              {lessonLoading && (
                <div className="hub-loading" role="status">
                  <span className="chat-typing" aria-hidden="true"><i /><i /><i /></span>
                  Preparing this chapter…
                </div>
              )}

              {lessonError && !lessonLoading && (
                <div className="hub-error" role="alert">
                  <p>{lessonError}</p>
                  {requestedConceptRef.current && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => requestedConceptRef.current && void loadLesson(requestedConceptRef.current, { mode: "start" })}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {lesson && !lessonLoading && (
                <>
                  <header className="hub-session-head">
                    <p className="lh-eyebrow">
                      {lesson.trackLabel || (selection.track ? selection.track.replace("_", " ") : "Learning Hub")}
                      {selection.classNum ? ` · Class ${selection.classNum}` : ""}
                      {lesson.subject ? ` · ${lesson.subject}` : ""}
                    </p>
                    <h1 className="lh-hero-title lh-hero-title--sm" ref={headingRef} tabIndex={-1}>
                      {lesson.name}
                    </h1>
                    <div className="hub-meta-row">
                      <span className={`lh-pill ${lesson.level === "advanced" ? "lh-pill--accent" : ""}`}>
                        {lesson.level.charAt(0).toUpperCase() + lesson.level.slice(1)} level
                      </span>
                      <span className="lh-pill">{sourceLabel(lesson.source)}</span>
                      {lesson.retry && <span className="lh-pill lh-pill--warn">AI unavailable</span>}
                      {revisionLabel && <span className="lh-pill lh-pill--ok">Revision {revisionLabel}</span>}
                    </div>
                  </header>

                  <AdaptiveRail activeIndex={activeRail} />

                  <div className="hub-session-grid">
                    <div className="hub-main">
                      <section className="hub-block" aria-labelledby="hub-known">
                        <h2 id="hub-known" className="hub-block-title">What you already know</h2>
                        <MasteryMeter mastery={mastery || lesson.mastery} session={sessionSummary || undefined} />
                        <PrerequisiteChips prerequisites={lesson.prerequisites || []} />
                      </section>

                      {reteachNotice && (
                        <p className="learn-callout learn-callout--accent">
                          Changing the explanation: we are starting from a different route — {reteachNotice}.
                        </p>
                      )}

                      <section className="hub-block" aria-labelledby="hub-explain">
                        <h2 id="hub-explain" className="hub-block-title">Explanation</h2>
                        <TeachingContent
                          directAnswer={lesson.intro || ""}
                          sections={lesson.sections || []}
                          example={lesson.workedExample}
                          advanced={lesson.advanced || null}
                          generatedNotice={lesson.generatedNotice}
                          level={lesson.level}
                          source={lesson.source}
                          reviewed={lesson.reviewed}
                          exampleFirst={!!lesson.reteach}
                        />                        {lesson.reteach?.note && <p className="learn-callout learn-callout--soft">{lesson.reteach.note}</p>}
                        {lesson.source === "unavailable" && (
                          <button type="button" className="btn btn-secondary" onClick={() => void loadLesson(lesson.conceptId, { mode: "start" })}>
                            Retry preparing the lesson
                          </button>
                        )}
                      </section>

                      {check && (
                        <section className="hub-block hub-practice" aria-labelledby="hub-practice">
                          <h2 id="hub-practice" className="hub-block-title">Practice</h2>
                          <CheckCard
                            key={check.questionId}
                            check={check}
                            evaluation={evaluation}
                            submitting={evaluating}
                            onSubmit={submitAnswer}
                            onExplainDifferently={reteach}
                            submitLabel="Submit answer"
                            disabled={!!evaluation && evaluation.verdict !== "unknown"}
                          />
                          {evaluation && pendingNext && !sessionSummary?.completed && (
                            <div className="hub-next-row">
                              <button type="button" className="btn btn-primary" onClick={advanceToNextQuestion}>
                                Next question →
                              </button>
                              {evaluation.verdict !== "correct" && (
                                <p className="hub-next-note">Or change the explanation first — the next question is one level easier.</p>
                              )}
                            </div>
                          )}
                        </section>
                      )}

                      {sessionSummary?.completed && (
                        <CompletionCard
                          session={sessionSummary}
                          revisionNote={revisionLabel}
                          revisionAt={revisionAt}
                          nextStep={
                            nextChapter
                              ? { kind: "complete", label: `Next: ${nextChapter.name}` }
                              : lesson.nextStep
                          }
                          onNext={
                            nextChapter
                              ? () => openChapter({ conceptId: nextChapter.conceptId, name: nextChapter.name, subject: nextChapter.subject })
                              : undefined
                          }
                          onExit={closeSession}
                        />
                      )}

                      {lesson.completed && !sessionSummary?.completed && (
                        <div className="hub-complete-callout">
                          <p>{lesson.nextStep?.label || "You have reached the end of this chapter."}</p>
                          <button type="button" className="btn btn-secondary" onClick={closeSession}>
                            Choose another chapter
                          </button>
                        </div>
                      )}

                      {progressNotice && <p className="learn-callout learn-callout--warn" role="status">{progressNotice}</p>}
                    </div>

                    <aside className="hub-side">
                      {lesson.visual ? (
                        <VisualLesson visual={lesson.visual} />
                      ) : (
                        <div className="hub-card hub-card--muted">
                          <h3 className="hub-card-title">Visual</h3>
                          <p className="hub-card-text">No approved visual is a good fit for this chapter. The written explanation and worked example carry the lesson.</p>
                        </div>
                      )}

                      <div className="hub-card">
                        <h3 className="hub-card-title">Remember</h3>
                        <p className="hub-card-text">
                          {revisionLabel
                            ? `Next revision ${revisionLabel}. Short, spaced reviews are what keep this topic available later.`
                            : "Finish the practice questions to schedule a revision."}
                        </p>
                        {review?.state && <p className="hub-card-text hub-card-meta">Review state: {review.state.replace(/_/g, " ")}</p>}
                      </div>

                      <div className="hub-card">
                        <h3 className="hub-card-title">Next step</h3>
                        <p className="hub-card-text">
                          {sessionSummary?.completed
                            ? nextChapter
                              ? `Next chapter: ${nextChapter.name}${nextChapter.difficultyLabel ? ` (${nextChapter.difficultyLabel})` : ""}.`
                              : "This is the last chapter in this subject. A short review tomorrow is the next step."
                            : "Answer the check question. The tutor will adapt the difficulty from your reasoning."}
                        </p>
                        {nextChapter && sessionSummary?.completed && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => openChapter({ conceptId: nextChapter.conceptId, name: nextChapter.name, subject: nextChapter.subject })}
                          >
                            Open {nextChapter.name}
                          </button>
                        )}
                      </div>
                    </aside>
                  </div>
                </>
              )}
            </section>
          ) : (
            <>
              <header className="hub-pick-head">
                <p className="lh-eyebrow">Choose a topic</p>
                <h1 className="lh-hero-title">
                  {catalog?.step === "chapter"
                    ? "Pick a chapter"
                    : catalog?.step === "subject"
                    ? "Which subject?"
                    : catalog?.step === "class"
                    ? "Which class are you in?"
                    : "What do you want to understand?"}
                </h1>
                <p className="lh-hero-sub">
                  Short explanations, a visual where it helps, and a question that adapts to your answer. Your progress is saved as you go.
                </p>
              </header>

              {continueTopic && (
                <div className="hub-continue">
                  <div>
                    <span className="hub-continue-label">Continue where you left off</span>
                    <span className="hub-continue-title">{continueTopic.name}</span>
                    <span className="hub-continue-meta">{continueTopic.subject}</span>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => resumeTopic(continueTopic)}>
                    Resume
                  </button>
                </div>
              )}

              {catalogLoading && !catalog && (
                <div className="hub-loading" role="status">
                  <span className="chat-typing" aria-hidden="true"><i /><i /><i /></span>
                  Loading your curriculum…
                </div>
              )}

              {catalogError && (
                <div className="hub-error" role="alert">
                  <p>{catalogError}</p>
                  <button type="button" className="btn btn-secondary" onClick={() => void fetchCatalog(selection)}>
                    Retry
                  </button>
                </div>
              )}

              {catalog && (
                <>
                  {catalog.step !== "board" && (
                    <nav className="hub-breadcrumb" aria-label="Your selection">
                      <button type="button" className="hub-back" onClick={showBack}>
                        ← {catalog.step === "chapter" ? selection.subject || "Subjects" : catalog.step === "subject" ? `Class ${selection.classNum || ""}` : "Boards"}
                      </button>
                      <span className="hub-breadcrumb-text">
                        {catalog.track ? catalog.track.label : ""}
                        {catalog.classNum ? ` · Class ${catalog.classNum}` : ""}
                        {catalog.subject ? ` · ${catalog.subject}` : ""}
                      </span>
                    </nav>
                  )}

                  {catalog.track?.notice && <p className="lh-notice">{catalog.track.notice}</p>}

                  {catalog.step === "board" && (
                    <div className="hub-grid hub-grid--boards">
                      {(catalog.tracks || []).map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          className="hub-board-card"
                          onClick={() => {
                            setSelection({ track: track.id, classNum: null, subject: "", query: "" });
                            void fetchCatalog({ track: track.id, classNum: null, subject: "", query: "" });
                          }}
                        >
                          <span className="hub-board-label">{track.label}</span>
                          <span className="hub-board-sub">{track.grades ? "Class 9–12" : "Exam preparation"}</span>
                          <span className="hub-board-count">{track.chapterCount} chapters</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {catalog.step === "class" && (
                    <div className="hub-grid hub-grid--classes">
                      {(catalog.classes || []).map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          className="hub-class-card"
                          onClick={() => {
                            setSelection((prev) => ({ ...prev, classNum: cls, subject: "", query: "" }));
                            void fetchCatalog({ ...selection, classNum: cls, subject: "", query: "" });
                          }}
                        >
                          <span className="hub-class-num">Class {cls}</span>
                          <span className="hub-class-sub">Subjects from your board syllabus</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {catalog.step === "subject" && (
                    <div className="hub-grid hub-grid--subjects">
                      {(catalog.subjects || []).map((subject) => (
                        <button
                          key={subject.name}
                          type="button"
                          className="hub-subject-card"
                          onClick={() => {
                            setSelection((prev) => ({ ...prev, subject: subject.name, query: "" }));
                            void fetchCatalog({ ...selection, subject: subject.name, query: "" });
                          }}
                        >
                          <span className="hub-subject-name">{subject.name}</span>
                          <span className="hub-subject-count">{subject.count} chapters</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {catalog.step === "chapter" && (
                    <>
                      <form
                        className="hub-search"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void fetchCatalog({ ...selection, query });
                        }}
                        role="search"
                      >
                        <label className="lh-sr-only" htmlFor="hub-search-input">Search chapters</label>
                        <input
                          id="hub-search-input"
                          className="hub-search-input"
                          type="search"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search chapters in this subject…"
                        />
                        {selection.query && (
                          <button
                            type="button"
                            className="hub-search-clear"
                            onClick={() => {
                              setQuery("");
                              void fetchCatalog({ ...selection, query: "" });
                            }}
                            aria-label="Clear search"
                          >
                            ×
                          </button>
                        )}
                        <button type="submit" className="btn btn-secondary">Search</button>
                      </form>

                      <div className="hub-chapters">
                        {(catalog.chapters || []).map((chapter: CatalogChapter) => (
                          <button
                            key={chapter.conceptId}
                            type="button"
                            className="hub-chapter"
                            onClick={() => openChapter(chapter)}
                          >
                            <span className="hub-chapter-num">{chapter.number}</span>
                            <span className="hub-chapter-body">
                              <span className="hub-chapter-name">{chapter.name}</span>
                              <span className="hub-chapter-meta">
                                {chapter.difficultyLabel}
                                {chapter.prerequisites.length > 0 ? ` · ${chapter.prerequisites.length} prerequisite${chapter.prerequisites.length === 1 ? "" : "s"}` : ""}
                                {chapter.progress?.status ? ` · ${chapter.progress.status.replace(/_/g, " ")}` : ""}
                              </span>
                            </span>
                            <span className="hub-chapter-arrow" aria-hidden="true">→</span>
                          </button>
                        ))}
                        {(!catalog.chapters || catalog.chapters.length === 0) && (
                          <p className="hub-empty">No chapters match this search in the curriculum dataset. Try a shorter search.</p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
