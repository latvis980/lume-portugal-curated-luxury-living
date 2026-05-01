-- 20260501_homepage_locales.sql
--
-- Fills in pt_pt / ru / es for homepage namespaces that were seeded with
-- English-only by 20260429_hero_translations.sql and
-- 20260501_homepage_translations.sql:
--
--   * hero
--   * footer
--   * cookies
--
-- The `services` namespace is excluded — it was populated via the admin UI.
-- The `questionnaire`, `investment`, `nav`, `contact` namespaces already
-- have their non-EN locales filled.
--
-- Uses COALESCE(NULLIF(col, ''), v.col) so any value already filled by an
-- admin survives — only NULL or empty cells get written.

-- ── hero ────────────────────────────────────────────────────────────────

update public.translations t
set pt_pt = coalesce(nullif(t.pt_pt, ''), v.pt_pt),
    ru    = coalesce(nullif(t.ru,    ''), v.ru),
    es    = coalesce(nullif(t.es,    ''), v.es),
    updated_at = now()
from (values
    ('eyebrow',
        'Casas · Vida · Coleccionar',
        'Дома · Жизнь · Коллекционирование',
        'Casas · Vida · Coleccionar'),
    ('logo',
        'LUME', 'LUME', 'LUME'),
    ('logo_subtitle',
        'por Mark', 'от Mark', 'por Mark'),
    ('tagline',
        'A sua luz para viver em Portugal',
        'Ваш свет для жизни в Португалии',
        'Su luz para vivir en Portugal'),
    ('cta_explore_homes',
        'Explorar Casas',
        'Смотреть дома',
        'Explorar Casas'),
    ('cta_let_us_guide_you',
        'Deixe-nos guiá-lo',
        'Позвольте нам сопровождать вас',
        'Déjenos guiarle'),
    ('scroll',
        'Deslizar', 'Прокрутить', 'Desplazar')
) as v(key, pt_pt, ru, es)
where t.namespace = 'hero' and t.key = v.key;


-- ── footer ──────────────────────────────────────────────────────────────

update public.translations t
set pt_pt = coalesce(nullif(t.pt_pt, ''), v.pt_pt),
    ru    = coalesce(nullif(t.ru,    ''), v.ru),
    es    = coalesce(nullif(t.es,    ''), v.es),
    updated_at = now()
from (values
    ('logo_alt',
        'LUME by Mark', 'LUME by Mark', 'LUME by Mark'),
    ('copyright',
        '© 2026 LUME by Mark · Imobiliário, Relocação e Investimento · Portugal',
        '© 2026 LUME by Mark · Недвижимость, переезд и инвестиции · Португалия',
        '© 2026 LUME by Mark · Inmobiliaria, Relocación e Inversión · Portugal')
) as v(key, pt_pt, ru, es)
where t.namespace = 'footer' and t.key = v.key;


-- ── cookies ─────────────────────────────────────────────────────────────

update public.translations t
set pt_pt = coalesce(nullif(t.pt_pt, ''), v.pt_pt),
    ru    = coalesce(nullif(t.ru,    ''), v.ru),
    es    = coalesce(nullif(t.es,    ''), v.es),
    updated_at = now()
from (values
    ('message',
        'Utilizamos cookies para guardar as suas preferências e melhorar a sua experiência.',
        'Мы используем cookies, чтобы сохранять ваши предпочтения и улучшать опыт.',
        'Utilizamos cookies para recordar sus preferencias y mejorar su experiencia.'),
    ('privacy_link',
        'Política de Privacidade',
        'Политика конфиденциальности',
        'Política de Privacidad'),
    ('decline',
        'Recusar', 'Отклонить', 'Rechazar'),
    ('accept',
        'Aceitar', 'Принять', 'Aceptar')
) as v(key, pt_pt, ru, es)
where t.namespace = 'cookies' and t.key = v.key;
