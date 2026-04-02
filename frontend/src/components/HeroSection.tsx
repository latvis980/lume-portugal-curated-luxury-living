import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-charcoal/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-xs md:text-sm tracking-[0.35em] uppercase text-sand-light/80 mb-6"
        >
          Real Estate · Relocation · Investment
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col items-center"
        >
          <span className="logo-shimmer font-display text-5xl md:text-7xl lg:text-8xl font-light tracking-wider inline-flex items-baseline relative">
            LUME
            <span className="sun-dot" />
          </span>
          <span className="font-body text-xs md:text-sm tracking-[0.3em] uppercase text-sand-light/60 mt-2 font-medium">
            by Mark
          </span>
        </motion.h1>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "4rem" }}
          transition={{ duration: 1, delay: 1 }}
          className="h-px bg-primary my-8"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="font-display text-xl md:text-2xl font-light text-sand-light/90 italic max-w-xl"
        >
          Your light to living in Portugal
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="mt-12 flex flex-col sm:flex-row gap-4"
        >
          <a
            href="#questionnaire"
            className="px-8 py-3 border border-sand-light/40 text-sand-light text-xs tracking-[0.2em] uppercase hover:bg-sand-light/10 transition-all duration-300"
          >
            Begin Your Journey
          </a>
          <a
            href="#private-access"
            className="px-8 py-3 bg-primary/90 text-primary-foreground text-xs tracking-[0.2em] uppercase hover:bg-primary transition-all duration-300"
          >
            Private Access
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase text-sand-light/50">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-sand-light/30"
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;
