import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const questions = [
  {
    id: 1,
    question: "What brings you to Portugal?",
    options: ["Relocation", "Investment", "Second Home", "Retirement"],
  },
  {
    id: 2,
    question: "What is your preferred region?",
    options: ["Lisbon & Cascais", "Algarve", "Porto & North", "Silver Coast"],
  },
  {
    id: 3,
    question: "What type of property are you looking for?",
    options: ["Modern Apartment", "Traditional Villa", "Penthouse", "Country Estate"],
  },
  {
    id: 4,
    question: "What is your budget range?",
    options: ["€500K – €1M", "€1M – €2.5M", "€2.5M – €5M", "€5M+"],
  },
];

interface QuestionnaireSectionProps {
  onComplete: () => void;
  isCompleted: boolean;
}

const QuestionnaireSection = ({ onComplete, isCompleted }: QuestionnaireSectionProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setShowEmail(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) onComplete();
  };

  const progress = ((currentQuestion + (showEmail ? 1 : 0)) / (questions.length + 1)) * 100;

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
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground">
            Tell Us What You Seek
          </h2>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full h-px bg-border mb-16 relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {!isCompleted ? (
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
                    className="flex-1 px-4 py-3 bg-background border border-border text-foreground text-sm tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:bg-primary/90 transition-colors"
                  >
                    Reveal
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="font-display text-2xl font-light text-primary italic">
              Your curated experience awaits below
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default QuestionnaireSection;
