"use strict";
/**
 * Canonical Curriculum & Academic Options for Learning Allied Global Learning OS.
 * Powers dynamic cascading selectors in Onboarding, Profile, Learning Hub, Arena, and AI Tutor.
 * Covers 15 target countries with authentic educational authorities, tracks, grade levels, and subjects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_OPTIONS = exports.GOAL_OPTIONS = exports.SUBJECTS_BY_TRACK = exports.GRADE_OPTIONS_BY_TRACK = exports.TRACK_OPTIONS_BY_COUNTRY = exports.COUNTRY_OPTIONS = void 0;
exports.getCountryOption = getCountryOption;
exports.getTracksForCountry = getTracksForCountry;
exports.getGradesForTrack = getGradesForTrack;
exports.getSubjectsForTrack = getSubjectsForTrack;
exports.getTrackInfo = getTrackInfo;
exports.COUNTRY_OPTIONS = [
    { code: "IN", name: "India", flag: "🇮🇳", region: "South Asia", defaultTrack: "in_cbse", defaultLocale: "en-IN" },
    { code: "US", name: "United States", flag: "🇺🇸", region: "North America", defaultTrack: "us_ap", defaultLocale: "en-US" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe", defaultTrack: "gb_gcse", defaultLocale: "en-GB" },
    { code: "CA", name: "Canada", flag: "🇨🇦", region: "North America", defaultTrack: "ca_ontario", defaultLocale: "en-CA" },
    { code: "AU", name: "Australia", flag: "🇦🇺", region: "Oceania", defaultTrack: "au_vce", defaultLocale: "en-AU" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿", region: "Oceania", defaultTrack: "nz_ncea", defaultLocale: "en-NZ" },
    { code: "SG", name: "Singapore", flag: "🇸🇬", region: "Southeast Asia", defaultTrack: "sg_secondary", defaultLocale: "en-SG" },
    { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", region: "Middle East", defaultTrack: "ae_moe_national", defaultLocale: "en-AE" },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East", defaultTrack: "sa_moe_masarat", defaultLocale: "en-SA" },
    { code: "MY", name: "Malaysia", flag: "🇲🇾", region: "Southeast Asia", defaultTrack: "my_kpm_spm", defaultLocale: "en-MY" },
    { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "South Asia", defaultTrack: "pk_fbise", defaultLocale: "en-PK" },
    { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "South Asia", defaultTrack: "bd_nctb", defaultLocale: "en-BD" },
    { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Africa", defaultTrack: "za_caps", defaultLocale: "en-ZA" },
    { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "Africa", defaultTrack: "ng_waec_nerdc", defaultLocale: "en-NG" },
    { code: "IE", name: "Ireland", flag: "🇮🇪", region: "Europe", defaultTrack: "ie_leaving_cert", defaultLocale: "en-IE" },
];
exports.TRACK_OPTIONS_BY_COUNTRY = {
    IN: [
        { id: "in_cbse", countryCode: "IN", name: "Central Board of Secondary Education (CBSE)", shortName: "CBSE", description: "Standardized NCERT framework for Class 9–12", defaultGrade: "Class 12" },
        { id: "in_jee_main", countryCode: "IN", name: "Joint Entrance Examination (JEE Main)", shortName: "JEE Main", description: "Engineering entrance focusing on conceptual Physics, Chem & Maths", defaultGrade: "Class 12" },
        { id: "in_jee_advanced", countryCode: "IN", name: "JEE Advanced (IIT)", shortName: "JEE Advanced", description: "Elite analytical problem-solving for Indian Institutes of Technology", defaultGrade: "Class 12" },
        { id: "in_neet", countryCode: "IN", name: "National Eligibility cum Entrance Test (NEET-UG)", shortName: "NEET-UG", description: "Comprehensive medical entrance focusing on Biology, Chem & Physics", defaultGrade: "Class 12" },
        { id: "in_maharashtra", countryCode: "IN", name: "Maharashtra State Board (MSBSHSE / Balbharati)", shortName: "Maharashtra Board", description: "State board curriculum for Secondary (Std 9–10) and Higher Secondary (Std 11–12)", defaultGrade: "Standard 12" },
        { id: "in_cisce", countryCode: "IN", name: "Council for the Indian School Certificate Examinations (CISCE)", shortName: "ICSE / ISC", description: "Rigorous ICSE (Class 9–10) and ISC (Class 11–12) programs", defaultGrade: "Class 12" },
    ],
    US: [
        { id: "us_ap", countryCode: "US", name: "College Board Advanced Placement (AP)", shortName: "AP Program", description: "College-level coursework & exams for high school students", defaultGrade: "Grade 12" },
        { id: "us_sat", countryCode: "US", name: "College Board SAT Prep", shortName: "Digital SAT", description: "Math, Reading & Writing reasoning tests for university admission", defaultGrade: "Grade 11" },
        { id: "us_ccss_ngss", countryCode: "US", name: "US High School Standards (CCSS & NGSS)", shortName: "US High School", description: "Common Core & Next Generation Science Standards", defaultGrade: "Grade 11" },
    ],
    GB: [
        { id: "gb_gcse", countryCode: "GB", name: "England GCSE (AQA / Edexcel / OCR)", shortName: "GCSE", description: "General Certificate of Secondary Education for Years 10–11", defaultGrade: "Year 11" },
        { id: "gb_alevel", countryCode: "GB", name: "England GCE A-Levels (AQA / Edexcel / OCR)", shortName: "A-Levels", description: "Advanced Level qualifications for university progression (Years 12–13)", defaultGrade: "Year 13" },
        { id: "gb_scotland_sqa", countryCode: "GB", name: "Scotland SQA (Curriculum for Excellence)", shortName: "SQA Highers", description: "National 5, Higher, and Advanced Higher qualifications", defaultGrade: "S5 (Higher)" },
    ],
    CA: [
        { id: "ca_ontario", countryCode: "CA", name: "Ontario Ministry of Education (OSSD)", shortName: "Ontario OSSD", description: "University preparation courses for Grades 9–12", defaultGrade: "Grade 12" },
        { id: "ca_bc", countryCode: "CA", name: "British Columbia Ministry of Education", shortName: "BC Curriculum", description: "Graduation Program and STEM competencies for Grades 9–12", defaultGrade: "Grade 12" },
    ],
    AU: [
        { id: "au_vce", countryCode: "AU", name: "Victorian Certificate of Education (VCAA VCE)", shortName: "VCE", description: "Units 1–4 senior secondary certificate", defaultGrade: "Year 12" },
        { id: "au_acara", countryCode: "AU", name: "Australian Curriculum v9.0 (ACARA)", shortName: "ACARA v9", description: "National standards framework across all Australian territories", defaultGrade: "Year 10" },
    ],
    NZ: [
        { id: "nz_ncea", countryCode: "NZ", name: "New Zealand NZQA & Te Mātaiaho (NCEA)", shortName: "NCEA", description: "National Certificate of Educational Achievement Levels 1–3", defaultGrade: "Year 12 (Level 2)" },
    ],
    SG: [
        { id: "sg_secondary", countryCode: "SG", name: "Singapore MOE & SEAB (Full SBB & GCE O-Level)", shortName: "Singapore O-Level", description: "Rigorous MOE secondary curriculum and national examinations", defaultGrade: "Secondary 4" },
    ],
    AE: [
        { id: "ae_moe_national", countryCode: "AE", name: "UAE Ministry of Education (MoE) Curriculum", shortName: "UAE MoE", description: "National stream curriculum for Grades 9–12", defaultGrade: "Grade 12" },
    ],
    SA: [
        { id: "sa_moe_masarat", countryCode: "SA", name: "Saudi Ministry of Education (Masarat Pathways)", shortName: "Saudi Masarat", description: "Specialized high school streams (Natural Sciences & CS)", defaultGrade: "Third Year" },
    ],
    MY: [
        { id: "my_kpm_spm", countryCode: "MY", name: "Malaysia KPM KSSM (SPM / Sijil Pelajaran Malaysia)", shortName: "SPM (KSSM)", description: "National upper secondary examination curriculum for Forms 4–5", defaultGrade: "Form 5" },
    ],
    PK: [
        { id: "pk_fbise", countryCode: "PK", name: "Pakistan Federal Board (FBISE SSC & HSSC)", shortName: "FBISE", description: "Federal Board Secondary and Higher Secondary school certificates", defaultGrade: "HSSC-II (Class 12)" },
    ],
    BD: [
        { id: "bd_nctb", countryCode: "BD", name: "Bangladesh NCTB Curriculum (SSC & HSC)", shortName: "NCTB (SSC/HSC)", description: "National Curriculum and Textbook Board science framework", defaultGrade: "HSC (Class 12)" },
    ],
    ZA: [
        { id: "za_caps", countryCode: "ZA", name: "South Africa DBE CAPS (FET Phase Grades 10–12)", shortName: "CAPS Matric", description: "Curriculum and Assessment Policy Statement leading to NSC", defaultGrade: "Grade 12 (Matric)" },
    ],
    NG: [
        { id: "ng_waec_nerdc", countryCode: "NG", name: "Nigeria NERDC & WAEC (WASSCE / JAMB UTME)", shortName: "WAEC / JAMB", description: "Senior Secondary curriculum for WASSCE and university entrance", defaultGrade: "SS 3" },
    ],
    IE: [
        { id: "ie_leaving_cert", countryCode: "IE", name: "Ireland NCCA & SEC Leaving Certificate", shortName: "Leaving Cert", description: "Established Leaving Certificate senior cycle program", defaultGrade: "6th Year" },
    ],
};
exports.GRADE_OPTIONS_BY_TRACK = {
    // India
    in_cbse: [
        { id: "Class 9", label: "Class 9 (NCERT)" },
        { id: "Class 10", label: "Class 10 (Secondary Board)" },
        { id: "Class 11", label: "Class 11 (Senior Secondary)" },
        { id: "Class 12", label: "Class 12 (Senior Secondary Board)" },
        { id: "Dropper / Target Year", label: "Dropper / Gap Year" },
    ],
    in_maharashtra: [
        { id: "Standard 9", label: "Standard 9" },
        { id: "Standard 10", label: "Standard 10 (SSC Board)" },
        { id: "Standard 11", label: "Standard 11 (FYJC)" },
        { id: "Standard 12", label: "Standard 12 (HSC Board)" },
    ],
    in_cisce: [
        { id: "Class 9", label: "Class 9 (ICSE)" },
        { id: "Class 10", label: "Class 10 (ICSE Board)" },
        { id: "Class 11", label: "Class 11 (ISC)" },
        { id: "Class 12", label: "Class 12 (ISC Board)" },
    ],
    in_jee_main: [
        { id: "Class 11", label: "Class 11 Prep" },
        { id: "Class 12", label: "Class 12 Board + JEE" },
        { id: "Dropper / Target Year", label: "Dropper / Repeat Target Year" },
    ],
    in_jee_advanced: [
        { id: "Class 11", label: "Class 11 Advanced" },
        { id: "Class 12", label: "Class 12 Advanced + Board" },
        { id: "Dropper / Target Year", label: "Dropper / Repeat IIT Ranker" },
    ],
    in_neet: [
        { id: "Class 11", label: "Class 11 Medical Prep" },
        { id: "Class 12", label: "Class 12 Medical + Board" },
        { id: "Dropper / Target Year", label: "Dropper / Medical Repeater" },
    ],
    // United States
    us_ap: [
        { id: "Grade 9", label: "Grade 9 (Freshman)" },
        { id: "Grade 10", label: "Grade 10 (Sophomore)" },
        { id: "Grade 11", label: "Grade 11 (Junior)" },
        { id: "Grade 12", label: "Grade 12 (Senior AP Exam Year)" },
    ],
    us_sat: [
        { id: "Grade 10", label: "Grade 10 (Foundation Prep)" },
        { id: "Grade 11", label: "Grade 11 (Primary SAT Target)" },
        { id: "Grade 12", label: "Grade 12 (Retake & College Apps)" },
    ],
    us_ccss_ngss: [
        { id: "Grade 9", label: "Grade 9 (Freshman)" },
        { id: "Grade 10", label: "Grade 10 (Sophomore)" },
        { id: "Grade 11", label: "Grade 11 (Junior)" },
        { id: "Grade 12", label: "Grade 12 (Senior)" },
    ],
    // United Kingdom
    gb_gcse: [
        { id: "Year 10", label: "Year 10 (GCSE Year 1)" },
        { id: "Year 11", label: "Year 11 (GCSE Exam Year)" },
    ],
    gb_alevel: [
        { id: "Year 12", label: "Year 12 / Lower Sixth (AS/Year 1)" },
        { id: "Year 13", label: "Year 13 / Upper Sixth (A-Level Final)" },
    ],
    gb_scotland_sqa: [
        { id: "S4 (National 5)", label: "S4 (National 5)" },
        { id: "S5 (Higher)", label: "S5 (Higher Exam Year)" },
        { id: "S6 (Advanced Higher)", label: "S6 (Advanced Higher)" },
    ],
    // Canada
    ca_ontario: [
        { id: "Grade 9", label: "Grade 9" },
        { id: "Grade 10", label: "Grade 10" },
        { id: "Grade 11", label: "Grade 11 (3U/3M)" },
        { id: "Grade 12", label: "Grade 12 (4U/4M OSSD Final)" },
    ],
    ca_bc: [
        { id: "Grade 9", label: "Grade 9" },
        { id: "Grade 10", label: "Grade 10" },
        { id: "Grade 11", label: "Grade 11" },
        { id: "Grade 12", label: "Grade 12" },
    ],
    // Australia
    au_vce: [
        { id: "Year 11", label: "Year 11 (Units 1 & 2)" },
        { id: "Year 12", label: "Year 12 (Units 3 & 4 ATAR)" },
    ],
    au_acara: [
        { id: "Year 9", label: "Year 9" },
        { id: "Year 10", label: "Year 10" },
    ],
    // New Zealand
    nz_ncea: [
        { id: "Year 11", label: "Year 11 (NCEA Level 1)" },
        { id: "Year 12", label: "Year 12 (NCEA Level 2)" },
        { id: "Year 13", label: "Year 13 (NCEA Level 3 & University Entrance)" },
    ],
    // Singapore
    sg_secondary: [
        { id: "Secondary 3", label: "Secondary 3 (Express / G3)" },
        { id: "Secondary 4", label: "Secondary 4 (GCE O-Level Exam Year)" },
    ],
    // UAE
    ae_moe_national: [
        { id: "Grade 10", label: "Grade 10" },
        { id: "Grade 11", label: "Grade 11 (Advanced Stream)" },
        { id: "Grade 12", label: "Grade 12 (MoE Final Exam)" },
    ],
    // Saudi Arabia
    sa_moe_masarat: [
        { id: "First Year Common", label: "First Year (Common Secondary)" },
        { id: "Second Year", label: "Second Year (Natural Sciences / CS)" },
        { id: "Third Year", label: "Third Year (Graduation & Qudurat / Tahsili)" },
    ],
    // Malaysia
    my_kpm_spm: [
        { id: "Form 4", label: "Tingkatan 4 (Form 4)" },
        { id: "Form 5", label: "Tingkatan 5 (Form 5 / SPM Final)" },
    ],
    // Pakistan
    pk_fbise: [
        { id: "Class 9", label: "Class 9 (SSC Part 1)" },
        { id: "Class 10", label: "Class 10 (SSC Part 2 Board)" },
        { id: "Class 11", label: "Class 11 / HSSC-I (FSc Pre-Eng/Pre-Med)" },
        { id: "Class 12", label: "Class 12 / HSSC-II (FSc Final Board)" },
    ],
    // Bangladesh
    bd_nctb: [
        { id: "Class 9", label: "Class 9 (Science Stream)" },
        { id: "Class 10", label: "Class 10 (SSC Exam Year)" },
        { id: "Class 11", label: "Class 11 (HSC Science)" },
        { id: "Class 12", label: "Class 12 (HSC Exam Year)" },
    ],
    // South Africa
    za_caps: [
        { id: "Grade 10", label: "Grade 10 (FET Phase)" },
        { id: "Grade 11", label: "Grade 11" },
        { id: "Grade 12", label: "Grade 12 (NSC Matric Exam Year)" },
    ],
    // Nigeria
    ng_waec_nerdc: [
        { id: "SS 1", label: "Senior Secondary 1 (SS 1)" },
        { id: "SS 2", label: "Senior Secondary 2 (SS 2)" },
        { id: "SS 3", label: "Senior Secondary 3 (WASSCE & JAMB Exam Year)" },
    ],
    // Ireland
    ie_leaving_cert: [
        { id: "5th Year", label: "5th Year (Senior Cycle Year 1)" },
        { id: "6th Year", label: "6th Year (Leaving Certificate Exam Year)" },
    ],
};
exports.SUBJECTS_BY_TRACK = {
    in_cbse: ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English Core"],
    in_maharashtra: ["Mathematics & Statistics", "Physics", "Chemistry", "Biology", "Information Technology", "English"],
    in_cisce: ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English Language & Literature"],
    in_jee_main: ["Physics", "Chemistry", "Mathematics"],
    in_jee_advanced: ["Advanced Physics", "Advanced Chemistry", "Advanced Mathematics"],
    in_neet: ["Physics", "Chemistry", "Botany", "Zoology"],
    us_ap: ["AP Calculus BC", "AP Physics C: Mechanics", "AP Chemistry", "AP Biology", "AP Computer Science A", "AP Statistics"],
    us_sat: ["Digital SAT Math", "Reading & Writing", "Problem Solving & Data Analysis"],
    us_ccss_ngss: ["Algebra II & Trigonometry", "Pre-Calculus", "Physics", "Chemistry", "Biology", "World History"],
    gb_gcse: ["GCSE Mathematics", "GCSE Physics", "GCSE Chemistry", "GCSE Biology", "GCSE Combined Science", "GCSE English"],
    gb_alevel: ["A-Level Mathematics", "A-Level Further Mathematics", "A-Level Physics", "A-Level Chemistry", "A-Level Biology", "A-Level Economics"],
    gb_scotland_sqa: ["Higher Mathematics", "Higher Physics", "Higher Chemistry", "Higher Biology", "Higher English"],
    ca_ontario: ["Advanced Functions", "Calculus and Vectors", "Physics (SPH4U)", "Chemistry (SCH4U)", "Biology (SBI4U)"],
    ca_bc: ["Pre-Calculus 12", "Calculus 12", "Physics 12", "Chemistry 12", "Biology 12"],
    au_vce: ["Mathematical Methods", "Specialist Mathematics", "Physics", "Chemistry", "Biology"],
    au_acara: ["Mathematics", "Science (Physical & Chemical)", "English", "Digital Technologies"],
    nz_ncea: ["NCEA Level 3 Calculus", "NCEA Level 3 Statistics", "NCEA Physics", "NCEA Chemistry", "NCEA Biology"],
    sg_secondary: ["Additional Mathematics", "Elementary Mathematics", "Pure Physics", "Pure Chemistry", "Pure Biology"],
    ae_moe_national: ["Advanced Mathematics", "Physics", "Chemistry", "Biology", "English", "Arabic Language"],
    sa_moe_masarat: ["Mathematics 2/3", "Physics", "Chemistry", "Biology", "Digital Technology"],
    my_kpm_spm: ["Additional Mathematics", "Mathematics", "Physics", "Chemistry", "Biology"],
    pk_fbise: ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"],
    bd_nctb: ["Higher Mathematics", "Physics", "Chemistry", "Biology", "General Science"],
    za_caps: ["Mathematics", "Physical Sciences (Physics/Chem)", "Life Sciences (Biology)", "Information Technology"],
    ng_waec_nerdc: ["General Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology"],
    ie_leaving_cert: ["Higher Level Mathematics", "Physics", "Chemistry", "Biology", "Applied Mathematics"],
};
exports.GOAL_OPTIONS = [
    {
        id: "top_percentile",
        title: "Competitive Exam Excellence",
        description: "Target top 1% rank in university entrance exams (JEE, NEET, SAT, ATAR, etc.)",
        badge: "Top 1%",
    },
    {
        id: "board_honors",
        title: "Board & Academic High Honors",
        description: "Target 95%+ marks, A* grades, or high GPA across all core subjects",
        badge: "95%+ / A*",
    },
    {
        id: "deep_mastery",
        title: "Deep Conceptual Understanding",
        description: "Master first principles, visual intuition, and problem-solving reasoning",
        badge: "First Principles",
    },
    {
        id: "daily_consistency",
        title: "Daily Study Habit & Clear Backlog",
        description: "Build an unbreakable daily study streak, revise spaced flashcards, and finish syllabus",
        badge: "Daily Streak",
    },
];
exports.LANGUAGE_OPTIONS = [
    { code: "en", name: "English", nativeName: "English (Global)" },
    { code: "hi", name: "Hindi", nativeName: "हिंदी" },
    { code: "hinglish", name: "Hinglish", nativeName: "Hinglish (English + Hindi)" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "ar", name: "Arabic", nativeName: "العربية" },
];
/**
 * Get country option by ISO 3166-1 alpha-2 code.
 */
