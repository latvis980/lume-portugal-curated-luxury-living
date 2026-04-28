# backend/routes/ai_listing.py
"""
AI-powered listing parser for LUME CMS.

POST /api/admin/ai-parse-listing

Accepts (multipart/form-data):
  - `text`  (str)        — pasted raw listing text
  - `file`  (UploadFile) — a .pdf or .docx file

Returns structured JSON matching the listings table schema.
Does NOT save to the database — the frontend previews and admin confirms.

Dependencies (add to requirements.txt):
    anthropic
    pdfplumber
    python-docx
"""

import io
import json
import os
import re
from typing import Optional

import anthropic
from auth import require_admin
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

router = APIRouter(prefix="/api/admin", tags=["admin-ai"])


# ─────────────────────────────────────────────────────────────────────────────
# File text extraction helpers
# ─────────────────────────────────────────────────────────────────────────────


def _extract_pdf(file_bytes: bytes) -> str:
    import pdfplumber

    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
    return "\n\n".join(parts)


def _extract_docx(file_bytes: bytes) -> str:
    from docx import Document  # python-docx

    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


# ─────────────────────────────────────────────────────────────────────────────
# System prompt — full schema instructions for Claude
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a real estate listing data extraction expert for LUME by Mark — a luxury real estate \
and lifestyle management company based in Lisbon, Portugal.

Your task: read the raw listing information provided and return ONE valid JSON object \
containing every field you can confidently extract or reasonably infer.
Return ONLY the JSON object. No markdown, no code fences, no explanation.

═══════════════════════════════════════════
FIELD REFERENCE
═══════════════════════════════════════════

── REQUIRED (provide your best inference for ALL of these) ──────────────────

reference       string   Generate a placeholder like "LM-AI-NNN" (random 3-digit suffix)
title           string   Elegant marketing title. e.g. "Stunning Penthouse with River Views, Santos"
slug            string   URL-safe from title+city. e.g. "stunning-penthouse-river-views-santos"
property_type   string   EXACTLY ONE of: apartment | penthouse | villa | townhouse | estate | farmhouse | quinta | land | new_development_unit
listing_type    string   EXACTLY ONE of: sale | rent | seasonal_rent
price           number   Numeric only. No currency symbols. null if not mentioned.
region          string   Portuguese region. e.g. Lisbon | Algarve | Porto | Silver Coast | Alentejo | Madeira | Azores
city            string   City name
area            string   Neighbourhood or parish name
bedrooms        integer  Number of bedrooms (0 if studio)
bathrooms       number   Number of bathrooms (0.5 for half-bath ok)
interior_living_area  number  Square metres of usable interior area
short_description  string  2–3 sentences. Elegant, warm, lifestyle-focused. English. LUME brand voice.
cover_image     string   Always use: "https://placehold.co/1200x800/1a1a2e/ffffff?text=Awaiting+Image"
company         string   Always "LUME by Mark"
listing_agent   string   Extract from text, or "Mark"

── CONDITIONAL REQUIRED (based on property_type) ──────────────────────────

floor_number    integer  REQUIRED if property_type is "apartment" or "penthouse"
plot_size       number   REQUIRED if property_type is "villa" | "estate" | "farmhouse" | "quinta" | "land"

── OPTIONAL (include if mentioned or clearly inferable) ─────────────────────

development_name  string
country           string   Default "Portugal"
currency          string   Default "EUR"
latitude          number
longitude         number

full_description  string   Rich multi-paragraph English marketing copy. Sophisticated tone.
ai_summary        string   One punchy sentence for listing cards. e.g. "Sleek penthouse with panoramic Tagus views in Santos."
key_selling_points  array of strings   3–5 concise selling points
lifestyle_tags    array of strings   ONLY values from: luxury | family | investment | golf | waterfront | countryside | historic | urban | beachfront | nightlife | wellness | equestrian | wine | surf | digital_nomad
views             array of strings   ONLY values from: sea | ocean | river | golf | city | countryside | mountain | garden | marina | panoramic
nearby            array of strings   ONLY values from: beach | airport | golf_course | marina | yacht_club | tennis_court | equestrian | fine_dining | wine_region | spa_wellness | international_school | private_hospital | historic_center | cultural_district | river_waterfront | park_nature | surf_spot | cycling_paths | peace_quiet | public_transport | coworking_space | ski_resort

build_year         integer   1800–2100 only. null if unknown. NEVER 0.
renovation_year    integer   1800–2100 only. null if unknown. NEVER 0.
condition          string    EXACTLY ONE of: new | excellent | renovated | good | to_refurbish — or null
energy_rating      string    e.g. "A", "A+", "B", "C"

