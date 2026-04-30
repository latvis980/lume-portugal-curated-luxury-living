-- 20260429_services_seven_translations.sql
-- Static copy for the new homepage Services section. Lives in the translations
-- table so admins can edit headings without code changes. Other locales are
-- left NULL — admins fill them via the Translations admin or the DeepL bulk
-- translate flow once English is finalised.

INSERT INTO public.translations (namespace, key, en) VALUES
  ('services', 'eyebrow',              'A LUME Ecosystem'),
  ('services', 'heading',              'Everything you need, curated'),
  ('services', 'category.settling_in', 'Settling In'),
  ('services', 'category.health',      'Health'),
  ('services', 'category.education',   'Education'),
  ('services', 'category.lifestyle',   'Lifestyle'),
  ('services', 'category.environment', 'Environment'),
  ('services', 'category.leisure',     'Leisure'),
  ('services', 'category.signature',   'Signature services'),
  ('services', 'signature.lead.bold',  'Collecting, with LUME.'),
  ('services', 'signature.lead.tail',  'Objects that shape space and quietly define how you live.')
ON CONFLICT (namespace, key) DO UPDATE SET
  en         = EXCLUDED.en,
  updated_at = now();
