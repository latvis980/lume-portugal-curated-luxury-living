// frontend/src/pages/AboutPage.tsx
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useT } from "@/lib/i18n";
import heroImage from "@/assets/hero-villa.jpg";

interface TeamMember {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  image_url: string | null;
  sort_order: number;
}

async function fetchTeam(): Promise<TeamMember[]> {
  try {
    const res = await fetch("/api/team");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.team) ? data.team : [];
  } catch {
    return [];
  }
}

const AboutPage = () => {
  const t = useT();
  const { data: team = [] } = useQuery({
    queryKey: ["public-team"],
    queryFn: fetchTeam,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Cover ────────────────────────────────────────────────────────── */}
      <section className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover grayscale opacity-70"
          />
          <div className="absolute inset-0 bg-charcoal/50" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-end h-full text-center px-6 pb-16 md:pb-24">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-xs md:text-sm tracking-[0.35em] uppercase text-sand-light/80 mb-5"
          >
            {t("about", "eyebrow", "About LUME")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-light text-sand-light max-w-3xl"
          >
            {t("about", "title", "A calm, precise way to enter life in Portugal")}
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "4rem" }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-px bg-primary my-6"
          />
        </div>
      </section>

      {/* ── Intro ────────────────────────────────────────────────────────── */}
      <section className="section-padding bg-background">
        <div className="max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-display text-xl md:text-2xl font-light text-foreground italic leading-relaxed"
          >
            {t("about", "tagline")}
          </motion.p>

          <div className="mt-10 space-y-5 text-base text-muted-foreground leading-relaxed">
            <p>{t("about", "intro_p1")}</p>
            <p>{t("about", "intro_p2")}</p>
            <p>{t("about", "intro_p3")}</p>
          </div>
        </div>
      </section>

      {/* ── What we do ───────────────────────────────────────────────────── */}
      <section className="section-padding bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "what_we_do_title", "What we do")}
          </h2>
          <div className="w-12 h-px bg-primary mb-8" />

          <p className="text-base text-foreground mb-6">
            {t("about", "what_we_do_lead", "LUME connects three layers:")}
          </p>

          <ul className="space-y-4 mb-8">
            {["homes", "living", "collecting"].map((k) => (
              <li
                key={k}
                className="pl-5 border-l border-primary/40 text-base text-muted-foreground leading-relaxed"
              >
                {t("about", `what_we_do_${k}`)}
              </li>
            ))}
          </ul>

          <p className="text-base text-muted-foreground italic">
            {t("about", "what_we_do_outro")}
          </p>
        </div>
      </section>

      {/* ── How we work ──────────────────────────────────────────────────── */}
      <section className="section-padding bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "how_we_work_title", "How we work")}
          </h2>
          <div className="w-12 h-px bg-primary mb-8" />
          <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
            <p>{t("about", "how_we_work_p1")}</p>
            <p>{t("about", "how_we_work_p2")}</p>
            <p>{t("about", "how_we_work_p3")}</p>
          </div>
        </div>
      </section>

      {/* ── Why LUME ─────────────────────────────────────────────────────── */}
      <section className="section-padding bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "why_lume_title", "Why LUME")}
          </h2>
          <div className="w-12 h-px bg-primary mb-8" />
          <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
            <p>{t("about", "why_lume_p1")}</p>
            <p>{t("about", "why_lume_p2")}</p>
          </div>
        </div>
      </section>

      {/* ── Our goal ─────────────────────────────────────────────────────── */}
      <section className="section-padding bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "goal_title", "Our goal")}
          </h2>
          <div className="w-12 h-px bg-primary mb-8 mx-auto" />
          <p className="font-display text-xl md:text-2xl font-light text-foreground italic leading-relaxed mb-4">
            {t("about", "goal_p1")}
          </p>
          <p className="text-base text-muted-foreground">
            {t("about", "goal_p2")}
          </p>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      <section className="section-padding bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">
              {t("about", "team_eyebrow", "Founders & Curators")}
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-light text-foreground">
              {t("about", "team_title", "The people behind LUME")}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
            {team.map((member, i) => (
              <FounderCard key={member.id} member={member} index={i} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

function FounderCard({ member, index }: { member: TeamMember; index: number }) {
  const t = useT();
  const bio = t(`team.${member.slug}`, "bio");
  const initials = member.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="flex flex-col items-center text-center"
    >
      <div className="relative w-28 h-28 md:w-32 md:h-32 mb-5 overflow-hidden rounded-full bg-muted">
        {member.image_url ? (
          <img
            src={member.image_url}
            alt={member.name}
            className="w-full h-full object-cover grayscale"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-sand text-charcoal/60 font-display text-2xl">
            {initials || "·"}
          </div>
        )}
      </div>
      <h3 className="font-display text-lg font-light text-foreground">
        {member.name}
      </h3>
      {member.role && (
        <p className="text-[10px] tracking-[0.2em] uppercase text-primary mt-1 mb-3">
          {member.role}
        </p>
      )}
      {bio && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {bio}
        </p>
      )}
    </motion.div>
  );
}

export default AboutPage;