function getCountryOption(code) {
    const upper = (code || "IN").toUpperCase();
    return exports.COUNTRY_OPTIONS.find((c) => c.code === upper) || exports.COUNTRY_OPTIONS[0];
}
/**
 * Get all available educational tracks/boards for a specific country.
 */
function getTracksForCountry(countryCode) {
    const upper = (countryCode || "IN").toUpperCase();
    return exports.TRACK_OPTIONS_BY_COUNTRY[upper] || exports.TRACK_OPTIONS_BY_COUNTRY["IN"];
}
/**
 * Get grade levels/stages for a given track.
 */
function getGradesForTrack(trackId) {
    if (!trackId)
        return exports.GRADE_OPTIONS_BY_TRACK["in_cbse"];
    return exports.GRADE_OPTIONS_BY_TRACK[trackId] || [
        { id: "Class 9", label: "Class 9 / Grade 9" },
        { id: "Class 10", label: "Class 10 / Grade 10" },
        { id: "Class 11", label: "Class 11 / Grade 11" },
        { id: "Class 12", label: "Class 12 / Grade 12" },
    ];
}
/**
 * Get available subject pills for a given track.
 */
function getSubjectsForTrack(trackId) {
    if (!trackId)
        return exports.SUBJECTS_BY_TRACK["in_cbse"];
    return exports.SUBJECTS_BY_TRACK[trackId] || ["Mathematics", "Physics", "Chemistry", "Biology"];
}
/**
 * Get track metadata by id.
 */
function getTrackInfo(trackId) {
    for (const tracks of Object.values(exports.TRACK_OPTIONS_BY_COUNTRY)) {
        const found = tracks.find((t) => t.id === trackId);
        if (found)
            return found;
    }
    return undefined;
}
