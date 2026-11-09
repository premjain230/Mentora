"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";

export type FeedbackCategory =
  | "general"
  | "ai_response"
  | "learning_experience"
  | "bug_report"
  | "feature_request"
  | "ui_ux"
  | "teacher";

interface ModalOpenDetail {
  category?: FeedbackCategory;
  page?: string;
  responseId?: string;
  conversationId?: string;
  model?: string;
  provider?: string;
  queryTopic?: string;
  subject?: string;
  topic?: string;
  rating?: number;
  initialType?: "thumbs_up" | "thumbs_down";
}

export function FeedbackModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [featureTab, setFeatureTab] = useState<"submit" | "browse">("submit");

  // Form fields
  const [rating, setRating] = useState<number | null>(null);
  const [subRatings, setSubRatings] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [whyNeeded, setWhyNeeded] = useState("");
  const [featureCat, setFeatureCat] = useState("curriculum");
  const [bugCategory, setBugCategory] = useState("broken_feature");
  const [severity, setSeverity] = useState("medium");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [aspect, setAspect] = useState("general_ux");

  // Teacher fields
  const [subjectTaught, setSubjectTaught] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Class 11-12");
  const [institution, setInstitution] = useState("");

  // Learning experience fields
  const [understood, setUnderstood] = useState<boolean | null>(null);
  const [easyToFollow, setEasyToFollow] = useState<boolean | null>(null);
  const [helpedTopic, setHelpedTopic] = useState<boolean | null>(null);
  const [confusingPart, setConfusingPart] = useState("");
  const [improvements, setImprovements] = useState("");

  // Context metadata
  const [contextMeta, setContextMeta] = useState<Record<string, any>>({});

  // Feature request browsing
  const [features, setFeatures] = useState<any[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [featureSearch, setFeatureSearch] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Listen for open events
  useEffect(() => {
    const handleOpen = (e: any) => {
      const detail: ModalOpenDetail = e.detail || {};
      const cat = detail.category || "general";
      setCategory(cat);
      setContextMeta({
        page: detail.page || (typeof window !== "undefined" ? window.location.pathname : "/"),
        responseId: detail.responseId || "",
        conversationId: detail.conversationId || "",
        model: detail.model || "",
        provider: detail.provider || "",
        queryTopic: detail.queryTopic || "",
        subject: detail.subject || "",
        topic: detail.topic || "",
      });

      if (detail.rating) setRating(detail.rating);
      else if (detail.initialType === "thumbs_down") setRating(1);
      else if (detail.initialType === "thumbs_up") setRating(5);
      else setRating(null);

      resetForm();
      setIsOpen(true);

      if (cat === "feature_request") {
        fetchPublicFeatures();
      }
    };

    window.addEventListener("open-feedback-modal", handleOpen);
    return () => window.removeEventListener("open-feedback-modal", handleOpen);
  }, []);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const resetForm = () => {
    setMessage("");
    setTitle("");
    setWhyNeeded("");
    setBugCategory("broken_feature");
    setSeverity("medium");
    setAttachment(null);
    setConfusingPart("");
    setImprovements("");
    setSubRatings({});
    setUnderstood(null);
    setEasyToFollow(null);
    setHelpedTopic(null);
    setSubmitted(false);
    setErrorMsg("");
  };

  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const fetchPublicFeatures = async () => {
    setLoadingFeatures(true);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        const token = await user.getIdToken().catch(() => null);
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/growth?route=feedback&public=true&category=feature_request", {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setFeatures(data.items || []);
      }
    } catch (err) {
      console.warn("Could not load features:", err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleUpvote = async (featureId: string) => {
    if (!user) {
      alert("Please sign in to upvote and support feature requests.");
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/growth?route=feedback/upvote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: featureId }),
      });
      if (res.ok) {
        const result = await res.json();
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId
              ? { ...f, upvotes: result.upvotes, hasUserUpvoted: result.hasUpvoted }
              : f
          )
        );
      }
    } catch (err) {
      console.warn("Upvote error:", err);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      alert("Please select a valid image file (PNG, JPEG, WebP).");
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      alert("Screenshot must be under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    const clientPage = contextMeta.page || window.location.pathname;

    const payload: any = {
      category,
      rating,
      subRatings,
      message,
      page: clientPage,
      details: {},
    };

    if (category === "ai_response") {
      payload.details = {
        provider: contextMeta.provider || "groq",
        model: contextMeta.model || "default",
        responseId: contextMeta.responseId,
        conversationId: contextMeta.conversationId,
        queryTopic: contextMeta.queryTopic,
        feedbackType: rating && rating >= 4 ? "thumbs_up" : "thumbs_down",
      };
    } else if (category === "learning_experience") {
      payload.details = {
        subject: contextMeta.subject,
        topic: contextMeta.topic,
        understood,
        easyToFollow,
        helpedTopic,
        confusingPart,
        improvements,
      };
    } else if (category === "bug_report") {
      payload.details = {
        bugCategory,
        severity,
        device: {
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          os: navigator.platform || "Unknown",
        },
      };
      if (attachment) {
        payload.attachment = attachment;
      }
    } else if (category === "feature_request") {
      payload.details = {
        title: title || message.slice(0, 100),
        featureCategory: featureCat,
        whyNeeded,
      };
      payload.title = title;
    } else if (category === "ui_ux") {
      payload.details = {
        aspect,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };
    } else if (category === "teacher") {
      payload.details = {
        subjectTaught,
        gradeLevel,
        institution,
        curriculumRelevance: subRatings.relevance || rating,
        explanationQuality: subRatings.clarity || rating,
        educationalUsefulness: subRatings.usefulness || rating,
      };
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        const token = await user.getIdToken().catch(() => null);
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/growth?route=feedback", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed.");
      }

      setSubmitted(true);
      if (category === "feature_request") {
        fetchPublicFeatures();
      }
      setTimeout(() => {
        closeModal();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="feedback-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="feedback-modal" ref={modalRef}>
        <div className="feedback-header">
          <div className="header-left">
            <span className="badge-category">{categoryLabels[category]}</span>
            <h2 id="feedback-modal-title" className="feedback-title">
              {submitted ? "Feedback Received" : modalTitles[category]}
            </h2>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={closeModal}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="success-state">
            <div className="check-icon" aria-hidden="true">✓</div>
            <h3>Thank You!</h3>
            <p>Your input is directly shaping the future of Learning Allied.</p>
          </div>
        ) : (
          <>
            {/* Category Switcher Tabs (when opened generally) */}
            <div className="category-tabs" role="tablist">
              {(Object.keys(categoryLabels) as FeedbackCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={category === cat}
                  className={`cat-tab ${category === cat ? "active" : ""}`}
                  onClick={() => {
                    setCategory(cat);
                    setErrorMsg("");
                    if (cat === "feature_request") fetchPublicFeatures();
                  }}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            {errorMsg && <div className="feedback-error-banner">{errorMsg}</div>}

            {/* Feature Request: Toggle Between Submit and Browse */}
            {category === "feature_request" && (
              <div className="feature-sub-tabs">
                <button
                  type="button"
                  className={`sub-tab ${featureTab === "submit" ? "active" : ""}`}
                  onClick={() => setFeatureTab("submit")}
                >
                  Suggest Feature
                </button>
                <button
                  type="button"
                  className={`sub-tab ${featureTab === "browse" ? "active" : ""}`}
                  onClick={() => {
                    setFeatureTab("browse");
                    fetchPublicFeatures();
                  }}
                >
                  Browse &amp; Upvote ({features.length})
                </button>
              </div>
            )}

            {category === "feature_request" && featureTab === "browse" ? (
              <div className="feature-browse-area">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search community suggestions…"
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                />

                {loadingFeatures ? (
                  <div className="loading-state">Loading suggestions…</div>
                ) : (
                  <div className="feature-list">
                    {features
                      .filter(
                        (f) =>
                          !featureSearch ||
                          f.details?.title?.toLowerCase().includes(featureSearch.toLowerCase()) ||
                          f.message?.toLowerCase().includes(featureSearch.toLowerCase())
                      )
                      .map((f) => (
                        <div key={f.id} className="feature-card">
                          <button
                            type="button"
                            className={`upvote-btn ${f.hasUserUpvoted ? "upvoted" : ""}`}
                            onClick={() => handleUpvote(f.id)}
                            title={f.hasUserUpvoted ? "Remove upvote" : "Support this suggestion"}
                          >
                            <span className="arrow">▲</span>
                            <span className="count">{f.upvotes || 0}</span>
                          </button>
                          <div className="feature-details">
                            <h4>{f.details?.title || f.message?.slice(0, 80)}</h4>
                            {f.details?.whyNeeded && <p>{f.details.whyNeeded}</p>}
                            <div className="feature-meta">
                              <span className="cat-pill">{f.details?.featureCategory || "General"}</span>
                              <span className="status-pill">{f.status?.replace("_", " ") || "Under Review"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    {features.length === 0 && (
                      <p className="empty-sub">No community suggestions yet. Be the first to submit one!</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                {/* 1. Star Rating (for general, ui_ux, ai_response) */}
                {["general", "ui_ux", "ai_response"].includes(category) && (
                  <div className="form-group">
                    <label className="field-label">Overall Rating</label>
                    <div className="star-row" role="radiogroup" aria-label="Rating out of 5 stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${rating && rating >= star ? "filled" : ""}`}
                          onClick={() => setRating(star)}
                          aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. AI Response Sub-ratings */}
                {category === "ai_response" && (
                  <div className="form-group sub-ratings-grid">
                    <label className="field-label full-width">Detailed Response Quality</label>
                    {["accuracy", "clarity", "relevance", "completeness"].map((metric) => (
                      <div key={metric} className="sub-rating-item">
                        <span className="metric-name">{metric.charAt(0).toUpperCase() + metric.slice(1)}</span>
                        <div className="metric-stars">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              className={`mini-star ${subRatings[metric] && subRatings[metric] >= val ? "filled" : ""}`}
                              onClick={() =>
                                setSubRatings((prev) => ({ ...prev, [metric]: val }))
                              }
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Bug Reporting Fields */}
                {category === "bug_report" && (
                  <>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="field-label" htmlFor="bug-cat">Bug Category</label>
                        <select
                          id="bug-cat"
                          value={bugCategory}
                          onChange={(e) => setBugCategory(e.target.value)}
                          className="field-select"
                        >
                          <option value="broken_feature">Broken Feature / Crash</option>
                          <option value="incorrect_behaviour">Incorrect AI Calculation / Formula</option>
                          <option value="ui_problem">UI / Visual Layout Problem</option>
                          <option value="loading_problem">Slow / Endless Loading</option>
                          <option value="auth_problem">Authentication / Sign-in Problem</option>
                          <option value="other">Other System Issue</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="field-label" htmlFor="bug-sev">Severity</label>
                        <select
                          id="bug-sev"
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value)}
                          className="field-select"
                        >
                          <option value="low">Low (Cosmetic / Minor annoyance)</option>
                          <option value="medium">Medium (Feature partially impaired)</option>
                          <option value="high">High (Feature unusable)</option>
                          <option value="critical">Critical (Crash / Data loss / Blocker)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Optional Screenshot (PNG, JPEG up to 1.5MB)</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleScreenshotChange}
                        className="field-file"
                      />
                      {attachment && (
                        <div className="screenshot-preview">
                          <img src={attachment} alt="Screenshot preview" />
                          <button
                            type="button"
                            className="remove-img-btn"
                            onClick={() => setAttachment(null)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 4. Feature Request Fields */}
                {category === "feature_request" && (
                  <>
                    <div className="form-group">
                      <label className="field-label" htmlFor="feat-title">Feature Title</label>
                      <input
                        id="feat-title"
                        type="text"
                        placeholder="e.g. NCERT Exemplar Question Sets"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="field-input"
                        required
                        maxLength={120}
                      />
                    </div>

                    <div className="form-group">
                      <label className="field-label" htmlFor="feat-cat">Category</label>
                      <select
                        id="feat-cat"
                        value={featureCat}
                        onChange={(e) => setFeatureCat(e.target.value)}
                        className="field-select"
                      >
                        <option value="curriculum">Curriculum &amp; Syllabus Coverage</option>
                        <option value="ai_tutor">AI Tutor &amp; Problem Solving</option>
                        <option value="practice_tests">Mock Tests &amp; Practice</option>
                        <option value="planner">Study Planner &amp; Schedule</option>
                        <option value="ui_ux">Interface &amp; Usability</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="field-label" htmlFor="feat-why">Why is this important for your learning?</label>
                      <textarea
                        id="feat-why"
                        placeholder="Explain how this would help your study workflow…"
                        value={whyNeeded}
                        onChange={(e) => setWhyNeeded(e.target.value)}
                        className="field-textarea"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* 5. Teacher Feedback Fields */}
                {category === "teacher" && (
                  <>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="field-label">Subject Taught</label>
                        <input
                          type="text"
                          placeholder="e.g. Physics, Chemistry, Math"
                          value={subjectTaught}
                          onChange={(e) => setSubjectTaught(e.target.value)}
                          className="field-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="field-label">Grade / Standard</label>
                        <input
                          type="text"
                          placeholder="e.g. Class 11-12, JEE Prep"
                          value={gradeLevel}
                          onChange={(e) => setGradeLevel(e.target.value)}
                          className="field-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Educational Ratings (1-5)</label>
                      <div className="teacher-ratings-grid">
                        <div className="tr-row">
                          <span>Curriculum Relevance:</span>
                          <div className="metric-stars">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <button
                                key={v}
                                type="button"
                                className={`mini-star ${subRatings.relevance && subRatings.relevance >= v ? "filled" : ""}`}
                                onClick={() => setSubRatings((prev) => ({ ...prev, relevance: v }))}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="tr-row">
                          <span>Explanation Quality:</span>
                          <div className="metric-stars">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <button
                                key={v}
                                type="button"
                                className={`mini-star ${subRatings.clarity && subRatings.clarity >= v ? "filled" : ""}`}
                                onClick={() => setSubRatings((prev) => ({ ...prev, clarity: v }))}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="tr-row">
                          <span>Pedagogical Usefulness:</span>
                          <div className="metric-stars">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <button
                                key={v}
                                type="button"
                                className={`mini-star ${subRatings.usefulness && subRatings.usefulness >= v ? "filled" : ""}`}
                                onClick={() => setSubRatings((prev) => ({ ...prev, usefulness: v }))}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="teacher-disclaimer">
                      Note: Educator feedback assists in product enhancement and pedagogical alignment. It does not constitute formal curriculum accreditation.
                    </p>
                  </>
                )}

                {/* 6. Learning Experience Fields */}
                {category === "learning_experience" && (
                  <div className="learning-questions">
                    <div className="lq-row">
                      <span>Did you understand the explanation?</span>
                      <div className="yes-no-group">
                        <button
                          type="button"
                          className={`choice-btn ${understood === true ? "active" : ""}`}
                          onClick={() => setUnderstood(true)}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`choice-btn ${understood === false ? "active" : ""}`}
                          onClick={() => setUnderstood(false)}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div className="lq-row">
                      <span>Was the lesson easy to follow?</span>
                      <div className="yes-no-group">
                        <button
                          type="button"
                          className={`choice-btn ${easyToFollow === true ? "active" : ""}`}
                          onClick={() => setEasyToFollow(true)}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`choice-btn ${easyToFollow === false ? "active" : ""}`}
                          onClick={() => setEasyToFollow(false)}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Was anything confusing?</label>
                      <input
                        type="text"
                        placeholder="Mention any confusing concept or formula…"
                        value={confusingPart}
                        onChange={(e) => setConfusingPart(e.target.value)}
                        className="field-input"
                      />
                    </div>
                  </div>
                )}

                {/* 7. UI/UX Feedback Aspects */}
                {category === "ui_ux" && (
                  <div className="form-group">
                    <label className="field-label" htmlFor="ui-aspect">Primary Concern</label>
                    <select
                      id="ui-aspect"
                      value={aspect}
                      onChange={(e) => setAspect(e.target.value)}
                      className="field-select"
                    >
                      <option value="navigation">Navigation &amp; Menus</option>
                      <option value="layout">Screen Layout &amp; Spacing</option>
                      <option value="accessibility">Accessibility &amp; Readability</option>
                      <option value="responsiveness">Mobile &amp; Screen Responsiveness</option>
                      <option value="visual_clarity">Visual Clarity &amp; Contrast</option>
                      <option value="general_ux">General Workflow</option>
                    </select>
                  </div>
                )}

                {/* Main Message / Description Text Area */}
                <div className="form-group">
                  <label className="field-label" htmlFor="feedback-desc">
                    {category === "bug_report"
                      ? "Steps to Reproduce & What Happened"
                      : category === "feature_request"
                      ? "Additional Details"
                      : "Your Comments / Suggestions"}
                  </label>
                  <textarea
                    id="feedback-desc"
                    className="field-textarea"
                    rows={3}
                    placeholder={
                      category === "bug_report"
                        ? "1. Went to Chat\n2. Asked a chemistry problem\n3. The equation did not format properly..."
                        : "Tell us what you liked or how we can improve..."
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required={category === "bug_report" || category === "general"}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="dash-btn ghost"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="dash-btn primary"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting…" : "Send Feedback"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .feedback-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .feedback-modal {
          background: var(--bg-card, #121214);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          border-radius: 16px;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          color: var(--text, #f1f5f9);
          padding: 24px;
        }

        .feedback-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .badge-category {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent, #3b82f6);
          font-weight: 700;
        }

        .feedback-title {
          font-size: 18px;
          font-weight: 700;
          margin: 4px 0 0;
          color: var(--text, #fff);
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
        }

        .close-btn:hover {
          color: #fff;
        }

        .category-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 10px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }

        .cat-tab {
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .cat-tab.active {
          background: var(--text, #fff);
          color: #000;
          font-weight: 600;
        }

        .feature-sub-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .sub-tab {
          flex: 1;
          padding: 8px;
          font-size: 13px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
        }

        .sub-tab.active {
          background: rgba(59, 130, 246, 0.15);
          color: var(--accent, #3b82f6);
          border-color: rgba(59, 130, 246, 0.4);
          font-weight: 600;
        }

        .feature-browse-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .search-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          color: #fff;
          font-size: 13px;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 380px;
          overflow-y: auto;
        }

        .feature-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }

        .upvote-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          min-width: 44px;
        }

        .upvote-btn.upvoted {
          background: rgba(59, 130, 246, 0.2);
          border-color: var(--accent, #3b82f6);
          color: var(--accent, #3b82f6);
        }

        .upvote-btn .arrow {
          font-size: 11px;
        }

        .upvote-btn .count {
          font-size: 13px;
          font-weight: 700;
        }

        .feature-details {
          flex: 1;
        }

        .feature-details h4 {
          margin: 0 0 4px;
          font-size: 14px;
          color: #fff;
        }

        .feature-details p {
          margin: 0 0 6px;
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
        }

        .feature-meta {
          display: flex;
          gap: 6px;
        }

        .cat-pill, .status-pill {
          font-size: 10.5px;
          padding: 2px 7px;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .cat-pill {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-muted, #94a3b8);
        }

        .status-pill {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
        }

        .feedback-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .field-input, .field-select, .field-textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          color: #fff;
          font-size: 13.5px;
          font-family: inherit;
        }

        .field-textarea {
          resize: vertical;
        }

        .star-row {
          display: flex;
          gap: 6px;
        }

        .star-btn {
          font-size: 26px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: transform 0.1s ease, color 0.1s ease;
        }

        .star-btn:hover {
          transform: scale(1.15);
        }

        .star-btn.filled {
          color: #fbbf24;
        }

        .sub-ratings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }

        .sub-ratings-grid .full-width {
          grid-column: span 2;
        }

        .sub-rating-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .metric-name {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
        }

        .metric-stars {
          display: flex;
          gap: 2px;
        }

        .mini-star {
          font-size: 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          padding: 0 1px;
        }

        .mini-star.filled {
          color: #fbbf24;
        }

        .teacher-ratings-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: 8px;
        }

        .tr-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--text-muted, #94a3b8);
        }

        .teacher-disclaimer {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          line-height: 1.4;
          font-style: italic;
          margin: 0;
        }

        .learning-questions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lq-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        .yes-no-group {
          display: flex;
          gap: 6px;
        }

        .choice-btn {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
        }

        .choice-btn.active {
          background: var(--text, #fff);
          color: #000;
          font-weight: 600;
        }

        .screenshot-preview {
          position: relative;
          display: inline-block;
          margin-top: 8px;
        }

        .screenshot-preview img {
          max-height: 90px;
          border-radius: 6px;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.2));
        }

        .remove-img-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          border: none;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .feedback-error-banner {
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #f87171;
          font-size: 12.5px;
          margin-bottom: 12px;
        }

        .success-state {
          text-align: center;
          padding: 32px 16px;
        }

        .check-icon {
          font-size: 40px;
          color: #10b981;
          margin-bottom: 12px;
        }

        .success-state h3 {
          margin: 0 0 8px;
          color: #fff;
        }

        .success-state p {
          color: var(--text-muted, #94a3b8);
          font-size: 13.5px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }

        .dash-btn {
          padding: 9px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .dash-btn.ghost {
          background: transparent;
          color: var(--text-muted, #94a3b8);
          border-color: var(--border, rgba(255, 255, 255, 0.12));
        }

        .dash-btn.primary {
          background: var(--text, #fff);
          color: #000;
        }

        .dash-btn.primary:disabled, .dash-btn.ghost:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

const categoryLabels: Record<FeedbackCategory, string> = {
  general: "General",
  ai_response: "AI Quality",
  learning_experience: "Learning",
  bug_report: "Report Bug",
  feature_request: "Feature Ideas",
  ui_ux: "UI / UX",
  teacher: "Teacher",
};

const modalTitles: Record<FeedbackCategory, string> = {
  general: "Share Your Feedback",
  ai_response: "Evaluate AI Tutor Response",
  learning_experience: "Lesson Understanding Feedback",
  bug_report: "Report an Issue or Bug",
  feature_request: "Community Feature Requests",
  ui_ux: "Interface & Experience Feedback",
  teacher: "Educator & Teacher Feedback",
};
