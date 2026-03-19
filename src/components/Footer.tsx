const Footer = () => {
  return (
    <footer className="px-6 md:px-12 lg:px-24 py-12 bg-charcoal border-t border-warm-white/10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start leading-none">
          <span className="font-display text-xl tracking-widest text-warm-white/80">LUME</span>
          <span className="font-body text-[8px] tracking-[0.2em] uppercase text-warm-white/40 font-medium">by Mark</span>
        </div>
        <p className="text-[11px] tracking-wider text-warm-white/30">
          © 2026 LUME by Mark · Real Estate, Relocation & Investment · Portugal
        </p>
      </div>
    </footer>
  );
};

export default Footer;
