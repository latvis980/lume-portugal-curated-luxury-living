import { motion } from "framer-motion";
import curatorImg from "@/assets/curator.jpg";

const CuratorSection = () => {
  return (
    <section id="art-advisory" className="section-padding bg-background">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <img
            src={curatorImg}
            alt="LUME Art & Antiques Advisory — curated collecting in Portugal"
            className="w-full max-w-md mx-auto lg:mx-0 aspect-[3/4] object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">A LUME Exclusive</p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground mb-6">
            Art &amp; Antiques Advisory
          </h2>
          <div className="w-16 h-px bg-primary mb-8" />
          <div className="space-y-5">
            <p className="text-base text-muted-foreground leading-relaxed">
              Beyond real estate and relocation, LUME offers something rare — a dedicated Collection Curator who guides you in building a personal art and antiques collection that reflects your taste, heritage, and the story of your new life in Portugal.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              From sourcing contemporary Portuguese artists and antique azulejo panels to navigating international auction houses and private dealers, your Curator handles every detail: authentication, provenance, logistics, installation, and long-term collection management.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              This is not a catalogue. It's a deeply personal journey — discovering pieces that transform a house into a home with meaning, and an investment portfolio with soul.
            </p>
          </div>
          <a
            href="#private-access"
            className="inline-block mt-10 px-8 py-3 border border-foreground/30 text-sm tracking-[0.2em] uppercase text-foreground hover:border-primary hover:text-primary transition-all duration-300"
          >
            Request Your Curator
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default CuratorSection;