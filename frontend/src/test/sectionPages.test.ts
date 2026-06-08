import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  SECTION_REGIONS,
  SECTION_TYPES,
  resolveSection,
} from "@/config/sectionPages";

// The frontend config (sectionPages.ts) and the backend mirror (backend/seo.py)
// MUST agree on the region- and type-slug sets, because both layers use that
// closed set to disambiguate /properties/<seg> (section page vs property
// detail). If they drift, real listings get shadowed by section logic (or
// vice versa) and server/client renders diverge. This test is the guard.

function readBackendSeo(): string {
  const candidates = [
    resolve(process.cwd(), "../backend/seo.py"),
    resolve(process.cwd(), "backend/seo.py"),
    resolve(__dirname, "../../../backend/seo.py"),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("backend/seo.py not found for parity check");
  return readFileSync(found, "utf-8");
}

/** Extract dict keys ("slug":) from a named Python dict block. */
function pyDictKeys(src: string, startMarker: string, endMarker: string): Set<string> {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  const block = src.slice(start, end === -1 ? undefined : end);
  const keys = new Set<string>();
  const re = /"([a-z0-9-]+)"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) keys.add(m[1]);
  return keys;
}

describe("section pages config parity (TS ↔ Python)", () => {
  const seo = readBackendSeo();

  it("region slug sets match", () => {
    const ts = new Set(SECTION_REGIONS.map((r) => r.slug));
    const py = pyDictKeys(seo, "SECTION_REGIONS", "SECTION_TYPES");
    expect([...ts].sort()).toEqual([...py].sort());
  });

  it("type slug sets match", () => {
    const ts = new Set(SECTION_TYPES.map((t) => t.slug));
    const py = pyDictKeys(seo, "SECTION_TYPES", "CURATED_SECTIONS");
    expect([...ts].sort()).toEqual([...py].sort());
  });
});

describe("resolveSection", () => {
  it("builds a bare-region page", () => {
    const s = resolveSection("lisbon");
    expect(s).toMatchObject({ region: "Lisbon", typeSlug: null, propertyTypes: null });
    expect(s?.h1).toBe("Luxury properties in Lisbon, Portugal");
  });

  it("builds a region + type page", () => {
    const s = resolveSection("algarve", "villas");
    expect(s?.h1).toBe("Villas in Algarve");
    expect(s?.propertyTypes).toEqual(["villa"]);
  });

  it("maps new-developments to both project types", () => {
    const s = resolveSection("silver-coast", "new-developments");
    expect(s?.h1).toBe("New developments in Silver Coast");
    expect(s?.propertyTypes).toEqual(["project_apartment", "project_villa"]);
  });

  it("returns null for an unknown region", () => {
    expect(resolveSection("some-real-property-slug")).toBeNull();
  });
});
