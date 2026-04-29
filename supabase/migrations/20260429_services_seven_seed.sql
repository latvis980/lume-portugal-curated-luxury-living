-- 20260429_services_seven_seed.sql
-- Seeds the 42 services across the 7 new categories.

INSERT INTO public.services (slug, category, title, description, sort_order, is_active) VALUES
-- TAB 1 — Settling In
('legal-documentation',           'settling_in',  'Legal & Documentation',          'Guidance and coordination of legal support for property purchases, residency and contract review — handled seamlessly.', 0, true),
('tax-financial-setup',           'settling_in',  'Tax & Financial Setup',          'Support in navigating the Portuguese tax system, including NHR, with precise guidance to organise your financial position.', 1, true),
('banking-payments',              'settling_in',  'Banking & Payments',             'Seamless coordination of bank account setup for non-residents, including international transfers and everyday banking.', 2, true),
('residency-visas',               'settling_in',  'Residency & Visas',              'End-to-end guidance and coordination of visa and residency applications — Golden Visa, D7 and Digital Nomad pathways.', 3, true),
('nif-documentation',             'settling_in',  'NIF & Documentation',            'Fast and seamless support with NIF registration and all essential documentation required for settling in Portugal.', 4, true),
('pet-relocation-care',           'settling_in',  'Pet Relocation & Care',          'Careful coordination of pet relocation, including transport, documentation and veterinary requirements — ensuring a smooth transition.', 5, true),

-- TAB 2 — Health
('private-healthcare-enrollment', 'health',       'Private Healthcare Enrollment',  'Guidance in selecting and setting up private health insurance tailored to your needs and lifestyle.', 0, true),
('doctor-clinic-access',          'health',       'Doctor & Clinic Access',         'Curated introductions to leading doctors, specialists and private clinics.', 1, true),
('preventive-health-checkups',    'health',       'Preventive Health & Check-ups',  'Coordination of annual screenings and personalised preventive health programmes.', 2, true),
('wellbeing-recovery',            'health',       'Wellbeing & Recovery',           'Access to physiotherapy, osteopathy and trusted wellness practitioners, coordinated around your needs.', 3, true),
('medical-coordination-support',  'health',       'Medical Coordination & Support', 'Ongoing coordination of appointments, translations and navigation of the healthcare system.', 4, true),
('family-pediatric-care',         'health',       'Family & Pediatric Care',        'Access to trusted pediatricians and family doctors, with ongoing coordination and support.', 5, true),

-- TAB 3 — Education
('international-schools',          'education',   'International Schools',          'Guidance and support in shortlisting and enrolling in leading international schools across Lisbon, Porto and the Algarve.', 0, true),
('universities',                   'education',   'Universities',                   'Guidance on Portuguese and international universities, with support for applications and academic planning.', 1, true),
('language-courses',               'education',   'Language Courses',               'Curated Portuguese language programmes from beginner to advanced, online and in person.', 2, true),
('kids-after-school',              'education',   'Kids & After-School',            'Access to activities, sports clubs, tutoring and enrichment programmes for children of all ages.', 3, true),
('private-tutors-academic-support','education',   'Private Tutors & Academic Support','Access to trusted tutors and tailored academic assistance across subjects and levels.', 4, true),

-- TAB 4 — Lifestyle
('interior-design',               'lifestyle',    'Interior Design',                'Guidance and coordination with carefully selected interior designers aligned with the LUME aesthetic.', 0, true),
('furniture-objects',             'lifestyle',    'Furniture & Objects',            'Access to curated furniture showrooms, artisans and selected international brands.', 1, true),
('home-automation',               'lifestyle',    'Home Automation',                'Seamless integration of smart home systems — lighting, climate, security and entertainment.', 2, true),
('garden-landscape',              'lifestyle',    'Garden & Landscape',             'Collaboration with landscape architects specialising in Mediterranean and Atlantic environments.', 3, true),
('property-management',           'lifestyle',    'Property Management',            'Full coordination of property management — maintenance, staff, utilities and rental oversight.', 4, true),
('art-collecting',                'lifestyle',    'Art & Collecting',               'Access to curated art, design pieces and guidance in building a personal collection.', 5, true),
('home-styling-setup',            'lifestyle',    'Home Styling & Setup',           'Styling, tableware, textiles and finishing touches that turn a house into a lived space.', 6, true),
('wine-cellar-curation',          'lifestyle',    'Wine & Cellar Curation',         'Access to local and international wines, cellar setup and personalised curation.', 7, true),

-- TAB 5 — Environment
('social-introductions',          'environment',  'Social Introductions',           'Access to private circles, networks and meaningful connections.', 0, true),
('private-events-gatherings',     'environment',  'Private Events & Gatherings',    'Access to curated events, private dinners and cultural gatherings.', 1, true),
('clubs-memberships',             'environment',  'Clubs & Memberships',            'Introductions to selected clubs, sports and private memberships.', 2, true),
('local-immersion',               'environment',  'Local Immersion',                'Personal introduction to neighbourhoods, places and everyday life.', 3, true),
('cultural-access',               'environment',  'Cultural Access',                'Introductions to galleries, cultural institutions and local scenes.', 4, true),

-- TAB 6 — Leisure
('dining',                        'leisure',      'Dining',                         'Access to sought-after tables, private dining and places that define the local scene.', 0, true),
('sea-water',                     'leisure',      'Sea & Water',                    'Private boat experiences, coastal routes and quiet days at sea.', 1, true),
('sport-movement',                'leisure',      'Sport & Movement',               'Access to selected clubs, coaches and places to play — from tennis to padel and beyond.', 2, true),
('wellness-recovery',             'leisure',      'Wellness & Recovery',            'Access to spas, treatments, practitioners and personalised wellbeing programmes.', 3, true),
('experiences',                   'leisure',      'Experiences',                    'Curated experiences across Portugal — from wine to nature to culture.', 4, true),
('wine-vineyards',                'leisure',      'Wine & Vineyards',               'Access to small producers, private tastings and vineyard experiences shaped by local knowledge and personal relationships.', 5, true),

-- TAB 7 — Signature
('private-gallery-access',        'signature',    'Private Gallery Access',         'Access to selected galleries and private viewings in Lisbon, Porto and the Algarve, including after-hours moments.', 0, true),
('artist-introductions',          'signature',    'Artist Introductions',           'Access to artists and studios, emerging and established, in Portugal and beyond.', 1, true),
('collection-strategy',           'signature',    'Collection Strategy',            'Guidance in shaping a coherent, personal collection from first pieces to long-term vision.', 2, true),
('acquisition-installation',      'signature',    'Acquisition & Installation',     'Seamless support through acquisition — from negotiation to delivery, insurance and installation.', 3, true),
('private-sales-auctions',        'signature',    'Private Sales & Auctions',       'Participation in private sales, auctions and off-market opportunities.', 4, true),
('collection-care-management',    'signature',    'Collection Care & Management',   'Ongoing support for your collection — cataloguing, insurance coordination, storage and advisory.', 5, true)
ON CONFLICT (slug) DO UPDATE SET
  category    = EXCLUDED.category,
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active,
  updated_at  = now();
