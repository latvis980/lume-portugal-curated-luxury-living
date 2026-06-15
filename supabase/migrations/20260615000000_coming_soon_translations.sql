-- Seed translation keys for the Homes "Coming Soon" banner.
--
-- Namespace: coming_soon
-- Keys: eyebrow, title, body_before, brand, body_after, email_placeholder,
--       button, button_loading, thanks_title, thanks_body, error
--
-- The banner copy is split into body_before / brand / body_after so the
-- brand ("LUME by Mark") can be rendered bold on its own line in every
-- locale, regardless of word order.
--
-- Idempotent: uses INSERT ... ON CONFLICT (namespace, key) DO UPDATE.

insert into public.translations (id, namespace, key, en, pt_pt, ru, es) values
  (gen_random_uuid(), 'coming_soon', 'eyebrow',
    'Homes',
    'Casas',
    'Дома',
    'Casas'),

  (gen_random_uuid(), 'coming_soon', 'title',
    'Coming Soon',
    'Em Breve',
    'Скоро',
    'Próximamente'),

  (gen_random_uuid(), 'coming_soon', 'body_before',
    'We are gathering the best homes in Portugal for you. Leave your contact to get notified when',
    'Estamos a reunir as melhores casas em Portugal para si. Deixe o seu contacto para ser notificado quando as ofertas de casas da',
    'Мы собираем для вас лучшие дома в Португалии. Оставьте свои контактные данные, чтобы получить уведомление, когда предложения домов от',
    'Estamos reuniendo las mejores casas de Portugal para usted. Deje su contacto para recibir una notificación cuando las ofertas de casas de'),

  (gen_random_uuid(), 'coming_soon', 'brand',
    'LUME by Mark',
    'LUME by Mark',
    'LUME by Mark',
    'LUME by Mark'),

  (gen_random_uuid(), 'coming_soon', 'body_after',
    'homes offers are live.',
    'estiverem disponíveis.',
    'станут доступны.',
    'estén disponibles.'),

  (gen_random_uuid(), 'coming_soon', 'email_placeholder',
    'Your email',
    'O seu email',
    'Ваш email',
    'Su email'),

  (gen_random_uuid(), 'coming_soon', 'button',
    'Notify Me',
    'Notificar-me',
    'Уведомить меня',
    'Avísame'),

  (gen_random_uuid(), 'coming_soon', 'button_loading',
    'Sending…',
    'A enviar…',
    'Отправка…',
    'Enviando…'),

  (gen_random_uuid(), 'coming_soon', 'thanks_title',
    'Thank you',
    'Obrigado',
    'Спасибо',
    'Gracias'),

  (gen_random_uuid(), 'coming_soon', 'thanks_body',
    'You''re on the list. We''ll be in touch the moment our homes go live.',
    'Está na lista. Entraremos em contacto assim que as nossas casas estiverem disponíveis.',
    'Вы в списке. Мы свяжемся с вами, как только наши дома станут доступны.',
    'Está en la lista. Nos pondremos en contacto en cuanto nuestras casas estén disponibles.'),

  (gen_random_uuid(), 'coming_soon', 'error',
    'Something went wrong. Please try again.',
    'Algo correu mal. Por favor, tente novamente.',
    'Что-то пошло не так. Пожалуйста, попробуйте снова.',
    'Algo salió mal. Por favor, inténtelo de nuevo.')

on conflict (namespace, key) do update set
  en     = excluded.en,
  pt_pt  = excluded.pt_pt,
  ru     = excluded.ru,
  es     = excluded.es,
  updated_at = now();
