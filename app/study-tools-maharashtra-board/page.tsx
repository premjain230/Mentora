import React from "react";
import { constructMetadata } from "@/lib/seo";
import { SeoLandingPage } from "@/components/landing/SeoLandingPage";

export const metadata = constructMetadata({
  title: "Best Study Tools for Maharashtra Board (SSC Class 10 & HSC Science Class 12)",
  description:
    "Discover the best study tools for Maharashtra State Board SSC Class 10 and HSC Science Class 12. Balbharati textbook aligned practice, AI Socratic tutoring, and previous years' question analysis.",
  path: "/study-tools-maharashtra-board",
  keywords: [
    "study tools for maharashtra board",
    "maharashtra board study app",
    "hsc science study tools",
    "ssc class 10 study tools",
    "balbharati solutions ai",
    "maharashtra state board exam prep",
  ],
});

export default function StudyToolsMaharashtraBoardPage() {
  return (
    <SeoLandingPage
      eyebrow="State Board Focus"
      title="Study Tools for Maharashtra State Board (SSC & HSC)"
      lede="Master Balbharati textbooks with precision. Built specifically for Maharashtra State Board SSC Class 10 and HSC Class 12 Science students targeting top percentage scores."
      path="/study-tools-maharashtra-board"
      badge="Balbharati Aligned"
      lastUpdated="November 2026"
      overviewSection={{
        headline: "Why Maharashtra Board Students Need Tailored AI Learning",
        paragraphs: [
          "The Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE) has unique textbook structures, terminology, and marking patterns that differ substantially from CBSE and foreign curricula.",
          "Most digital learning apps only cater to CBSE or generic NCERT, forcing Maharashtra Board students to translate concepts or study chapters in unfamiliar orders. When HSC Science students prepare for MHT-CET alongside their 12th Board exams, this misalignment causes severe confusion.",
          "Learning Allied provides first-class support for the Maharashtra State Board, indexing Balbharati textbooks directly for SSC Class 10 and HSC Class 12 Science streams.",
        ],
        callout: {
          title: "Balbharati Textual Precision",
          text: "Maharashtra Board examiners look for specific textbook phrases and structured derivations in Physics and Chemistry. Learning Allied guides students using authentic Balbharati definitions and solved exercise frameworks.",
        },
      }}
      syllabusCoverage={{
        title: "Maharashtra State Board Curricula Covered",
        subtitle: "Comprehensive support across secondary and higher secondary levels.",
        categories: [
          {
            name: "HSC Class 12 Science — Physics",
            topics: [
              "Rotational Dynamics (Centripetal vs Centrifugal, Moment of Inertia)",
              "Mechanical Properties of Fluids (Surface Tension, Viscosity, Bernoulli)",
              "Kinetic Theory of Gases & Radiation (Blackbody radiation, Kirchhoff)",
              "Thermodynamics (First law, cyclic processes, heat engines)",
              "Oscillations & Superposition of Waves (Simple pendulum, resonance)",
              "Wave Optics & Electrostatics (Huygens principle, Gauss' law)",
              "Current Electricity & Magnetic Fields (Kirchhoff's laws, Ampere)",
              "Electromagnetic Induction & AC Circuits (Faraday's laws, LCR circuit)",
              "Dual Nature of Radiation & Structure of Atoms and Nuclei",
              "Semiconductor Devices (Logic gates, photodiode, solar cell)",
            ],
          },
          {
            name: "HSC Class 12 Science — Chemistry",
            topics: [
              "Solid State (Crystal lattices, unit cells, packing efficiency)",
              "Solutions (Raoult's law, colligative properties, van 't Hoff factor)",
              "Ionic Equilibria (Buffer solutions, solubility product, pH calculations)",
              "Chemical Thermodynamics (Enthalpy, Hess's law, Gibbs free energy)",
              "Electrochemistry & Chemical Kinetics (Nernst equation, rate laws)",
              "Elements of Groups 16, 17, 18 & Transition and Inner Transition Elements",
              "Coordination Compounds (IUPAC nomenclature, Werner's theory)",
              "Halogen Derivatives, Alcohols, Phenols & Ethers",
              "Aldehydes, Ketones, Carboxylic Acids & Amines",
              "Biomolecules, Introduction to Polymer Chemistry & Green Chemistry",
            ],
          },
          {
            name: "HSC Class 12 — Mathematics & Statistics",
            topics: [
              "Mathematical Logic (Truth tables, quantifiers, duality)",
              "Matrices (Inversion method, reduction method)",
              "Trigonometric Functions (General solutions, inverse trigonometric)",
              "Pair of Straight Lines, Vectors & 3D Geometry",
              "Line and Plane & Linear Programming Problems (LPP)",
              "Differentiation & Applications of Derivatives (Tangents, Maxima/Minima)",
              "Indefinite & Definite Integration with properties",
              "Differential Equations & Applications",
              "Probability Distributions & Binomial Distribution",
            ],
          },
          {
            name: "SSC Class 10 (Secondary School)",
            topics: [
              "Science & Technology Part 1: Gravitation, Periodic Classification, Chemical Reactions, Heat, Refraction of Light, Lenses, Space Missions",
              "Science & Technology Part 2: Heredity and Evolution, Life Processes, Environmental Management, Cell Biology & Biotechnology",
              "Mathematics Part 1 (Algebra): Linear Equations in Two Variables, Quadratic Equations, Arithmetic Progression, Financial Planning, Statistics",
              "Mathematics Part 2 (Geometry): Similarity, Pythagoras Theorem, Circle, Geometric Constructions, Coordinate Geometry, Trigonometry, Mensuration",
            ],
          },
        ],
      }}
      featuresGrid={{
        title: "Features Tailored for Maharashtra Board Excellence",
        subtitle: "Everything you need to secure top board percentiles and crack MHT-CET.",
        items: [
          {
            tag: "Balbharati Textbooks",
            title: "Direct Balbharati Mapping",
            description: "Exercises, solved examples, and miscellaneous problems from Maharashtra State Board books are fully supported.",
            bullets: [
              "Exact question formats from textbook exercises",
              "Terminology matching state board expectations",
              "Step-by-step scoring guides for long derivations",
            ],
          },
          {
            tag: "Dual Prep",
            title: "HSC Boards + MHT-CET Synergy",
            description: "Balancing board descriptive answers with CET speed is tough. Learning Allied trains you for both subjective proofs and timed multiple choice speed.",
            bullets: [
              "Switch between Board writing mode and CET MCQ drills",
              "Time-saving shortcut formulas for Physics & Maths",
              "Detailed conceptual grounding for negative-free CET scoring",
            ],
          },
          {
            tag: "Socratic AI",
            title: "Never Memorize Blindly",
            description: "State board students often struggle when questions test application rather than rote memory. Our AI tutor ensures you understand the underlying physical laws.",
            bullets: [
              "Diagnoses fundamental formula prerequisites",
              "Encourages conceptual derivation over rote memorization",
              "24/7 personalized doubt resolution",
            ],
          },
        ],
      }}
      faqs={[
        {
          q: "Is Learning Allied aligned with the Maharashtra State Board syllabus?",
          a: "Yes. Learning Allied explicitly includes dedicated chapter coverage for SSC Class 10 and HSC Class 12 Science according to Balbharati textbooks and the latest MSBSHSE syllabus.",
        },
        {
          q: "Can I use Learning Allied to prepare for both HSC 12th Board and MHT-CET?",
          a: "Absolutely. Because MHT-CET is based entirely on the Maharashtra State Board curriculum (with 20% weightage to Class 11 and 80% to Class 12), mastering concepts on Learning Allied provides the ideal dual-preparation platform.",
        },
        {
          q: "How does Learning Allied help SSC Class 10 students?",
          a: "It breaks down complex Science 1 & 2 concepts (like Periodic Trends and Life Processes) and provides step-by-step geometry theorem walkthroughs to build strong exam confidence.",
        },
      ]}
      relatedPages={[
        {
          label: "Maharashtra State Board Hub",
          href: "/maharashtra-board",
          desc: "Full syllabus overview and free practice quizzes for Maharashtra students.",
        },
        {
          label: "AI Study Tools in India",
          href: "/ai-study-tools-india",
          desc: "How purpose-built AI supports state board and national competitive exams.",
        },
        {
          label: "Best Study Tools for Students",
          href: "/best-study-tools",
          desc: "The essential 4-tool stack for high-retention academic preparation.",
        },
        {
          label: "Study Tools for CBSE",
          href: "/study-tools-cbse",
          desc: "NCERT-aligned practice and AI tutoring for CBSE Classes 9–12.",
        },
      ]}
    />
  );
}
