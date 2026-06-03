import { useT } from "@/lib/i18n";

const Footer = () => {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative px-6 md:px-12 lg:px-24 py-14"
      style={{ background: "#1a1108", color: "rgba(237,226,200,0.7)", zIndex: 35 }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-10 md:gap-8">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
          <img
            src="/footer-logo.png"
            alt={t("footer", "logo_alt", "LUME by Mark")}
            className="h-[110px] w-auto opacity-95"
          />
        </div>

        {/* Legal / registration */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-[13px] leading-relaxed font-semibold text-[#edd9a8]/90">
            {t("footer", "legal_name", "LUME by Mark Lda")}
          </p>
          <p className="text-[13px] leading-relaxed">
            {t("footer", "legal_nif_label", "NIF")}{" "}
            {t("footer", "legal_nif", "000 000 000")}
          </p>
          <p className="text-[13px] leading-relaxed">
            {t("footer", "legal_ami_label", "AMI")}{" "}
            {t("footer", "legal_ami", "0000")}
          </p>
          <p className="text-[13px] leading-relaxed">
            {t("footer", "legal_address_street", "Avenida de Liberdade XX")}
          </p>
          <p className="text-[13px] leading-relaxed">
            {t("footer", "legal_address_city", "1250-XXX Lisboa, Portugal")}
          </p>
        </div>

        {/* Copyright & credits */}
        <div className="flex flex-col items-center md:items-end gap-1 text-center md:text-right">
          <p className="text-[13px] tracking-wider">
            ©{year} {t("footer", "rights_reserved", "All Rights Reserved")}
          </p>
          <p className="text-[13px] tracking-wider">
            {t("footer", "site_dev_label", "Site development")}:{" "}
            <a
              href="https://diamondoctopus.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#edd9a8] transition-colors"
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
