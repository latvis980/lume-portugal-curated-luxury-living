// frontend/src/components/QuestionnaireSection.tsx
//
// Branching questionnaire flow:
//   Q1 (intent) → branch-specific questions → email capture → thank-you screen
//
// All visible text comes from the `questionnaire` namespace in the
// translations table (see populate-questionnaire-translations.sql).
//
// Answers are stored to Supabase contacts.questionnaire_answers as a flat
// JSONB blob keyed by question ID, e.g.
//   {
//     "q1_intent": "relocation",
//     "relocation_q2_companions": "couple",
//     "relocation_q3_lifestyle": "ocean",
//     ...
//   }
// We don't filter the listings on the answers — we just collect them and
// follow up via email with a hand-curated selection.
//
// We do NOT remember submission across visits (no cookie). Each fresh load
// shows the questionnaire again, so a returning visitor can do it again if
// they want — but within the same session we use React state to skip past it
// once they've submitted (otherwise refreshing the page mid-session would be
// painful).

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import {
  Q1,
  BRANCHES,
  asBranch,
  totalSteps,
  type Branch,
} from "@/lib/questionnaire-schema";

// ─── Internal step model ──────────────────────────────────────────────────

type Step =
  | { kind: "q1" }
  | { kind: "branch"; branch: Branch; index: number }
  | { kind: "email" }
  | { kind: "thanks" };

// ─── Props ────────────────────────────────────────────────────────────────

interface QuestionnaireSectionProps {
  /** Called once after a successful email submission. Used to unlock the rest of the page. */
  onComplete: () => void;
  /**
   * When true, the section returns null. Comes from session-level React
   * state in the parent — there's no persisted "already submitted" flag.
   */
  isCompleted: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

const QuestionnaireSection = ({ onComplete, isCompleted }: QuestionnaireSectionProps) => {
  const t = useT();

  const [step, setStep] = useState<Step>({ kind: "q1" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Hide the whole section once the parent says we're done ─────────────
  if (isCompleted) return null;

  // ── Derived: which question is on screen, and progress bar % ──────────
  const currentQuestion =
    step.kind === "q1"
      ? Q1
      : step.kind === "branch"
        ? BRANCHES[step.branch][step.index]
        : null;

  const branch =
    step.kind === "branch" ? step.branch : asBranch(answers["q1_intent"]);
  const total = totalSteps(branch);

  const stepIndex =
    step.kind === "q1"
      ? 0
      : step.kind === "branch"
        ? 1 + step.index
        : step.kind === "email"
          ? 1 + (branch ? BRANCHES[branch].length : 0)
          : total; // thanks → 100%
  const progress = (stepIndex / total) * 100;

  // ── Handlers ──────────────────────────────────────────────────────────

  function handleAnswer(value: string) {
    if (step.kind === "q1") {
      const nextAnswers = { ...answers, q1_intent: value };
      setAnswers(nextAnswers);
      const nextBranch = asBranch(value);
      if (!nextBranch) return; // shouldn't happen — Q1 options are typed
      // Slight delay so the user sees their selection highlight before the next question slides in
      setTimeout(() => setStep({ kind: "branch", branch: nextBranch, index: 0 }), 300);
      return;
    }

    if (step.kind === "branch") {
      const q = BRANCHES[step.branch][step.index];
      const nextAnswers = { ...answers, [q.id]: value };
      setAnswers(nextAnswers);
      const isLast = step.index === BRANCHES[step.branch].length - 1;
      setTimeout(() => {
        if (isLast) setStep({ kind: "email" });
        else setStep({ kind: "branch", branch: step.branch, index: step.index + 1 });
      }, 300);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/submit/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          answers,
          branch: branch ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || t("questionnaire", "error.generic", "Something went wrong. Please try again."));
      }

      // Unlock the rest of the page (Listings/Services/Concierge),
      // then move the questionnaire UI to the thank-you screen.
      onComplete();
      setStep({ kind: "thanks" });
    } catch (err: any) {
      setError(err.message || t("questionnaire", "error.generic", "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section id="questionnaire" className="min-h-screen flex items-center bg-card section-padding">
      <div className="max-w-3xl mx-auto w-full">

        {/* Intro — hidden on the thanks screen so it has full focus */}
        {step.kind !== "thanks" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">
              {t("questionnaire", "intro.eyebrow", "Discover your match")}
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-light text-foreground mb-4">
              {t("questionnaire", "intro.title", "Tell us what you seek")}
            </h2>
            <p className="text-sm text-muted-foreground/70 font-light max-w-md mx-auto">
              {t("questionnaire", "intro.subtitle", "Answer a few quick questions to unlock exclusive listings and services tailored to you.")}
            </p>
          </motion.div>
        )}

        {/* Progress bar — hidden on the thanks screen */}
        {step.kind !== "thanks" && (
          <div className="w-full h-px bg-border mb-16 relative">
            <motion.div
              className="absolute top-0 left-0 h-full bg-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ─── Question screen (Q1 or any branch question) ─── */}
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">
                {t("questionnaire", "progress.label", "Question {current} of {total}")
                  .replace("{current}", String(stepIndex + 1))
                  .replace("{total}", String(total))}
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-light text-foreground mb-12">
                {t("questionnaire", currentQuestion.titleKey)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(option.value)}
                      className={`px-6 py-4 border text-sm tracking-wider transition-all duration-300 ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {t("questionnaire", option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Email capture screen ─── */}
          {step.kind === "email" && (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit}
              className="text-center max-w-md mx-auto"
            >
              <h3 className="font-display text-2xl md:text-3xl font-light text-foreground mb-4">
                {t("questionnaire", "email.title", "Unlock your curated selection")}
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                {t("questionnaire", "email.subtitle", "Enter your email to reveal properties and services matched to your preferences.")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("questionnaire", "email.placeholder", "your@email.com")}
                  required
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-background border border-border text-foreground text-sm tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? t("questionnaire", "email.button_loading", "Sending…")
                    : t("questionnaire", "email.button", "Send")}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500 mt-4">{error}</p>
              )}
            </motion.form>
          )}

          {/* ─── Thank-you screen ─── */}
          {step.kind === "thanks" && (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-xl mx-auto"
            >
              <h2 className="font-display text-4xl md:text-6xl font-light text-foreground mb-6">
                {t("questionnaire", "thanks.title", "Thank you")}
              </h2>
              <div className="w-12 h-px bg-primary mx-auto mb-8" />
              <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed mb-2">
                {t("questionnaire", "thanks.message", "While we prepare your selection,")}
              </p>
              <Link
                to="/properties"
                className="inline-block mt-4 px-10 py-3.5 border border-primary text-primary text-xs tracking-[0.25em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors duration-300"
              >
                {t("questionnaire", "thanks.cta", "explore our current homes")}
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </section>
  );
};

export default QuestionnaireSection;