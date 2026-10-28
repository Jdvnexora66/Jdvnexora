-- JDV NEXORA AI STUDIO: initial commercial subscription catalog.
-- All prices are XOF/FCFA. Annual prices equal ten monthly payments.
-- Quotas are launch proposals and must be enforced server-side before paid AI usage.
insert into public.plans
  (code, name, description, active, features, price_minor, currency, billing_interval, trial_days)
values
  ('decouverte', 'Découverte', 'Pour commencer gratuitement et découvrir les outils essentiels.', true,
   '{"audience":"b2c","monthly_ai_units":10,"projects":1,"core_tools":true,"advanced_tools":false,"billing_mode":"free"}'::jsonb,
   0, 'XOF', 'month', 0),
  ('createur', 'Créateur', 'Pour les créateurs, étudiants avancés et entrepreneurs indépendants.', true,
   '{"audience":"b2c","monthly_ai_units":200,"multiple_projects":true,"advanced_tools":true,"export_when_available":true,"billing_mode":"online"}'::jsonb,
   4000, 'XOF', 'month', 0),
  ('professionnel', 'Professionnel', 'Pour les freelances, consultants et professionnels.', true,
   '{"audience":"b2c_pro","monthly_ai_units":800,"multiple_projects":true,"professional_features":true,"billing_mode":"online"}'::jsonb,
   8000, 'XOF', 'month', 0),
  ('equipe', 'Équipe', 'Pour les agences, startups et petites entreprises.', true,
   '{"audience":"b2b","monthly_ai_units":2000,"included_members":5,"shared_workspace":true,"roles_and_access":true,"collective_usage_tracking":true,"billing_mode":"online"}'::jsonb,
   20000, 'XOF', 'month', 0),
  ('entreprise', 'Entreprise', 'Offre sur devis pour les organisations aux besoins spécifiques.', true,
   '{"audience":"b2b_enterprise","billing_mode":"quote","custom_capacity":true,"advanced_administration_subject_to_availability":true}'::jsonb,
   0, 'XOF', 'one_time', 0),
  ('createur-annuel', 'Créateur annuel', 'Abonnement annuel Créateur, équivalent à 10 mensualités.', true,
   '{"audience":"b2c","monthly_ai_units":200,"multiple_projects":true,"advanced_tools":true,"export_when_available":true,"billing_mode":"online","discount_months":2}'::jsonb,
   40000, 'XOF', 'year', 0),
  ('professionnel-annuel', 'Professionnel annuel', 'Abonnement annuel Professionnel, équivalent à 10 mensualités.', true,
   '{"audience":"b2c_pro","monthly_ai_units":800,"multiple_projects":true,"professional_features":true,"billing_mode":"online","discount_months":2}'::jsonb,
   80000, 'XOF', 'year', 0),
  ('equipe-annuel', 'Équipe annuelle', 'Abonnement annuel Équipe, équivalent à 10 mensualités.', true,
   '{"audience":"b2b","monthly_ai_units":2000,"included_members":5,"shared_workspace":true,"roles_and_access":true,"collective_usage_tracking":true,"billing_mode":"online","discount_months":2}'::jsonb,
   200000, 'XOF', 'year', 0)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  active = excluded.active,
  features = excluded.features,
  price_minor = excluded.price_minor,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  trial_days = excluded.trial_days;
