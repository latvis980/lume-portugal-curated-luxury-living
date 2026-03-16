import { motion } from "framer-motion";
import { Scale, Heart, Home, TrendingUp } from "lucide-react";

const categories = [
  {
    icon: Scale,
    title: "Administrative",
    items: ["Legal counsel & lawyers", "Tax advisory (NHR)", "Bank account opening", "Visa & residency permits", "NIF & documentation"],
  },
  {
    icon: Heart,
    title: "Healthcare & Family",
    items: ["Private healthcare enrollment", "International schools", "Family relocation support", "Pet relocation", "Language services"],
  },
  {
    icon: Home,
    title: "Home",
    items: ["Interior design", "Furniture sourcing", "Home automation", "Garden & landscape", "Property management"],
  },
  {
    icon: TrendingUp,
    title: "Investment Advisory",
    items: ["Market analysis", "Portfolio strategy", "Golden Visa guidance", "Rental yield optimization", "Asset management"],
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="section-padding bg-card">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">Exclusive Services</p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground">
            Everything You Need, Curated
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group"
            >
              <cat.icon className="w-6 h-6 text-primary mb-5" strokeWidth={1.5} />
              <h3 className="font-display text-xl font-light text-foreground mb-4">{cat.title}</h3>
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
