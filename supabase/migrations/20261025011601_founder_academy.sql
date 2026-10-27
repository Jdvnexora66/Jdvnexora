create table if not exists public.nexora_learning_paths (
  id text primary key,
  title text not null,
  audience text not null,
  description text not null,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.nexora_learning_modules (
  id text primary key,
  path_id text not null references public.nexora_learning_paths(id) on delete cascade,
  title text not null,
  summary text not null,
  project_task text not null,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.nexora_learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null references public.nexora_learning_modules(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  notes text,
  updated_at timestamptz not null default now(),
  unique(user_id,module_id)
);
alter table public.nexora_learning_paths enable row level security;
alter table public.nexora_learning_modules enable row level security;
alter table public.nexora_learning_progress enable row level security;
grant select on public.nexora_learning_paths, public.nexora_learning_modules to authenticated;
grant select, insert, update, delete on public.nexora_learning_progress to authenticated;
drop policy if exists "Published learning paths are readable" on public.nexora_learning_paths;
create policy "Published learning paths are readable" on public.nexora_learning_paths for select to authenticated using (is_published = true);
drop policy if exists "Published learning modules are readable" on public.nexora_learning_modules;
create policy "Published learning modules are readable" on public.nexora_learning_modules for select to authenticated using (is_published = true);
drop policy if exists "Users read own learning progress" on public.nexora_learning_progress;
create policy "Users read own learning progress" on public.nexora_learning_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own learning progress" on public.nexora_learning_progress;
create policy "Users insert own learning progress" on public.nexora_learning_progress for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own learning progress" on public.nexora_learning_progress;
create policy "Users update own learning progress" on public.nexora_learning_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own learning progress" on public.nexora_learning_progress;
create policy "Users delete own learning progress" on public.nexora_learning_progress for delete to authenticated using ((select auth.uid()) = user_id);
insert into public.nexora_learning_paths (id,title,audience,description,position) values
('discover','Découvrir le numérique','Débutants','Comprendre les opportunités et transformer une idée en premier projet concret.',1),
('creator','Créer et vendre','Créateurs et entrepreneurs digitaux','Construire une audience, une offre claire et un système de vente.',2),
('builder','Construire un produit','Créateurs d’applications et SaaS','Concevoir, construire et sécuriser un produit numérique.',3)
on conflict (id) do update set title=excluded.title,audience=excluded.audience,description=excluded.description,position=excluded.position;
insert into public.nexora_learning_modules (id,path_id,title,summary,project_task,position) values
('discover-1','discover','Trouver une opportunité','Repérer un problème concret rencontré par une audience précise.','Rédiger une fiche problème, public cible et hypothèse de solution.',1),
('discover-2','discover','Valider son idée','Interroger de vrais utilisateurs avant de construire.','Préparer cinq questions et consigner les retours de trois personnes.',2),
('discover-3','discover','Créer une première offre','Définir une promesse simple et un livrable utile.','Rédiger une offre avec bénéfice, contenu, prix à tester et appel à l’action.',3),
('creator-1','creator','Positionnement éditorial','Choisir son audience, son sujet et sa voix.','Écrire une phrase de positionnement et trois piliers de contenu.',1),
('creator-2','creator','Créer du contenu utile','Produire des contenus cohérents et réutilisables.','Préparer un calendrier de publication de sept jours.',2),
('creator-3','creator','Transformer l’audience en offre','Relier le contenu à un besoin et à une offre claire.','Rédiger une page de présentation avec un appel à l’action.',3),
('builder-1','builder','Cadrer le produit','Définir utilisateurs, problème et fonctionnalités essentielles.','Rédiger le périmètre MVP et les critères d’acceptation.',1),
('builder-2','builder','Modéliser les données','Décrire les entités et les relations du produit.','Dessiner un schéma de données initial et identifier les données privées.',2),
('builder-3','builder','Préparer sécurité et lancement','Penser aux accès, aux tests et au déploiement dès le départ.','Établir une checklist de tests, permissions et lancement.',3)
on conflict (id) do update set path_id=excluded.path_id,title=excluded.title,summary=excluded.summary,project_task=excluded.project_task,position=excluded.position;
