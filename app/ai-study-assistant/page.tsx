import React from "react";
import { constructMetadata } from "@/lib/seo";
import { SeoLandingPage } from "@/components/landing/SeoLandingPage";

export const metadata = constructMetadata({
  title: "AI Study Assistant: Socratic Learning, Active Recall & Knowledge Gap Detection",
  description:
    "Meet Learning Allied, your 24/7 Socratic AI study assistant. Diagnoses prerequisite misconceptions, enforces active retrieval, and schedules spaced review sessions.",
  path: "/ai-study-assistant",
  keywords: [
    "ai study assistant",
    "ai study partner",
    "socratic ai assistant",
    "ai tutor for students",
    "personal ai tutor",
    "ai learning assistant",
  ],
});

export default function AiStudyAssistantPage() {
  return (
    <SeoLandingPage
      eyebrow="Pedagogical Engine"
      title="The AI Study Assistant That Refuses to Cheat for You"
      lede="Most AI assistants write your essays and dump solutions that make you dependent. Learning Allied is your personal Socratic tutor: asking the right questions, diagnosing root conceptual gaps, and building true problem-solving stamina."
      path="/ai-study-assistant"
      badge="Socratic AI Partner"
      lastUpdated="November 2026"
      overviewSection={{
        headline: "Why Independent Thinking is the Rarest Skill in the AI Era",
        paragraphs: [
          "In an educational landscape saturated with instant answers, the greatest competitive advantage a student can build is the ability to sit with a difficult problem, break it into first principles, and derive a solution independently.",
          "When you rely on an AI assistant that hands you full answers, your brain never forms the neural pathways required for independent retrieval. When you sit in a proctored exam hall without access to your phone or computer, you freeze.",
          "Learning Allied was built on a single uncompromising thesis: an AI study assistant should act like the best human professor you ever had. It never spoils the punchline. It asks you what you know, challenges your assumptions, and celebrates when you take the final leap yourself.",
        ],
        callout: {
          title: "The Socratic Dialogue Loop",
          text: "1. Diagnose: Identifies which concept is causing confusion. | 2. Scaffold: Asks a targeted question to isolate the governing principle. | 3. Reinforce: Delivers an active retrieval quiz to lock the insight in permanent memory.",
        },
      }}
      featuresGrid={{
        title: "How Your Socratic Study Assistant Operates",
        subtitle: "A step-by-step walkthrough of an authentic learning interaction.",
        items: [
          {
            tag: "Step 1",
            title: "Premise Clarification",
            description: "Instead of spitting out code or math derivations, your assistant asks: 'What physical laws or formulas connect your given variables?'",
            bullets: [
              "Forces active recall of foundational equations",
              "Ensures you understand what the question is asking",
              "Prevents blind formula substitution",
            ],
          },
          {
            tag: "Step 2",
            title: "Misconception Diagnosis",
            description: "If your intuition is incorrect, the assistant doesn't just say 'wrong'. It constructs a counterexample that reveals the flaw in your reasoning.",
            bullets: [
              "Isolates whether the gap is physical, mathematical, or semantic",
              "Checks prerequisite knowledge graphs for earlier gaps",
              "Builds intuition rather than rote compliance",
            ],
          },
          {
            tag: "Step 3",
            title: "Guided Derivation",
            description: "Provides progressive hints (one layer at a time) so you do 90% of the mathematical and logical heavy lifting.",
            bullets: [
              "Preserves the satisfaction of problem solving",
              "Increases dopamine-driven memory consolidation",
              "Mirrors authentic university tutorial sessions",
            ],
          },
          {
            tag: "Step 4",
            title: "Retention Consolidation",
            description: "Once the problem is solved, your assistant creates an active practice drill and schedules it in your spaced repetition queue.",
            bullets: [
              "Verifies transfer to isomorphic variations",
              "Schedules review intervals calibrated to Ebbinghaus decay",
              "Tracks your mastery over time",
            ],
          },
        ],
      }}
      deepDiveSections={[
        {
          id: "prerequisite-engine",
          heading: "How Prerequisite Knowledge Graphs Save 100+ Hours of Frustration",
          subheading: "Diagnosing the hidden reason why students hit walls in advanced subjects.",
          content: [
            "In subjects like Physics, Chemistry, and Mathematics, knowledge is deeply hierarchical. A student struggling with Rotational Dynamics in Class 11 is almost never struggling with the concept of rotation itself: their actual issue is usually Vector Cross Products from chapter 2 or Newton's Third Law from chapter 5.",
            "Traditional tutors spend hours explaining the same rotational formula because they cannot see the student's prerequisite tree. Learning Allied maintains a comprehensive dependency graph across all supported syllabi.",
            "When our AI detects repeated failures on a specific problem type, it quietly tests the prerequisite nodes. Once the underlying foundation is repaired, the advanced concept clicks in minutes.",
          ],
          quote: "You cannot build a skyscraper on a foundation of sand. Learning Allied inspects the foundation first.",
          stats: [
            { label: "Prerequisite Nodes Mapped", value: "1,200+" },
            { label: "Reduction in Repeated Errors", value: "62%" },
            { label: "Average Student Rating for Clarity", value: "9.4/10" },
          ],
        },
      ]}
      faqs={[
        {
          q: "What is an AI study assistant?",
          a: "An AI study assistant is a software partner that uses large language models and cognitive science to help students understand complex concepts, solve problems, practice active recall, and organize their revision schedules.",
        },
        {
          q: "How does Learning Allied prevent students from cheating?",
          a: "Learning Allied's Socratic system prompts instruct the AI to never output direct answers, complete essay drafts, or final numerical values to homework questions. It insists on guiding the student through step-by-step reasoning.",
        },
        {
          q: "Can I use Learning Allied on mobile?",
          a: "Yes. Learning Allied is fully responsive on mobile web and also offers a lightweight Android APK for seamless studying on phones and tablets.",
        },
      ]}
      relatedPages={[
        {
          label: "Learn Smarter with AI",
          href: "/learn-smarter-with-ai",
          desc: "The 7 cognitive rules for using AI without losing problem-solving stamina.",
        },
        {
          label: "Learning Allied vs ChatGPT",
          href: "/learning-allied-vs-chatgpt",
          desc: "Detailed breakdown of why Socratic guidance outperforms direct answer bots.",
        },
        {
          label: "Best Study Tools for Students",
          href: "/best-study-tools",
          desc: "Explore the comprehensive student study stack for 2026.",
        },
        {
          label: "How Learning Allied Works",
          href: "/how-it-works",
          desc: "Deep dive into our Socratic AI architecture and cognitive models.",
        },
      ]}
    />
  );
}
