// frontend/src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { localeFromPath, localePrefix } from "@/lib/locale-path";
import { isRegionSlug } from "@/config/sectionPages";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ListingPage from "./pages/ListingPage.tsx";
import SectionPage from "./pages/SectionPage.tsx";
import PropertiesPage from "./pages/PropertiesPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import TeamPage from "./pages/TeamPage.tsx";
import CompanyNewsPage from "./pages/CompanyNewsPage.tsx";
import JournalIndex from "./pages/JournalIndex.tsx";
import JournalArticle from "./pages/JournalArticle.tsx";
import LegalPage from "./pages/LegalPage.tsx";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminListings from "./pages/admin/AdminListings.tsx";
import AdminListingForm from "./pages/admin/AdminListingForm.tsx";
import AdminContacts from "./pages/admin/AdminContacts.tsx";
import AdminServices from "./pages/admin/AdminServices.tsx";
import AdminAbout from "./pages/admin/AdminAbout.tsx";
import AdminInvestment from "./pages/admin/AdminInvestment.tsx";
import AdminContactPage from "./pages/admin/AdminContactPage.tsx";
import AdminJournal from "./pages/admin/AdminJournal.tsx";
import AdminJournalForm from "./pages/admin/AdminJournalForm.tsx";

const queryClient = new QueryClient();

// React Router basename derived from the URL locale prefix at load. With this,
// every <Link to="/x"> resolves to the active locale (e.g. /pt/x) and
// useLocation() reports paths WITHOUT the prefix — no per-link changes needed.
const ROUTER_BASENAME =
  typeof window !== "undefined"
    ? localePrefix(localeFromPath(window.location.pathname))
    : "";

// /properties/<seg> is ambiguous: it is a curated section page when <seg> is a
// known region slug, otherwise a property detail page. We resolve it against
// the SAME closed region-slug set the backend uses, so server and client agree.
const PropertiesSegment = () => {
  const { slug } = useParams();
  return isRegionSlug(slug) ? <SectionPage /> : <ListingPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={ROUTER_BASENAME || undefined}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/about/team" element={<TeamPage />} />
            <Route path="/about/news" element={<CompanyNewsPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            {/* Section landing pages (region [+ type]) share the single-segment
                shape with property detail pages; PropertiesSegment dispatches. */}
            <Route path="/properties/:slug" element={<PropertiesSegment />} />
            <Route path="/properties/:slug/:typeSlug" element={<SectionPage />} />
            <Route path="/journal" element={<JournalIndex />} />
            <Route path="/journal/:slug" element={<JournalArticle />} />

            {/* Legal pages (hardcoded content, see src/content/legal) */}
            <Route path="/legal/terms" element={<LegalPage slug="legal-terms" />} />
            <Route path="/privacy" element={<LegalPage slug="privacy-policy" />} />
            <Route path="/legal/cookies" element={<LegalPage slug="cookies-policy" />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="listings" element={<AdminListings />} />
              <Route path="listings/new" element={<AdminListingForm />} />
              <Route path="listings/:id" element={<AdminListingForm />} />
              <Route path="contacts" element={<AdminContacts />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="about" element={<AdminAbout />} />
              <Route path="investment" element={<AdminInvestment />} />
              <Route path="contact-page" element={<AdminContactPage />} />
              <Route path="journal" element={<AdminJournal />} />
              <Route path="journal/new" element={<AdminJournalForm />} />
              <Route path="journal/:id" element={<AdminJournalForm />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;