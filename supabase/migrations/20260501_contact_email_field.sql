-- Add the contact.email and contact.email_label keys used by the homepage
-- contact info block in PrivateAccessSection. email_label is translated;
-- email itself is single-locale (edited via admin → CMS → Contact page).

insert into public.translations (namespace, key, en, pt_pt, ru, es) values
    ('contact', 'email_label',
        'Email',
        'E-mail',
        'Электронная почта',
        'Correo electrónico'),

    ('contact', 'email', '', null, null, null)

on conflict (namespace, key) do nothing;
