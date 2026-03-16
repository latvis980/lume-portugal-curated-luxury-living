import { motion } from "framer-motion";
import clubCardImg from "@/assets/club-card.jpg";

const conciergeServices = [
  "Private airport transfers",
  "Restaurant reservations at top tables",
  "Yacht & sailing charters",
  "Wine estate private tours",
  "Golf club memberships",
  "Personal shopping & styling",
  "Private chef arrangements",
  "Event planning & access",
  "Wellness & spa bookings",
  "Cultural tours & experiences",
];

const ConciergeSection = () => {
  return (
    <section className="section-padding bg-card">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">Lume Concierge</p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground">
            The Club Card
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <img
              src={clubCardImg}
              alt="Lume Membership Card"
              className="w-full max-w-lg mx-auto"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              The Lume Club Card grants you access to our full concierge network — 
              a curated collection of Portugal's finest experiences, reserved exclusively for our members.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {conciergeServices.map((service, i) => (
                <motion.div
                  key={service}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full shrink-0" />
                  <span className="text-sm text-foreground">{service}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ConciergeSection;
