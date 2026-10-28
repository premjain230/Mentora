"use client";

import React, { useId, useState } from "react";
import type { CheckQuestion, Evaluation, LessonSection, MasterySummary, SessionSummary, WorkedExample } from "../../lib/learning/types";

const LEVEL_LABEL: Record<string, string> = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function TeachingContent({
  title,
  directAnswer,
  sections,
  example,
  advanced,
  personalization,
  fallbackNote,
  generatedNotice,
  level,
  reviewed,
  source,
  exampleFirst = false,
}: {
  title?: string | null;
  directAnswer: string;
  sections: LessonSection[];
  example?: WorkedExample | null;
  advanced?: { heading: string; body: string } | null;
  personalization?: string | null;
  fallbackNote?: string | null;
  generatedNotice?: string | null;
  level?: string | null;
  reviewed?: boolean;
  source?: string;
  exampleFirst?: boolean;
}) {
  const exampleBlock = example ? (
    <div className="learn-example">
      <div className="learn-example-head">
        <span className="learn-badge learn-badge--soft">Worked example</span>
      </div>
      {example.problem && <p className="learn-example-problem">{example.problem}</p>}
      {example.steps.length > 0 && (
        <ol className="learn-steps">
          {example.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}
      {example.answer && <p className="learn-answer"><strong>Answer:</strong> {example.answer}</p>}
    </div>
  ) : null;

  return (
    <div className="learn-teaching">
      <div className="learn-teaching-head">
        {title && <h3 className="learn-title">{title}</h3>}
        <div className="learn-teaching-tags">
          {level && <span className="learn-badge learn-badge--soft">{LEVEL_LABEL[level] || level}</span>}
          {source === "authored" && reviewed && <span className="learn-badge learn-badge--ok">Reviewed lesson</span>}
        </div>
      </div>

      {personalization && <p className="learn-personal">{personalization}</p>}
      {fallbackNote && <p className="learn-callout learn-callout--warn">{fallbackNote}</p>}
      {generatedNotice && <p className="learn-callout learn-callout--soft">{generatedNotice}</p>}

      {exampleFirst && exampleBlock}

      {directAnswer && <p className="learn-lead">{directAnswer}</p>}

      {sections.map((section, index) => (
        <section key={`${section.heading}-${index}`} className="learn-section">
          <h4>{section.heading}</h4>
          <p>{section.body}</p>
          {section.equation && <pre className="learn-equation"><code>{section.equation}</code></pre>}
        </section>
      ))}

      {!exampleFirst && exampleBlock}

      {advanced && (
        <details className="learn-advanced">
          <summary>{advanced.heading || "Go deeper"}</summary>
          <p>{advanced.body}</p>
        </details>
      )}
    </div>
  );
}

const VERDICT_META: Record<string, { label: string; className: string }> = {
  correct: { label: "Correct", className: "verdict-good" },
  partially_correct: { label: "Almost there", className: "verdict-partial" },
  incorrect: { label: "Not yet", className: "verdict-bad" },
  unknown: { label: "Not evaluated", className: "verdict-unknown" },
};

export function EvaluationCard({
  evaluation,
  onExplainDifferently,
  onRetry,
}: {
  evaluation: Evaluation;
  onExplainDifferently?: () => void;
  onRetry?: () => void;
}) {
  const meta = VERDICT_META[evaluation.verdict] || VERDICT_META.unknown;
  return (
    <div className={`learn-feedback ${meta.className}`} role="status" aria-live="polite">
      <div className="learn-feedback-head">
        <span className={`learn-verdict ${meta.className}`}>{meta.label}</span>
        {evaluation.basis === "authored" && <span className="learn-badge learn-badge--soft">Checked against the lesson rubric</span>}
      </div>

      {evaluation.feedback && <p className="learn-feedback-text">{evaluation.feedback}</p>}

      {evaluation.whatWorked.length > 0 && (
        <div className="learn-feedback-group">
          <span className="learn-feedback-label">What worked</span>
          <ul>
            {evaluation.whatWorked.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.missing.length > 0 && (
        <div className="learn-feedback-group">
          <span className="learn-feedback-label">What was missing</span>
          <ul>
            {evaluation.missing.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.misconception && (
        <div className="learn-misconception">
          <div className="learn-misconception-label">
            <span aria-hidden="true">⚠ </span>
            {evaluation.misconception.verified ? "Common misconception" : "Likely misconception"}: {evaluation.misconception.label}
          </div>
          {evaluation.misconception.explanation && <p>{evaluation.misconception.explanation}</p>}
          {evaluation.misconception.remediation && <p><strong>Try this:</strong> {evaluation.misconception.remediation}</p>}
        </div>
      )}

      {evaluation.packExplanation && !evaluation.feedback.includes(evaluation.packExplanation) && (
        <details className="learn-advanced learn-advanced--tight">
          <summary>Key idea</summary>
          <p>{evaluation.packExplanation}</p>
        </details>
      )}

      {evaluation.next.message && <p className="learn-next-hint">{evaluation.next.message}</p>}

      <div className="learn-feedback-actions">
        {onExplainDifferently && evaluation.verdict !== "correct" && (
          <button type="button" className="btn btn-secondary" onClick={onExplainDifferently}>
            Explain it a different way
          </button>
        )}
        {onRetry && evaluation.verdict === "unknown" && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry evaluation
          </button>
        )}
      </div>
    </div>
  );
}

export function CheckCard({
  check,
  evaluation,
  submitting,
  onSubmit,
  onExplainDifferently,
  onRetryEvaluation,
  submitLabel = "Check my answer",
  disabled = false,
}: {
  check: CheckQuestion;
  evaluation: Evaluation | null;
  submitting: boolean;
  onSubmit: (answer: string) => void | Promise<void>;
  onExplainDifferently?: () => void;
  onRetryEvaluation?: () => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generatedId = useId();
  const inputId = `answer-${check.questionId || generatedId.replace(/:/g, "")}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || submitting || disabled) return;
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError((err as Error)?.message || "Your answer could not be checked. Please retry.");
    }
  };

  return (
    <div className="learn-check">
      <div className="learn-check-head">
        <span className="learn-badge learn-badge--accent">Check your understanding</span>
        <span className="learn-check-difficulty">Level {check.difficulty}/3</span>
      </div>
      <p className="learn-check-prompt">{check.prompt}</p>

      <form onSubmit={submit}>
        <label className="learn-check-label" htmlFor={inputId}>
          Your reasoning
        </label>
        <textarea
          id={inputId}
          className="learn-textarea"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Write the answer and your reasoning in your own words…"
          rows={4}
          disabled={submitting || disabled}
        />
        <div className="learn-check-actions">
          <button type="submit" className="btn btn-primary" disabled={!answer.trim() || submitting || disabled}>
            {submitting ? "Checking…" : submitLabel}
          </button>
          {check.hint && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowHint((value) => !value)} aria-expanded={showHint}>
              {showHint ? "Hide hint" : "Show hint"}
            </button>
          )}
        </div>
        {showHint && check.hint && <p className="learn-hint">{check.hint}</p>}
        {error && <p className="learn-error" role="alert">{error}</p>}
      </form>

      {evaluation && (
        <EvaluationCard evaluation={evaluation} onExplainDifferently={onExplainDifferently} onRetry={onRetryEvaluation} />
      )}
    </div>
  );
}

export function MasteryMeter({ mastery, session }: { mastery: MasterySummary; session?: SessionSummary }) {
  const score = mastery.score;
  const percent = score === null ? 0 : Math.round(score * 100);
  return (
    <div className="learn-mastery" aria-label="Mastery and this session's evidence">
      <div className="learn-mastery-head">
        <span className="learn-mastery-label">Mastery</span>
        <span className="learn-mastery-value">{score === null ? "No evidence yet" : `${percent}%`}</span>
      </div>
      <div className="learn-mastery-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Mastery score">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="learn-mastery-note">
        {session
          ? `${session.correctCount} correct of ${session.answeredCount} answered this session. ${session.note}`
          : mastery.evidence > 0
          ? "Based on your recorded learning events."
          : "Answer a question to start building evidence."}
      </p>
    </div>
  );
}

const STEPS = ["Understand", "Explain", "Visualize", "Practice", "Evaluate", "Adapt", "Remember"];

export function AdaptiveRail({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="learn-rail" aria-label="Lesson stages">
      {STEPS.map((step, index) => (
        <li
          key={step}
          className={index === activeIndex ? "is-active" : index < activeIndex ? "is-done" : ""}
          aria-current={index === activeIndex ? "step" : undefined}
        >
          <span className="learn-rail-dot" aria-hidden="true">{index < activeIndex ? "✓" : index + 1}</span>
          <span className="learn-rail-text">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function PrerequisiteChips({
  prerequisites,
}: {
  prerequisites: Array<{ conceptId: string; name: string; status?: string }>;
}) {
  if (!prerequisites.length) return null;
  return (
    <div className="learn-prereqs">
      <span className="learn-feedback-label">Before this chapter</span>
      <div className="learn-chips">
        {prerequisites.map((prereq) => (
          <span key={prereq.conceptId} className={`learn-chip ${prereq.status === "likely known" ? "is-good" : ""}`}>
            {prereq.name}
            {prereq.status && <em> · {prereq.status}</em>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CompletionCard({
  session,
  revisionNote,
  revisionAt,
  nextStep,
  onNext,
  onExit,
}: {
  session: SessionSummary;
  revisionNote?: string | null;
  revisionAt?: string | null;
  nextStep?: { label: string; kind: string } | null;
  onNext?: () => void;
  onExit?: () => void;
}) {
  return (
    <div className="learn-complete" role="status">
      <div className="learn-complete-head">
        <span className="learn-complete-icon" aria-hidden="true">✓</span>
        <div>
          <h3>Session complete</h3>
          <p>{session.note}</p>
        </div>
      </div>
      <dl className="learn-complete-stats">
        <div>
          <dt>Correct answers</dt>
          <dd>{session.correctCount} / {session.answeredCount}</dd>
        </div>
        <div>
          <dt>Hardest correct level</dt>
          <dd>{session.highestCorrectDifficulty ?? "—"} / 3</dd>
        </div>
        {revisionAt && (
          <div>
            <dt>Revision</dt>
            <dd>{revisionNote || new Date(revisionAt).toLocaleDateString()}</dd>
          </div>
        )}
      </dl>
      <div className="learn-complete-actions">
        {onNext && nextStep && nextStep.kind === "complete" && (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {nextStep.label}
          </button>
        )}
        {onExit && (
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            Back to chapters
          </button>
        )}
      </div>
      <p className="learn-complete-note">
        Mastery updates only from recorded evidence, not from this screen. Your answers were sent to the existing learning pipeline.
      </p>
    </div>
  );
}
