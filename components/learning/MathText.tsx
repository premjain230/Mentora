"use client";

import React from "react";
import { splitTextWithMath, renderKatexString } from "@/vanilla/shared/math-renderer";

interface MathTextProps {
  text: string | null | undefined;
  displayMode?: boolean;
  className?: string;
}

/**
 * Renders text that may contain inline or block LaTeX equations via KaTeX.
 * Preserves normal text and safely handles incomplete streaming math.
 */
export function MathText({ text, displayMode = false, className }: MathTextProps) {
  if (!text) return null;

  if (displayMode) {
    const html = renderKatexString(text, { displayMode: true });
    if (!html) {
      return <span className={className}>{text}</span>;
    }
    return (
      <div
        className={`learn-math-block${className ? ` ${className}` : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const tokens = splitTextWithMath(text);
  return (
    <span className={className}>
      {tokens.map((tok, i) => {
        if (tok.type === "block-math") {
          const html = renderKatexString(tok.value, {
            displayMode: true,
            isStreaming: tok.streaming,
          });
          if (!html) return <span key={i}>{tok.value}</span>;
          return (
            <span
              key={i}
              className="learn-math-block"
              style={{ display: "block" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (tok.type === "inline-math") {
          const html = renderKatexString(tok.value, {
            displayMode: false,
            isStreaming: tok.streaming,
          });
          if (!html) return <span key={i}>{tok.value}</span>;
          return (
            <span
              key={i}
              className="learn-inline-math"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return <React.Fragment key={i}>{tok.value}</React.Fragment>;
      })}
    </span>
  );
}
