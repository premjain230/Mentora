// server/_concept-registry.js
// Authoritative curriculum-grounded concept repository for Learning Allied.
// Provides dedicated, curriculum-specific, subject-aware learning packages for each concept.
// Strictly eliminates generic template fallbacks and guarantees educational differentiation.

/**
 * Registry of dedicated concept packages.
 * Keyed by full hierarchical conceptId (e.g. 'maharashtra.9.science1.laws_of_motion.distance_displacement_velocity')
 * and aliasable by `${chapterId}.${subConceptId}` or direct subConceptId.
 */
const CONCEPT_REGISTRY = {
  // =========================================================================
  // 1. MAHARASHTRA BOARD CLASS 9 — LAWS OF MOTION (Balbharati Physics)
  // =========================================================================

  // Concept 1A: Distance, Displacement, Speed and Velocity
  "maharashtra.9.science1.laws_of_motion.distance_displacement_velocity": {
    conceptId: "maharashtra.9.science1.laws_of_motion.distance_displacement_velocity",
    subConceptId: "distance_displacement_velocity",
    chapterId: "maharashtra.9.science1.laws_of_motion",
    chapterTitle: "Laws of Motion",
    conceptTitle: "Distance, Displacement, Speed and Velocity",
    curriculumTrack: "maharashtra",
    board: "Maharashtra State Board (Balbharati)",
    classNum: 9,
    subject: "Science & Technology - Part 1",
    subjectType: "physics",
    layoutType: "physics_simulation",
    difficulty: 0.35,
    difficultyLabel: "Intermediate",
    estimatedMinutes: 8,
    learningObjectives: [
      "Distinguish scalar distance (actual path length) from vector displacement (minimum straight-line distance from initial to final point).",
      "Calculate average speed as total distance / total time and average velocity as net displacement / total time.",
      "Understand why displacement can be zero even when total distance traveled is non-zero (e.g., circular paths, round trips).",
      "Convert speeds between km/h and m/s accurately using the conversion factor 5/18."
    ],
    prerequisites: ["Fundamental units of length (meter) and time (second)"],
    explain: {
      conceptIntro: "Imagine walking from your house to school along a winding market street, or flying directly in a straight line. Physical motion requires distinguishing between how far you actually walked versus your net change in position.",
      definition: "Distance is the length of the actual path traversed by an object between its initial and final positions. Displacement is the minimum distance in a straight line from the initial point to the final point, having both magnitude and direction.",
      foundationalExplanation: "Distance is a scalar quantity—it only tells us 'how much ground was covered' and is always positive or zero. Displacement is a vector quantity—it points from where you started directly to where you finished. If you walk 4 meters North and then 3 meters East, your distance is 7 meters, but your displacement is exactly 5 meters Northeast.",
      detailedExplanation: "According to the Balbharati Class 9 Science curriculum, motion is relative to an observer. When an object completes a circular lap of radius r and returns to the starting point, the distance traveled is 2*pi*r, whereas its displacement is exactly 0. Velocity is defined as the rate of change of displacement (v = s/t), whereas speed is the rate of change of distance. Velocity possesses direction; speed does not.",
      sections: [
        {
          heading: "1. Scalar vs. Vector Quantities in Kinematics",
          body: "A scalar quantity is described completely by its numerical magnitude and appropriate unit (e.g., mass, time, distance, speed). A vector quantity requires both magnitude and directional orientation in space (e.g., displacement, velocity, acceleration).",
          highlight: "Distance depends on the trajectory chosen; displacement depends only on the endpoints."
        },
        {
          heading: "2. The Mathematical Relationship: Speed vs. Velocity",
          body: "Speed = Total Distance Covered / Total Time Taken. Velocity = Net Displacement / Total Time Taken. When motion is strictly along a unidirectional straight line without reversing, speed equals the magnitude of velocity. In all other trajectories, average speed > magnitude of average velocity.",
          highlight: "Speed can never be negative; velocity can be positive, negative, or zero depending on chosen coordinate direction."
        },
        {
          heading: "3. Unit Conversions in Physics Calculations",
          body: "The SI unit of both distance and displacement is the meter (m). The SI unit of speed and velocity is meter per second (m/s). To convert kilometers per hour (km/h) to meters per second (m/s), multiply by 1000/3600 = 5/18. To convert m/s to km/h, multiply by 18/5."
        }
      ],
      rulesOrFormulas: [
        { name: "Distance", formula: "s_path = sum(delta s_i)", explanation: "Scalar sum of all path segments", units: "meters (m)" },
        { name: "Displacement", formula: "vec(s) = vec(r_final) - vec(r_initial)", explanation: "Vector difference between position vectors", units: "meters (m)" },
        { name: "Average Speed", formula: "v_avg = Total Distance / Total Time", explanation: "Scalar rate of covering distance", units: "m/s" },
        { name: "Average Velocity", formula: "vec(v_avg) = Net Displacement / Total Time", explanation: "Vector rate of positional change", units: "m/s" }
      ],
      realWorldApplications: [
        "Car odometers record cumulative distance traveled, while GPS navigation computes straight-line displacement for route optimization.",
        "A marathon runner running a 400m circular track finishes with 400m distance but 0m net displacement.",
        "Aircraft flight paths plan around airway waypoints (distance) while radar tracking monitors instantaneous displacement from the control tower."
      ],
      commonMisconceptions: [
        {
          misconception: "Displacement and distance are always identical.",
          whyItsWrong: "Displacement equals distance only for rectilinear motion in a single unchanging direction.",
          correction: "In any curved, zig-zag, or returning motion, distance is strictly greater than the magnitude of displacement."
        },
        {
          misconception: "If average velocity is zero, the object never moved.",
          whyItsWrong: "A car can travel 100 km and return to its starting garage in 2 hours. Displacement is zero, so average velocity is zero, but it traveled 100 km at 50 km/h average speed.",
          correction: "Zero average velocity only indicates net displacement is zero, not that instantaneous speed was zero."
        }
      ],
      keyTakeaway: "Distance measures the journey; displacement measures the net positional destination."
    },
    visualize: {
      visualType: "motion_simulation",
      renderer: "motion_simulation",
      title: "Interactive Path vs. Displacement Comparison",
      subtitle: "Observe scalar path length versus vector straight-line displacement in real time",
      observe: "Watch how winding the path increases total distance (blue line), while displacement (red vector) connects only the start and finish points.",
      visualProps: {
        mode: "distance_displacement",
        startPoint: { x: 50, y: 180, label: "Point A (Home)" },
        endPoint: { x: 380, y: 80, label: "Point B (School)" },
        pathPoints: [
          { x: 50, y: 180 },
          { x: 120, y: 240 },
          { x: 220, y: 160 },
          { x: 290, y: 220 },
          { x: 380, y: 80 }
        ],
        pathDistanceMeters: 650,
        displacementMeters: 410,
        direction: "62° North of East",
        interactiveSlider: "scrub_time"
      },
      interactiveControls: [
        { id: "scrub", label: "Object Progress", type: "slider", min: 0, max: 100, default: 40, unit: "%" },
        { id: "toggle_path", label: "Show Path Trace", type: "checkbox", default: true }
      ],
      caption: "Blue dotted line shows actual winding road traveled (650 m). Red arrow shows vector displacement (410 m at 62°)."
    },
    practice: {
      questions: [
        {
          id: "mh9_motion_q1",
          questionNumber: 1,
          type: "numerical",
          difficulty: "intermediate",
          prompt: "Sheetal travels from her house to Sangeeta's house (path length 500 m), and then both go to school (path length 1200 m). The total path taken is perpendicular. If the direct straight-line distance from Sheetal's house to school is 1300 m, find the total distance traveled and the magnitude of her displacement.",
          hints: [
            "Distance is the sum of actual path lengths traveled: Sheetal -> Sangeeta + Sangeeta -> School.",
            "Displacement is the straight line from Sheetal's house directly to the school."
          ],
          solutionSteps: [
            "Total Distance = 500 m + 1200 m = 1700 m.",
            "Total Displacement = Minimum straight-line distance = 1300 m (directed straight from house to school)."
          ],
          expectedAnswer: "Distance = 1700 m, Displacement = 1300 m",
          explanation: "Distance accounts for the entire 1700 m walked. Displacement measures solely the 1300 m straight line connecting initial and final positions."
        },
        {
          id: "mh9_motion_q2",
          questionNumber: 2,
          type: "conceptual",
          difficulty: "foundation",
          prompt: "An athlete runs around a circular track of circumference 400 m and completes exactly 3 full rounds in 4 minutes. What is the athlete's total distance covered and total displacement?",
          hints: [
            "One complete round equals 400 m of distance. Multiply by 3.",
            "After 3 full rounds, where is the athlete relative to the starting line?"
          ],
          solutionSteps: [
            "Total Distance = 3 * 400 m = 1200 meters.",
            "Since the athlete finishes at the exact starting point, Initial Position = Final Position.",
            "Net Displacement = 0 meters."
          ],
          expectedAnswer: "Distance = 1200 m, Displacement = 0 m",
          explanation: "Because the athlete returned to the starting point, the net change in position is zero, making displacement 0 m even though 1200 m was run."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student distinguishes path dependence from endpoint vectors and correctly identifies zero-displacement conditions.",
      commonMistakes: [
        {
          mistake: "Adding directions as scalar numbers",
          diagnosis: "Student failed to treat displacement as a vector quantity.",
          category: "conceptual_misunderstanding",
          remediation: "Use Pythagorean theorem or straight-line measurement for perpendicular displacements rather than simple scalar addition."
        },
        {
          mistake: "Claiming displacement = distance in circular motion",
          diagnosis: "Student confused track circumference with net positional shift.",
          category: "terminology_confusion",
          remediation: "Remember that displacement is the vector connecting start to finish. If start == finish, displacement is always 0."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "real_world_analogy",
        label: "The Crow vs. The Ant Analogy",
        explanation: "Think of an ant crawling along every curve of a winding garden hose—that is distance. Think of a crow flying directly through the air from the hose inlet to the nozzle—that is displacement."
      },
      prerequisiteBridge: {
        neededConcept: "Scalar vs Vector Fundamentals",
        bridgeExplanation: "A scalar has size only (like temperature 30°C or distance 5m). A vector has size AND direction (like walking 5m Due North)."
      },
      challengeExtension: {
        challengePrompt: "A car travels the first half of a straight journey at 40 km/h and the second half of the journey at 60 km/h. Why is its average speed NOT 50 km/h?",
        deepThinkingQuestion: "Hint: Average speed is Total Distance / Total Time. Calculate the time spent in each half."
      }
    },
    remember: {
      coreTakeaway: "Distance is total path length traveled (scalar); displacement is the direct straight-line vector from start to finish.",
      essentialFormulas: [
        "v_avg = Total Distance / Total Time",
        "vec(v_avg) = Net Displacement / Total Time",
        "1 km/h = 5/18 m/s"
      ],
      summaryPoints: [
        "Distance is always >= magnitude of displacement.",
        "Displacement is zero whenever an object returns to its starting point.",
        "Speed is scalar; velocity is vector."
      ],
      memoryCard: {
        front: "Can distance be zero while displacement is non-zero?",
        back: "NO. If distance is zero, the object never moved, so displacement must also be zero.",
        tip: "Displacement can be zero when distance > 0, but distance can never be smaller than displacement."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Revise Distance vs Displacement and Velocity Conversions",
        recommendedMinutes: 15,
        suggestedDayOffset: 1
      }
    }
  },

  // Concept 1B: Acceleration and Newton's Equations of Motion
  "maharashtra.9.science1.laws_of_motion.acceleration_kinematic_equations": {
    conceptId: "maharashtra.9.science1.laws_of_motion.acceleration_kinematic_equations",
    subConceptId: "acceleration_kinematic_equations",
    chapterId: "maharashtra.9.science1.laws_of_motion",
    chapterTitle: "Laws of Motion",
    conceptTitle: "Acceleration and Newton's Equations of Motion",
    curriculumTrack: "maharashtra",
    board: "Maharashtra State Board (Balbharati)",
    classNum: 9,
    subject: "Science & Technology - Part 1",
    subjectType: "physics",
    layoutType: "physics_simulation",
    difficulty: 0.42,
    difficultyLabel: "Intermediate",
    estimatedMinutes: 10,
    learningObjectives: [
      "Define acceleration as the time rate of change of velocity: a = (v - u) / t.",
      "Distinguish positive acceleration (speeding up), negative acceleration / deceleration / retardation (slowing down), and zero acceleration (uniform velocity).",
      "Derive and apply the three kinematic equations of motion for uniform acceleration: v = u + at, s = ut + 1/2*at^2, and v^2 = u^2 + 2as.",
      "Interpret velocity-time graphs to calculate acceleration (slope) and distance traveled (area under the graph)."
    ],
    prerequisites: ["Distance, Displacement, Speed and Velocity", "Basic algebraic equation manipulation"],
    explain: {
      conceptIntro: "When a metro train leaves a station, its speedometer climbs from 0 to 60 km/h in 20 seconds. Then it cruises steadily, and finally applies brakes to halt at the next station. Acceleration describes how velocity changes over time.",
      definition: "Acceleration is the rate of change of velocity with respect to time. It is a vector quantity with SI unit m/s^2.",
      foundationalExplanation: "If an object changes either its speed or its direction of motion, it is accelerating. When speed increases in the direction of motion, acceleration is positive. When brakes are applied and speed decreases, acceleration is negative (also termed deceleration or retardation). If velocity remains constant, acceleration is strictly zero.",
      detailedExplanation: "In Balbharati Class 9 Chapter 1, Sir Isaac Newton formulated three kinematic equations connecting initial velocity (u), final velocity (v), acceleration (a), elapsed time (t), and displacement (s) under constant acceleration: 1) v = u + at (Velocity-time relation); 2) s = ut + (1/2)at^2 (Displacement-time relation); 3) v^2 = u^2 + 2as (Displacement-velocity relation). In a velocity-time graph, the slope (rise over run) yields acceleration, while the area enclosed under the curve equals displacement.",
      sections: [
        {
          heading: "1. Defining Acceleration and Retardation",
          body: "Acceleration a = (Final Velocity v - Initial Velocity u) / Elapsed Time t. If v > u, a > 0 (speeding up). If v < u, a < 0 (retardation/deceleration). In SI units, velocity is m/s and time is s, so unit is (m/s)/s = m/s^2.",
          highlight: "Retardation is simply negative acceleration in the direction of motion."
        },
        {
          heading: "2. Newton's Three Kinematic Equations of Motion",
          body: "For uniform acceleration along a straight line:\n• Equation 1: v = u + at\n• Equation 2: s = ut + (1/2)at^2\n• Equation 3: v^2 = u^2 + 2as\nThese equations apply ONLY when acceleration 'a' is constant.",
          highlight: "When starting from rest, u = 0. When an object comes to a halt, v = 0."
        },
        {
          heading: "3. Graphical Analysis of Motion",
          body: "On a Velocity-Time (v-t) graph:\n• Slope = (v - u) / t = Acceleration 'a'.\n• Area beneath the graph between t1 and t2 = Displacement 's'.\nA horizontal line indicates zero acceleration; an upward straight line indicates uniform positive acceleration."
        }
      ],
      rulesOrFormulas: [
        { name: "Acceleration", formula: "a = (v - u) / t", explanation: "Rate of velocity change", units: "m/s^2" },
        { name: "First Kinematic Equation", formula: "v = u + a * t", explanation: "Relates velocity and time", units: "m/s" },
        { name: "Second Kinematic Equation", formula: "s = u * t + 0.5 * a * t^2", explanation: "Relates displacement and time", units: "meters (m)" },
        { name: "Third Kinematic Equation", formula: "v^2 = u^2 + 2 * a * s", explanation: "Relates velocity and displacement (time-independent)", units: "m^2/s^2" }
      ],
      realWorldApplications: [
        "Automotive engineers use v^2 = u^2 + 2as to calculate minimum braking distances for anti-lock brake systems (ABS).",
        "Aircraft runway lengths are calculated using s = (v^2 - u^2)/(2a) to ensure safe takeoff speeds before the runway ends.",
        "Elevator programming accelerates smoothly at 1 m/s^2 to prevent passenger discomfort before cruising at constant velocity."
      ],
      commonMisconceptions: [
        {
          misconception: "Zero velocity implies zero acceleration.",
          whyItsWrong: "When a ball is thrown vertically upward, at its highest peak its instantaneous velocity is zero, but acceleration due to gravity (g = 9.8 m/s^2 downward) is actively acting on it.",
          correction: "An object can have zero velocity while experiencing non-zero acceleration."
        },
        {
          misconception: "Acceleration is just speed.",
          whyItsWrong: "A car traveling at 120 km/h on cruise control has high speed, but ZERO acceleration because velocity is constant.",
          correction: "Acceleration measures the CHANGE in velocity, not the magnitude of velocity itself."
        }
      ],
      keyTakeaway: "Acceleration is the tempo of velocity change; constant acceleration enables Newton's three kinematic equations."
    },
    visualize: {
      visualType: "interactive_graph",
      renderer: "graph",
      title: "Interactive Velocity-Time Graph & Kinematic Equations",
      subtitle: "Adjust initial velocity and acceleration to see slope and area transform dynamically",
      observe: "Notice how the slope of the v-t graph equals acceleration 'a', and the shaded trapezoidal area under the curve equals total displacement 's'.",
      visualProps: {
        mode: "velocity_time",
        u: 10,
        a: 2,
        t: 5,
        v: 20,
        displacement: 75,
        equationDisplay: true
      },
      interactiveControls: [
        { id: "u_slider", label: "Initial Velocity (u)", type: "slider", min: 0, max: 20, default: 10, unit: "m/s" },
        { id: "a_slider", label: "Acceleration (a)", type: "slider", min: -4, max: 6, default: 2, unit: "m/s²" },
        { id: "t_slider", label: "Elapsed Time (t)", type: "slider", min: 1, max: 10, default: 5, unit: "s" }
      ],
      caption: "Slope = acceleration a = 2 m/s². Shaded Area = rectangle (u*t = 50m) + triangle (0.5*a*t² = 25m) = 75m displacement."
    },
    practice: {
      questions: [
        {
          id: "mh9_acc_q1",
          questionNumber: 1,
          type: "numerical",
          difficulty: "intermediate",
          prompt: "A car starts from rest (u = 0) and moves with a uniform acceleration of 2 m/s^2. Find its velocity after 10 seconds and the distance covered in that time.",
          hints: [
            "Use the first kinematic equation v = u + at to find velocity.",
            "Use the second kinematic equation s = ut + 1/2*at^2 to find distance."
          ],
          solutionSteps: [
            "Given: u = 0, a = 2 m/s^2, t = 10 s.",
            "Velocity: v = u + at = 0 + (2 * 10) = 20 m/s.",
            "Distance: s = ut + 0.5 * a * t^2 = 0 + 0.5 * 2 * (10)^2 = 100 meters."
          ],
          expectedAnswer: "Velocity = 20 m/s, Distance = 100 m",
          explanation: "In 10 seconds with acceleration 2 m/s^2, the car accelerates to 20 m/s and traverses 100 meters."
        },
        {
          id: "mh9_acc_q2",
          questionNumber: 2,
          type: "numerical",
          difficulty: "advanced",
          prompt: "A train traveling at 72 km/h applies brakes and comes to a complete stop in 100 meters. What is the retardation produced by the brakes?",
          hints: [
            "First convert 72 km/h into m/s using the 5/18 conversion factor.",
            "Identify the stopping condition: final velocity v = 0.",
            "Use the third kinematic equation v^2 = u^2 + 2as because time 't' is not provided."
          ],
          solutionSteps: [
            "u = 72 * (5/18) = 20 m/s. v = 0 m/s. s = 100 m.",
            "v^2 = u^2 + 2as => 0^2 = (20)^2 + 2 * a * 100",
            "0 = 400 + 200a => 200a = -400 => a = -2 m/s^2.",
            "Retardation is the magnitude of negative acceleration = 2 m/s^2."
          ],
          expectedAnswer: "Retardation = 2 m/s^2 (acceleration = -2 m/s^2)",
          explanation: "The brakes produce a deceleration of 2 m/s^2, bringing the 20 m/s train to rest in 100 meters."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student converts km/h to m/s correctly, selects the right kinematic equation for given variables, and interprets negative signs as retardation.",
      commonMistakes: [
        {
          mistake: "Plugging km/h directly into equations of motion with seconds",
          diagnosis: "Unit inconsistency error.",
          category: "unit_confusion",
          remediation: "Always convert velocities to SI units (m/s) before applying Newton's kinematic formulas."
        },
        {
          mistake: "Using s = v * t when acceleration is non-zero",
          diagnosis: "Applying uniform velocity formula to accelerated motion.",
          category: "incorrect_formula_selection",
          remediation: "Distance = velocity * time works ONLY when a = 0. When a != 0, use s = ut + (1/2)at^2."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "step_by_step_breakdown",
        label: "The Kinematic Variable Checklist Method",
        explanation: "Write down the five kinematic variables: u, v, a, s, t. Identify which three are given, which one is asked, and pick the one equation containing all four."
      },
      prerequisiteBridge: {
        neededConcept: "Velocity Rate of Change",
        bridgeExplanation: "Speed tells you where you are going each second; acceleration tells you how much faster you are getting each second."
      },
      challengeExtension: {
        challengePrompt: "A ball is dropped from a 80m high tower. Take g = 10 m/s^2. How long does it take to strike the ground and with what velocity?",
        deepThinkingQuestion: "Use u = 0, a = 10 m/s^2, s = 80 m to calculate t and v."
      }
    },
    remember: {
      coreTakeaway: "v = u + at, s = ut + (1/2)at^2, and v^2 = u^2 + 2as unlock all constant acceleration problems.",
      essentialFormulas: [
        "v = u + at",
        "s = ut + (1/2)at^2",
        "v^2 = u^2 + 2as",
        "v_t_graph_slope = a, v_t_graph_area = s"
      ],
      summaryPoints: [
        "Acceleration is vector rate of velocity change (m/s^2).",
        "Retardation is negative acceleration (slowing down).",
        "Kinematic equations require constant acceleration."
      ],
      memoryCard: {
        front: "What do slope and area represent on a velocity-time graph?",
        back: "Slope represents Acceleration (a); Area under curve represents Displacement (s).",
        tip: "Rise/Run = (m/s)/s = m/s^2 (a). Base*Height = s * (m/s) = m (s)."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Practice Newton's 3 Kinematic Equations and v-t graph problems",
        recommendedMinutes: 20,
        suggestedDayOffset: 2
      }
    }
  },

  // =========================================================================
  // 2. CBSE CLASS 9 — MOTION (NCERT Physics)
  // =========================================================================
  "cbse.9.science.motion.uniform_motion_and_graphs": {
    conceptId: "cbse.9.science.motion.uniform_motion_and_graphs",
    subConceptId: "uniform_motion_and_graphs",
    chapterId: "cbse.9.science.motion",
    chapterTitle: "Motion",
    conceptTitle: "Uniform Motion, Non-Uniform Motion and Distance-Time Graphs",
    curriculumTrack: "cbse",
    board: "CBSE (NCERT)",
    classNum: 9,
    subject: "Science",
    subjectType: "physics",
    layoutType: "physics_simulation",
    difficulty: 0.35,
    difficultyLabel: "Intermediate",
    estimatedMinutes: 8,
    learningObjectives: [
      "Distinguish uniform motion (equal distances in equal intervals of time) from non-uniform motion.",
      "Plot and interpret Distance-Time (s-t) graphs for stationary, uniform, and accelerated motion.",
      "Calculate speed directly from the gradient/slope of a Distance-Time graph.",
      "Analyze non-linear curves representing non-uniform acceleration."
    ],
    prerequisites: ["Coordinates, axes, and line slope concepts in basic algebra"],
    explain: {
      conceptIntro: "If a car on a desert highway covers exactly 10 meters every single second, its motion is uniform. If it drives through city traffic stopping and starting, its motion is non-uniform.",
      definition: "An object is in uniform motion along a straight line if it covers equal distances in equal intervals of time, however small these intervals may be. Otherwise, its motion is non-uniform.",
      foundationalExplanation: "Uniform motion produces a straight line sloping upward on a distance-time graph. The steepness of this slope tells us the speed: a steeper line means a faster object. A flat horizontal line means the object is at rest (time passes, but distance does not change). A curved line indicates changing speed (non-uniform motion).",
      detailedExplanation: "According to NCERT Class 9 Chapter 8, the slope of a distance-time graph is delta s / delta t, which equals speed. When calculating speed from a straight line s-t graph, choose two points (t1, s1) and (t2, s2). Speed v = (s2 - s1) / (t2 - t1). In non-uniform motion, instantaneous speed is obtained from the tangent slope at that instant.",
      sections: [
        {
          heading: "1. Characteristics of Uniform and Non-Uniform Motion",
          body: "In uniform motion, velocity is constant, meaning acceleration is zero. Real-world motion is almost always non-uniform because friction, turns, and obstacles cause speed and direction changes.",
          highlight: "Uniform motion implies zero acceleration (a = 0)."
        },
        {
          heading: "2. Reading Distance-Time Graphs (NCERT Method)",
          body: "• Line parallel to time axis: Object at rest (v = 0).\n• Straight line passing through origin: Uniform speed.\n• Curved line bending upward: Speed is increasing (accelerating).\n• Curved line leveling off: Speed is decreasing (decelerating)."
        }
      ],
      rulesOrFormulas: [
        { name: "Slope of Distance-Time Graph", formula: "Speed = (s2 - s1) / (t2 - t1)", explanation: "Rate of change of position", units: "m/s" },
        { name: "Uniform Motion Equation", formula: "s = v * t", explanation: "Valid strictly when acceleration is zero", units: "meters (m)" }
      ],
      realWorldApplications: [
        "Railway train timetables model section speeds as piecewise uniform motion intervals.",
        "Seismograph traces plot ground displacement over time to determine earthquake wave velocities."
      ],
      commonMisconceptions: [
        {
          misconception: "A straight line on an s-t graph means the car is driving up a hill.",
          whyItsWrong: "The vertical axis represents distance from starting point, NOT physical height or elevation.",
          correction: "An upward slope on an s-t graph represents forward motion along a horizontal road at constant speed."
        }
      ],
      keyTakeaway: "On a distance-time graph, slope represents speed; a straight line represents uniform motion."
    },
    visualize: {
      visualType: "interactive_graph",
      renderer: "graph",
      title: "Distance-Time Graph Explorer",
      subtitle: "Compare uniform motion (straight line) vs non-uniform motion (curve) vs rest (flat line)",
      observe: "Notice how changing the speed slider steepens the slope of the line, showing faster distance accumulation per second.",
      visualProps: {
        mode: "distance_time",
        slopeValue: 15,
        comparisonLines: [
          { label: "Car A (Fast, 20 m/s)", slope: 20, color: "#10b981" },
          { label: "Car B (Slow, 10 m/s)", slope: 10, color: "#3b82f6" },
          { label: "Car C (At Rest, 0 m/s)", slope: 0, color: "#6b7280" }
        ]
      },
      interactiveControls: [
        { id: "speed_slider", label: "Car Speed", type: "slider", min: 0, max: 30, default: 15, unit: "m/s" }
      ],
      caption: "Steeper slope = higher speed. Horizontal line = object at rest."
    },
    practice: {
      questions: [
        {
          id: "cbse9_motion_q1",
          questionNumber: 1,
          type: "numerical",
          difficulty: "foundation",
          prompt: "On a distance-time graph, an object moves from position s1 = 20 m at t1 = 2 s to position s2 = 80 m at t2 = 6 s along a straight line. Calculate the speed of the object.",
          hints: ["Use the slope formula: Speed = (s2 - s1) / (t2 - t1)."],
          solutionSteps: [
            "Change in distance delta s = 80 m - 20 m = 60 m.",
            "Change in time delta t = 6 s - 2 s = 4 s.",
            "Speed = 60 m / 4 s = 15 m/s."
          ],
          expectedAnswer: "15 m/s",
          explanation: "The slope of the line over that interval is 15 m/s, which equals the uniform speed."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Verify student calculates delta s / delta t and interprets horizontal lines as zero speed.",
      commonMistakes: [
        {
          mistake: "Dividing s2 by t2 directly instead of using delta s / delta t",
          diagnosis: "Forgot that the line does not start from the origin.",
          category: "calculation_error",
          remediation: "Always subtract initial coordinates: slope = (s2 - s1) / (t2 - t1)."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "visual_demonstration",
        label: "Real-Time Runner Visual",
        explanation: "Watch two runners side by side: one taking identical strides every second (straight line), the other speeding up then panting (curving line)."
      },
      prerequisiteBridge: {
        neededConcept: "Line Slopes in Graphs",
        bridgeExplanation: "Slope is rise over run. In a distance-time graph, rise is meters and run is seconds, giving m/s (speed)."
      },
      challengeExtension: {
        challengePrompt: "Can a distance-time graph ever be a vertical line perpendicular to the time axis? Why or why not?",
        deepThinkingQuestion: "A vertical line would mean infinite distance covered in zero seconds (infinite speed)."
      }
    },
    remember: {
      coreTakeaway: "Slope of Distance-Time graph = Speed. Straight line = Uniform motion. Horizontal line = Rest.",
      essentialFormulas: ["Speed = delta s / delta t"],
      summaryPoints: ["Uniform motion covers equal distance in equal time.", "Slope indicates speed magnitude."],
      memoryCard: {
        front: "What does the slope of an s-t graph represent?",
        back: "Speed (or velocity magnitude).",
        tip: "Rise = meters, Run = seconds. Rise/Run = m/s."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Practice CBSE Class 9 Distance-Time Graph Interpretations",
        recommendedMinutes: 15,
        suggestedDayOffset: 1
      }
    }
  },

  // =========================================================================
  // 3. JEE MAIN PHYSICS — KINEMATICS (Rigorous Problem Solving)
  // =========================================================================
  "jee.main.physics.kinematics.projectile_motion": {
    conceptId: "jee.main.physics.kinematics.projectile_motion",
    subConceptId: "projectile_motion",
    chapterId: "jee.main.physics.kinematics",
    chapterTitle: "Kinematics",
    conceptTitle: "Projectile Motion and Kinematics in Two Dimensions",
    curriculumTrack: "jee_main",
    board: "JEE Main (NTA)",
    classNum: 11,
    subject: "Physics",
    subjectType: "physics",
    layoutType: "physics_simulation",
    difficulty: 0.65,
    difficultyLabel: "Advanced",
    estimatedMinutes: 15,
    learningObjectives: [
      "Decompose 2D projectile motion into independent, orthogonal 1D motions: uniform horizontal velocity and uniformly accelerated vertical motion under gravity.",
      "Derive time of flight T = (2*u*sin theta)/g, maximum height H = (u^2 * sin^2 theta)/(2*g), and horizontal range R = (u^2 * sin 2theta)/g.",
      "Derive the parabolic trajectory equation y = x*tan theta - (g*x^2)/(2*u^2 * cos^2 theta) and express it in terms of range: y = x*tan theta * (1 - x/R).",
      "Solve advanced two-body collision and inclined plane projectile problems expected in JEE Main."
    ],
    prerequisites: ["Vector resolution into components (cos theta, sin theta)", "1D Kinematic Equations under gravity"],
    explain: {
      conceptIntro: "A cricket ball hit into the stands or an artillery shell fired from a cannon follows a curved trajectory governed solely by initial velocity and gravity. Galileo demonstrated that perpendicular dimensions of motion operate with complete independence.",
      definition: "Projectile motion is two-dimensional motion under constant acceleration due to gravity, neglecting aerodynamic drag. Horizontal acceleration a_x = 0; vertical acceleration a_y = -g.",
      foundationalExplanation: "When launched at initial speed u and launch angle theta above the horizontal:\n• Horizontal velocity component: u_x = u * cos theta (remains completely constant throughout the flight).\n• Vertical velocity component: u_y = u * sin theta (decreases at rate g, becomes 0 at peak height, then accelerates downward).",
      detailedExplanation: "For JEE Main, mastery of the equation of trajectory is vital:\ny = x * tan theta - [g * x^2 / (2 * u^2 * cos^2 theta)]\nThis can be factored into the compact range form:\ny = x * tan theta * (1 - x / R)\nThis form saves valuable examination time when solving coordinate intersection problems. Complementary launch angles (theta and 90° - theta) yield identical horizontal ranges for the same launch speed u.",
      sections: [
        {
          heading: "1. Derivation of Standard Projectile Formulas",
          body: "• Time of Flight (T): Set vertical displacement y = 0 => u*sin theta * T - 0.5*g*T^2 = 0 => T = (2*u*sin theta) / g.\n• Maximum Height (H): At peak, v_y = 0 => 0 = (u*sin theta)^2 - 2*g*H => H = (u^2 * sin^2 theta) / (2*g).\n• Horizontal Range (R): R = u_x * T = (u*cos theta) * (2*u*sin theta / g) = (u^2 * sin 2theta) / g.",
          highlight: "Range R is maximized at theta = 45°, where R_max = u^2 / g, and H_at_Rmax = R_max / 4."
        },
        {
          heading: "2. The Compact Trajectory Equation (JEE Shortcut)",
          body: "y = x * tan theta * (1 - x / R). When a question gives point (x, y) through which a projectile passes and its horizontal range R, the launch angle theta can be solved instantly without computing time of flight.",
          highlight: "Crucial JEE Shortcut: y = x * tan(theta) * (1 - x/R)."
        }
      ],
      rulesOrFormulas: [
        { name: "Time of Flight", formula: "T = (2 * u * sin theta) / g", explanation: "Total duration in air", units: "seconds (s)" },
        { name: "Maximum Height", formula: "H = (u^2 * sin^2 theta) / (2 * g)", explanation: "Peak vertical displacement", units: "meters (m)" },
        { name: "Horizontal Range", formula: "R = (u^2 * sin 2theta) / g", explanation: "Horizontal distance covered", units: "meters (m)" },
        { name: "Trajectory Formula", formula: "y = x * tan theta * (1 - x / R)", explanation: "Parabolic path in terms of Range", units: "meters" }
      ],
      realWorldApplications: [
        "Ballistics tracking in defense targeting systems.",
        "Satellite orbit injection where booster cutoff angle and velocity determine suborbital trajectory."
      ],
      commonMisconceptions: [
        {
          misconception: "At the highest point of projectile motion, acceleration is zero.",
          whyItsWrong: "Only the vertical velocity v_y is zero at the peak. Gravity still exerts a downward acceleration g = 9.8 m/s^2, and horizontal velocity u*cos theta is still present.",
          correction: "At the peak, velocity is v = u*cos theta (horizontal), and acceleration is g (vertically downward)."
        }
      ],
      keyTakeaway: "Horizontal velocity never changes; vertical velocity accelerates at -g; horizontal and vertical motions are completely independent."
    },
    visualize: {
      visualType: "motion_simulation",
      renderer: "motion_simulation",
      title: "2D Parabolic Projectile Simulator",
      subtitle: "Launch velocity u and angle theta decomposition with live vector displays",
      observe: "Observe that the green horizontal vector (u_x) never changes length, while the blue vertical vector (u_y) shrinks to zero at the peak and reverses downward.",
      visualProps: {
        mode: "projectile_motion",
        u: 25,
        theta: 45,
        g: 9.8,
        showVectors: true,
        showParabola: true
      },
      interactiveControls: [
        { id: "u_control", label: "Launch Speed (u)", type: "slider", min: 10, max: 50, default: 25, unit: "m/s" },
        { id: "theta_control", label: "Launch Angle (θ)", type: "slider", min: 15, max: 75, default: 45, unit: "°" }
      ],
      caption: "Launch at 45° maximizes horizontal range. Horizontal velocity component remains constant throughout flight."
    },
    practice: {
      questions: [
        {
          id: "jee_proj_q1",
          questionNumber: 1,
          type: "numerical",
          difficulty: "advanced",
          prompt: "A projectile is thrown with a velocity of 50 m/s at an angle of 30° with the horizontal. Calculate its time of flight, maximum height, and horizontal range. (Take g = 10 m/s^2)",
          hints: [
            "u_x = 50 * cos(30°) = 50 * (sqrt(3)/2) = 25*sqrt(3) m/s.",
            "u_y = 50 * sin(30°) = 50 * 0.5 = 25 m/s.",
            "T = 2*u_y / g, H = u_y^2 / (2g), R = u_x * T."
          ],
          solutionSteps: [
            "T = (2 * 50 * sin 30°) / 10 = (100 * 0.5) / 10 = 5 seconds.",
            "H = (50^2 * sin^2 30°) / (2 * 10) = (2500 * 0.25) / 20 = 625 / 20 = 31.25 meters.",
            "R = (50^2 * sin 60°) / 10 = (2500 * sqrt(3)/2) / 10 = 125 * sqrt(3) ≈ 216.5 meters."
          ],
          expectedAnswer: "T = 5 s, H = 31.25 m, R = 125√3 m (216.5 m)",
          explanation: "Standard application of orthogonal velocity components under constant vertical gravitational acceleration."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student separates orthogonal components and properly handles trigonometric values for sin(2theta) and sin^2(theta).",
      commonMistakes: [
        {
          mistake: "Confusing sin(2*theta) in Range with sin^2(theta) in Height",
          diagnosis: "Algebraic formula confusion.",
          category: "incorrect_formula_application",
          remediation: "Remember Range uses double angle sin(2θ) because R = 2*u_x*u_y/g = 2*u*cosθ*u*sinθ/g."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "step_by_step_derivation",
        label: "The Orthogonal Table Technique",
        explanation: "Set up two columns on your scratchpad: X-Axis (a_x = 0, v_x = u cos theta) and Y-Axis (a_y = -g, u_y = u sin theta). Never mix horizontal and vertical values."
      },
      prerequisiteBridge: {
        neededConcept: "Trigonometric Component Resolution",
        bridgeExplanation: "In any right-angled triangle of hypotenuse u and angle theta: Adjacent side = u cos theta, Opposite side = u sin theta."
      },
      challengeExtension: {
        challengePrompt: "JEE Advanced: A projectile is fired from the base of an inclined plane of inclination 30° with speed 30 m/s at an angle of 60° to the horizontal. Find its range along the incline.",
        deepThinkingQuestion: "Rotate your coordinate axes so that X is parallel to the incline and Y is perpendicular."
      }
    },
    remember: {
      coreTakeaway: "T = 2u sinθ / g; H = u² sin²θ / 2g; R = u² sin 2θ / g; y = x tanθ (1 - x/R).",
      essentialFormulas: ["T = 2u_y / g", "H = u_y^2 / 2g", "R = 2 u_x u_y / g"],
      summaryPoints: ["Motion along x is uniform.", "Motion along y is accelerated under gravity.", "Max range occurs at θ = 45°."],
      memoryCard: {
        front: "What is the speed of a projectile at its highest point?",
        back: "v_min = u * cos(theta)",
        tip: "Vertical speed is 0; horizontal speed is unchanged."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Practice JEE Main Projectile and Trajectory Equation Problems",
        recommendedMinutes: 25,
        suggestedDayOffset: 2
      }
    }
  },

  // =========================================================================
  // 4. NEET BIOLOGY — CELL: THE UNIT OF LIFE
  // =========================================================================
  "neet.biology.cell.organelles_and_membrane": {
    conceptId: "neet.biology.cell.organelles_and_membrane",
    subConceptId: "organelles_and_membrane",
    chapterId: "cbse.11.biology.the_living_world",
    chapterTitle: "Cell: The Unit of Life",
    conceptTitle: "Fluid Mosaic Model and Eukaryotic Cell Organelles",
    curriculumTrack: "neet",
    board: "NEET (NTA / NCERT)",
    classNum: 11,
    subject: "Biology",
    subjectType: "biology",
    layoutType: "biology_diagram",
    difficulty: 0.58,
    difficultyLabel: "Advanced",
    estimatedMinutes: 12,
    learningObjectives: [
      "Explain Singer and Nicolson's Fluid Mosaic Model (1972) of the plasma membrane, detailing the phospholipid bilayer and protein arrangements.",
      "Distinguish between passive transport (simple diffusion, facilitated diffusion) and active transport (Na+/K+ pump requiring ATP).",
      "Characterize endomembrane system components: Endoplasmic Reticulum (RER vs SER), Golgi apparatus, Lysosomes, and Vacuoles.",
      "Compare semi-autonomous double-membrane organelles: Mitochondria (cristae, ATP synthesis) and Chloroplasts (thylakoids, stroma, photosynthesis)."
    ],
    prerequisites: ["Prokaryotic vs Eukaryotic basic cell distinctions"],
    explain: {
      conceptIntro: "Every living organism is a functioning society of cells. Inside each eukaryotic cell, biochemical factories are separated into specialized membrane-bound compartments, all coordinated through the selectively permeable plasma membrane.",
      definition: "The plasma membrane is a quasi-fluid lipid bilayer with embedded and peripheral proteins that regulates the selective transit of substances into and out of the cell.",
      foundationalExplanation: "According to the Fluid Mosaic Model proposed by Singer and Nicolson in 1972, the cell membrane consists of a sea of fluid phospholipids in which proteins float like icebergs in an ocean. The lipid bilayer has polar hydrophilic heads facing outward toward aqueous environments and nonpolar hydrophobic fatty acid tails facing inward, shielded from water.",
      detailedExplanation: "For NEET, high-yield organelle structures require precise memorization:\n• Endoplasmic Reticulum: RER bears 80S ribosomes for protein synthesis; SER synthesizes lipids and steroidal hormones.\n• Golgi Apparatus: Discovered by Camillo Golgi (1898); cisternae have a convex forming/cis face (receives vesicles from ER) and a concave maturing/trans face (secretes packaged glycoproteins and glycolipids).\n• Mitochondria and Chloroplasts: Both contain 70S ribosomes, circular double-stranded DNA, and divide by binary fission, supporting the endosymbiotic theory.",
      sections: [
        {
          heading: "1. The Fluid Mosaic Model (Singer & Nicolson, 1972)",
          body: "Phospholipids provide fluidity, allowing lateral movement of proteins. Integral proteins span the entire membrane (channel and carrier proteins), while peripheral proteins lie on the membrane surface. Cholesterol regulates membrane fluidity at varying temperatures.",
          highlight: "Quasi-fluid nature of lipids enables cell growth, intercellular junctions, endocytosis, and cell division."
        },
        {
          heading: "2. The Endomembrane System",
          body: "Includes organelles whose functions are coordinated: Endoplasmic Reticulum, Golgi apparatus, Lysosomes (acid hydrolases at pH 5), and Vacuoles (tonoplast membrane). Mitochondria, chloroplasts, and peroxisomes are NOT part of the endomembrane system because their functions are uncoordinated with these.",
          highlight: "NEET Trap: Mitochondria and chloroplasts are NOT members of the endomembrane system."
        }
      ],
      rulesOrFormulas: [
        { name: "Membrane Composition", formula: "Lipids (40%) + Proteins (52%) + Carbohydrates (8%)", explanation: "Approximate ratio in human erythrocyte membrane" }
      ],
      realWorldApplications: [
        "Liposomes modeled after lipid bilayers are used in targeted chemotherapy drug delivery.",
        "Cystic fibrosis is caused by a defect in CFTR membrane channel protein."
      ],
      commonMisconceptions: [
        {
          misconception: "Mitochondria are part of the endomembrane system.",
          whyItsWrong: "Mitochondrial protein processing and electron transport operate independently of the ER-Golgi secretion pathway.",
          correction: "Mitochondria, chloroplasts, and peroxisomes are excluded from the endomembrane system."
        }
      ],
      keyTakeaway: "Plasma membrane is a fluid phospholipid bilayer with mosaic proteins; endomembrane organelles coordinate secretory and packaging traffic."
    },
    visualize: {
      visualType: "labelled_diagram",
      renderer: "cell",
      title: "Interactive Eukaryotic Cell & Membrane Structure",
      subtitle: "Click organelles to inspect ultra-structure, functions, and NEET high-yield facts",
      observe: "Notice the double membrane of mitochondria and the connection between the rough ER and the cis face of the Golgi apparatus.",
      visualProps: {
        mode: "eukaryotic_cell",
        organelles: [
          { id: "nucleus", name: "Nucleus", info: "Houses chromatin and nucleolus (rRNA synthesis)" },
          { id: "rer", name: "Rough Endoplasmic Reticulum", info: "Lined with 80S ribosomes; synthesizes secretory proteins" },
          { id: "golgi", name: "Golgi Apparatus", info: "Packaging and glycosylation (cis face receives, trans face buds)" },
          { id: "mitochondria", name: "Mitochondria", info: "Double membrane, cristae, 70S ribosomes, circular DNA, ATP powerhouse" },
          { id: "lysosome", name: "Lysosome", info: "Acid hydrolases active at acidic pH; intracellular digestion" }
        ]
      },
      interactiveControls: [
        { id: "focus_organelle", label: "Inspect Organelle", type: "select", options: ["All", "Mitochondria", "Golgi", "RER", "Lysosome"] }
      ],
      caption: "Interactive eukaryotic cell model highlighting endomembrane coordination and semi-autonomous organelles."
    },
    practice: {
      questions: [
        {
          id: "neet_cell_q1",
          questionNumber: 1,
          type: "mcq",
          difficulty: "intermediate",
          prompt: "Which of the following cellular components is NOT considered part of the endomembrane system? (NEET Exam Question)",
          hints: ["Endomembrane members have coordinated vesicle trafficking functions."],
          options: [
            "A) Golgi apparatus",
            "B) Lysosomes",
            "C) Peroxisomes",
            "D) Vacuoles"
          ],
          expectedAnswer: "C) Peroxisomes",
          explanation: "Peroxisomes, mitochondria, and chloroplasts are not coordinated with the ER-Golgi pathway and are therefore excluded from the endomembrane system."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student recognizes Singer-Nicolson lipid bilayer mechanics and knows the exact 4 endomembrane components.",
      commonMistakes: [
        {
          mistake: "Selecting mitochondria as part of endomembrane system",
          diagnosis: "Did not understand the biological definition of endomembrane coordination.",
          category: "conceptual_misunderstanding",
          remediation: "Endomembrane system contains ONLY ER, Golgi, Lysosomes, and Vacuoles."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "visual_demonstration",
        label: "The Postal Service Organelle Analogy",
        explanation: "Think of ER as the factory making products, Golgi as the post office sorting and packing boxes, and lysosomes as the recycling disposal truck."
      },
      prerequisiteBridge: {
        neededConcept: "Prokaryotic vs Eukaryotic Ribosomes",
        bridgeExplanation: "Eukaryotic cytoplasm has 80S ribosomes (60S + 40S), but mitochondria and chloroplasts retain primitive prokaryotic 70S ribosomes (50S + 30S)."
      },
      challengeExtension: {
        challengePrompt: "Why are mitochondria and chloroplasts referred to as 'semi-autonomous' rather than fully autonomous?",
        deepThinkingQuestion: "They have their own DNA and ribosomes, but still depend on nuclear DNA for most structural enzymes."
      }
    },
    remember: {
      coreTakeaway: "Fluid Mosaic Model = Singer & Nicolson (1972). Endomembrane = ER + Golgi + Lysosome + Vacuole. Mitochondria/Chloroplasts = 70S + circular DNA.",
      essentialFormulas: ["Human erythrocyte membrane: 52% protein, 40% lipid"],
      summaryPoints: [
        "Phospholipid bilayer: Hydrophilic heads outside, hydrophobic tails inside.",
        "Tonoplast is the semi-permeable membrane of plant vacuoles.",
        "Mitochondrial inner membrane cristae increase surface area for ATP synthase."
      ],
      memoryCard: {
        front: "Which face of the Golgi apparatus receives vesicles from ER?",
        back: "The cis (forming or convex) face receives; trans (maturing or concave) face releases.",
        tip: "Cis comes first, Trans transports out."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Review NEET Cell Biology and Fluid Mosaic Model Questions",
        recommendedMinutes: 20,
        suggestedDayOffset: 1
      }
    }
  },

  // =========================================================================
  // 5. CBSE CLASS 10 CHEMISTRY — CHEMICAL REACTIONS AND EQUATIONS
  // =========================================================================
  "cbse.10.science.chemical_reactions_and_equations.balancing_and_types": {
    conceptId: "cbse.10.science.chemical_reactions_and_equations.balancing_and_types",
    subConceptId: "balancing_and_types",
    chapterId: "cbse.10.science.chemical_reactions_and_equations",
    chapterTitle: "Chemical Reactions and Equations",
    conceptTitle: "Balancing Chemical Equations and Reaction Types",
    curriculumTrack: "cbse",
    board: "CBSE (NCERT)",
    classNum: 10,
    subject: "Science",
    subjectType: "chemistry",
    layoutType: "chemistry_reaction",
    difficulty: 0.4,
    difficultyLabel: "Intermediate",
    estimatedMinutes: 10,
    learningObjectives: [
      "Balance chemical equations using the Law of Conservation of Mass (atoms of each element in reactants = atoms in products).",
      "Identify the 5 primary reaction types: Combination, Decomposition, Displacement, Double Displacement, and Redox (Oxidation-Reduction).",
      "Differentiate exothermic reactions (heat released, e.g. respiration) from endothermic reactions (heat absorbed, e.g. photosynthesis, thermal decomposition).",
      "Identify oxidation (gain of oxygen / loss of hydrogen / loss of electrons) and reduction."
    ],
    prerequisites: ["Chemical symbols, valency, and writing chemical formulas"],
    explain: {
      conceptIntro: "When magnesium ribbon burns in air with a dazzling white flame to form magnesium oxide ash, chemical bonds break and re-form. Antoine Lavoisier proved that matter can neither be created nor destroyed in a chemical reaction.",
      definition: "A balanced chemical equation has an equal number of atoms of each element on both sides of the reaction equation.",
      foundationalExplanation: "Consider the rusting of iron or burning of natural gas. We cannot change the chemical formulas of substances (e.g. H2O cannot be changed to H2O2), but we adjust stoichiometric coefficients in front of formulas until the number of atoms balances on both sides.",
      detailedExplanation: "In NCERT Class 10 Chapter 1, reactions are classified into five fundamental categories:\n1. Combination: Two or more reactants join to form a single product: CaO (quicklime) + H2O -> Ca(OH)2 (slaked lime) + Heat.\n2. Decomposition: A single reactant breaks down into simpler products: 2FeSO4 (green) + Heat -> Fe2O3 (brown) + SO2 + SO3.\n3. Displacement: A more reactive element displaces a less reactive element: Fe + CuSO4 (blue) -> FeSO4 (light green) + Cu.\n4. Double Displacement: Exchange of ions between reactants forming an insoluble precipitate: Na2SO4 + BaCl2 -> BaSO4 (white ppt) + 2NaCl.\n5. Redox: Simultaneous oxidation (loss of e-) and reduction (gain of e-).",
      sections: [
        {
          heading: "1. The Law of Conservation of Mass in Chemistry",
          body: "Total mass of reactants = Total mass of products. Therefore, the total number of atoms of each element present in reactants must strictly equal the total number of atoms of that element in the products.",
          highlight: "Never alter subscripts in a chemical formula (e.g., Fe2O3). Only change stoichiometric coefficients in front."
        },
        {
          heading: "2. Identifying Redox Reactions",
          body: "Oxidation is the gain of oxygen or loss of hydrogen. Reduction is the loss of oxygen or gain of hydrogen. In modern electronic terms: Oil Rig (Oxidation is Loss of electrons, Reduction is Gain of electrons). In CuO + H2 -> Cu + H2O, CuO is reduced to Cu (oxidizing agent) and H2 is oxidized to H2O (reducing agent)."
        }
      ],
      rulesOrFormulas: [
        { name: "Combustion of Methane", formula: "CH4 + 2O2 -> CO2 + 2H2O + Heat", explanation: "Exothermic combination/redox" },
        { name: "Precipitation Equation", formula: "BaCl2(aq) + Na2SO4(aq) -> BaSO4(s)v + 2NaCl(aq)", explanation: "Double displacement precipitate" }
      ],
      realWorldApplications: [
        "Respiration is an exothermic decomposition process (C6H12O6 + 6O2 -> 6CO2 + 6H2O + Energy).",
        "Corrosion (rusting of iron: 2Fe + 3/2 O2 + xH2O -> Fe2O3.xH2O) and Rancidity of fats are harmful real-world redox reactions."
      ],
      commonMisconceptions: [
        {
          misconception: "Balancing an equation by changing subscripts (e.g. writing H2 + O2 -> H2O2 to balance oxygen).",
          whyItsWrong: "H2O2 is hydrogen peroxide (a bleaching antiseptic), completely different from water (H2O).",
          correction: "Change only the multiplier in front: 2H2 + O2 -> 2H2O."
        }
      ],
      keyTakeaway: "Atoms are conserved in chemical reactions; balancing requires adjusting front coefficients without altering chemical formulas."
    },
    visualize: {
      visualType: "chemical_reaction",
      renderer: "atom",
      title: "Interactive Chemical Equation Balancer & Atomic Model",
      subtitle: "Balance Fe + H2O -> Fe3O4 + H2 and verify atom conservation on both sides",
      observe: "Watch the balance scales for Iron (Fe), Hydrogen (H), and Oxygen (O) reach equilibrium when coefficients are 3Fe + 4H2O -> Fe3O4 + 4H2.",
      visualProps: {
        mode: "equation_balancer",
        reactants: [
          { formula: "Fe", count: 3, atoms: { Fe: 1 } },
          { formula: "H2O", count: 4, atoms: { H: 2, O: 1 } }
        ],
        products: [
          { formula: "Fe3O4", count: 1, atoms: { Fe: 3, O: 4 } },
          { formula: "H2", count: 4, atoms: { H: 2 } }
        ],
        balanced: true
      },
      interactiveControls: [
        { id: "fe_coeff", label: "Fe coefficient", type: "number", min: 1, max: 6, default: 3 },
        { id: "h2o_coeff", label: "H2O coefficient", type: "number", min: 1, max: 6, default: 4 }
      ],
      caption: "Left: 3 Fe, 8 H, 4 O. Right: 3 Fe, 8 H, 4 O. Atom counts are perfectly balanced."
    },
    practice: {
      questions: [
        {
          id: "cbse10_chem_q1",
          questionNumber: 1,
          type: "numerical",
          difficulty: "intermediate",
          prompt: "Balance the following chemical equation and identify the reaction type: Al + Fe2O3 -> Al2O3 + Fe",
          hints: [
            "Count Al: 1 on left, 2 on right. Multiply Al on left by 2.",
            "Count Fe: 2 on left, 1 on right. Multiply Fe on right by 2.",
            "Notice how Al displaces Fe from its oxide."
          ],
          solutionSteps: [
            "Reactants: 1 Al, 2 Fe, 3 O. Products: 2 Al, 1 Fe, 3 O.",
            "Step 1: Place 2 in front of Al -> 2Al + Fe2O3 -> Al2O3 + Fe.",
            "Step 2: Place 2 in front of Fe -> 2Al + Fe2O3 -> Al2O3 + 2Fe.",
            "Check: Al=2, Fe=2, O=3 on both sides. Reaction Type: Displacement reaction (Thermite process)."
          ],
          expectedAnswer: "2Al + Fe2O3 -> Al2O3 + 2Fe (Displacement / Redox Reaction)",
          explanation: "Aluminum is more reactive than iron, displacing it from iron(III) oxide with intense heat release."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student balances atoms without modifying subscripts and accurately classifies displacement and redox pairs.",
      commonMistakes: [
        {
          mistake: "Modifying formula subscripts to balance",
          diagnosis: "Did not understand chemical formula stability.",
          category: "incorrect_formula_application",
          remediation: "Subscripts are fixed by valencies. Only adjust coefficients."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "step_by_step_breakdown",
        label: "The Element Ledger Balancing Method",
        explanation: "Draw a 3-column table: Element | Reactant Count | Product Count. Balance the element present in the fewest compounds first, saving Hydrogen and Oxygen for last."
      },
      prerequisiteBridge: {
        neededConcept: "Valency and Compound Formation",
        bridgeExplanation: "Formulas like Al2O3 come from valency criss-cross (Al is +3, O is -2). Changing subscripts invents non-existent molecules."
      },
      challengeExtension: {
        challengePrompt: "In the reaction: MnO2 + 4HCl -> MnCl2 + 2H2O + Cl2, identify the substance oxidized, substance reduced, oxidizing agent, and reducing agent.",
        deepThinkingQuestion: "HCl loses hydrogen (oxidized, acting as reducing agent); MnO2 loses oxygen (reduced, acting as oxidizing agent)."
      }
    },
    remember: {
      coreTakeaway: "Conservation of mass demands balanced chemical equations; 5 types: Combination, Decomposition, Displacement, Double Displacement, Redox.",
      essentialFormulas: ["Reactant Atoms = Product Atoms"],
      summaryPoints: [
        "Combination: A + B -> AB",
        "Decomposition: AB -> A + B",
        "Displacement: A + BC -> AC + B",
        "Double Displacement: AB + CD -> AD + CB (forms precipitate)",
        "Oxidation = Gain of O / Loss of H; Reduction = Loss of O / Gain of H"
      ],
      memoryCard: {
        front: "What is the difference between slaked lime and quicklime?",
        back: "Quicklime is Calcium Oxide (CaO). Slaked lime is Calcium Hydroxide [Ca(OH)2].",
        tip: "CaO + H2O -> Ca(OH)2 (slaking of lime, vigorous exothermic combination)."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Practice Balancing Complex Equations and Identifying Redox Agents",
        recommendedMinutes: 20,
        suggestedDayOffset: 1
      }
    }
  },

  // =========================================================================
  // 6. CBSE CLASS 10 MATHEMATICS — QUADRATIC EQUATIONS
  // =========================================================================
  "cbse.10.mathematics.quadratic_equations.roots_and_discriminant": {
    conceptId: "cbse.10.mathematics.quadratic_equations.roots_and_discriminant",
    subConceptId: "roots_and_discriminant",
    chapterId: "cbse.10.mathematics.quadratic_equations",
    chapterTitle: "Quadratic Equations",
    conceptTitle: "Quadratic Formula and the Nature of Roots",
    curriculumTrack: "cbse",
    board: "CBSE (NCERT)",
    classNum: 10,
    subject: "Mathematics",
    subjectType: "mathematics",
    layoutType: "math_derivation",
    difficulty: 0.45,
    difficultyLabel: "Intermediate",
    estimatedMinutes: 10,
    learningObjectives: [
      "Identify the standard form of a quadratic equation: ax^2 + bx + c = 0, where a != 0.",
      "Solve quadratic equations using the Quadratic Formula (Sridharacharya's rule): x = (-b ± sqrt(b^2 - 4ac)) / (2a).",
      "Calculate the discriminant D = b^2 - 4ac to determine the nature of roots without finding the roots.",
      "Interpret the 3 discriminant conditions: D > 0 (two distinct real roots), D = 0 (two equal real roots), and D < 0 (no real roots / complex conjugates)."
    ],
    prerequisites: ["Factoring polynomials, perfect square trinomials, square roots"],
    explain: {
      conceptIntro: "If an architect designs a rectangular room whose length is 3 meters greater than its width with an area of 40 square meters, the dimensions satisfy x(x + 3) = 40, or x^2 + 3x - 40 = 0. Quadratic equations govern geometric areas, parabolic arches, and projectile trajectories.",
      definition: "A quadratic equation in variable x is an equation of the form ax^2 + bx + c = 0, where a, b, and c are real numbers and a != 0.",
      foundationalExplanation: "Any quadratic equation has at most two roots (solutions). While some can be factored easily, the Quadratic Formula solves ANY quadratic equation by completing the square. The term under the square root, D = b^2 - 4ac, is called the discriminant because it discriminates between types of roots.",
      detailedExplanation: "According to NCERT Class 10 Chapter 4, the roots are x = [-b ± sqrt(D)] / 2a. The nature of roots depends entirely on the sign of D:\n1. If D > 0: Two distinct real roots: x = (-b + sqrt(D))/2a and x = (-b - sqrt(D))/2a. The parabola crosses the x-axis at two distinct points.\n2. If D = 0: Two equal real roots: x = -b / (2a). The parabola touches the x-axis at exactly one vertex point.\n3. If D < 0: No real roots. The square root of a negative number is not real. The parabola lies entirely above or below the x-axis without ever intersecting it.",
      sections: [
        {
          heading: "1. Sridharacharya's Quadratic Formula Derivation",
          body: "ax^2 + bx + c = 0 => Divide by a: x^2 + (b/a)x + c/a = 0.\nComplete the square: [x + b/(2a)]^2 - b^2/(4a^2) + c/a = 0.\n[x + b/(2a)]^2 = (b^2 - 4ac) / (4a^2).\nTake square root: x + b/(2a) = ± sqrt(b^2 - 4ac) / (2a).\nx = [-b ± sqrt(b^2 - 4ac)] / (2a).",
          highlight: "The discriminant D = b^2 - 4ac dictates whether the square root yields real numbers."
        },
        {
          heading: "2. The Nature of Roots Summary Table",
          body: "• D > 0 and a perfect square: Roots are real, rational, and distinct.\n• D > 0 but not a perfect square: Roots are real, irrational, and distinct (conjugate surds).\n• D = 0: Roots are real, rational, and coincident (equal).\n• D < 0: No real roots."
        }
      ],
      rulesOrFormulas: [
        { name: "Standard Quadratic Form", formula: "a*x^2 + b*x + c = 0, a != 0", explanation: "Polynomial of degree 2" },
        { name: "Quadratic Formula", formula: "x = (-b ± sqrt(b^2 - 4*a*c)) / (2*a)", explanation: "General solution formula" },
        { name: "Discriminant", formula: "D = b^2 - 4*a*c", explanation: "Determines nature of roots" },
        { name: "Sum & Product of Roots", formula: "alpha + beta = -b/a, alpha * beta = c/a", explanation: "Vieta's relations" }
      ],
      realWorldApplications: [
        "Civil engineers calculate cable tension profiles for suspension bridges modeled as parabolas.",
        "Revenue maximization in business: Profit P(x) = -2x^2 + 80x - 300 to find break-even roots."
      ],
      commonMisconceptions: [
        {
          misconception: "Forgetting the negative sign in -b or forgetting to divide the entire numerator by 2a.",
          whyItsWrong: "Writing -b ± sqrt(D) / 2a where only the radical is divided by 2a causes calculation failure.",
          correction: "The entire quantity (-b ± sqrt(D)) is over (2a)."
        }
      ],
      keyTakeaway: "Discriminant D = b² - 4ac determines whether roots are distinct real (D > 0), equal (D = 0), or non-real (D < 0)."
    },
    visualize: {
      visualType: "step_by_step_derivation",
      renderer: "transform",
      title: "Interactive Parabola & Discriminant Roots Visualizer",
      subtitle: "Adjust coefficients a, b, c to see the parabola intersect the x-axis based on D",
      observe: "When D > 0 the curve cuts x-axis twice. When D = 0 it grazes at one point. When D < 0 it floats completely above.",
      visualProps: {
        mode: "quadratic_parabola",
        a: 1,
        b: -4,
        c: 3,
        D: 4,
        roots: [1, 3]
      },
      interactiveControls: [
        { id: "coeff_a", label: "Coefficient a", type: "slider", min: 1, max: 3, default: 1 },
        { id: "coeff_b", label: "Coefficient b", type: "slider", min: -6, max: 6, default: -4 },
        { id: "coeff_c", label: "Coefficient c", type: "slider", min: -5, max: 8, default: 3 }
      ],
      caption: "Parabola y = x² - 4x + 3. D = (-4)² - 4(1)(3) = 16 - 12 = 4 > 0. Two real roots at x = 1 and x = 3."
    },
    practice: {
      questions: [
        {
          id: "cbse10_math_q1",
          questionNumber: 1,
          type: "numerical",
          difficulty: "intermediate",
          prompt: "Find the discriminant of the quadratic equation 2x^2 - 4x + 3 = 0, and hence determine the nature of its roots.",
          hints: [
            "Identify coefficients: a = 2, b = -4, c = 3.",
            "Use formula D = b^2 - 4ac."
          ],
          solutionSteps: [
            "a = 2, b = -4, c = 3.",
            "D = b^2 - 4ac = (-4)^2 - 4(2)(3) = 16 - 24 = -8.",
            "Since D < 0, the equation has no real roots."
          ],
          expectedAnswer: "D = -8, No real roots",
          explanation: "Because the discriminant is negative (-8 < 0), the quadratic equation possesses no real roots."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student computes (-4)^2 as positive 16, applies b^2 - 4ac, and properly infers root characteristics.",
      commonMistakes: [
        {
          mistake: "Computing (-4)^2 as -16",
          diagnosis: "Sign squaring error in discriminant evaluation.",
          category: "calculation_error",
          remediation: "The square of any real negative number is strictly positive: (-4)^2 = +16."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "guided_discovery",
        label: "Visual Vertex Shift Exploration",
        explanation: "Think of the discriminant as controlling the vertical height of the parabola vertex relative to the ground (x-axis)."
      },
      prerequisiteBridge: {
        neededConcept: "Square Roots of Negatives",
        bridgeExplanation: "In the real number system, you cannot take the square root of a negative number, because no number times itself equals a negative."
      },
      challengeExtension: {
        challengePrompt: "Find the values of k for which the quadratic equation 2x^2 + kx + 3 = 0 has two equal real roots.",
        deepThinkingQuestion: "Equal real roots require D = 0 => k^2 - 4(2)(3) = 0 => k^2 = 24 => k = ±2√6."
      }
    },
    remember: {
      coreTakeaway: "x = (-b ± √D) / 2a. D > 0 gives two real roots; D = 0 gives equal roots; D < 0 gives no real roots.",
      essentialFormulas: ["D = b^2 - 4ac", "x = (-b ± sqrt(D)) / (2a)", "Sum = -b/a, Product = c/a"],
      summaryPoints: ["a cannot equal zero in ax^2 + bx + c = 0.", "Quadratic formula always works."],
      memoryCard: {
        front: "What is the condition for a quadratic equation to have equal real roots?",
        back: "D = b^2 - 4ac = 0. The single root is x = -b / 2a.",
        tip: "Equal roots means the vertex sits directly on the x-axis."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Solve Quadratic Discriminant and Word Problems",
        recommendedMinutes: 20,
        suggestedDayOffset: 2
      }
    }
  },

  // =========================================================================
  // 7. MAHARASHTRA BOARD CLASS 9 HISTORY — SOURCES OF HISTORY
  // =========================================================================
  "maharashtra.9.history.sources_of_history.primary_and_secondary_sources": {
    conceptId: "maharashtra.9.history.sources_of_history.primary_and_secondary_sources",
    subConceptId: "primary_and_secondary_sources",
    chapterId: "maharashtra.9.history.sources_of_history",
    chapterTitle: "Sources of History",
    conceptTitle: "Written, Material, Oral and Audio-Visual Historical Sources",
    curriculumTrack: "maharashtra",
    board: "Maharashtra State Board (Balbharati)",
    classNum: 9,
    subject: "History",
    subjectType: "history",
    layoutType: "history_timeline",
    difficulty: 0.3,
    difficultyLabel: "Foundation",
    estimatedMinutes: 8,
    learningObjectives: [
      "Classify historical sources into four distinct categories: Written sources, Material sources, Oral sources, and Audio-Visual media.",
      "Understand the historical value of newspapers, periodicals, diaries, archives, and official government gazettes.",
      "Analyze material sources including coins, commemorative postage stamps, monuments, and museum artifacts.",
      "Evaluate modern audio-visual archives like the Film and Television Institute of India (FTII) in recording post-independence history."
    ],
    prerequisites: ["Concept of chronological eras (BC/AD, BCE/CE)"],
    explain: {
      conceptIntro: "How do historians reconstruct events that occurred 50 or 500 years ago? Just as a detective examines footprints, fingerprints, and phone records, a historian relies on evidence left behind by past generations.",
      definition: "Historical sources are artifacts, documents, recordings, and oral traditions created during or about a past period that provide factual evidence for historical analysis.",
      foundationalExplanation: "History of modern India (1961 to 2000) is unique because unlike ancient history which relies heavily on stone inscriptions, modern history possesses abundant written documents, audio recordings, film reels, and government gazettes. Sources are classified into: 1) Written sources, 2) Material sources, 3) Oral sources, and 4) Audio-Visual sources.",
      detailedExplanation: "According to Balbharati Class 9 History Chapter 1:\n• Written Sources: Newspapers (e.g. Times of India, Loksatta), periodicals, diaries, reference books, correspondence, documents in archives (National Archives of India, New Delhi), government gazettes, and postage stamps.\n• Material Sources: Coins (varying metals, shapes, and inscriptions showing inflation, agricultural priorities, family welfare), memorials, buildings, and utensils.\n• Oral Sources: Folk songs (powadas of Tanaji Malusare or 1960 Samyukta Maharashtra Movement), owis, folk tales, and interviews with freedom fighters.\n• Audio-Visual Sources: Television (Doordarshan), films, documentaries by the Films Division of the Government of India, and FTII Pune archives.",
      sections: [
        {
          heading: "1. The Four Pillar Categories of Modern Sources",
          body: "1. Written: Written evidence documenting administrative, social, and political decisions.\n2. Material: Physical tangible objects reflecting metallurgical progress, architecture, and everyday life.\n3. Oral: Unwritten memories, ballads, and folklore passed through generations.\n4. Audio-Visual: Camera footage, radio broadcasts (All India Radio/Akashvani), and newsreels recording verbatim history.",
          highlight: "The National Archives of India in New Delhi is the largest historical archive in Asia."
        },
        {
          heading: "2. Coins and Postage Stamps as Historical Mirrors",
          body: "Postage stamps do not speak themselves, yet an astute historian reads their iconography. From the creation of India's postal department to commemorative issues honoring Jal Cooper (renowned philatelist), postage stamps depict India's scientific breakthroughs, wildlife conservation, and leaders."
        }
      ],
      rulesOrFormulas: [
        { name: "Historical Triangulation", formula: "Written Evidence + Material Cross-Check + Oral Context", explanation: "Method used to verify historical truth" }
      ],
      realWorldApplications: [
        "FTII (Film and Television Institute of India, Pune) preserves newsreels used by documentarians.",
        "Archaeological Survey of India (ASI) dates coins to map ancient trade routes."
      ],
      commonMisconceptions: [
        {
          misconception: "Newspapers are 100% objective historical facts.",
          whyItsWrong: "Newspapers reflect the editorial stance, censorship constraints, or political climate of their publication date.",
          correction: "Historians must critically corroborate newspaper articles against official government archives and independent sources."
        }
      ],
      keyTakeaway: "History is reconstructed from written records, physical artifacts, oral folk traditions, and audio-visual archives."
    },
    visualize: {
      visualType: "historical_timeline",
      renderer: "transform",
      title: "Classification of Modern Indian Historical Sources",
      subtitle: "Explore Written, Material, Oral, and Audio-Visual categories with primary artifacts",
      observe: "Click through each category to see real examples like the National Archives, Reserve Bank coinage, Powadas, and FTII newsreels.",
      visualProps: {
        mode: "sources_categories",
        categories: [
          { name: "Written Sources", examples: ["Newspapers", "Govt Gazettes", "Postage Stamps", "National Archives of India"] },
          { name: "Material Sources", examples: ["Coins & Currency", "Monuments", "Museum Artifacts", "Royal Seals"] },
          { name: "Oral Sources", examples: ["Powadas (Ballads)", "Folk Tales (Owis)", "Oral Testimonies", "Interviews"] },
          { name: "Audio-Visual", examples: ["FTII Documentaries", "All India Radio (Akashvani)", "Doordarshan Newsreels", "Internet Archives"] }
        ]
      },
      interactiveControls: [
        { id: "source_filter", label: "Source Type", type: "select", options: ["All", "Written", "Material", "Oral", "Audio-Visual"] }
      ],
      caption: "The 4 fundamental pillars of modern Indian historical documentation (1961–2000)."
    },
    practice: {
      questions: [
        {
          id: "mh9_hist_q1",
          questionNumber: 1,
          type: "mcq",
          difficulty: "foundation",
          prompt: "The National Archives of India, which is the largest archive in Asia, is situated in which city?",
          hints: ["It is the national capital of India."],
          options: ["A) Mumbai", "B) New Delhi", "C) Kolkata", "D) Pune"],
          expectedAnswer: "B) New Delhi",
          explanation: "The National Archives of India is located in New Delhi and houses millions of historical public records, treaties, and maps."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student correctly classifies sources into written, material, oral, or audio-visual and understands archive significance.",
      commonMistakes: [
        {
          mistake: "Classifying Powadas as written sources",
          diagnosis: "Confused written poetry with traditional oral ballads.",
          category: "terminology_confusion",
          remediation: "Powadas are traditional oral folk songs and ballads transmitted by word of mouth."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "concept_decomposition",
        label: "The Detective Evidence Breakdown",
        explanation: "Compare historical research to a criminal investigation: diaries = written confession, murder weapon = material source, eyewitness = oral source, CCTV footage = audio-visual source."
      },
      prerequisiteBridge: {
        neededConcept: "Primary vs Secondary Evidence",
        bridgeExplanation: "A primary source is created during the time under study; a secondary source is written later by analyzing primary evidence."
      },
      challengeExtension: {
        challengePrompt: "Why are postage stamps considered valuable mirrors of changing social priorities in independent India?",
        deepThinkingQuestion: "Analyze how stamp themes shifted from royalty to agriculture, industrial self-reliance, space exploration, and cultural icons."
      }
    },
    remember: {
      coreTakeaway: "Modern history relies on Written, Material, Oral, and Audio-Visual sources (FTII, Doordarshan, National Archives).",
      essentialFormulas: ["Sources = Written + Material + Oral + Audio-Visual"],
      summaryPoints: ["National Archives is in New Delhi.", "Powadas and Owis are oral sources.", "Coins and stamps are material sources."],
      memoryCard: {
        front: "What institution was established by the Government of India in Pune in 1960 to provide public education media?",
        back: "Film and Television Institute of India (FTII).",
        tip: "FTII produces newsreels and documentaries preserving contemporary history."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Review Maharashtra Class 9 Sources of History and Archival Institutions",
        recommendedMinutes: 15,
        suggestedDayOffset: 1
      }
    }
  },

  // =========================================================================
  // 8. MAHARASHTRA BOARD CLASS 9 GEOGRAPHY — DISTRIBUTIONAL MAPS
  // =========================================================================
  "maharashtra.9.geography.distributional_maps.thematic_mapping_methods": {
    conceptId: "maharashtra.9.geography.distributional_maps.thematic_mapping_methods",
    subConceptId: "thematic_mapping_methods",
    chapterId: "maharashtra.9.geography.distributional_maps",
    chapterTitle: "Distributional Maps",
    conceptTitle: "Thematic Mapping: Dot Method, Choropleth Method and Isopleth Method",
    curriculumTrack: "maharashtra",
    board: "Maharashtra State Board (Balbharati)",
    classNum: 9,
    subject: "Geography",
    subjectType: "geography",
    layoutType: "geography_map",
    difficulty: 0.35,
    difficultyLabel: "Intermediate",
    estimatedMinutes: 8,
    learningObjectives: [
      "Understand the purpose of thematic maps in displaying statistical spatial distributions (population, rainfall, temperature, crop yields).",
      "Apply the Dot Method: assigning statistical values to uniform dots based on discrete rural population or livestock data.",
      "Interpret the Choropleth Method: tinting administrative sub-districts using shades of color based on density intervals.",
      "Analyze the Isopleth Method: connecting points of equal value (isohyets for rainfall, isotherms for temperature) using continuous isolines."
    ],
    prerequisites: ["Map reading, scales, and administrative boundaries"],
    explain: {
      conceptIntro: "A standard map shows roads, mountains, and district borders. But if a geographer wants to show where 120 million people live in Maharashtra or where rainfall is highest, they use a Distributional (Thematic) Map.",
      definition: "Distributional maps are thematic maps designed to represent the spatial distribution of a specific geographical variable (e.g. population, rainfall, temperature, cattle) across a geographic territory.",
      foundationalExplanation: "Balbharati Class 9 Geography categorizes distributional mapping into three distinct methods:\n1. Dot Method: Used for variables distributed discretely across space (e.g. rural population). Each dot represents a fixed count (e.g., 1 dot = 10,000 people).\n2. Choropleth Method: Administrative units (talukas or districts) are shaded from light to dark based on statistical density classes. Darker shades represent higher values.\n3. Isopleth Method: Used for variables that vary continuously across natural space without sudden administrative boundaries (e.g. altitude, rainfall, temperature). Lines connecting points of equal value are called isolines.",
      detailedExplanation: "According to Chapter 1 of Balbharati Class 9 Geography, selecting the wrong method produces misleading maps. For example, population counts in towns and villages are discrete points, making the Dot Method ideal. Rainfall does not stop abruptly at a district border; it changes gradually over physical terrain, making the Isopleth Method (isohyets) scientifically necessary. Choropleth maps use class intervals (e.g., 0-100, 101-250, 251-500 persons/sq km) with graded tints.",
      sections: [
        {
          heading: "1. The Dot Method: Rules and Precautions",
          body: "When preparing a dot map:\n• The size of dots must be identical across the entire map.\n• Physiography, water bodies, transport routes, and settlement clusters must be consulted before placing dots.\n• Rural population is depicted using dots; urban population is depicted using circles of varying radii.",
          highlight: "Dot size and assigned value must be uniform throughout the map."
        },
        {
          heading: "2. Choropleth vs. Isopleth Methods",
          body: "• Choropleth Method: Uses sub-district/taluka data (density per sq km). One value per administrative area, rendered with color tints or black-and-white hatching.\n• Isopleth Method: Uses point data collected at specific weather stations. Isopleths are drawn by interpolation, joining points of equal values (isotherms for temperature, isohyets for rainfall, isobars for atmospheric pressure).",
          highlight: "Isopleths reflect continuous natural phenomena; Choropleths reflect administrative aggregations."
        }
      ],
      rulesOrFormulas: [
        { name: "Population Density", formula: "Density = Total Population / Total Area (sq km)", explanation: "Standard metric used in Choropleth mapping" },
        { name: "Dot Value", formula: "Value per Dot = Total Rural Population / Number of Target Dots", explanation: "Determines dot density scale" }
      ],
      realWorldApplications: [
        "Census of India produces district-level population density choropleth maps.",
        "Indian Meteorological Department (IMD) publishes daily monsoon rainfall isopleth (isohyet) maps."
      ],
      commonMisconceptions: [
        {
          misconception: "Using the Choropleth method to display temperature distribution.",
          whyItsWrong: "Temperature does not step up or down at taluka borders; it changes continuously based on elevation, latitude, and proximity to sea.",
          correction: "Continuous natural variables like temperature, altitude, and rainfall must be represented using Isopleth maps (isotherms, contours, isohyets)."
        }
      ],
      keyTakeaway: "Dot Method maps discrete items; Choropleth shades administrative units by density; Isopleth connects equal continuous values with isolines."
    },
    visualize: {
      visualType: "geographic_map",
      renderer: "transform",
      title: "Interactive Comparison of Thematic Mapping Methods",
      subtitle: "Switch between Dot Method, Choropleth Density, and Isopleth Rainfall contours",
      observe: "Notice how the Choropleth map uses sharp district boundary shading, while the Isopleth map draws smooth continuous curves ignoring political borders.",
      visualProps: {
        mode: "mapping_methods_comparison",
        region: "Maharashtra State",
        methods: [
          { id: "dot", name: "Dot Method", variable: "Rural Population (1 dot = 10,000 persons)" },
          { id: "choropleth", name: "Choropleth Method", variable: "Population Density (< 200, 201-400, > 400 persons/km²)" },
          { id: "isopleth", name: "Isopleth Method", variable: "Annual Rainfall Isohyets (800mm, 1200mm, 2000mm, 3000mm)" }
        ]
      },
      interactiveControls: [
        { id: "method_selector", label: "Select Mapping Method", type: "select", options: ["Dot Method", "Choropleth Method", "Isopleth Method"] }
      ],
      caption: "Left to Right: Dot method (discrete count), Choropleth (administrative density), Isopleth (continuous natural contours)."
    },
    practice: {
      questions: [
        {
          id: "mh9_geo_q1",
          questionNumber: 1,
          type: "mcq",
          difficulty: "intermediate",
          prompt: "Which mapping method is most suitable for representing the distribution of annual rainfall across Maharashtra?",
          hints: ["Rainfall changes continuously across physical terrain and does not stop at district boundaries."],
          options: [
            "A) Dot Method",
            "B) Choropleth Method",
            "C) Isopleth Method",
            "D) Pictorial Method"
          ],
          expectedAnswer: "C) Isopleth Method",
          explanation: "Rainfall is a continuous natural geographic variable; therefore lines joining points of equal rainfall (isohyets) provide the most accurate representation."
        }
      ]
    },
    evaluate: {
      diagnosticRubric: "Assess whether student matches variable type (discrete vs administrative vs continuous) to the correct mapping technique.",
      commonMistakes: [
        {
          mistake: "Selecting Dot method for rainfall",
          diagnosis: "Confused rain drops with map dots.",
          category: "conceptual_misunderstanding",
          remediation: "Dots represent discrete countable entities (like people or cows), not continuous weather variables."
        }
      ]
    },
    adapt: {
      alternateStrategy: {
        id: "concept_comparison",
        label: "The Three-Variable Decision Flowchart",
        explanation: "Ask: Is it countable discrete items (people, cattle)? -> Dot. Is it averaged per administrative district (density, literacy)? -> Choropleth. Is it a continuous natural gradient (rain, temperature)? -> Isopleth."
      },
      prerequisiteBridge: {
        neededConcept: "Contour Lines and Isolines",
        bridgeExplanation: "You already know contour lines on topo maps connect points of equal elevation. An isohyet does the same for rainfall, and an isotherm for temperature."
      },
      challengeExtension: {
        challengePrompt: "Why are urban populations mapped with graduated circles rather than simple dots on a dot map?",
        deepThinkingQuestion: "In dense cities like Mumbai, plotting 12 million individual dots would produce a solid black blob with no legibility."
      }
    },
    remember: {
      coreTakeaway: "Dot = Discrete counts (people). Choropleth = Administrative shades (density). Isopleth = Continuous lines (rainfall, temperature).",
      essentialFormulas: ["Density = Population / Area", "Isohyet = Equal Rainfall Line", "Isotherm = Equal Temp Line"],
      summaryPoints: [
        "Dot method requires uniform dot size.",
        "Choropleth uses graded color tints per administrative area.",
        "Isopleth joins points of equal value."
      ],
      memoryCard: {
        front: "What are lines connecting points of equal rainfall called?",
        back: "Isohyets (a type of isopleth line).",
        tip: "Iso = equal, Hyet = rain. Isobar = pressure, Isotherm = temperature."
      },
      spacedIntervalDays: [1, 3, 7, 14, 30],
      plannerTask: {
        title: "Practice Thematic Map Interpretations (Dot, Choropleth, Isopleth)",
        recommendedMinutes: 15,
        suggestedDayOffset: 1
      }
    }
  }
};

/**
 * Normalizes concept lookups across various keying styles:
 * e.g. "maharashtra.9.science1.laws_of_motion.distance_displacement_velocity",
 * or chapterId "maharashtra.9.science1.laws_of_motion" with subConceptId "distance_displacement_velocity".
 */
function getConceptPackage(conceptId, subConceptId = null) {
  if (!conceptId) return null;
  const fullKey = subConceptId ? `${conceptId}.${subConceptId}` : conceptId;
  
  if (CONCEPT_REGISTRY[fullKey]) {
    return CONCEPT_REGISTRY[fullKey];
  }
  
  // Try direct match if conceptId is already a fullKey
  if (CONCEPT_REGISTRY[conceptId]) {
    return CONCEPT_REGISTRY[conceptId];
  }

  // Look for any package whose subConceptId matches
  if (subConceptId) {
    for (const key of Object.keys(CONCEPT_REGISTRY)) {
      if (key.endsWith(`.${subConceptId}`)) {
        return CONCEPT_REGISTRY[key];
      }
    }
  }

  return null;
}

/**
 * Returns all registered concept IDs.
 */
function listRegisteredConcepts() {
  return Object.keys(CONCEPT_REGISTRY);
}

module.exports = {
  CONCEPT_REGISTRY,
  getConceptPackage,
  listRegisteredConcepts
};
