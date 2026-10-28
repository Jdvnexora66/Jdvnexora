-- Provision the explicitly designated founder/designer account.
-- This is a one-time migration; no client-side role escalation is introduced.
INSERT INTO public.profiles (id, display_name, preferred_language, timezone, role)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'display_name', ''), NULLIF(u.raw_user_meta_data->>'full_name', ''), 'JDV NEXORA Founder'),
  'fr',
  'Africa/Porto-Novo',
  'admin'::public.app_role
FROM auth.users AS u
WHERE lower(u.email) = lower('romarica15@gmail.com')
ON CONFLICT (id) DO UPDATE
SET role = 'admin'::public.app_role,
    updated_at = now();