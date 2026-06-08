// frontend/src/config/sectionPages.ts
//
// Curated region × type landing pages. This is the SINGLE SOURCE OF TRUTH for
// the frontend and MUST stay in sync with the Python mirror in backend/seo.py
// (SECTION_REGIONS / SECTION_TYPES / CURATED_SECTIONS). The parity test
// frontend/src/test/sectionPages.test.ts fails the build if the slug sets drift.
//
// Region slugs are a CLOSED SET: PropertiesSegment checks this set first to
// decide whether /properties/<seg> is a section page or a property detail page,
// exactly as backend/seo.py does — so server and client always agree.

export interface SectionRegion {
  slug: string;
  region: string; // exact DB `region` value
}

export interface SectionType {
  slug: string;
  propertyTypes: string[]; // DB `property_type` value(s)
  noun: string;
  titlePrefix: string;
}

export const SECTION_REGIONS: SectionRegion[] = [
  { slug: "lisbon", region: "Lisbon" },
  { slug: "algarve", region: "Algarve" },
  { slug: "silver-coast", region: "Silver Coast" },
  { slug: "porto", region: "Porto" },
  { slug: "alentejo", region: "Alentejo" },
];

export const SECTION_TYPES: SectionType[] = [
  { slug: "apartments", propertyTypes: ["apartment"], noun: "apartments", titlePrefix: "Luxury apartments in" },
  { slug: "villas", propertyTypes: ["villa"], noun: "villas", titlePrefix: "Villas in" },
  { slug: "penthouses", propertyTypes: ["penthouse"], noun: "penthouses", titlePrefix: "Penthouses in" },
  { slug: "townhouses", propertyTypes: ["townhouse"], noun: "townhouses", titlePrefix: "Townhouses in" },
  {
    slug: "new-developments",
    propertyTypes: ["project_apartment", "project_villa"],
    noun: "new developments",
    titlePrefix: "New developments in",
  },
];

// Curated combos advertised in the footer (routing itself is permissive).
export const CURATED_SECTIONS: { regionSlug: string; typeSlug: string | null }[] = [
  { regionSlug: "lisbon", typeSlug: null },
  { regionSlug: "algarve", typeSlug: null },
  { regionSlug: "silver-coast", typeSlug: null },
  { regionSlug: "porto", typeSlug: null },
  { regionSlug: "alentejo", typeSlug: null },
  { regionSlug: "lisbon", typeSlug: "apartments" },
  { regionSlug: "lisbon", typeSlug: "penthouses" },
  { regionSlug: "algarve", typeSlug: "villas" },
  { regionSlug: "algarve", typeSlug: "apartments" },
  { regionSlug: "silver-coast", typeSlug: "apartments" },
  { regionSlug: "silver-coast", typeSlug: "new-developments" },
  { regionSlug: "porto", typeSlug: "apartments" },
  { regionSlug: "alentejo", typeSlug: "villas" },
];

const REGION_BY_SLUG = new Map(SECTION_REGIONS.map((r) => [r.slug, r]));
const TYPE_BY_SLUG = new Map(SECTION_TYPES.map((t) => [t.slug, t]));

export function isRegionSlug(slug?: string): boolean {
  return !!slug && REGION_BY_SLUG.has(slug);
}

export function getRegion(slug?: string): SectionRegion | undefined {
  return slug ? REGION_BY_SLUG.get(slug) : undefined;
}

export function getType(slug?: string): SectionType | undefined {
  return slug ? TYPE_BY_SLUG.get(slug) : undefined;
}

export interface ResolvedSection {
  region: string;
  regionSlug: string;
  typeSlug: string | null;
  propertyTypes: string[] | null;
  h1: string;
  title: string;
  intro: string;
}

/** Resolve a region/type slug pair into display copy + query filters. */
export function resolveSection(
  regionSlug: string,
  typeSlug?: string,
): ResolvedSection | null {
  const region = REGION_BY_SLUG.get(regionSlug);
  if (!region) return null;

  const type = typeSlug ? TYPE_BY_SLUG.get(typeSlug) : undefined;
  const h1 = type
    ? `${type.titlePrefix} ${region.region}`
    : `Luxury properties in ${region.region}, Portugal`;
  const noun = type ? type.noun : "properties";

  return {
    region: region.region,
    regionSlug,
    typeSlug: type ? type.slug : null,
    propertyTypes: type ? type.propertyTypes : null,
    h1,
    title: `${h1} — LUME by Mark`,
    intro: `Discover ${noun} in ${region.region}, Portugal — a curated selection of luxury homes by LUME by Mark.`,
  };
}
