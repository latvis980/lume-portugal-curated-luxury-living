// frontend/src/components/PrivateAccessSection.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";

const PrivateAccessSection = () => {
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
        throw new Error(
          data.detail || t("contact", "error_fallback", "Something went wrong. Please try again."),
        );
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || t("contact", "error_fallback", "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const phone = t("contact", "phone", "");
  const phoneLandline = t("contact", "phone_landline", "+351 21 3212 800");
  const email = t("contact", "email", "");
  const address = t("contact", "address", "");
  const mapsUrl = t("contact", "maps_url", "");
  const whatsappNumber = phone.replace(/\D/g, "");

  return (
    <section
      id="private-access"
      className="relative z-[32] section-padding overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #ecbe5b 0%, #e89446 60%, #d36a25 100%)",
        color: "#2a1d10",
      }}
    >
      {/* Soft sun glow + warm shadow — gives the section depth without
          obscuring the form. Mirrors the contact panel in the mockup. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 10%, rgba(255,240,200,0.6), transparent 60%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(176,78,26,0.4), transparent 60%)",
        }}
      />
      <div className="relative max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm tracking-[0.3em] uppercase mb-4" style={{ color: "rgba(42,29,16,0.6)" }}>
            {t("contact", "eyebrow", "Private Access")}
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-light mb-4" style={{ color: "#2a1d10" }}>
            {t("contact", "title", "Begin the Conversation")}
          </h2>
          <div className="w-16 h-px mx-auto mb-8" style={{ background: "#2a1d10" }} />
          <p
            className="text-base leading-relaxed max-w-md mx-auto mb-12"
            style={{ color: "rgba(42,29,16,0.7)" }}
          >
            {t(
              "contact",
              "intro",
              "Request a private consultation with our team. Share your vision and we'll curate a bespoke plan for your life in Portugal.",
            )}
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
              placeholder={t("contact", "name_placeholder", "Full Name")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={isSubmitting}
              className="lume-contact-input w-full px-4 py-3 text-base tracking-wider focus:outline-none transition-colors disabled:opacity-50"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <input
                type="email"
                placeholder={t("contact", "email_placeholder", "Email")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={isSubmitting}
                className="lume-contact-input w-full px-4 py-3 text-base tracking-wider focus:outline-none transition-colors disabled:opacity-50"
              />
              <input
                type="tel"
                placeholder={t("contact", "phone_placeholder", "Phone")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isSubmitting}
                className="lume-contact-input w-full px-4 py-3 text-base tracking-wider focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <textarea
              placeholder={t("contact", "message_placeholder", "Tell us about your vision...")}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              disabled={isSubmitting}
              className="lume-contact-input w-full px-4 py-3 text-sm tracking-wider focus:outline-none transition-colors resize-none disabled:opacity-50"
            />

            {error && (
              <p className="text-sm text-red-900 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 text-sm tracking-[0.25em] uppercase font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#2a1d10", color: "#fbf4e6" }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "#b04e1a";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "#2a1d10";
              }}
            >
              {isSubmitting
                ? t("contact", "submitting", "Sending...")
                : t("contact", "submit", "Request Private Access")}
            </button>

            <style>{`
              .lume-contact-input {
                background: rgba(255,243,220,0.4);
                border: 1px solid rgba(42,29,16,0.18);
                color: #2a1d10;
                border-radius: 2px;
              }
              .lume-contact-input::placeholder { color: rgba(42,29,16,0.5); }
              .lume-contact-input:focus {
                border-color: #2a1d10;
                background: rgba(255,243,220,0.7);
              }
            `}</style>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16"
          >
            <p className="font-display text-2xl font-light italic mb-3" style={{ color: "#2a1d10" }}>
              {t("contact", "thank_you_title", "Thank you")}
            </p>
            <p className="text-base" style={{ color: "rgba(42,29,16,0.75)" }}>
              {t("contact", "thank_you_body", "A member of our team will be in touch within 24 hours.")}
            </p>
          </motion.div>
        )}

        {(phoneLandline || phone || email || address) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-16 pt-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left max-w-lg mx-auto"
            style={{ borderTop: "1px solid rgba(42,29,16,0.18)" }}
          >
            {(phoneLandline || phone) && (
              <div>
                <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "rgba(42,29,16,0.6)" }}>
                  {t("contact", "phone_label", "Phone")}
                </p>
                <div className="flex flex-col gap-2">
                  {phoneLandline && (
                    <div className="flex items-baseline gap-2">
                      <a
                        href={`tel:${phoneLandline.replace(/\s/g, "")}`}
                        className="font-display text-base font-light transition-colors"
                        style={{ color: "#2a1d10" }}
                      >
                        {phoneLandline}
                      </a>
                      <span
                        className="text-xs"
                        style={{ color: "rgba(42,29,16,0.55)" }}
                      >
                        ({t("contact", "phone_calls_note", "calls")})
                      </span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-3">
                      <a
                        href={`tel:${phone}`}
                        className="font-display text-base font-light transition-colors"
                        style={{ color: "#2a1d10" }}
                      >
                        {phone}
                      </a>
                      <span
                        className="text-xs"
                        style={{ color: "rgba(42,29,16,0.55)" }}
                      >
                        ({t("contact", "whatsapp_text_note", "text")})
                      </span>
                      {whatsappNumber && (
                        <a
                          href={`https://wa.me/${whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("contact", "whatsapp_label", "WhatsApp")}
                          className="transition-colors flex-shrink-0"
                          style={{ color: "rgba(42,29,16,0.55)" }}
                          aria-label={t("contact", "whatsapp_label", "WhatsApp")}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-4 h-4"
                            aria-hidden="true"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {email && (
              <div>
                <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "rgba(42,29,16,0.6)" }}>
                  {t("contact", "email_label", "Email")}
                </p>
                <a
                  href={`mailto:${email}`}
                  className="font-display text-base font-light transition-colors break-all"
                  style={{ color: "#2a1d10" }}
                >
                  {email}
                </a>
              </div>
            )}

            {address && (
              <div>
                <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "rgba(42,29,16,0.6)" }}>
                  {t("contact", "address_label", "Address")}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "rgba(42,29,16,0.85)" }}>
                  {address}
                </p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs transition-colors underline underline-offset-2"
                    style={{ color: "rgba(42,29,16,0.7)" }}
                  >
                    {t("contact", "map_link", "View on map")}
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PrivateAccessSection;
