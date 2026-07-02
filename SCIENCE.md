# Aquila AI - Neuroscience-Backed Learning Design

## Overview

Aquila AI is redesigned based on modern neuroscience, cognitive psychology, and evidence-based learning research. Every feature maps to established scientific principles.

## Core Principles

### 1. Spaced Repetition
**Based on:** Ebbinghaus forgetting curve (1885), Cepeda et al. (2006)

Memory decays exponentially over time. Reviews scheduled at optimal intervals (just before forgetting) dramatically improve long-term retention.

**Implementation:**
- Automatic review scheduling based on memory strength
- Interval multiplier: 1 → 3 → 7 → 14 → 30 → 60 days
- Failed retrieval resets to initial interval

### 2. Active Recall (Testing Effect)
**Based on:** Roediger & Butler (2011), Karpicke & Blunt (2011)

Retrieving information from memory strengthens it more than re-reading. Testing is not just assessment—it's learning.

**Implementation:**
- Questions that require recall, not recognition
- Immediate feedback on answers
- Layered hints when stuck (1 → 2 → 3 attempts)

### 3. Socratic Questioning
**Based on:** Generation effect (Slamecka & Graf, 1978), Elaborative interrogation

Generating answers (even wrong ones) creates stronger memory traces than passive reception.

**Implementation:**
- AI asks "what do you think?" 70% of the time
- Direct answers only after failed attempts or explicit request
- Metacognitive prompts: "How confident are you?"

### 4. Desirable Difficulties
**Based on:** Bjork & Bjork (2011)

Making retrieval slightly harder in controlled ways strengthens long-term retention.

**Implementation:**
- Time-pressured practice sessions
- Interleaved question types
- Novel problem formats

### 5. Interleaving
**Based on:** Rohrer (2012), Taylor & Rohrer (2010)

Mixing different problem types forces discriminative contrast—learning to distinguish between similar concepts.

**Implementation:**
- Mixed practice sessions after initial learning
- Cross-topic review questions
- Comparative analysis prompts

### 6. Metacognition
**Based on:** Flavell (1979), Dunning-Kruger effect

Students who accurately assess their own knowledge learn 20-30% more effectively.

**Implementation:**
- Confidence tracking (1-5 scale)
- Calibration analysis (confidence vs accuracy)
- Weekly reflection reports

### 7. Dual Coding
**Based on:** Paivio (1986), Mayer's multimedia learning theory

Information encoded both visually and verbally creates two memory traces instead of one.

**Implementation:**
- Visual diagrams alongside text explanations
- Concept maps for topic relationships
- Memory strength visualizations

### 8. Cognitive Load Theory
**Based on:** Sweller (1988)

Working memory is limited. Extraneous cognitive load kills learning.

**Implementation:**
- Maximum 3 sentences per AI response
- Single-column mobile layout
- Calm, minimal interface
- Progressive disclosure of complexity

### 9. Curiosity-Driven Learning
**Based on:** Loewenstein (1994) information gap theory

Curiosity activates the dopaminergic reward system, enhancing memory formation.

**Implementation:**
- Intriguing facts at session end
- "Did you know?" hooks
- Connections to real-world applications

### 10. Self-Determination Theory
**Based on:** Deci & Ryan (1985)

Intrinsic motivation requires: Competence, Autonomy, Relatedness.

**Implementation:**
- Mastery progress (competence)
- Adaptive difficulty (autonomy)
- No leaderboards or extrinsic rewards that undermine motivation

## Scientific References

1. Bjork, R. A., & Bjork, E. L. (2011). Making things hard on yourself, but in a good way. *Psychology of Learning and Motivation*, 54, 56-94.

2. Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks. *Review of Educational Research*, 76(3), 354-380.

3. Deci, E. L., & Ryan, R. M. (1985). *Intrinsic motivation and self-determination in human behavior*. Springer.

4. Ebbinghaus, H. (1885). *Memory: A contribution to experimental psychology*.

5. Flavell, J. H. (1979). Metacognition and cognitive monitoring. *American Psychologist*, 34(10), 906-911.

6. Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying. *Science*, 331(6018), 772-775.

7. Loewenstein, G. (1994). The psychology of curiosity. *Psychological Bulletin*, 116(1), 75-98.

8. Paivio, A. (1986). *Mental representations: A dual coding approach*. Oxford University Press.

9. Roediger, H. L., & Butler, A. C. (2011). The critical role of retrieval practice in long-term retention. *Trends in Cognitive Sciences*, 15(1), 20-27.

10. Rohrer, D. (2012). Interleaving helps students distinguish among similar concepts. *Educational Psychology Review*, 24(3), 355-367.

11. Slamecka, N. J., & Graf, P. (1978). The generation effect. *Journal of Experimental Psychology: Human Learning and Memory*, 4(4), 392-407.

12. Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science*, 12(2), 257-285.
