// frontend/src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ListingPage from "./pages/ListingPage.tsx";
import PropertiesPage from "./pages/PropertiesPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";


// Admin pages
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminListings from "./pages/admin/AdminListings.tsx";
import AdminListingForm from "./pages/admin/AdminListingForm.tsx";
import AdminContacts from "./pages/admin/AdminContacts.tsx";
import AdminServices from "./pages/admin/AdminServices.tsx";
import AdminTranslations from "./pages/admin/AdminTranslations.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:slug" element={<ListingPage />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="listings" element={<AdminListings />} />
              <Route path="listings/new" element={<AdminListingForm />} />
              <Route path="listings/:id" element={<AdminListingForm />} />
              <Route path="contacts" element={<AdminContacts />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="translations" element={<AdminTranslations />} />
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