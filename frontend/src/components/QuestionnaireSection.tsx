// frontend/src/components/QuestionnaireSection.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setCookie, EMAIL_SUBMITTED_KEY } from "@/lib/cookies";

const questions = [
  {
    id: 1,
    question: "What brings you to Portugal?",
    options: ["Relocation", "Second Home", "Investment", "Just Exploring"],
  },
  {
    id: 2,
    question: "My preferred lifestyle",
    options: ["Ocean", "City", "Countryside", "Wine Region"],
  },
  {
    id: 3,
    question: "Who are you moving with?",
    options: ["Just Me", "With Partner", "With Children", "With Extended Family"],
  },
  {
    id: 4,
    question: "Timeline",
    options: ["Now", "3–6 Months", "6–12 Months", "Just Exploring"],
  },
];

interface QuestionnaireSectionProps {
  // answers are passed back so the parent can use them to filter listings
  onComplete: (answers: Record<string, string>) => void;
  isCompleted: boolean;
}

const QuestionnaireSection = ({ onComplete, isCompleted }: QuestionnaireSectionProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setShowEmail(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    // Convert answers from {0: "Relocation", 1: "Ocean"}
    // to {"1": "Relocation", "2": "Ocean"} (1-indexed string keys for backend)
    const formattedAnswers: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      formattedAnswers[String(Number(key) + 1)] = value;
    }

    try {
      const res = await fetch("/api/submit/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answers: formattedAnswers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Something went wrong. Please try again.");
      }

      // Set cookie so returning visitors skip the questionnaire (90 days)
      setCookie(EMAIL_SUBMITTED_KEY, "1", 90);

      // Pass answers up so Index can filter listings accordingly
      onComplete(formattedAnswers);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentQuestion + (showEmail ? 1 : 0)) / (questions.length + 1)) * 100;

  if (isCompleted) return null;

  return (
    <section id="questionnaire" className="min-h-screen flex items-center bg-card section-padding">
      <div className="max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">Discover Your Match</p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground mb-4">
            Tell Us What You Seek
          </h2>
          <p className="text-sm text-muted-foreground/70 font-light max-w-md mx-auto">
            Answer a few quick questions to unlock exclusive listings and services tailored to you.
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full h-px bg-border mb-16 relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {!showEmail ? (
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-light text-foreground mb-12">
                {questions[currentQuestion].question}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {questions[currentQuestion].options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`px-6 py-4 border text-sm tracking-wider transition-all duration-300 ${
                      answers[currentQuestion] === option
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
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
                Unlock Your Curated Selection
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                Enter your email to reveal properties and services matched to your preferences.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-background border border-border text-foreground text-sm tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Sending…" : "Reveal"}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500 mt-4">{error}</p>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default QuestionnaireSection;
