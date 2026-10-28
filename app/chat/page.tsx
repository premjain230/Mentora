"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";
import { VisualLesson } from "../../components/learning/VisualLesson";
import { CheckCard, TeachingContent } from "../../components/learning/LessonBlocks";
import {
  callTutor,
  emitLearningEvent,
  summarizeConversation,
  TutorError,
  type CatalogResponse,
  type ChatResponse,
  type Evaluation,
  type EvaluationResponse,
  type LearningProfile,
  type TeachingReply,
  type TutorMeta,
} from "../../lib/learning/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reply?: TeachingReply;
  meta?: TutorMeta;
  evaluation?: Evaluation;
  error?: boolean;
}

const WELCOME_TEXT =
  "Hello! I am your Learning Allied tutor. Ask me to explain a concept, work through a problem, or check your reasoning. I will keep simple questions short and go deeper when a topic needs it.";

const STARTERS = [
  "Why is the current the same everywhere in a series circuit?",
  "Help me understand photosynthesis instead of memorising it.",
  "Give me a worked example of a quadratic with two real roots.",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "mr", label: "मराठी" },
];

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function welcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: WELCOME_TEXT,
    reply: {
      kind: "short",
      title: null,
      directAnswer: WELCOME_TEXT,
      sections: [],
      example: null,
      check: null,
      visual: null,
      personalization: null,
      advanced: null,
      level: "intermediate",
      source: "system",
    },
  };
}

