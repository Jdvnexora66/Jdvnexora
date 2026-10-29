import { supabase } from './supabase';

export const PAGE_DATA_BINDINGS = {
  'projects.total': { label: 'Mes projets', source: 'studio_projects', requiresUser: true },
  'projects.in_progress': { label: 'Mes projets en cours', source: 'studio_projects', requiresUser: true },
  'media.total': { label: 'Médias enregistrés', source: 'media_library_items', requiresUser: true },
  'resources.published': { label: 'Ressources publiées', source: 'nexora_resources', requiresUser: false },
  'courses.published': { label: 'Formations publiées', source: 'nexora_courses', requiresUser: false },
  'roadmap.open': { label: 'Objectifs non terminés', source: 'roadmap_tasks', requiresUser: true },
  'discover.public': { label: 'Profils publics', source: 'entrepreneurs', requiresUser: false },
  'library.saved': { label: 'Éléments de bibliothèque', source: 'user_learning_items', requiresUser: true },
  'ai.messages': { label: 'Messages Studio IA', source: 'studio_ai_messages', requiresUser: true },
  'billing.active_plans': { label: 'Forfaits actifs', source: 'plans', requiresUser: false },
  'organizations.accessible': { label: 'Organisations accessibles', source: 'organizations', requiresUser: true },
  'academy.enrollments': { label: 'Inscriptions actives', source: 'nexora_course_enrollments', requiresUser: true },
} as const;

export type PageDataBindingKey = keyof typeof PAGE_DATA_BINDINGS;

export function isPageDataBindingKey(value: unknown): value is PageDataBindingKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PAGE_DATA_BINDINGS, value);
}

export function pageDataBindingLabel(value: PageDataBindingKey): string {
  return PAGE_DATA_BINDINGS[value].label;
}

/**
 * Resolve a small, explicit allowlist of read-only aggregate data bindings.
 * Every query is scoped by the authenticated user's ID where the source is personal.
 * RLS remains in force; unavailable sources return null rather than a fabricated zero.
 */
export async function loadPageDataBindings(keys: readonly string[]): Promise<Record<string, number | null>> {
  const requested = [...new Set(keys)].filter(isPageDataBindingKey);
  if (!requested.length) return {};
  if (!supabase) return Object.fromEntries(requested.map(key => [key, null]));

  const userScoped = requested.some(key => PAGE_DATA_BINDINGS[key].requiresUser);
  let userId: string | null = null;
  if (userScoped) {
    const { data, error } = await supabase.auth.getUser();
    if (!error) userId = data.user?.id ?? null;
  }

  const result: Record<string, number | null> = {};
  await Promise.all(requested.map(async key => {
    if (PAGE_DATA_BINDINGS[key].requiresUser && !userId) {
      result[key] = null;
      return;
    }
    try {
      let count: number | null = null;
      let failed = false;
      switch (key) {
        case 'projects.total': {
          const response = await supabase!.from('studio_projects').select('id', { count: 'exact', head: true }).eq('owner_id', userId!);
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'projects.in_progress': {
          const response = await supabase!.from('studio_projects').select('id', { count: 'exact', head: true }).eq('owner_id', userId!).eq('status', 'in_progress');
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'media.total': {
          const response = await supabase!.from('media_library_items').select('id', { count: 'exact', head: true }).eq('owner_id', userId!);
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'resources.published': {
          const response = await supabase!.from('nexora_resources').select('id', { count: 'exact', head: true }).eq('is_published', true);
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'courses.published': {
          const response = await supabase!.from('nexora_courses').select('id', { count: 'exact', head: true }).eq('status', 'published');
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'roadmap.open': {
          const response = await supabase!.from('roadmap_tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId!).neq('status', 'completed');
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'discover.public': {
          const response = await supabase!.from('entrepreneurs').select('id', { count: 'exact', head: true }).eq('visibility', 'public');
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'library.saved': {
          const response = await supabase!.from('user_learning_items').select('id', { count: 'exact', head: true }).eq('user_id', userId!);
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'ai.messages': {
          const response = await supabase!.from('studio_ai_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId!);
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'billing.active_plans': {
          const response = await supabase!.from('plans').select('id', { count: 'exact', head: true }).eq('active', true);
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'organizations.accessible': {
          const response = await supabase!.from('organizations').select('id', { count: 'exact', head: true });
          count = response.count; failed = Boolean(response.error); break;
        }
        case 'academy.enrollments': {
          const response = await supabase!.from('nexora_course_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId!).eq('status', 'active');
          count = response.count; failed = Boolean(response.error); break;
        }
      }
      result[key] = failed ? null : count ?? 0;
    } catch {
      result[key] = null;
    }
  }));
  return result;
}


export const PAGE_ACTION_TARGETS = [
  { value: 'dashboard', label: 'Tableau de bord' },
  { value: 'studio', label: 'Studio IA' },
  { value: 'design', label: 'Studio de conception visuelle' },
  { value: 'projects', label: 'Mes projets' },
  { value: 'organizations', label: 'Entreprise et équipe' },
  { value: 'profile', label: 'Profil et préférences' },
  { value: 'administration', label: 'Administration' },
  { value: 'academy', label: 'Académie' },
  { value: 'library', label: 'Bibliothèque de formation' },
  { value: 'resources', label: 'Ressources numériques' },
  { value: 'discover', label: 'Découvrir' },
  { value: 'media', label: 'Vidéothèque et créateurs' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'insights', label: 'Analyses et Insights' },
  { value: 'billing', label: 'Abonnement et facturation' },
] as const;

export type PageActionTarget = typeof PAGE_ACTION_TARGETS[number]['value'];

export function isPageActionTarget(value: unknown): value is PageActionTarget {
  return typeof value === 'string' && PAGE_ACTION_TARGETS.some(target => target.value === value);
}

export function pageActionTargetLabel(value: PageActionTarget): string {
  return PAGE_ACTION_TARGETS.find(target => target.value === value)?.label ?? 'Ouvrir le module';
}
