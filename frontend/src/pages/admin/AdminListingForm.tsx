// frontend/src/pages/admin/AdminListingForm.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListing, createListing, updateListing, translateListingField, translateText,
  type ListingTranslatableField,
} from "@/lib/admin-api";
import { getToken } from "@/lib/admin-api";
import { useUnsavedChanges } from "./UnsavedChangesContext";
import AdminListingAIImport from "./AdminListingAIImport";

// ─── Locale config ────────────────────────────────────────────────────────────

type I18nLocale = "en" | "pt_pt" | "ru" | "es";

const LOCALE_TABS: { code: I18nLocale; short: string; name: string }[] = [
  { code: "en",    short: "EN", name: "English" },
  { code: "pt_pt", short: "PT", name: "Portuguese" },
  { code: "ru",    short: "RU", name: "Русский" },
  { code: "es",    short: "ES", name: "Español" },
];

// ─── Enum options (must match Supabase enums) ─────────────────────────────────

const PROPERTY_TYPES = ["apartment","penthouse","villa","townhouse","estate","farmhouse","quinta","land","new_development_unit"];
const LISTING_TYPES  = ["sale", "rent", "seasonal_rent"];
const STATUS_OPTIONS = ["draft", "available", "reserved", "sold", "rented", "off_market"];
const INTERNAL_STATUS = ["draft", "ready_for_review", "live", "on_hold", "off_market"];
const CONDITIONS      = ["new", "excellent", "renovated", "good", "to_refurbish"];
const PRIORITIES      = ["low", "medium", "high"];
const VISIBILITY      = ["exact", "approximate", "hidden"];
const VIEW_TYPES      = ["sea","ocean","river","golf","city","countryside","mountain","garden","marina","panoramic"];
const NEARBY_OPTIONS = [
  ["beach","Beach"],["airport","Airport"],["golf_course","Golf Course"],
  ["marina","Marina"],["yacht_club","Yacht Club"],["tennis_court","Tennis Court"],
  ["equestrian","Equestrian Centre"],["fine_dining","Fine Dining"],
  ["wine_region","Wine Region"],["spa_wellness","Spa & Wellness"],
  ["international_school","International School"],["private_hospital","Private Hospital"],
  ["historic_center","Historic Centre"],["cultural_district","Cultural District"],
  ["river_waterfront","River / Waterfront"],["park_nature","Park & Nature Reserve"],
  ["surf_spot","Surf Spot"],["cycling_paths","Cycling Paths"],
  ["peace_quiet","Peace & Quiet"],["public_transport","Public Transport"],
  ["coworking_space","Coworking Space"],["ski_resort","Ski Resort"],
];

const NEEDS_FLOOR = ["apartment", "penthouse"];
const NEEDS_PLOT  = ["villa", "estate", "farmhouse", "quinta", "land"];

const SECTIONS = [
  { id: "ai_import", label: "✦ AI Import" }, 
  { id: "basics",   label: "Basics" },
  { id: "location", label: "Location" },
  { id: "specs",    label: "Specs" },
  { id: "features", label: "Features" },
  { id: "content",  label: "Content" },
  { id: "media",    label: "Media" },
  { id: "agent",    label: "Agent" },
  { id: "internal", label: "Internal" },
];

// ─── Empty form including i18n JSONB fields ───────────────────────────────────