export default function ChatPage() {
  const router = useRouter();
  const { user, isPro, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [progressNotice, setProgressNotice] = useState<string | null>(null);
  const [tracks, setTracks] = useState<CatalogResponse["catalog"]["tracks"]>([]);
  const [subjects, setSubjects] = useState<Array<{ name: string; count: number }>>([]);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [ctx, setCtx] = useState<{ board: string; classNum: number | null; subject: string; language: string }>({
    board: "",
    classNum: null,
    subject: "",
    language: "en",
  });
  const [lastAttempt, setLastAttempt] = useState<{ question: string; base: ChatMessage[]; userMessage: ChatMessage } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const initialized = useRef(false);

  const getToken = useCallback(async () => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("learning-allied-tutor-context") || "{}");
      if (saved && typeof saved === "object") {
        setCtx((prev) => ({
          board: typeof saved.board === "string" ? saved.board : prev.board,
          classNum: Number.isFinite(Number(saved.classNum)) ? Number(saved.classNum) : prev.classNum,
          subject: typeof saved.subject === "string" ? saved.subject : prev.subject,
          language: typeof saved.language === "string" ? saved.language : prev.language,
        }));
      }
    } catch (_) {
      /* ignore malformed local settings */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("learning-allied-tutor-context", JSON.stringify(ctx));
    } catch (_) {
      /* storage may be unavailable */
    }
  }, [ctx]);

  // One catalogue request on mount: board list, saved profile, and any saved context.
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await callTutor<CatalogResponse>(getToken, "catalog", {});
        if (cancelled) return;
        setTracks(res.catalog.tracks || []);
        setProfile(res.profile);
        if (res.profile) {
          setCtx((prev) => ({
            board: prev.board || res.profile?.board || "",
            classNum: prev.classNum ?? res.profile?.classNum ?? null,
            subject: prev.subject || "",
            language: prev.language || res.profile?.language || "en",
          }));
        }
      } catch (_) {
        /* The chat still works without the catalogue; context selectors stay empty. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  // Subjects for the selected board/class. No AI is involved.
  useEffect(() => {
    if (!user || !ctx.board) {
      setSubjects([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await callTutor<CatalogResponse>(getToken, "catalog", {
          track: ctx.board,
          ...(ctx.classNum ? { classNum: ctx.classNum } : {}),
        });
        if (cancelled) return;
        if (res.catalog.step === "subject") setSubjects(res.catalog.subjects || []);
        else setSubjects([]);
      } catch (_) {
        if (!cancelled) setSubjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.board, ctx.classNum, user, getToken]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const selectedTrack = tracks?.find((t) => t.id === ctx.board) || null;

  const changeBoard = (board: string) => {
    const track = tracks?.find((t) => t.id === board) || null;
    setCtx((prev) => ({
      ...prev,
      board,
      classNum: track && track.grades ? (profile?.board === board ? profile?.classNum ?? prev.classNum : prev.classNum) : null,
      subject: "",
    }));
  };

  const runChat = async (question: string, base: ChatMessage[], userMessage: ChatMessage) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setMessages([...base, userMessage]);
    setSending(true);
    setProgressNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const history = base
      .filter((m) => m.id !== "welcome")
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.reply ? m.reply.directAnswer : m.content,
      }));
    const summary = summarizeConversation(
      base.slice(0, Math.max(0, base.length - 6)).map((m) => ({ role: m.role, content: m.content, title: m.reply?.title || null }))
    );

    try {
      const data = await callTutor<ChatResponse>(
        getToken,
        "chat",
        {
          question,
          history,
          summary,
          context: {
            track: ctx.board || undefined,
            classNum: ctx.classNum || undefined,
            subject: ctx.subject || undefined,
            language: ctx.language,
          },
        },
        { signal: controller.signal, dedupe: false }
      );
      setMessages([
        ...base,
        userMessage,
        {
          id: makeId(),
          role: "assistant",
          content: data.reply.directAnswer,
          reply: data.reply,
          meta: data.meta,
        },
      ]);
      setLastAttempt(data.reply.retry ? { question, base, userMessage } : null);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const tutorError = err instanceof TutorError ? err : null;
      if (tutorError?.code === "limit_reached") {
        if (!isPro) {
          window.dispatchEvent(
            new CustomEvent("show-upgrade-modal", {
              detail: { type: "chat", used: tutorError.used, limit: tutorError.limit },
            })
          );
        }
        setMessages([
          ...base,
          userMessage,
          {
            id: makeId(),
            role: "assistant",
            content:
              tutorError.message ||
              "You have reached your daily free chat limit. Upgrade to Learning Allied Pro for unlimited conversations.",
            reply: {
              kind: "fallback",
              title: null,
              directAnswer: tutorError.message || "Daily free chat limit reached.",
              sections: [],
              example: null,
              check: null,
              visual: null,
              personalization: null,
              advanced: null,
              level: "intermediate",
              source: "limit",
            },
            error: true,
          },
        ]);
        setLastAttempt(null);
        return;
      }
      const message =
        tutorError?.message ||
        "I could not reach the tutor just now. Your question has not been answered. Please retry.";
      setMessages([
        ...base,
        userMessage,
        {
          id: makeId(),
          role: "assistant",
          content: message,
          reply: {
            kind: "fallback",
            title: null,
            directAnswer: message,
            sections: [],
            example: null,
            check: null,
            visual: null,
            personalization: null,
            advanced: null,
            level: "intermediate",
            source: "unavailable",
            retry: true,
          },
          error: true,
        },
      ]);
      setLastAttempt({ question, base, userMessage });
    } finally {
      inFlightRef.current = false;
      setSending(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const sendQuestion = (text: string) => {
    const question = text.trim();
    if (!question || sending || inFlightRef.current || !user) return;
    const base = messages;
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: question };
    setInput("");
    void runChat(question, base, userMessage);
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    sendQuestion(input);
  };

  const retryLast = () => {
    if (!lastAttempt || sending || inFlightRef.current) return;
    setMessages(lastAttempt.base);
    void runChat(lastAttempt.question, lastAttempt.base, lastAttempt.userMessage);
  };

  const evaluateCheck = async (message: ChatMessage, answer: string) => {
    if (!message.reply?.check || !user) return;
    setEvaluatingId(message.id);
    setProgressNotice(null);
    try {
      const data = await callTutor<EvaluationResponse>(getToken, "evaluate", {
        conceptId: message.meta?.conceptId || undefined,
        track: ctx.board || undefined,
        classNum: ctx.classNum || undefined,
        question: message.reply.check.prompt,
        answer,
        level: message.reply.level,
        difficulty: message.reply.check.difficulty || 2,
        questionId: message.reply.check.questionId || `${message.id}-check`,
        surface: "chat",
        topic: message.reply.title || undefined,
      });
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, evaluation: data.evaluation } : m)));
      if (data.learningEvent) {
        const saved = await emitLearningEvent(getToken, {
          ...data.learningEvent,
          eventId: `chat_${message.id}_${Date.now()}`,
          source: data.learningEvent.source || "chat",
        });
        if (!saved) setProgressNotice("Your feedback is shown, but this answer could not be saved to your progress. Retrying will not duplicate it.");
      }
    } finally {
      setEvaluatingId(null);
    }
  };

  const askFollowUp = (prompt: string, message?: ChatMessage) => {
    const topic = message?.reply?.title;
    sendQuestion(topic ? `${prompt} (about ${topic})` : prompt);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.reply?.kind === "lesson");

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>AI Tutor Chat</span>
          </div>
          <span className="chat-topbar-tag">Adaptive teaching</span>
        </div>
        <div className="topbar-right">
          {isPro && <span className="chat-pro-tag">★ Pro Unlimited</span>}
        </div>
      </div>

      <div className="chat-shell">
        <div className="chat-context" aria-label="Learning context">
          <span className="chat-context-label">Learning context</span>
          <select
            aria-label="Board or exam"
            value={ctx.board}
            onChange={(event) => changeBoard(event.target.value)}
            className="chat-select"
          >
            <option value="">General</option>
            {(tracks || []).map((track) => (
              <option key={track.id} value={track.id}>
                {track.label}
              </option>
            ))}
          </select>

          {selectedTrack?.grades && (
            <select
              aria-label="Class"
              value={ctx.classNum ?? ""}
              onChange={(event) => setCtx((prev) => ({ ...prev, classNum: Number(event.target.value) || null, subject: "" }))}
              className="chat-select"
            >
              <option value="">Class</option>
              {selectedTrack.classes.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
          )}

          <select
            aria-label="Subject"
            value={ctx.subject}
            onChange={(event) => setCtx((prev) => ({ ...prev, subject: event.target.value }))}
            className="chat-select"
            disabled={!ctx.board || (!!selectedTrack?.grades && !ctx.classNum)}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.name} value={subject.name}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Explanation language"
            value={ctx.language}
            onChange={(event) => setCtx((prev) => ({ ...prev, language: event.target.value }))}
            className="chat-select"
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        <div className="chat-log" role="log" aria-live="polite" aria-label="Conversation">
          {messages.map((message) => {
            const isUser = message.role === "user";
            const reply = message.reply;
            return (
              <div key={message.id} className={`chat-row ${isUser ? "is-user" : "is-assistant"}`}>
                <div className={`chat-bubble ${isUser ? "is-user" : "is-assistant"} ${message.error ? "is-error" : ""}`}>
                  {isUser ? (
                    <p className="chat-user-text">{message.content}</p>
                  ) : reply ? (
                    <>
                      {reply.kind === "short" ? (
                        <p className="chat-short-answer">{message.content}</p>
                      ) : (
                        <TeachingContent
                          title={reply.title}
                          directAnswer={reply.directAnswer}
                          sections={reply.sections}
                          example={reply.example}
                          advanced={reply.advanced}
                          personalization={reply.personalization}
                          fallbackNote={reply.fallbackNote}
                          level={reply.level}
                          source={reply.source}
                          reviewed={reply.source === "authored"}
                        />
                      )}

                      {reply.visual && <VisualLesson visual={reply.visual} compact />}

                      {reply.check && (
                        <CheckCard
                          key={`${message.id}-${reply.check.questionId || "check"}`}
                          check={reply.check}
                          evaluation={message.evaluation || null}
                          submitting={evaluatingId === message.id}
                          onSubmit={(answer) => evaluateCheck(message, answer)}
                          onExplainDifferently={() => askFollowUp("Explain this a different way, starting from a simpler example", message)}
                          submitLabel="Check my reasoning"
                          disabled={!!message.evaluation && message.evaluation.verdict === "correct"}
                        />
                      )}

                      {message.meta?.cached && <p className="chat-meta-note">Reused a reviewed explanation for this exact topic — no new AI generation was needed.</p>}
                      {message.meta?.source === "authored-fallback" && <p className="chat-meta-note chat-meta-note--warn">AI was unavailable, so reviewed lesson content was used.</p>}

                      {reply.retry && (
                        <button type="button" className="btn btn-primary" onClick={retryLast} disabled={sending}>
                          Retry
                        </button>
                      )}

                      {reply.kind !== "fallback" && (
                        <div className="chat-followups">
                          <button type="button" className="chat-chip" onClick={() => askFollowUp("Give me one worked example", message)}>
                            Worked example
                          </button>
                          <button type="button" className="chat-chip" onClick={() => askFollowUp("Explain it more simply", message)}>
                            Simpler
                          </button>
                          <button type="button" className="chat-chip" onClick={() => askFollowUp("Ask me one practice question on this", message)}>
                            Quiz me
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="chat-short-answer">{message.content}</p>
                  )}
                </div>
              </div>
            );
          })}

          {messages.length === 1 && (
            <div className="chat-starters">
              {STARTERS.map((starter) => (
                <button key={starter} type="button" className="chat-starter" onClick={() => sendQuestion(starter)}>
                  {starter}
                </button>
              ))}
            </div>
          )}

          {sending && (
            <div className="chat-row is-assistant">
              <div className="chat-bubble is-assistant chat-thinking" role="status">
                <span className="chat-typing" aria-hidden="true"><i /><i /><i /></span>
                Teaching…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {progressNotice && <p className="chat-progress-notice" role="status">{progressNotice}</p>}

        {lastAssistant && !sending && (
          <div className="chat-quickbar" aria-label="Quick follow-ups">
            <button type="button" className="chat-chip" onClick={() => askFollowUp("Quiz me on what we just covered", lastAssistant)}>
              Quiz me
            </button>
            <button type="button" className="chat-chip" onClick={() => askFollowUp("Connect this to a real-world example", lastAssistant)}>
              Real-world example
            </button>
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSend}>
          <div className="chat-composer-box">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 2000))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend(event);
                }
              }}
              placeholder="Ask a question or paste a problem…"
              rows={1}
              aria-label="Your question"
              disabled={sending}
              className="chat-input"
            />
            <button type="submit" className="btn btn-primary chat-send" disabled={sending || !input.trim()}>
              {sending ? "…" : "Send"}
            </button>
          </div>
          <div className="chat-composer-meta">
            <span>Enter to send · Shift+Enter for a new line</span>
            {input.length > 1600 && <span>{input.length}/2000</span>}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
