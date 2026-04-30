// frontend/src/components/PrivateAccessSection.tsx
import { useState } from "react";
import { motion } from "framer-motion";

const PrivateAccessSection = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/submit/private-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          message: form.message || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="private-access" className="section-padding bg-[#5398b5]">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm tracking-[0.3em] uppercase text-sun-light/90 mb-4">Private Access</p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-warm-white mb-4">
            Begin the Conversation
          </h2>
          <div className="w-16 h-px bg-primary mx-auto mb-8" />
          <p className="text-base text-ocean-light/90 leading-relaxed max-w-md mx-auto mb-12">
            Request a private consultation with our team. Share your vision and
            we'll curate a bespoke plan for your life in Portugal.
          </p>
        </motion.div>

        {!submitted ? (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-5 text-left max-w-lg mx-auto"
          >
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-transparent border border-warm-white/25 text-warm-white text-base tracking-wider placeholder:text-warm-white/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-transparent border border-warm-white/25 text-warm-white text-base tracking-wider placeholder:text-warm-white/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-transparent border border-warm-white/25 text-warm-white text-base tracking-wider placeholder:text-warm-white/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
              />
            </div>
            <textarea
              placeholder="Tell us about your vision..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-transparent border border-warm-white/15 text-warm-white text-sm tracking-wider placeholder:text-warm-white/30 focus:outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
            />

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-primary-foreground text-sm tracking-[0.25em] uppercase hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Request Private Access"}
            </button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16"
          >
            <p className="font-display text-2xl font-light text-warm-white italic mb-3">
              Thank you
            </p>
            <p className="text-base text-ocean-light/85">
              A member of our team will be in touch within 24 hours.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PrivateAccessSection;