function emptyForm() {
  return {
    reference: "", title: "",
    // i18n JSONB columns — populated from DB on edit, saved back on update
    title_i18n:             { pt_pt: "", ru: "", es: "" } as Record<string, string>,
    short_description_i18n: { pt_pt: "", ru: "", es: "" } as Record<string, string>,
    full_description_i18n:  { pt_pt: "", ru: "", es: "" } as Record<string, string>,
    ai_summary_i18n:        { pt_pt: "", ru: "", es: "" } as Record<string, string>,
    // ─────────────────────────────────────────────────────────────────────
    property_type: "apartment", listing_type: "sale", status: "draft",
    price: "", currency: "EUR", featured: false,
    country: "Portugal", region: "", city: "", area: "", development_name: "",
    address_visibility: "approximate", latitude: "", longitude: "",
    bedrooms: "", bathrooms: "", interior_living_area: "", plot_size: "",
    build_year: "", renovation_year: "", condition: "", energy_rating: "",
    views: [] as string[],
    nearby: [] as string[],
    floors: "", floor_number: "", living_rooms: "", suites: "", guest_wc: "",
    office: false, storage_room: false,
    garage: false, parking_spaces: "", elevator: false,
    covered_parking: false, underground_parking: false, ev_charging: false, new_development: false,
    terrace: false, balcony: false, garden: false, private_garden: false,
    roof_terrace: false, patio: false, pool: false, heated_pool: false,
    outdoor_kitchen: false, bbq_area: false,
    air_conditioning: false, heating: false, underfloor_heating: false, fireplace: false,
    equipped_kitchen: false, laundry_room: false, walk_in_wardrobe: false,
    smart_home: false, alarm_system: false, security: false, concierge: false, furnished: false,
    short_description: "", full_description: "", ai_summary: "",
    lifestyle_tags: "", key_selling_points: "",
    cover_image: "", gallery: "", video_url: "", virtual_tour_url: "",
    agent_name: "", agent_phone: "", agent_email: "", agent_whatsapp: "",
    company: "LUME by Mark", listing_agent: "Mark",
    internal_status: "draft", source: "", priority: "medium",
    confidential: false, internal_notes: "",
  };
}

