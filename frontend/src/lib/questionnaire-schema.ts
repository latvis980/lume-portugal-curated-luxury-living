// frontend/src/lib/questionnaire-schema.ts
//
// Source of truth for the branching questionnaire.
//
// Translation strategy:
//   - All visible text is fetched at render time via useT("questionnaire", labelKey)
//   - Internal `value` strings are stable IDs that are stored in the answers
//     blob sent to Supabase. Don't ever change them; the admin's "Contacts"
//     page and any future analytics rely on these being consistent over time.
//
// Adding/removing branches:
//   - Add or remove a key in BRANCHES below.
//   - Add the matching translation rows under namespace `questionnaire`
//     (see populate-questionnaire-translations.sql for the pattern).

export type Branch = "relocation" | "second_home" | "investment" | "exploring";

export interface QOption {
  /** Stable internal value — stored in answers, never displayed. */
  value: string;
  /** Translation key under namespace `questionnaire`. */
  labelKey: string;
}

export interface Question {
  /** Unique question ID — used as the answer key sent to backend. */
  id: string;
  /** Translation key for the question title. */
  titleKey: string;
  options: QOption[];
}

// ─── Q1: shared entry point ────────────────────────────────────────────────

export const Q1: Question = {
  id: "q1_intent",
  titleKey: "q1.title",
  options: [
    { value: "relocation",  labelKey: "q1.opt.relocation" },
    { value: "second_home", labelKey: "q1.opt.second_home" },
    { value: "investment",  labelKey: "q1.opt.investment" },
    { value: "exploring",   labelKey: "q1.opt.exploring" },
  ],
};

// ─── Branch definitions ────────────────────────────────────────────────────

