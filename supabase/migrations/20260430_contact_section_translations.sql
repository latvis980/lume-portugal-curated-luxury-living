-- Contact section copy and contact info for the homepage.
-- Keys mirror the calls to t("contact", ...) in
-- frontend/src/components/ContactSection.tsx and
-- t("nav", ...) in frontend/src/components/Navbar.tsx.
--
-- Phone and address use placeholder values — edit them in the admin
-- under CMS → Contact page once the site is live.

-- ── Nav keys (replacing request_private_access / request_private_access_sub) ──

insert into public.translations (namespace, key, en, pt_pt, ru, es) values
    ('nav', 'contact',     'Contact',      'Contacto',       'Контакты',  'Contacto'),
    ('nav', 'contact_sub', 'Get in touch', 'Fale connosco',  'Напишите нам', 'Contáctanos')
on conflict (namespace, key) do nothing;

-- ── Contact section copy ───────────────────────────────────────────────────────

insert into public.translations (namespace, key, en, pt_pt, ru, es) values
    ('contact', 'eyebrow',
        'Contact',
        'Contacto',
        'Контакты',
        'Contacto'),

    ('contact', 'title',
        'Get in Touch',
        'Entre em Contacto',
        'Свяжитесь с нами',
        'Ponte en Contacto'),

    ('contact', 'intro',
        'Reach out to our team. Share your vision and we''ll help you find your place in Portugal.',
        'Fale com a nossa equipa. Partilhe a sua visão e nós ajudamo-lo a encontrar o seu lugar em Portugal.',
        'Свяжитесь с нашей командой. Расскажите нам о своих планах — мы поможем вам найти своё место в Португалии.',
        'Contacta con nuestro equipo. Comparte tu visión y te ayudaremos a encontrar tu lugar en Portugal.'),

    -- ── Form labels ──────────────────────────────────────────────────────────

    ('contact', 'name_placeholder',
        'Full Name',
        'Nome completo',
        'Полное имя',
        'Nombre completo'),

    ('contact', 'email_placeholder',
        'Email',
        'E-mail',
        'Электронная почта',
        'Correo electrónico'),

    ('contact', 'phone_placeholder',
        'Phone (optional)',
        'Telefone (opcional)',
        'Телефон (необязательно)',
        'Teléfono (opcional)'),

    ('contact', 'message_placeholder',
        'Tell us about your vision...',
        'Conte-nos sobre a sua visão...',
        'Расскажите нам о своих планах...',
        'Cuéntanos tu visión...'),

    ('contact', 'submit',
        'Send Message',
        'Enviar Mensagem',
        'Отправить сообщение',
        'Enviar Mensaje'),

    ('contact', 'submitting',
        'Sending...',
        'A enviar...',
        'Отправка...',
        'Enviando...'),

    ('contact', 'error_fallback',
        'Something went wrong. Please try again.',
        'Ocorreu um erro. Por favor, tente novamente.',
        'Что-то пошло не так. Пожалуйста, попробуйте ещё раз.',
        'Algo salió mal. Por favor, inténtalo de nuevo.'),

    ('contact', 'thank_you_title',
        'Thank you',
        'Obrigado',
        'Спасибо',
        'Gracias'),

    ('contact', 'thank_you_body',
        'A member of our team will be in touch within 24 hours.',
        'Um membro da nossa equipa entrará em contacto em 24 horas.',
        'Наш специалист свяжется с вами в течение 24 часов.',
        'Un miembro de nuestro equipo se pondrá en contacto contigo en 24 horas.'),

    -- ── Contact info labels ───────────────────────────────────────────────────

    ('contact', 'phone_label',
        'Phone',
        'Telefone',
        'Телефон',
        'Teléfono'),

    ('contact', 'whatsapp_label',
        'WhatsApp',
        'WhatsApp',
        'WhatsApp',
        'WhatsApp'),

    ('contact', 'address_label',
        'Address',
        'Morada',
        'Адрес',
        'Dirección'),

    ('contact', 'map_link',
        'View on map',
        'Ver no mapa',
        'Посмотреть на карте',
        'Ver en el mapa'),

    -- ── Contact info values (single-locale, edited via admin) ─────────────────
    -- Leave phone and address blank so the blocks are hidden until the admin
    -- fills them in. maps_url seeded empty too.

    ('contact', 'phone',     '', null, null, null),
    ('contact', 'address',   '', null, null, null),
    ('contact', 'maps_url',  '', null, null, null)

on conflict (namespace, key) do nothing;
