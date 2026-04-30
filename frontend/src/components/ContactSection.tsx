// frontend/src/components/ContactSection.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";

const ContactSection = () => {
  const t = useT();
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
        throw new Error(data.detail || t("contact", "error_fallback", "Something went wrong. Please try again."));
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || t("contact", "error_fallback", "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const phone = t("contact", "phone", "");
  const address = t("contact", "address", "");
  const mapsUrl = t("contact", "maps_url", "");
  const whatsappNumber = phone.replace(/\D/g, "");

  return (
    <section id="contact" className="section-padding bg-[#4e8ba1]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm tracking-[0.3em] uppercase text-sun-light/90 mb-4">
            {t("contact", "eyebrow", "Contact")}
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-warm-white mb-4">
            {t("contact", "title", "Get in Touch")}
          </h2>
          <div className="w-16 h-px bg-primary mx-auto mb-8" />
          <p className="text-base text-ocean-light/90 leading-relaxed max-w-md mx-auto">
            {t("contact", "intro", "Reach out to our team. Share your vision and we'll help you find your place in Portugal.")}
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">

          {/* Left: Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <input
                  type="text"
                  placeholder={t("contact", "name_placeholder", "Full Name")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-transparent border border-warm-white/25 text-warm-white text-base tracking-wider placeholder:text-warm-white/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input
                    type="email"
                    placeholder={t("contact", "email_placeholder", "Email")}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-transparent border border-warm-white/25 text-warm-white text-base tracking-wider placeholder:text-warm-white/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  />
                  <input
                    type="tel"
                    placeholder={t("contact", "phone_placeholder", "Phone (optional)")}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-transparent border border-warm-white/25 text-warm-white text-base tracking-wider placeholder:text-warm-white/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  />
                </div>
                <textarea
                  placeholder={t("contact", "message_placeholder", "Tell us about your vision...")}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-transparent border border-warm-white/15 text-warm-white text-sm tracking-wider placeholder:text-warm-white/30 focus:outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
                />

                {error && (
                  <p className="text-sm text-red-300 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-primary-foreground text-sm tracking-[0.25em] uppercase hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? t("contact", "submitting", "Sending...")
                    : t("contact", "submit", "Send Message")}
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-16 text-center"
              >
                <p className="font-display text-2xl font-light text-warm-white italic mb-3">
                  {t("contact", "thank_you_title", "Thank you")}
                </p>
                <p className="text-base text-ocean-light/85">
                  {t("contact", "thank_you_body", "A member of our team will be in touch within 24 hours.")}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Right: Contact details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-10 md:pt-2"
          >
            {/* Phone */}
            {phone && (
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-sun-light/70 mb-3">
                  {t("contact", "phone_label", "Phone")}
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href={`tel:${phone}`}
                    className="font-display text-xl font-light text-warm-white hover:text-sun-light/90 transition-colors"
                  >
                    {phone}
                  </a>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("contact", "whatsapp_label", "WhatsApp")}
                      className="text-warm-white/60 hover:text-warm-white/90 transition-colors flex-shrink-0"
                      aria-label={t("contact", "whatsapp_label", "WhatsApp")}
                    >
                      {/* WhatsApp icon — monochrome, inherits text color */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                        aria-hidden="true"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            {address && (
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-sun-light/70 mb-3">
                  {t("contact", "address_label", "Address")}
                </p>
                <p className="text-warm-white/90 leading-relaxed whitespace-pre-line">
                  {address}
                </p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm text-sun-light/70 hover:text-sun-light transition-colors underline underline-offset-2"
                  >
                    {t("contact", "map_link", "View on map")}
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