export default function AdminListingForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const formRef = useRef(form);
  formRef.current = form;  // updates every render — never stale
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("basics");
  const [formDirty, setFormDirty] = useState(false);

  const { setDirty, registerSaveHandler, unregisterSaveHandler } = useUnsavedChanges();

  // ── Fetch existing listing (edit mode) ────────────────────────────────────
  const { data: existing } = useQuery({
    queryKey: ["admin-listing", id],
    queryFn: () => getListing(id!),
    enabled: isEdit,
  });

  // ── Fetch regions from Supabase for the dropdown ──────────────────────────
  const { data: regionsData } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/regions", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to load regions");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const regionOptions = ["", ...(regionsData?.regions?.map((r: any) => r.name) ?? [])];
  const selectedRegionTags: string[] =
    regionsData?.regions?.find((r: any) => r.name === form.region)?.lifestyle_tags ?? [];

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (!existing) return;
    const f = emptyForm();
    Object.keys(f).forEach((key) => {
      const val = (existing as any)[key];
      if (val === null || val === undefined) return;
      if (key === "views" || key === "nearby")
        (f as any)[key] = Array.isArray(val) ? val : [];
      else if (["lifestyle_tags", "key_selling_points", "gallery"].includes(key))
        (f as any)[key] = Array.isArray(val) ? val.join(", ") : val;
      else
        (f as any)[key] = val; // handles _i18n JSONB objects directly
    });
    setForm(f);
    setFormDirty(false); // reset — this was a DB load, not a user edit
  }, [existing]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (k: string, v: any) => {
  setForm((prev) => ({ ...prev, [k]: v }));
  setFormDirty(true);
  };

  const fillFromAI = (data: Record<string, unknown>) => {
    const empty = emptyForm() as Record<string, unknown>;
    setForm((prev) => {
      const next = { ...prev };
      Object.keys(empty).forEach((key) => {
        const val = data[key];
        if (val === null || val === undefined) return;
        if (["lifestyle_tags", "key_selling_points", "gallery"].includes(key) && Array.isArray(val)) {
          (next as any)[key] = (val as string[]).join(", ");
        } else if (key === "views" || key === "nearby") {
          (next as any)[key] = Array.isArray(val) ? val : [];
        } else {
          (next as any)[key] = val;
        }
      });
      return next;
    });
    setFormDirty(true);
    setActiveSection("basics");
  };
  
  const toggleView = (v: string) =>
    set("views", form.views.includes(v) ? form.views.filter((x) => x !== v) : [...form.views, v]);
  const toggleNearby = (v: string) =>
    set("nearby", form.nearby.includes(v)
      ? form.nearby.filter((x: string) => x !== v) : [...form.nearby, v]);

  const needsFloor = NEEDS_FLOOR.includes(form.property_type);
  const needsPlot  = NEEDS_PLOT.includes(form.property_type);

  // ── Build payload (extracted so it can be called from modal save handler) ──
  const buildPayload = useCallback((): Record<string, unknown> => {
    const form = formRef.current;          // ← always the latest state
    const payload: Record<string, unknown> = {};

    // Strings
    [
      "reference","title","property_type","listing_type","status","currency","country",
      "region","city","area","development_name","address_visibility","condition","energy_rating",
      "short_description","full_description","ai_summary","cover_image","video_url",
      "virtual_tour_url","agent_name","agent_phone","agent_email","agent_whatsapp",
      "company","listing_agent","internal_status","source","priority","internal_notes",
    ].forEach((k) => {
      const v = (form as any)[k];
      if (v !== "" && v !== undefined && v !== null) payload[k] = v;
    });

    // i18n JSONB fields — always include so translations are never lost
    ["title_i18n", "short_description_i18n", "full_description_i18n", "ai_summary_i18n"].forEach((k) => {
      const v = (form as any)[k];
      if (v && typeof v === "object") payload[k] = v;
    });

    // Numbers
    [
      "price","latitude","longitude","bedrooms","bathrooms","interior_living_area","plot_size",
      "build_year","renovation_year","floors","floor_number","living_rooms","suites","guest_wc","parking_spaces",
    ].forEach((k) => {
      const v = (form as any)[k];
      if (v === "" || v === null || v === undefined) return;
      payload[k] = Number(v);
    });

    // Booleans
    [
      "featured","office","storage_room","garage","elevator","covered_parking","underground_parking",
      "ev_charging","new_development","terrace","balcony","garden","private_garden","roof_terrace","patio",
      "pool","heated_pool","outdoor_kitchen","bbq_area","air_conditioning","heating","underfloor_heating",
      "fireplace","equipped_kitchen","laundry_room","walk_in_wardrobe","smart_home","alarm_system","security",
      "concierge","furnished","confidential",
    ].forEach((k) => { payload[k] = !!(form as any)[k]; });

    // Arrays
    payload.views = form.views;
    payload.nearby = form.nearby;
    payload.lifestyle_tags = form.lifestyle_tags
      ? form.lifestyle_tags.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    payload.key_selling_points = form.key_selling_points
      ? form.key_selling_points.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    payload.gallery = form.gallery
      ? form.gallery.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    return payload;
  }, []); // ref handles freshness — no dep needed

  // ── Save mutation ─────────────────────────────────────────────────────────
  // onSuccess does NOT navigate — callers handle navigation explicitly so we
  // can reuse mutateAsync from the modal without double-navigating.
  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit ? updateListing(id!, payload) : createListing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      setFormDirty(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  // Save button handler — saves then navigates to listings
  const handleSave = () => {
    setError("");
    saveMutation.mutate(buildPayload(), {
      onSuccess: () => navigate("/admin/listings"),
    });
  };

  // ── Register dirty state + save handler with global context ───────────────
  useEffect(() => {
    setDirty("listing-form", formDirty);
  }, [formDirty]); // eslint-disable-line

  useEffect(() => {
    // Modal's "Save & Leave" calls this — saves without navigating (modal does blocker.proceed)
    registerSaveHandler("listing-form", async () => {
      await saveMutation.mutateAsync(buildPayload());
    });
    return () => unregisterSaveHandler("listing-form");
  }, [buildPayload]); // eslint-disable-line



  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-admin-text">
            {isEdit ? "Edit Listing" : "New Listing"}
          </h1>
          {isEdit && (
            <p className="text-xs text-admin-text-muted mt-0.5">ID: {id}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/listings")}
            className="rounded-md border border-admin-border px-4 py-2 text-sm text-admin-text-secondary transition hover:bg-admin-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-md bg-admin-btn px-6 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : isEdit ? "Update Listing" : "Create Listing"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Section tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-admin-border pb-px">
        {SECTIONS.filter(s => !isEdit || s.id !== "ai_import").map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`whitespace-nowrap rounded-t px-3 py-2 text-xs font-medium transition ${
              activeSection === s.id
                ? "border border-admin-border border-b-admin-bg -mb-px bg-admin-surface text-admin-text"
                : "text-admin-text-muted hover:text-admin-text-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ AI IMPORT ═══ */}
      {activeSection === "ai_import" && !isEdit && (
        <AdminListingAIImport onFill={fillFromAI} />
      )}
      
      {/* ═══ BASICS ═══ */}
      {activeSection === "basics" && (
        <Section>
          <Row>
            <Field label="Reference *" width="w-1/3">
              <Input value={form.reference} onChange={v => set("reference", v)} placeholder="LM-001" />
            </Field>
            {/* Title — multilingual */}
            <div className="w-2/3">
              <LocalizedField
                label="Title *"
                fieldName="title"
                form={form}
                set={set}
                setForm={setForm}
                listingId={id}
                required
                placeholder="Riverfront Penthouse with Panoramic Views"
              />
            </div>
          </Row>
          <Row>
            <Field label="Property Type *" width="w-1/3">
              <Select value={form.property_type} onChange={v => set("property_type", v)} options={PROPERTY_TYPES} />
            </Field>
            <Field label="Listing Type *" width="w-1/3">
              <Select value={form.listing_type} onChange={v => set("listing_type", v)} options={LISTING_TYPES} />
            </Field>
            <Field label="Status" width="w-1/3">
              <Select value={form.status} onChange={v => set("status", v)} options={STATUS_OPTIONS} />
            </Field>
          </Row>
          <Row>
            <Field label="Price *" width="w-1/3">
              <Input type="number" value={form.price} onChange={v => set("price", v)} placeholder="2850000" />
            </Field>
            <Field label="Currency" width="w-1/6">
              <Input value={form.currency} onChange={v => set("currency", v)} placeholder="EUR" />
            </Field>
            <Field label="" width="w-1/2">
              <Checkbox label="Featured listing" checked={form.featured} onChange={v => set("featured", v)} />
            </Field>
          </Row>
        </Section>
      )}

      {/* ═══ LOCATION ═══ */}
      {activeSection === "location" && (
        <Section>
          <Row>
            <Field label="Country" width="w-1/4">
              <Input value={form.country} onChange={v => set("country", v)} />
            </Field>
            <Field label="Region *" width="w-1/4">
              <Select value={form.region} onChange={v => set("region", v)} options={regionOptions} />
              {selectedRegionTags.length > 0 && (
                <p className="mt-1 text-xs text-admin-text-muted">
                  Lifestyle: {selectedRegionTags.join(", ")}
                </p>
              )}
              {regionOptions.length <= 1 && (
                <input
                  type="text"
                  value={form.region}
                  onChange={e => set("region", e.target.value)}
                  placeholder="Loading regions…"
                  className="mt-1 w-full rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none"
                />
              )}
            </Field>
            <Field label="City *" width="w-1/4">
              <Input value={form.city} onChange={v => set("city", v)} placeholder="Lisbon" />
            </Field>
            <Field label="Area / Neighbourhood *" width="w-1/4">
              <Input value={form.area} onChange={v => set("area", v)} placeholder="Santos" />
            </Field>
          </Row>
          <Row>
            <Field label="Development Name" width="w-1/3">
              <Input value={form.development_name} onChange={v => set("development_name", v)} />
            </Field>
            <Field label="Address Visibility" width="w-1/3">
              <Select value={form.address_visibility} onChange={v => set("address_visibility", v)} options={VISIBILITY} />
            </Field>
          </Row>
          <Row>
            <Field label="Latitude" width="w-1/3">
              <Input type="number" value={form.latitude} onChange={v => set("latitude", v)} placeholder="38.7069" />
            </Field>
            <Field label="Longitude" width="w-1/3">
              <Input type="number" value={form.longitude} onChange={v => set("longitude", v)} placeholder="-9.1565" />
            </Field>
          </Row>
        </Section>
      )}

      {/* ═══ SPECS ═══ */}
      {activeSection === "specs" && (
        <Section>
          <Row>
            <Field label="Bedrooms *" width="w-1/4">
              <Input type="number" value={form.bedrooms} onChange={v => set("bedrooms", v)} placeholder="4" />
            </Field>
            <Field label="Bathrooms *" width="w-1/4">
              <Input type="number" value={form.bathrooms} onChange={v => set("bathrooms", v)} placeholder="3" />
            </Field>
            <Field label="Living Area (m²) *" width="w-1/4">
              <Input type="number" value={form.interior_living_area} onChange={v => set("interior_living_area", v)} placeholder="280" />
            </Field>
            {needsPlot && (
              <Field label="Plot Size (m²) *" width="w-1/4">
                <Input type="number" value={form.plot_size} onChange={v => set("plot_size", v)} placeholder="500" />
              </Field>
            )}
          </Row>
          <Row>
            {needsFloor && (
              <Field label="Floor Number *" width="w-1/4">
                <Input type="number" value={form.floor_number} onChange={v => set("floor_number", v)} placeholder="6" />
              </Field>
            )}
            <Field label="Total Floors" width="w-1/4">
              <Input type="number" value={form.floors} onChange={v => set("floors", v)} />
            </Field>
            <Field label="Gross Built Area (m²)" width="w-1/4">
              <Input type="number" value={(form as any).gross_built_area ?? ""} onChange={v => set("gross_built_area", v)} />
            </Field>
          </Row>
          <Row>
            <Field label="Build Year" width="w-1/4">
              <Input type="number" value={form.build_year} onChange={v => set("build_year", v)} placeholder="2018" />
            </Field>
            <Field label="Renovation Year" width="w-1/4">
              <Input type="number" value={form.renovation_year} onChange={v => set("renovation_year", v)} />
            </Field>
            <Field label="Condition" width="w-1/4">
              <Select value={form.condition} onChange={v => set("condition", v)} options={["", ...CONDITIONS]} />
            </Field>
            <Field label="Energy Rating" width="w-1/4">
              <Input value={form.energy_rating} onChange={v => set("energy_rating", v)} placeholder="A" />
            </Field>
          </Row>
          <Row>
            <Field label="Living Rooms" width="w-1/4">
              <Input type="number" value={form.living_rooms} onChange={v => set("living_rooms", v)} />
            </Field>
            <Field label="Suites" width="w-1/4">
              <Input type="number" value={form.suites} onChange={v => set("suites", v)} />
            </Field>
            <Field label="Guest WC" width="w-1/4">
              <Input type="number" value={form.guest_wc} onChange={v => set("guest_wc", v)} />
            </Field>
          </Row>

          {/* Views multi-select */}
          <div className="mt-4">
            <label className="mb-2 block text-xs text-admin-text-muted">Views</label>
            <div className="flex flex-wrap gap-2">
              {VIEW_TYPES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleView(v)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    form.views.includes(v)
                      ? "border-admin-accent bg-admin-accent-soft text-admin-accent"
                      : "border-admin-border text-admin-text-muted hover:border-admin-text-muted"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {needsFloor && !form.floor_number && (
            <Warning>Floor number is required for {form.property_type}.</Warning>
          )}
          {needsPlot && !form.plot_size && (
            <Warning>Plot size is required for {form.property_type}.</Warning>
          )}
        </Section>
      )}

      {/* ═══ FEATURES ═══ */}
      {activeSection === "features" && (
        <Section>
          <FeatureGroup title="Parking & Access" items={[
            ["garage","Garage"],["elevator","Elevator"],["covered_parking","Covered Parking"],
            ["underground_parking","Underground Parking"],["ev_charging","EV Charging"],["new_development","New Development"],
          ]} form={form} set={set} />
          <FeatureGroup title="Outdoor" items={[
            ["terrace","Terrace"],["balcony","Balcony"],["garden","Garden"],["private_garden","Private Garden"],
            ["roof_terrace","Roof Terrace"],["patio","Patio"],["pool","Pool"],["heated_pool","Heated Pool"],
            ["outdoor_kitchen","Outdoor Kitchen"],["bbq_area","BBQ Area"],
          ]} form={form} set={set} />
          <FeatureGroup title="Indoor" items={[
            ["air_conditioning","Air Conditioning"],["heating","Heating"],["underfloor_heating","Underfloor Heating"],
            ["fireplace","Fireplace"],["equipped_kitchen","Equipped Kitchen"],["laundry_room","Laundry Room"],
            ["walk_in_wardrobe","Walk-in Wardrobe"],["smart_home","Smart Home"],["alarm_system","Alarm System"],
            ["security","Security"],["concierge","Concierge"],["furnished","Furnished"],
            ["office","Office"],["storage_room","Storage Room"],
          ]} form={form} set={set} />

          {/* Close To / Nearby */}
          <h3 className="mb-3 text-xs uppercase tracking-wider text-admin-text-muted">Close To</h3>
          <div className="mb-6 flex flex-wrap gap-2">
            {NEARBY_OPTIONS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleNearby(key)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  form.nearby.includes(key)
                    ? "border-admin-accent bg-admin-accent-soft text-admin-accent"
                    : "border-admin-border text-admin-text-muted hover:border-admin-text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ CONTENT — multilingual ═══ */}
      {activeSection === "content" && (
        <Section>
          <p className="text-xs text-admin-text-muted mb-4">
            Use the language tabs to enter or review content in each locale.
            {" Click ↺ Translate on the active tab to fill the other languages via DeepL."}
          </p>

          <LocalizedField
            label="Short Description *"
            fieldName="short_description"
            form={form}
            set={set}
            setForm={setForm}
            listingId={id}
            required
            rows={3}
            placeholder="1–2 sentences for property cards…"
          />

          <LocalizedField
            label="Full Description"
            fieldName="full_description"
            form={form}
            set={set}
            setForm={setForm}
            listingId={id}
            rows={10}
            placeholder="Detailed property description…"
          />

          <LocalizedField
            label="AI Summary"
            fieldName="ai_summary"
            form={form}
            set={set}
            setForm={setForm}
            listingId={id}
            rows={3}
            placeholder="Auto-generated summary…"
          />

          {/* These two are not translatable (structured data / EN-only) */}
          <Field label="Key Selling Points (comma-separated)">
            <Textarea value={form.key_selling_points} onChange={v => set("key_selling_points", v)} rows={2} placeholder="Panoramic views, Private terrace, Gaggenau kitchen" />
          </Field>
          <Field label="Lifestyle Tags (comma-separated)">
            <Input value={form.lifestyle_tags} onChange={v => set("lifestyle_tags", v)} placeholder="river-view, contemporary, turnkey" />
          </Field>
        </Section>
      )}

      {/* ═══ MEDIA ═══ */}
      {activeSection === "media" && (
        <Section>
          <Field label="Cover Image URL *">
            <Input value={form.cover_image} onChange={v => set("cover_image", v)} placeholder="https://..." />
          </Field>
          {form.cover_image && (
            <div className="mb-4">
              <img src={form.cover_image} alt="Cover preview" className="h-40 rounded-md object-cover border border-admin-border" />
            </div>
          )}
          <Field label="Gallery URLs (comma-separated)">
            <Textarea value={form.gallery} onChange={v => set("gallery", v)} rows={3} placeholder="https://img1.jpg, https://img2.jpg" />
          </Field>
          <Row>
            <Field label="Video URL" width="w-1/2">
              <Input value={form.video_url} onChange={v => set("video_url", v)} placeholder="https://youtube.com/..." />
            </Field>
            <Field label="Virtual Tour URL" width="w-1/2">
              <Input value={form.virtual_tour_url} onChange={v => set("virtual_tour_url", v)} placeholder="https://..." />
            </Field>
          </Row>
        </Section>
      )}

      {/* ═══ AGENT ═══ */}
      {activeSection === "agent" && (
        <Section>
          <Row>
            <Field label="Company *" width="w-1/2">
              <Input value={form.company} onChange={v => set("company", v)} />
            </Field>
            <Field label="Listing Agent *" width="w-1/2">
              <Input value={form.listing_agent} onChange={v => set("listing_agent", v)} />
            </Field>
          </Row>
          <Row>
            <Field label="Agent Name" width="w-1/2">
              <Input value={form.agent_name} onChange={v => set("agent_name", v)} />
            </Field>
            <Field label="Agent Email" width="w-1/2">
              <Input value={form.agent_email} onChange={v => set("agent_email", v)} />
            </Field>
          </Row>
          <Row>
            <Field label="Agent Phone" width="w-1/2">
              <Input value={form.agent_phone} onChange={v => set("agent_phone", v)} />
            </Field>
            <Field label="Agent WhatsApp" width="w-1/2">
              <Input value={form.agent_whatsapp} onChange={v => set("agent_whatsapp", v)} />
            </Field>
          </Row>
        </Section>
      )}

      {/* ═══ INTERNAL ═══ */}
      {activeSection === "internal" && (
        <Section>
          <Row>
            <Field label="Internal Status" width="w-1/3">
              <Select value={form.internal_status} onChange={v => set("internal_status", v)} options={INTERNAL_STATUS} />
            </Field>
            <Field label="Priority" width="w-1/3">
              <Select value={form.priority} onChange={v => set("priority", v)} options={PRIORITIES} />
            </Field>
            <Field label="Source" width="w-1/3">
              <Input value={form.source} onChange={v => set("source", v)} placeholder="Partner referral, Owner, etc." />
            </Field>
          </Row>
          <Row>
            <Field label="" width="w-full">
              <Checkbox label="Confidential listing" checked={form.confidential} onChange={v => set("confidential", v)} />
            </Field>
          </Row>
          <Field label="Internal Notes">
            <Textarea value={form.internal_notes} onChange={v => set("internal_notes", v)} rows={4} placeholder="Internal notes, not visible on the site…" />
          </Field>
        </Section>
      )}

      {/* Bottom save bar */}
      <div className="mt-8 flex justify-end gap-3 border-t border-admin-border pt-6">
        <button
          onClick={() => navigate("/admin/listings")}
          className="rounded-md border border-admin-border px-4 py-2 text-sm text-admin-text-secondary transition hover:bg-admin-surface-hover"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="rounded-md bg-admin-btn px-6 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving..." : isEdit ? "Update Listing" : "Create Listing"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LocalizedField — language-tab input with DeepL translate button
───────────────────────────────────────────────────────────────────────── */

interface LocalizedFieldProps {
  label: string;
  fieldName: string;
  form: Record<string, any>;
  set: (k: string, v: any) => void;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  listingId?: string;     // undefined → new listing (translate disabled)
  rows?: number;          // provided → textarea; omitted → text input
  placeholder?: string;
  required?: boolean;
  width?: string;
}

function LocalizedField({
  label, fieldName, form, set, setForm, listingId, rows, placeholder, required, width,
}: LocalizedFieldProps) {
  const [locale, setLocale] = useState<I18nLocale>("en");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  const i18nKey = `${fieldName}_i18n`;

  const value =
    locale === "en"
      ? String(form[fieldName] ?? "")
      : String((form[i18nKey] as Record<string, string> | undefined)?.[locale] ?? "");

  const hasContent = (loc: I18nLocale) => {
    if (loc === "en") return Boolean(String(form[fieldName] ?? "").trim());
    return Boolean(
      String((form[i18nKey] as Record<string, string> | undefined)?.[loc] ?? "").trim()
    );
  };

  const onChange = (v: string) => {
    if (locale === "en") {
      set(fieldName, v);
    } else {
      set(i18nKey, { ...(form[i18nKey] as Record<string, string> || {}), [locale]: v });
    }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    setTranslateError("");
    try {
      if (listingId) {
        // Existing listing: backend reads source from DB and persists results.
        const updated = await translateListingField(listingId, {
          field: fieldName as ListingTranslatableField,
          source_locale: locale,
          overwrite: false,
        });
        setForm((prev: any) => ({
          ...prev,
          [fieldName]: (updated as any)[fieldName] ?? prev[fieldName],
          [i18nKey]:   (updated as any)[i18nKey]   ?? prev[i18nKey],
        }));
      } else {
        // New listing: translate text in-memory, fill empty locales only.
        const translations = await translateText(value, locale);
        const currentI18n: Record<string, string> = { ...(form[i18nKey] || {}) };
        let nextEn = String(form[fieldName] ?? "");
        for (const [target, text] of Object.entries(translations)) {
          if (target === "en") {
            if (!nextEn.trim()) nextEn = text;
          } else if (!String(currentI18n[target] ?? "").trim()) {
            currentI18n[target] = text;
          }
        }
        if (nextEn !== form[fieldName]) set(fieldName, nextEn);
        set(i18nKey, currentI18n);
      }
    } catch (e: any) {
      setTranslateError(e.message || "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const canTranslate = value.trim().length > 0;

  return (
    <div className={`mb-4 ${width ?? "w-full"}`}>
      {/* Header row: label left, tabs + translate button right */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
        <label className="text-xs text-admin-text-muted">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </label>

        <div className="flex items-center gap-1">
          {LOCALE_TABS.map(({ code, short, name }) => (
            <button
              key={code}
              type="button"
              title={name}
              onClick={() => setLocale(code)}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                locale === code
                  ? "bg-admin-accent text-white"
                  : "text-admin-text-muted hover:text-admin-text"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  hasContent(code) ? "bg-green-400" : "bg-admin-border"
                }`}
              />
              {short}
            </button>
          ))}

          <button
            type="button"
            onClick={handleTranslate}
            disabled={!canTranslate || translating}
            title={
              canTranslate
                ? `Translate from ${LOCALE_TABS.find(t => t.code === locale)?.name} to all other languages via DeepL`
                : "Enter text in this locale first"
            }
            className="ml-1.5 rounded border border-admin-accent/50 px-2 py-0.5 text-[11px] text-admin-accent transition hover:bg-admin-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {translating ? "Translating…" : "↺ Translate"}
          </button>
        </div>
      </div>

      {/* Text input or textarea depending on rows prop */}
      {rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={
            locale !== "en" && placeholder
              ? `${placeholder} (${LOCALE_TABS.find(t => t.code === locale)?.name})`
              : placeholder
          }
          className="w-full resize-y rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={
            locale !== "en" && placeholder
              ? `${placeholder} (${LOCALE_TABS.find(t => t.code === locale)?.name})`
              : placeholder
          }
          className="w-full rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
        />
      )}

      {translateError && (
        <p className="mt-1 text-xs text-red-500">{translateError}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Reusable form primitives (unchanged)
───────────────────────────────────────────────────────────────────────── */

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-4">{children}</div>;
}

function Field({ label, width, children }: { label: string; width?: string; children: React.ReactNode }) {
  return (
    <div className={`mb-2 ${width || "w-full"}`}>
      {label && <label className="mb-1.5 block text-xs text-admin-text-muted">{label}</label>}
      {children}
    </div>
  );
}

function Input({
  value, onChange, type = "text", placeholder,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
    />
  );
}

function Textarea({
  value, onChange, rows = 3, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
    />
  );
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text-secondary outline-none transition focus:border-admin-text-muted"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>
          {opt ? opt.replace(/_/g, " ") : "— select —"}
        </option>
      ))}
    </select>
  );
}

function Checkbox({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-admin-text-secondary transition hover:text-admin-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="rounded border-admin-border bg-admin-surface text-admin-accent focus:ring-0 focus:ring-offset-0"
      />
      {label}
    </label>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      ⚠ {children}
    </div>
  );
}

function FeatureGroup({
  title, items, form, set,
}: {
  title: string;
  items: string[][];
  form: any;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <h3 className="mb-3 text-xs uppercase tracking-wider text-admin-text-muted">{title}</h3>
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-3">
        {items.map(([key, label]) => (
          <Checkbox key={key} label={label} checked={form[key]} onChange={v => set(key, v)} />
        ))}
      </div>
    </>
  );
}