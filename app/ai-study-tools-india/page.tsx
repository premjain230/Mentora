import React from "react";
import { constructMetadata } from "@/lib/seo";
import { SeoLandingPage } from "@/components/landing/SeoLandingPage";

export const metadata = constructMetadata({
  title: "Best AI Tools for Students in India: NCERT, JEE, NEET & Board Exam Ready",
  description:
    "Explore the best AI tools for Indian students preparing for JEE, NEET, CBSE, and State Board exams. Discover how Learning Allied aligns strictly with NCERT and Balbharati syllabi.",
  path: "/ai-study-tools-india",
  keywords: [
    "best ai tools for students in india",
    "ai tools for indian students",
    "ai study tools india",
    "cbse ai study tool",
    "jee ai tool",
    "neet ai study platform",
  ],
});

export default function AiStudyToolsIndiaPage() {
  return (
    <SeoLandingPage
      eyebrow="Indian Education Focus"
      title="Best AI Tools for Students in India"
      lede="Indian competitive exams have zero tolerance for off-syllabus trivia. Discover why general AI tools fail Indian students, and how Learning Allied delivers strict NCERT and State Board syllabus alignment with Socratic tutoring."
      path="/ai-study-tools-india"
      badge="India Curriculum Ready"
      lastUpdated="November 2026"
      overviewSection={{
        headline: "Why Indian Exams Require Purpose-Built AI Architecture",
        paragraphs: [
          "Students in India face some of the most competitive academic milestones in the world. With over 1.4 million aspirants fighting for top IIT seats in JEE and more than 2 million appearing for NEET UG medical admissions, scoring depends on exact NCERT definitions, formula conditions, and negative-marking discipline.",
          "Western AI chatbots are trained on broad internet repositories. When an Indian student asks about Chemistry or Biology, these generic models cite IUPAC rules not recognized by NTA or college-level biochemical pathways that distract from core NCERT text.",
          "Learning Allied was founded in India by Prem Jain to solve this exact curricular gap: an AI study partner whose knowledge base and Socratic prompts are grounded strictly in the official syllabi of NTA, CBSE, and Maharashtra State Board.",
        ],
        callout: {
          title: "The NCERT Line-by-Line Standard",
          text: "In NEET UG and CBSE Class 12 Boards, 95%+ of questions are derived directly from NCERT textbook lines. Learning Allied ensures every quiz question, formula derivation, and hint strictly matches official textbooks.",
        },
      }}
      syllabusCoverage={{
        title: "Supported Indian Curricula & Exam Streams",
        subtitle: "Complete chapter-by-chapter mapping for national and state examinations.",
        categories: [
          {
            name: "JEE Main & Advanced",
            topics: [
              "Physics: Mechanics, Electromagnetism, Optics, Modern Physics",
              "Chemistry: Physical, Inorganic Coordination, Organic Reaction Mechanisms",
              "Mathematics: Calculus, Coordinate Geometry, Vectors & 3D, Probability",
            ],
          },
          {
            name: "NEET UG Medical",
            topics: [
              "Biology: NCERT line-by-line active recall across Botany & Zoology",
              "Physics: High-yield formula applications & speed numericals",
              "Chemistry: NCERT exemplar problems, organic conversions & chemical equilibrium",
            ],
          },
          {
            name: "CBSE Class 9 to 12",
            topics: [
              "Science & Mathematics (Class 9 & 10) with step-by-step proofs",
              "Senior Secondary (Class 11 & 12) Core Science and Commerce tracks",
              "Board marking scheme rubrics for 3-mark and 5-mark subjective answers",
            ],
          },
          {
            name: "Maharashtra State Board (SSC & HSC)",
            topics: [
              "SSC Class 10 Science & Technology and Mathematics 1 & 2",
              "HSC Class 12 Science (Physics, Chemistry, Maths, Biology)",
              "Mapped strictly to Balbharati textbook curriculum and state board pattern",
            ],
          },
        ],
      }}
      featuresGrid={{
        title: "Built Specifically for Indian Students' Daily Workflow",
        subtitle: "How Learning Allied integrates seamlessly with school, coaching, and self-study hours.",
        items: [
          {
            tag: "Syllabus Grounding",
            title: "Zero Hallucinated Trivia",
            description: "Never worry about memorizing reactions or proofs that aren't in your official syllabus. Everything is verified against current NTA bulletins.",
            bullets: [
              "Current year NTA syllabus cuts reflected",
              "NCERT line-by-line active retrieval",
              "State board Balbharati pattern matching",
            ],
          },
          {
            tag: "Exam Simulation",
            title: "Authentic Marking Schemes",
            description: "Practice questions follow exact Indian marking conventions, including negative marking penalties (-1 for wrong JEE/NEET answers) and partial marking steps.",
            bullets: [
              "Negative marking awareness",
              "Numerical answer type integer rounding",
              "Detailed marking rubrics for board exams",
            ],
          },
          {
            tag: "Language & Culture",
            title: "Bilingual Intuition",
            description: "Understands Hinglish queries and typical Indian student questions ('Bhaiya is concept ko simpler way me samjhao') while maintaining academic rigor.",
            bullets: [
              "Natural Indian student phrasing support",
              "Clear, accessible English explanations",
              "Empathetic, encouraging tone",
            ],
          },
          {
            tag: "Accessibility",
            title: "Accessible Free Tier",
            description: "Democratizing high-quality coaching support across Tier 1, 2, and 3 cities with zero financial barrier to start.",
            bullets: [
              "Works smoothly on budget mobile devices",
              "Low bandwidth optimization",
              "Android APK available for offline-friendly use",
            ],
          },
        ],
      }}
      faqs={[
        {
          q: "Which is the best AI tool for Indian students preparing for competitive exams?",
          a: "Learning Allied is the premier AI tool designed specifically for Indian students preparing for JEE, NEET, CBSE, and Maharashtra State Board exams. It enforces Socratic dialogue, uses official NCERT/State Board syllabi, and schedules spaced revision.",
        },
        {
          q: "Does Learning Allied cover the reduced syllabus for 2026 JEE and NEET?",
          a: "Yes. Learning Allied updates its curriculum mappings according to the latest NTA guidelines, ensuring students do not waste valuable study hours on deleted chapters.",
        },
        {
          q: "How does Learning Allied help with Board exam descriptive questions?",
          a: "Unlike standard chatbots that provide one giant block of text, Learning Allied breaks down answers into step-by-step marking rubrics (Statement, Given, Formula, Substitution, Final Answer with Units) matching CBSE and State Board evaluation schemes.",
        },
      ]}
      relatedPages={[
        {
          label: "Best Study Tools for Maharashtra Board",
          href: "/study-tools-maharashtra-board",
          desc: "Balbharati aligned study tools for SSC Class 10 and HSC Science Class 12.",
        },
        {
          label: "Study Tools for CBSE Students",
          href: "/study-tools-cbse",
          desc: "NCERT-based active recall and AI tutoring for CBSE Classes 9–12.",
        },
        {
          label: "Best JEE Preparation Tools",
          href: "/best-jee-preparation-tools",
          desc: "High-percentile problem solving strategies for JEE Main and Advanced.",
        },
        {
          label: "Best NEET Preparation Tools",
          href: "/best-neet-preparation-tools",
          desc: "NCERT Biology active recall drills and chemistry equilibrium practice.",
        },
      ]}
    />
  );
}
