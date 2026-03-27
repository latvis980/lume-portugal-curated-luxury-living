// frontend/src/components/ServicesSection.tsx
// ⚠️  Category values MUST match the Postgres enum exactly:
//     administrative | healthcare_family | home | investment_advisory

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Scale, Heart, Home, TrendingUp, LucideIcon } from "lucide-react";

const CATEGORY_META: Record<
  string,
  { label: string; icon: LucideIcon; order: number }
> = {
  administrative:      { label: "Administrative",       icon: Scale,       order: 0 },
  healthcare_family:   { label: "Healthcare & Family",  icon: Heart,       order: 1 },
  home:                { label: "Home",                  icon: Home,        order: 2 },
  investment_advisory: { label: "Investment Advisory",  icon: TrendingUp,  order: 3 },
};

interface Service {
  id: string;
  title: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

async function fetchPublicServices(): Promise<{ services: Service[] }> {
  const res = await fetch("/api/services");
  if (!res.ok) throw new Error("Failed to load services");
  return res.json();
}

const ServicesSection = () => {
  const { data } = useQuery({
    queryKey: ["public-services"],
    queryFn: fetchPublicServices,
    retry: 1,
  });

  const services = data?.services ?? [];

  const categories = Object.entries(CATEGORY_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => ({
      key,
      ...meta,
      items: services
        .filter((s) => s.category === key)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => s.title),
    }));

  return (
    <section id="services" className="section-padding bg-card">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">
            Exclusive Services
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground">
            Everything You Need, Curated
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group"
            >
              <cat.icon className="w-6 h-6 text-primary mb-5" strokeWidth={1.5} />
              <h3 className="font-display text-xl font-light text-foreground mb-4">
                {cat.label}
              </h3>
              <div className="w-8 h-px bg-primary/40 mb-5 group-hover:w-12 transition-all duration-500" />
              <ul className="space-y-2.5">
                {cat.items.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;