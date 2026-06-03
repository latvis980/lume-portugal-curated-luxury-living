-- Seed all navbar translation keys for all supported locales.
--
-- Namespace: nav
-- Keys: browse_homes, browse_homes_sub, discover_services, discover_services_sub,
--       investment, investment_sub, about, about_sub, journal, journal_sub,
--       contact, contact_sub
--
-- Idempotent: uses INSERT ... ON CONFLICT (namespace, key) DO UPDATE.

insert into public.translations (id, namespace, key, en, pt_pt, ru, es) values
  (gen_random_uuid(), 'nav', 'browse_homes',
    'Homes',
    'Casas',
    'Дома',
    'Casas'),

  (gen_random_uuid(), 'nav', 'browse_homes_sub',
    'View available places',
    'Ver propriedades disponíveis',
    'Доступные объекты',
    'Ver propiedades disponibles'),

  (gen_random_uuid(), 'nav', 'discover_services',
    'Services',
    'Serviços',
    'Услуги',
    'Servicios'),

  (gen_random_uuid(), 'nav', 'discover_services_sub',
    'What we take care of',
    'O que tratamos por si',
    'О чём мы заботимся',
    'Lo que cuidamos'),

  (gen_random_uuid(), 'nav', 'investment',
    'Investment',
    'Investimento',
    'Инвестиции',
    'Inversión'),

  (gen_random_uuid(), 'nav', 'investment_sub',
    'Thinking beyond the present',
    'Pensar além do presente',
    'Думать о будущем',
    'Pensar más allá del presente'),

  (gen_random_uuid(), 'nav', 'about',
    'About us',
    'Sobre nós',
    'О нас',
    'Sobre nosotros'),

  (gen_random_uuid(), 'nav', 'about_sub',
    'The idea behind Lume',
    'A ideia por detrás da Lume',
    'Идея Lume',
    'La idea detrás de Lume'),

  (gen_random_uuid(), 'nav', 'journal',
    'Journal',
    'Revista',
    'Журнал',
    'Revista'),

  (gen_random_uuid(), 'nav', 'journal_sub',
    'Articles about Portugal',
    'Artigos sobre Portugal',
    'Статьи о Португалии',
    'Artículos sobre Portugal'),

  (gen_random_uuid(), 'nav', 'contact',
    'Contact',
    'Contacto',
    'Контакт',
    'Contacto'),

  (gen_random_uuid(), 'nav', 'contact_sub',
    'Get in touch',
    'Entre em contacto',
    'Свяжитесь с нами',
    'Ponerse en contacto')

on conflict (namespace, key) do update set
  en     = excluded.en,
  pt_pt  = excluded.pt_pt,
  ru     = excluded.ru,
  es     = excluded.es,
  updated_at = now();
