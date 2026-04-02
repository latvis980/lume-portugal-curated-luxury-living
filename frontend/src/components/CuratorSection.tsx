import { motion } from "framer-motion";
import curatorImg from "@/assets/curator.jpg";

const CuratorSection = () => {
  return (
    <section className="section-padding bg-background">
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
            alt="Your dedicated Residential Curator"
            className="w-full max-w-md mx-auto lg:mx-0 aspect-[3/4] object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">The LUME Difference</p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground mb-6">
            Your Residential Curator
          </h2>
          <div className="w-16 h-px bg-primary mb-8" />
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every LUME client is paired with a dedicated Residential Curator — a single point of contact who understands your vision, preferences, and lifestyle needs.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              From your first enquiry to settling into your new home, your Curator orchestrates every detail: property sourcing, legal coordination, interior design, school enrollment, and beyond.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is not a service. It's a relationship built on trust, discretion, and an intimate knowledge of Portugal's finest addresses.
            </p>
          </div>
          <a
            href="#private-access"
            className="inline-block mt-10 px-8 py-3 border border-foreground/20 text-xs tracking-[0.2em] uppercase text-foreground hover:border-primary hover:text-primary transition-all duration-300"
          >
            Request Your Curator
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default CuratorSection;
