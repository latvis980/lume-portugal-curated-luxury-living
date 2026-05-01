# Translation duplicates cleanup — report

Branch: `claude/cleanup-translation-duplicates-bxvEU`
Migration: `supabase/migrations/20260501_translation_duplicates_cleanup.sql`

## Method

1. Grepped every `t("ns", "key", ...)` call site across `frontend/src/**/*.{ts,tsx}` and `backend/**/*.py`. The backend has no hard-coded translation keys — `routes/translations.py` is generic CRUD. The frontend reads translations exclusively via `useT()` from `frontend/src/lib/i18n.tsx`, which keys on `(namespace, key)`.
2. Compared the live (namespace, key) call set against the suspected duplicate pairs.
3. Cross-checked against existing migrations in `supabase/migrations/`.

## Decisions per pair

### `investment` namespace — underscore vs. dot scheme

`InvestmentSection.tsx` exclusively uses the **dot scheme**. Every underscore key is dead. Pairs share identical English text, so locale values are merged into the keeper via `COALESCE` before delete.

| Legacy (delete) | Keeper (kept) | Call site |
| --- | --- | --- |
| `investment.cta_button` | `investment.cta.button` | `InvestmentSection.tsx:237` |
| `investment.cta_caption` | `investment.cta.url_label` | `InvestmentSection.tsx:256` |
| `investment.closing_title` | `investment.cta.heading` | `InvestmentSection.tsx:199` |
| `investment.closing_p1` | `investment.cta.body.line1` | `InvestmentSection.tsx:212` |
| `investment.closing_p2` | `investment.cta.body.line2` | `InvestmentSection.tsx:213` |
| `investment.quote_line_1` | `investment.quote.line1` | `InvestmentSection.tsx:182` |
| `investment.quote_line_2` | `investment.quote.line2` | `InvestmentSection.tsx:184` |
| `investment.section_01_title` | `investment.block1.heading` | `InvestmentSection.tsx:108` |
| `investment.section_01_p1` | `investment.block1.p1` | `InvestmentSection.tsx:109` |
| `investment.section_01_p2` | `investment.block1.p2` | `InvestmentSection.tsx:110` |
| `investment.section_01_p3` | `investment.block1.p3` | `InvestmentSection.tsx:111` |
| `investment.section_02_title` | `investment.block2.heading` | `InvestmentSection.tsx:114` |
| `investment.section_02_p2` | `investment.block2.p2` | `InvestmentSection.tsx:132` |
| `investment.section_03_title` | `investment.block3.heading` | `InvestmentSection.tsx:135` |
| `investment.value_long_term` | `investment.block3.bullet1` | `InvestmentSection.tsx:55` |
| `investment.value_locations` | `investment.block3.bullet2` | `InvestmentSection.tsx:56` |
| `investment.value_architecture` | `investment.block3.bullet3` | `InvestmentSection.tsx:57` |
| `investment.value_projects` | `investment.block3.bullet4` | `InvestmentSection.tsx:58` |

### Cross-namespace `nav` pairs

`Navbar.tsx` (`frontend/src/components/Navbar.tsx`) reads only the longer keys. The shorter ones were seeded by `20260430_contact_section_translations.sql` with the intent of replacing them, but the code was never updated.

| Legacy (delete) | Keeper (kept) | Call site for keeper |
| --- | --- | --- |
| `nav.homes` | `nav.browse_homes` | `Navbar.tsx:24` |
| `nav.services` | `nav.discover_services` | `Navbar.tsx:29` |
| `nav.contact` | `nav.request_private_access` | `Navbar.tsx:44` |
| `nav.contact_sub` | `nav.request_private_access_sub` | `Navbar.tsx:45` |

**No locale merge for these.** The English source text differs semantically ("Contact" vs. "Request Private Access"), so translations of one would be wrong on the other.

> ⚠️ **Decision needed.** The `20260430` migration's comment says the intent was to replace `request_private_access` with `contact`. If you want to follow through on that, we should instead update `Navbar.tsx` to call `t("nav", "contact"...)` and delete the `request_private_access` rows. As written, this migration assumes the code is the source of truth and the migration's intent was abandoned.

### Cross-namespace pairs — KEEP both sides

Both sides are read by independent components. No deletes.

| Pair | Why kept |
| --- | --- |
| `contact.thank_you_body` / `private_access.thank_you_body` | `ContactSection.tsx:145` and `PrivateAccessSection.tsx:144` |
| `contact.thank_you_title` / `private_access.thank_you_title` | `ContactSection.tsx:142` and `PrivateAccessSection.tsx:141` |
| `contact.message_placeholder` / `private_access.message_placeholder` | `ContactSection.tsx:113` and `PrivateAccessSection.tsx:112` |
| `contact.error_fallback` / `private_access.error_fallback` / `questionnaire.error.generic` | `ContactSection.tsx:34,39`, `PrivateAccessSection.tsx:36,42`, `QuestionnaireSection.tsx:168,173` |
| `contact.submitting` / `private_access.submitting` | `ContactSection.tsx:131` and `PrivateAccessSection.tsx:130` |
| `nav.request_private_access` / `contact.eyebrow` | Navbar item vs. section eyebrow — different rendering positions |

### Namespace-style inconsistency — flagged, NOT changed

`team_members.slug` values include `partner-2` … `partner-5`, producing namespaces `team.partner-2`…`team.partner-5`, while the founder Mark uses `team.mark`. The hyphenation comes from the `team_members.slug` column (`20260428_translations_and_team.sql:122-125`) and `AboutPage.tsx:199` builds the namespace dynamically as `` `team.${member.slug}` ``.

**Recommendation:** rename the slugs (e.g. `partner_2`, or drop the `partner-` prefix entirely once founders have real names). This requires a coordinated update of `team_members.slug`, the corresponding `translations.namespace` rows, and any imagery — leave for a separate task once you confirm the desired convention.

## Code changes

**None.** Every keeper key is already referenced from the canonical call site. No `t(...)` invocations point at the legacy keys, so nothing in `frontend/src` or `backend/` needs to change for this cleanup.

## How to apply

1. Review `supabase/migrations/20260501_translation_duplicates_cleanup.sql`.
2. Run it in Supabase (SQL editor or `supabase db push`). It is wrapped in a single transaction; on any error it rolls back cleanly.
3. After running, the `translations` table loses 22 rows (18 investment + 4 nav). Verify with:

   ```sql
   select count(*) from public.translations
   where namespace = 'investment'
     and key like '%\_%' escape '\';
   -- should be 0

   select * from public.translations
   where (namespace, key) in (
         ('nav','contact'), ('nav','contact_sub'),
         ('nav','homes'),   ('nav','services')
   );
   -- should be empty
   ```
