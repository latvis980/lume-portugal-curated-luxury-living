// Single source of truth for the property typology shown across the public
// site and admin form. Enum values mirror the Postgres `property_type` enum
// (see supabase/migrations/20260602000000_property_type_v2.sql).

export const PROPERTY_TYPES = [
  "apartment",
  "penthouse",
  "townhouse",
  "villa",
  "project_apartment",
  "project_villa",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

const FALLBACK_LABELS: Record<string, string> = {
  apartment: "Apartment",
  penthouse: "Penthouse",
  townhouse: "Townhouse",
  villa: "Villa",
  project_apartment: "Project / Apartment",
  project_villa: "Project / Villa",
};

// Admin-form validation: which typologies require floor_number / plot_size.
// Matches the apartment_floor_check / land_plot_required_check constraints.
export const NEEDS_FLOOR: PropertyType[] = ["apartment", "penthouse", "project_apartment"];
export const NEEDS_PLOT:  PropertyType[] = ["villa", "project_villa"];

// Resolve a localized label via the translations table (namespace
// `property_type`). Falls back to the English label, then a title-cased
// rendering of the enum value, so the UI never shows a raw key even if a
// translation row is missing.
export function getPropertyTypeLabel(
  type: string | null | undefined,
  t: (namespace: string, key: string, fallback?: string) => string,
): string {
  if (!type) return "";
  const fallback = FALLBACK_LABELS[type] ?? titleCase(type);
  return t("property_type", type, fallback);
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
