import { useT } from "@/lib/i18n";

const Footer = () => {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer
      className="px-6 md:px-12 lg:px-24 py-14"
      style={{ background: "#1a1108", color: "rgba(237,226,200,0.7)" }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 items-start">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
          <img
            src="/footer-logo.png"
            alt={t("footer", "logo_alt", "LUME by Mark")}
            className="h-[70px] w-auto opacity-95"
          />
          <p className="text-[13px] tracking-wider leading-relaxed">
            {t(
              "footer",
              "tagline",
              "Real Estate, Relocation & Investment · Portugal",
            )}
          </p>
        </div>

        {/* Legal / registration */}
        <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#edd9a8]/60 mb-2">
            {t("footer", "legal_heading", "Legal")}
          </p>
          <p className="text-[13px] leading-relaxed">
            {t("footer", "legal_name", "LUME by Mark, Lda.")}
          </p>
          <p className="text-[13px] leading-relaxed">
            {t("footer", "legal_nif_label", "NIF")}:{" "}
            {t("footer", "legal_nif", "000 000 000")}
          </p>
          <p className="text-[13px] leading-relaxed">
            {t("footer", "legal_ami_label", "AMI")}:{" "}
            {t("footer", "legal_ami", "0000")}
          </p>
          <p className="text-[13px] leading-relaxed whitespace-pre-line">
            {t(
              "footer",
              "legal_address",
              "Avenida da Liberdade XX\n1250-XXX Lisboa, Portugal",
            )}
          </p>
        </div>

        {/* Copyright & credits */}
        <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
          <p className="text-[13px] tracking-wider">
            © {year} {t("footer", "company_short", "LUME by Mark")}
          </p>
          <p className="text-[13px] tracking-wider">
            {t("footer", "rights_reserved", "All rights reserved.")}
          </p>
          <p className="text-[12px] tracking-wider mt-3 text-[#edd9a8]/55">
            {t("footer", "site_dev_label", "Site development")}:{" "}
            <a
              href="https://diamondoctopus.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[#edd9a8] transition-colors"
            >
              Diamond Octopus
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
