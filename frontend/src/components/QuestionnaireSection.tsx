// frontend/src/components/QuestionnaireSection.tsx
//
// Branching questionnaire flow:
//   Q1 (intent) → branch-specific questions → email capture → thank-you screen
//
// All visible text comes from the `questionnaire` namespace in the
// translations table — there are no in-component fallback strings, so any
// missing row will render as empty. Seeded by
// supabase/migrations/20260501_homepage_translations.sql and resynced by
// supabase/migrations/20260501_questionnaire_copy_resync.sql.
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

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
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

// ─── Component ────────────────────────────────────────────────────────────

const QuestionnaireSection = () => {
  const t = useT();
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>({ kind: "q1" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mobileThanksOpen, setMobileThanksOpen] = useState(false);

  // Open the mobile thank-you pop-up the moment we land on the thanks step.
  useEffect(() => {
    if (step.kind === "thanks" && isMobile) {
      setMobileThanksOpen(true);
    }
  }, [step.kind, isMobile]);

  // Lock body scroll while the mobile pop-up is showing so the page can't
  // shift around behind it. Pad the body by the scrollbar width while
  // locked so the layout doesn't get wider when the scrollbar disappears.
  useEffect(() => {
    if (!mobileThanksOpen) return;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [mobileThanksOpen]);

  function closeMobileThanks() {
    setMobileThanksOpen(false);
    // Allow body scroll to unlock before scrolling to Services.
    setTimeout(() => {
      document
        .querySelector("#services")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

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
        throw new Error(data.detail || t("questionnaire", "error.generic"));
      }

      setStep({ kind: "thanks" });
    } catch (err: any) {
      setError(err.message || t("questionnaire", "error.generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section id="questionnaire" className="min-h-screen flex items-center bg-card section-padding">
      <div className="max-w-3xl mx-auto w-full">

        {/* Intro — hidden but space-reserved on the 'thanks' screen
            so the heading below stays in the same vertical position. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`text-center mb-16 ${step.kind === "thanks" ? "invisible" : ""}`}
          aria-hidden={step.kind === "thanks"}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">
            {t("questionnaire", "intro.eyebrow")}
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground mb-4">
            {t("questionnaire", "intro.title")}
          </h2>
          <p className="text-sm text-muted-foreground/70 font-light max-w-md mx-auto">
            {t("questionnaire", "intro.subtitle")}
          </p>
        </motion.div>

        {/* Progress bar — hidden but space-reserved on the thanks screen */}
        <div
          className={`w-full h-px bg-border mb-16 relative ${step.kind === "thanks" ? "invisible" : ""}`}
          aria-hidden={step.kind === "thanks"}
        >
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

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
                {t("questionnaire", "progress.label")
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
                {t("questionnaire", "email.title")}
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                {t("questionnaire", "email.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("questionnaire", "email.placeholder")}
                  required
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-background border border-border text-foreground text-base sm:text-sm tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? t("questionnaire", "email.button_loading")
                    : t("questionnaire", "email.button")}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500 mt-4">{error}</p>
              )}
            </motion.form>
          )}

          {/* ─── Thank-you screen ───
              On mobile we also surface this content as a fixed pop-up
              modal (see below). The image is suppressed on mobile inline
              so the section height doesn't jump around behind the modal. */}
          {step.kind === "thanks" && (
            <motion.div
              key="thanks"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.25, delayChildren: 0.1 } },
              }}
              className="text-center max-w-xl mx-auto"
            >
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
                }}
                className="font-display text-4xl md:text-6xl font-light text-foreground mb-6"
              >
                {t("questionnaire", "thanks.title")}
              </motion.h2>
              <motion.div
                variants={{
                  hidden: { opacity: 0, scaleX: 0 },
                  visible: { opacity: 1, scaleX: 1, transition: { duration: 0.6 } },
                }}
                className="w-12 h-px bg-primary mx-auto mb-8 origin-center"
              />
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
                }}
                className="text-base md:text-lg text-muted-foreground font-light leading-relaxed mb-12"
              >
                {t("questionnaire", "thanks.message")}
                <br />
                <Link
                  to="/properties"
                  className="text-primary underline-offset-4 hover:underline transition-colors"
                >
                  {t("questionnaire", "thanks.cta")}
                </Link>
                .
              </motion.p>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1 } },
                }}
                className="overflow-hidden hidden md:block"
              >
                <img
                  src="/ocean.jpg"
                  alt=""
                  aria-hidden="true"
                  className="w-full h-48 md:h-64 object-cover"
                />
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ─── Mobile-only pop-up layer ─── */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {mobileThanksOpen && isMobile && (
              <motion.div
                key="mobile-thanks-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 bg-background/80 backdrop-blur-sm md:hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-thanks-title"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden bg-card border border-primary/30 shadow-2xl"
                >
                  {/* Animated close button */}
                  <motion.button
                    type="button"
                    onClick={closeMobileThanks}
                    aria-label={t("questionnaire", "thanks.close")}
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-card hover:bg-primary/90 transition-colors"
                  >
                    <X className="h-5 w-5" strokeWidth={2.25} />
                  </motion.button>

                  <div className="px-6 pt-12 pb-6 text-center">
                    <motion.h2
                      id="mobile-thanks-title"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.6 }}
                      className="font-display text-3xl font-light text-foreground mb-4"
                    >
                      {t("questionnaire", "thanks.title")}
                    </motion.h2>
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="w-12 h-px bg-primary mx-auto mb-6 origin-center"
                    />
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="text-sm text-muted-foreground font-light leading-relaxed mb-6 px-2"
                    >
                      {t("questionnaire", "thanks.message")}
                      <br />
                      <Link
                        to="/properties"
                        className="text-primary underline-offset-4 hover:underline transition-colors"
                      >
                        {t("questionnaire", "thanks.cta")}
                      </Link>
                      .
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55, duration: 0.7 }}
                      className="overflow-hidden"
                    >
                      <img
                        src="/ocean.jpg"
                        alt=""
                        aria-hidden="true"
                        className="w-full h-40 object-cover"
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
};

export default QuestionnaireSection;