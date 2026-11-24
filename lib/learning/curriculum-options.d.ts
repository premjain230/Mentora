/**
 * Canonical Curriculum & Academic Options for Learning Allied Global Learning OS.
 * Powers dynamic cascading selectors in Onboarding, Profile, Learning Hub, Arena, and AI Tutor.
 * Covers 15 target countries with authentic educational authorities, tracks, grade levels, and subjects.
 */
export interface CountryOption {
    code: string;
    name: string;
    flag: string;
    region: string;
    defaultTrack: string;
    defaultLocale: string;
}
export interface TrackOption {
    id: string;
    countryCode: string;
    name: string;
    shortName: string;
    description: string;
    defaultGrade: string;
}
export interface GradeOption {
    id: string;
    label: string;
}
export interface GoalOption {
    id: string;
    title: string;
    description: string;
    badge: string;
}
export interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
}
export declare const COUNTRY_OPTIONS: CountryOption[];
export declare const TRACK_OPTIONS_BY_COUNTRY: Record<string, TrackOption[]>;
export declare const GRADE_OPTIONS_BY_TRACK: Record<string, GradeOption[]>;
export declare const SUBJECTS_BY_TRACK: Record<string, string[]>;
export declare const GOAL_OPTIONS: GoalOption[];
export declare const LANGUAGE_OPTIONS: LanguageOption[];
/**
 * Get country option by ISO 3166-1 alpha-2 code.
 */
export declare function getCountryOption(code: string): CountryOption;
/**
 * Get all available educational tracks/boards for a specific country.
 */
export declare function getTracksForCountry(countryCode: string): TrackOption[];
/**
 * Get grade levels/stages for a given track.
 */
export declare function getGradesForTrack(trackId: string): GradeOption[];
/**
 * Get available subject pills for a given track.
 */
export declare function getSubjectsForTrack(trackId: string): string[];
/**
 * Get track metadata by id.
 */
export declare function getTrackInfo(trackId: string): TrackOption | undefined;
