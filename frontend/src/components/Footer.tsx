const Footer = () => {
  return (
    <footer className="px-6 md:px-12 lg:px-24 py-12 bg-charcoal border-t border-warm-white/10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <img
          src="/logo_footer.png"
          alt="LUME by Mark"
          className="h-[52px] w-auto"
        />
        <p className="text-[11px] tracking-wider text-warm-white/30">
          © 2026 LUME by Mark · Real Estate, Relocation & Investment · Portugal
        </p>
      </div>
    </footer>
  );
};

export default Footer;
