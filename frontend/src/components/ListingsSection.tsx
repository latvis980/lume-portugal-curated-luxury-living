import { motion } from "framer-motion";
import listing1 from "@/assets/listing-1.jpg";
import listing2 from "@/assets/listing-2.jpg";
import listing3 from "@/assets/listing-3.jpg";

const listings = [
  {
    image: listing1,
    title: "Riverfront Penthouse",
    location: "Lisbon, Santos",
    price: "€2,850,000",
    specs: "4 Bed · 3 Bath · 280m²",
    tag: "River View",
  },
  {
    image: listing2,
    title: "Traditional Villa with Pool",
    location: "Cascais, Birre",
    price: "€1,950,000",
    specs: "5 Bed · 4 Bath · 420m²",
    tag: "Garden",
  },
  {
    image: listing3,
    title: "Douro Terrace Apartment",
    location: "Porto, Foz do Douro",
    price: "€1,200,000",
    specs: "3 Bed · 2 Bath · 190m²",
    tag: "Panoramic View",
  },
];

const ListingsSection = () => {
  return (
    <section id="listings" className="section-padding bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">Curated For You</p>
          <h2 className="font-display text-3xl md:text-5xl font-light text-foreground">
            Your Matched Properties
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {listings.map((listing, i) => (
            <motion.div
              key={listing.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden mb-5 aspect-[4/5]">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-background/90 text-foreground text-[10px] tracking-[0.2em] uppercase">
                    {listing.tag}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="font-display text-xl font-light text-foreground mb-1">
                  {listing.title}
                </h3>
                <p className="text-xs tracking-wider text-muted-foreground mb-3">{listing.location}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-primary">{listing.price}</span>
                  <span className="text-[11px] tracking-wider text-muted-foreground">{listing.specs}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ListingsSection;
