import { motion } from "framer-motion";
import investmentImg from "@/assets/investment.jpg";
import { TrendingUp, Home, Building2 } from "lucide-react";

const tracks = [
  {
    icon: TrendingUp,
    title: "Investment Homes",
    description: "Properties selected for rental yield and capital appreciation. Professionally sourced from an active development pipeline, with full asset management from acquisition through exit.",
  },
  {
    icon: Home,
    title: "Second Homes",
    description: "Lifestyle properties for personal use, family retreats, and long-stay escapes across Portugal's most desirable addresses — from Lisbon and Cascais to the Alentejo coast.",
  },
  {
    icon: Building2,
    title: "Strategic Investments",
    description: "Co-investment opportunities in new residential developments across three distinct market segments, targeting short investment cycles and above-market returns through innovative construction methods and sustainability-led design.",
  },
];

const InvestmentSection = () => {
  return (
    <section id="investment" className="relative">
      {/* Full-width image banner */}
      <div className="relative h-[50vh] overflow-hidden">
        <img
          src={investmentImg}
          alt="Lisbon cityscape aerial view"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-charcoal/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-xs tracking-[0.3em] uppercase text-sun-light/80 mb-4">Investment</p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-light text-warm-white">
              Property as a Long-Term
              <br />
              <span className="italic">Investment</span>
            </h2>
          </motion.div>
        </div>
      </div>

      {/* Investment tracks */}
      <div className="section-padding bg-background">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center text-sm text-muted-foreground leading-relaxed mb-16"
        >
          Our investment advisory is delivered in partnership with <strong>Mark Properties</strong> — a Portuguese real estate development platform founded by seasoned executives with decades of experience in premium residential development, strategic consulting, and infrastructure finance. Rooted in Lisbon and backed by established relationships with leading Portuguese banks, architects, and construction partners, <strong>Mark Properties</strong> brings institutional rigour to every opportunity.
        </motion.p>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {tracks.map((track, i) => (
            <motion.div
              key={track.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="text-center"
            >
              <track.icon className="w-8 h-8 text-primary mx-auto mb-5" strokeWidth={1.2} />
              <h3 className="font-display text-xl font-light text-foreground mb-4">
                {track.title}
              </h3>
              <div className="w-8 h-px bg-primary/40 mx-auto mb-5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {track.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InvestmentSection;
