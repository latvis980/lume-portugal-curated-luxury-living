// frontend/src/pages/CompanyNewsPage.tsx — placeholder for the Company News
// section (labelled "Media" in Portuguese). Content will be built out later.
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useT } from "@/lib/i18n";

const CompanyNewsPage = () => {
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 md:pt-36">
        <p className="text-xs tracking-[0.3em] uppercase text-primary mb-5">
          {t("news", "eyebrow", "Company News")}
        </p>
        <h1 className="font-display text-3xl md:text-5xl font-light text-foreground max-w-2xl">
          {t("news", "title", "Coming soon")}
        </h1>
        <div className="w-16 h-px bg-primary my-7" />
        <p className="text-sm text-muted-foreground max-w-md">
          {t("news", "body", "We're putting this together. Check back soon for updates from LUME.")}
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default CompanyNewsPage;