gross_built_area   number   sqm
gross_private_area number   sqm
terrace_area       number   sqm
balcony_area       number   sqm
garden_area        number   sqm
outdoor_area_total number   sqm

floors         integer   Number of floors in building
living_rooms   integer
suites         integer
guest_wc       integer
parking_spaces integer

── BOOLEAN FEATURES (true/false — default false, ONLY true if explicitly stated) ─

office | storage_room | elevator | new_development | garage | covered_parking |
underground_parking | ev_charging | terrace | balcony | garden | private_garden |
roof_terrace | patio | pool | heated_pool | outdoor_kitchen | bbq_area |
air_conditioning | heating | underfloor_heating | fireplace | equipped_kitchen |
laundry_room | walk_in_wardrobe | smart_home | alarm_system | security | concierge | furnished

── ALWAYS USE THESE DEFAULTS ──────────────────────────────────────────────

status            "draft"
internal_status   "draft"
priority          "medium"
featured          false
confidential      false
address_visibility "approximate"

═══════════════════════════════════════════
STRICT RULES
═══════════════════════════════════════════

1. NEVER invent specific numeric values (price, area sqm, bedrooms) — use null if not stated.
2. NEVER set build_year or renovation_year to 0 — use null if unknown.
3. ONLY use enum values from the exact lists above (property_type, listing_type, condition, views, nearby, lifestyle_tags).
4. Boolean features: false unless the text explicitly mentions them.
5. Write short_description and full_description in English with a premium, sophisticated tone.
6. Return ONLY the JSON object — no preamble, no explanation, no markdown.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Route
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/ai-parse-listing")
async def ai_parse_listing(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    admin=Depends(require_admin),
):
    """
    Parse a raw listing (pasted text, PDF, or DOCX) with Claude AI.
    Returns structured JSON ready to pre-fill the listing form.
    Does NOT write to the database.
    """
    # ── Check API key ─────────────────────────────────────────────────────────
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not set in environment variables.",
        )

    # ── Extract raw text ──────────────────────────────────────────────────────
    raw_text = ""

    if file and file.filename:
        file_bytes = await file.read()
        name = file.filename.lower()

        if name.endswith(".pdf"):
            try:
                raw_text = _extract_pdf(file_bytes)
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Could not read PDF: {exc}")

        elif name.endswith(".docx"):
            try:
                raw_text = _extract_docx(file_bytes)
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Could not read DOCX: {exc}")

        else:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported file type '{file.filename}'. Please upload a PDF or DOCX.",
            )

    elif text:
        raw_text = text.strip()

    if not raw_text:
        raise HTTPException(status_code=422, detail="Please provide text or a file.")

    if len(raw_text) < 20:
        raise HTTPException(status_code=422, detail="Text is too short to analyse.")

    # ── Call Claude ───────────────────────────────────────────────────────────
    client = anthropic.Anthropic(api_key=api_key)

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Here is the raw listing information to analyse:\n\n"
                        + raw_text[:12000]  # guard against huge files
                    ),
                }
            ],
        )
    except anthropic.APIError as exc:
        raise HTTPException(status_code=502, detail=f"Claude API error: {exc}")

    # ── Parse response ────────────────────────────────────────────────────────
    raw_response = message.content[0].text.strip()

    # Strip accidental markdown fences
    raw_response = re.sub(r"^```(?:json)?\s*", "", raw_response)
    raw_response = re.sub(r"\s*```$", "", raw_response.strip())

    try:
        parsed: dict = json.loads(raw_response)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Claude returned invalid JSON ({exc}). Raw start: {raw_response[:200]}",
        )

    # ── Safety defaults ───────────────────────────────────────────────────────
    safe_defaults = {
        "status": "draft",
        "internal_status": "draft",
        "currency": "EUR",
        "country": "Portugal",
        "featured": False,
        "confidential": False,
        "address_visibility": "approximate",
        "company": "LUME by Mark",
        "listing_agent": "Mark",
        "priority": "medium",
        "cover_image": "https://placehold.co/1200x800/1a1a2e/ffffff?text=Awaiting+Image",
    }
    for k, v in safe_defaults.items():
        if not parsed.get(k):
            parsed[k] = v

    # ── Confidence score ──────────────────────────────────────────────────────
    # Count meaningful (non-empty, non-default) values Claude actually extracted
    skip_defaults = set(safe_defaults.keys()) | {"slug"}
    extracted = sum(
        1
        for k, v in parsed.items()
        if k not in skip_defaults
        and v is not None
        and v != ""
        and v != []
        and v != {}
        and v is not False
    )

    return {
        "listing": parsed,
        "meta": {
            "fields_extracted": extracted,
            "model": "claude-sonnet-4-20250514",
            "source": "file" if file else "text",
        },
    }