export const BRANCHES: Record<Branch, Question[]> = {
  relocation: [
    {
      id: "relocation_q2_companions",
      titleKey: "relocation.q2.title",
      options: [
        { value: "solo",     labelKey: "relocation.q2.opt.solo" },
        { value: "couple",   labelKey: "relocation.q2.opt.couple" },
        { value: "children", labelKey: "relocation.q2.opt.children" },
        { value: "family",   labelKey: "relocation.q2.opt.family" },
      ],
    },
    {
      id: "relocation_q3_lifestyle",
      titleKey: "relocation.q3.title",
      options: [
        { value: "ocean",         labelKey: "relocation.q3.opt.ocean" },
        { value: "countryside",   labelKey: "relocation.q3.opt.countryside" },
        { value: "historic_city", labelKey: "relocation.q3.opt.historic_city" },
        { value: "wine_region",   labelKey: "relocation.q3.opt.wine_region" },
      ],
    },
    {
      id: "relocation_q4_timeline",
      titleKey: "relocation.q4.title",
      options: [
        { value: "now",       labelKey: "relocation.q4.opt.now" },
        { value: "6_months",  labelKey: "relocation.q4.opt.6_months" },
        { value: "1_year",    labelKey: "relocation.q4.opt.1_year" },
        { value: "exploring", labelKey: "relocation.q4.opt.exploring" },
      ],
    },
    {
      id: "relocation_q5_priorities",
      titleKey: "relocation.q5.title",
      options: [
        { value: "schools",    labelKey: "relocation.q5.opt.schools" },
        { value: "healthcare", labelKey: "relocation.q5.opt.healthcare" },
        { value: "lifestyle",  labelKey: "relocation.q5.opt.lifestyle" },
        { value: "investment", labelKey: "relocation.q5.opt.investment" },
      ],
    },
  ],

  second_home: [
    {
      id: "second_home_q2_use",
      titleKey: "second_home.q2.title",
      options: [
        { value: "solo",   labelKey: "second_home.q2.opt.solo" },
        { value: "couple", labelKey: "second_home.q2.opt.couple" },
        { value: "family", labelKey: "second_home.q2.opt.family" },
      ],
    },
    {
      id: "second_home_q_regions",
      titleKey: "second_home.q_regions.title",
      options: [
        { value: "lisboa",   labelKey: "second_home.q_regions.opt.lisboa" },
        { value: "algarve",  labelKey: "second_home.q_regions.opt.algarve" },
        { value: "porto",    labelKey: "second_home.q_regions.opt.porto" },
        { value: "alentejo", labelKey: "second_home.q_regions.opt.alentejo" },
      ],
    },
    {
      id: "second_home_q3_lifestyle",
      titleKey: "second_home.q3.title",
      options: [
        { value: "ocean",         labelKey: "second_home.q3.opt.ocean" },
        { value: "countryside",   labelKey: "second_home.q3.opt.countryside" },
        { value: "historic_city", labelKey: "second_home.q3.opt.historic_city" },
        { value: "wine_region",   labelKey: "second_home.q3.opt.wine_region" },
      ],
    },
    {
      id: "second_home_q4_visits",
      titleKey: "second_home.q4.title",
      options: [
        { value: "year_round",    labelKey: "second_home.q4.opt.year_round" },
        { value: "seasonally",    labelKey: "second_home.q4.opt.seasonally" },
        { value: "holidays_only", labelKey: "second_home.q4.opt.holidays_only" },
        { value: "as_evolves",    labelKey: "second_home.q4.opt.as_evolves" },
      ],
    },
    {
      id: "second_home_q5_priorities",
      titleKey: "second_home.q5.title",
      options: [
        { value: "privacy",          labelKey: "second_home.q5.opt.privacy" },
        { value: "lifestyle",        labelKey: "second_home.q5.opt.lifestyle" },
        { value: "rental_potential", labelKey: "second_home.q5.opt.rental_potential" },
        { value: "investment_value", labelKey: "second_home.q5.opt.investment_value" },
      ],
    },
  ],

  investment: [
    {
      id: "investment_q2_type",
      titleKey: "investment.q2.title",
      options: [
        { value: "lead",     labelKey: "investment.q2.opt.lead" },
        { value: "co",       labelKey: "investment.q2.opt.co" },
        { value: "guidance", labelKey: "investment.q2.opt.guidance" },
        { value: "various",  labelKey: "investment.q2.opt.various" },
      ],
    },
    {
      id: "investment_q3_focus",
      titleKey: "investment.q3.title",
      options: [
        { value: "branded",    labelKey: "investment.q3.opt.branded" },
        { value: "renovation", labelKey: "investment.q3.opt.renovation" },
        { value: "new_dev",    labelKey: "investment.q3.opt.new_dev" },
      ],
    },
  ],

  exploring: [
    // Display order swapped: lifestyle is now shown before regions.
    // Question IDs stay stable for analytics/answer-blob continuity.
    {
      id: "exploring_q3_lifestyle",
      titleKey: "exploring.q3.title",
      options: [
        { value: "ocean",         labelKey: "exploring.q3.opt.ocean" },
        { value: "countryside",   labelKey: "exploring.q3.opt.countryside" },
        { value: "historic_city", labelKey: "exploring.q3.opt.historic_city" },
        { value: "wine_region",   labelKey: "exploring.q3.opt.wine_region" },
      ],
    },
    {
      id: "exploring_q2_regions",
      titleKey: "exploring.q2.title",
      options: [
        { value: "lisboa",   labelKey: "exploring.q2.opt.lisboa" },
        { value: "algarve",  labelKey: "exploring.q2.opt.algarve" },
        { value: "porto",    labelKey: "exploring.q2.opt.porto" },
        { value: "alentejo", labelKey: "exploring.q2.opt.alentejo" },
      ],
    },
    {
      id: "exploring_q4_draws",
      titleKey: "exploring.q4.title",
      options: [
        { value: "slower_pace", labelKey: "exploring.q4.opt.slower_pace" },
        { value: "culture",     labelKey: "exploring.q4.opt.culture" },
        { value: "nature",      labelKey: "exploring.q4.opt.nature" },
        { value: "possibility", labelKey: "exploring.q4.opt.possibility" },
      ],
    },
  ],
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Type-narrow a Q1 answer value into a Branch. Returns null for anything else. */
export function asBranch(value: string | undefined): Branch | null {
  if (value === "relocation" || value === "second_home" ||
      value === "investment" || value === "exploring") {
    return value;
  }
  return null;
}

/** Total step count for a given branch (Q1 + branch questions + email). */
export function totalSteps(branch: Branch | null): number {
  return 1 + (branch ? BRANCHES[branch].length : 0) + 1;
}