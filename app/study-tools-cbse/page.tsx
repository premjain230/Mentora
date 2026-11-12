import React from "react";
import { constructMetadata } from "@/lib/seo";
import { SeoLandingPage } from "@/components/landing/SeoLandingPage";

export const metadata = constructMetadata({
  title: "Study Tools for CBSE Students: Class 9 to 12 NCERT AI Learning Companion",
  description:
    "Discover the best study tools for CBSE students in Class 9, 10, 11, and 12. Master NCERT exemplars, board marking schemes, and Socratic AI tutoring with Learning Allied.",
  path: "/study-tools-cbse",
  keywords: [
    "study tools for cbse students",
    "cbse study tools",
    "cbse class 10 study tools",
    "cbse class 12 board preparation ai",
    "ncert exemplar solutions ai",
    "cbse ai learning companion",
  ],
});

export default function StudyToolsCbsePage() {
  return (
    <SeoLandingPage
      eyebrow="CBSE Board Focus"
      title="Study Tools for CBSE Students (Classes 9–12)"
      lede="Crack CBSE Board exams with NCERT line-by-line mastery. Socratic AI tutoring, step-by-step marking rubrics, exemplar drills, and spaced revision designed for high scores."
      path="/study-tools-cbse"
      badge="NCERT Exemplar Ready"
      lastUpdated="November 2026"
      overviewSection={{
        headline: "Mastering the CBSE Exam Pattern with Socratic Intelligence",
        paragraphs: [
          "The Central Board of Secondary Education (CBSE) has evolved significantly over recent academic cycles. Modern CBSE board papers emphasize Competency-Based Questions (CBQs), case studies, assertion-reasoning items, and multi-step derivations rather than simple rote recall.",
          "Students who rely on copy-pasting textbook solutions frequently lose marks because examiners evaluate papers using strict step-by-step marking rubrics: marks are allocated for stating principles, diagram labeling, algebraic substitution, and units.",
          "Learning Allied is engineered specifically to train students in the exact structure demanded by CBSE evaluators, combining Socratic conceptual guidance with NCERT line-by-line retrieval practice.",
        ],
        callout: {
          title: "The CBSE Marking Scheme Rubric",
          text: "In Class 10 and 12 CBSE evaluations, half a mark is deducted for missing SI units, and zero credit is awarded if the governing formula is omitted. Learning Allied trains students to present answers with full procedural rigor.",
        },
      }}
      syllabusCoverage={{
        title: "CBSE Classes Covered on Learning Allied",
        subtitle: "From foundational middle school science to senior secondary specialization.",
        categories: [
          {
            name: "Class 10 CBSE Board",
            topics: [
              "Science: Chemical Reactions & Equations, Acids Bases & Salts, Metals & Non-metals, Carbon & its Compounds, Life Processes, Control & Coordination, Reproduction, Heredity, Light (Reflection & Refraction), Human Eye, Electricity, Magnetic Effects of Electric Current, Our Environment",
              "Mathematics Standard & Basic: Real Numbers, Polynomials, Linear Equations, Quadratic Equations, Arithmetic Progressions, Triangles, Coordinate Geometry, Trigonometry, Circles, Surface Areas & Volumes, Statistics, Probability",
            ],
          },
          {
            name: "Class 12 CBSE Senior Secondary — Core Science",
            topics: [
              "Physics: Electrostatics, Current Electricity, Magnetic Effects & Magnetism, EMI & AC, Electromagnetic Waves, Ray & Wave Optics, Dual Nature, Atoms & Nuclei, Semiconductor Electronics",
              "Chemistry: Solutions, Electrochemistry, Chemical Kinetics, d- & f-Block Elements, Coordination Compounds, Haloalkanes, Alcohols Phenols Ethers, Aldehydes Ketones & Carboxylic Acids, Amines, Biomolecules",
              "Mathematics: Relations & Functions, Matrices & Determinants, Continuity & Differentiability, Applications of Derivatives, Integrals, Differential Equations, Vectors, 3D Geometry, Linear Programming, Probability",
              "Biology: Reproduction, Genetics & Evolution, Biology in Human Welfare, Biotechnology & its Applications, Ecology & Environment",
            ],
          },
          {
            name: "Class 11 Foundation Track",
            topics: [
              "Physics: Units & Measurement, Motion in a Straight Line, Motion in a Plane, Laws of Motion, Work Energy Power, System of Particles & Rotational Motion, Gravitation, Solids & Fluids, Thermodynamics, Oscillations & Waves",
              "Chemistry: Some Basic Concepts of Chemistry, Structure of Atom, Classification of Elements, Chemical Bonding, Thermodynamics, Equilibrium, Redox Reactions, Organic Chemistry (GOC & Hydrocarbons)",
            ],
          },
          {
            name: "Class 9 Foundation Track",
            topics: [
              "Science: Matter in Our Surroundings, Is Matter Around Us Pure, Atoms & Molecules, Structure of the Atom, Cell (Fundamental Unit of Life), Tissues, Motion, Force & Laws of Motion, Gravitation, Work & Energy, Sound",
              "Mathematics: Number Systems, Polynomials, Coordinate Geometry, Linear Equations in Two Variables, Lines & Angles, Triangles, Quadrilaterals, Circles, Heron's Formula, Surface Areas & Volumes, Statistics",
            ],
          },
        ],
      }}
      featuresGrid={{
        title: "How Learning Allied Gives CBSE Students an Unfair Advantage",
        subtitle: "Combining cognitive psychology with authentic board evaluation rubrics.",
        items: [
          {
            tag: "NCERT Focus",
            title: "NCERT Exemplar & In-Text Drills",
            description: "Practice questions drawn from NCERT in-text questions, chapter-end exercises, and official exemplar problems with detailed Socratic hints.",
            bullets: [
              "Every NCERT exemplar problem covered",
              "Assertion & Reason question mastery",
              "Case-based scenario problem solving",
            ],
          },
          {
            tag: "Scoring Strategy",
            title: "Step-by-Step Marking Rubrics",
            description: "Learn how to format long-answer derivations to capture all 5 marks according to official CBSE marking guidelines.",
            bullets: [
              "Explicit marks for formulas & diagrams",
              "Rigorous unit verification checks",
              "Prevents careless procedural deductions",
            ],
          },
          {
            tag: "Active Recall",
            title: "Diagnostic Quizzes After Every Concept",
            description: "Test your understanding immediately after studying a chapter rather than reading your notes passively.",
            bullets: [
              "Automatic misconception diagnosis",
              "Spaced retrieval for organic reactions & formulas",
              "Zero reliance on memorized answer copies",
            ],
          },
        ],
      }}
      faqs={[
        {
          q: "How does Learning Allied help CBSE Class 12 students balance Boards and JEE/NEET?",
          a: "Since the Class 12 CBSE syllabus overlaps almost 100% with the core syllabus for JEE and NEET, Learning Allied teaches concepts from first principles. This allows students to master the deep theoretical derivations needed for CBSE board proofs while simultaneously building numerical speed for competitive exams.",
        },
        {
          q: "Does Learning Allied provide NCERT solutions?",
          a: "Rather than giving static, copied solutions that encourage passive cheating, Learning Allied provides interactive Socratic guidance through NCERT exercises so you understand how to solve every problem yourself.",
        },
        {
          q: "Can Class 9 and 10 students use Learning Allied?",
          a: "Yes. Class 9 and 10 foundational courses in Science and Mathematics are fully available, helping students build conceptual confidence before entering Senior Secondary.",
        },
      ]}
      relatedPages={[
        {
          label: "CBSE Board Hub",
          href: "/cbse-board",
          desc: "Full curriculum breakdown and practice quizzes for CBSE Class 9–12.",
        },
        {
          label: "Study Tools for Maharashtra Board",
          href: "/study-tools-maharashtra-board",
          desc: "State board Balbharati solutions and exam preparation.",
        },
        {
          label: "Best Study Tools for Students",
          href: "/best-study-tools",
          desc: "Evidence-based tools for active recall and spaced repetition.",
        },
        {
          label: "Best JEE Preparation Tools",
          href: "/best-jee-preparation-tools",
          desc: "Transition from CBSE Board concepts to JEE Main and Advanced problems.",
        },
      ]}
    />
  );
}
