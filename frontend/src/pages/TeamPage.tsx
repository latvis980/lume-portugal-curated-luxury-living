// frontend/src/pages/TeamPage.tsx — the team section, split out of the
// former About page so it lives at its own /about/team route.
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useT } from "@/lib/i18n";

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

const TeamPage = () => {
  const t = useT();
  const { data: team = [] } = useQuery({
    queryKey: ["public-team"],
    queryFn: fetchTeam,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="px-6 md:px-10 lg:px-16 pt-28 pb-14 md:pt-36 md:py-20 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">
              {t("about", "team_eyebrow", "Founders & Curators")}
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
              {t("about", "team_title", "The people behind LUME")}
            </h2>
          </div>

          <div className="space-y-24 md:space-y-36">
            {team.map((member, i) => (
              <FounderRow key={member.id} member={member} reverse={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

function FounderRow({ member, reverse }: { member: TeamMember; reverse: boolean }) {
  const t = useT();
  const bio = t(`team.${member.slug}`, "bio");

  // Split bio on blank lines so editors can write paragraphs in a single
  // text field (one blank line in the admin = new paragraph on the page).
  const paragraphs = bio
    ? bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : [];

  const initials = member.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7 }}
      className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 lg:gap-16 items-start"
    >
      {/* Square photo */}
      <div className={`md:col-span-4 ${reverse ? "md:order-2" : ""}`}>
        <div className="aspect-square w-full overflow-hidden bg-muted">
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              className="w-full h-full object-cover grayscale"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-sand text-charcoal/60 font-display text-5xl">
              {initials || "·"}
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <div className={`md:col-span-8 ${reverse ? "md:order-1" : ""}`}>
        <h3 className="font-display text-lg md:text-2xl lg:text-3xl font-light text-foreground">
          {member.name}
        </h3>
        {member.role && (
          <p className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-primary mt-3">
            {member.role}
          </p>
        )}
        <div className="w-12 h-px bg-primary my-6" />
        {paragraphs.length > 0 && (
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            {paragraphs.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default TeamPage;
