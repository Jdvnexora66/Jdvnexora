import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, ShieldCheck, Sparkles, FolderKanban, Building2, Plus, Trash2, RefreshCw, LogOut, Clock3, Search, CalendarDays, Compass, Bookmark, CalendarClock, UserRound, Save, Globe2, Pencil, X, Check, Film, Palette, BookOpen } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import Discover from './components/Discover';
import MediaLibrary from './components/MediaLibrary';
import Timeline from './components/Timeline';
import Insights from './components/Insights';
import LearningLibrary from './components/LearningLibrary';
import Academy from './components/Academy';
import ResourceLibrary from './components/ResourceLibrary';
import Roadmap from './components/Roadmap';
import StudioIA from './components/StudioIA';
import CollaborationPanel from './components/CollaborationPanel';
import BillingPanel from './components/BillingPanel';
import AdminPanel from './components/AdminPanel';
import OrganizationPanel from './components/OrganizationPanel';
import VisualDesignStudio from './components/VisualDesignStudio';
import PublishedVisualLayout from './components/PublishedVisualLayout';
import ReferenceDashboard from './components/ReferenceDashboard';

type AuthMode = 'signin' | 'signup';
type UserProfile = { id: string; display_name: string | null; preferred_language: string; timezone: string; role: string; };
type StudioAsset = { id: string; project_id: string; owner_id: string; title: string; content: string | null; kind: string; updated_at: string; };
type StudioProject = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  project_type: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
  organization_id?: string | null;
};

export default function App() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileLanguage, setProfileLanguage] = useState('fr');
  const [profileTimezone, setProfileTimezone] = useState('Africa/Porto-Novo');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState('');
  const [tenantProjectsEnabled, setTenantProjectsEnabled] = useState<boolean | null>(null);
  const [activeProject, setActiveProject] = useState<StudioProject | null>(null);
  const [activeAsset, setActiveAsset] = useState<StudioAsset | null>(null);
  const [projectAssets, setProjectAssets] = useState<StudioAsset[]>([]);
  const [editorContent, setEditorContent] = useState('');
  const [savingContent, setSavingContent] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('ebook');
  const [busy, setBusy] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectType, setEditProjectType] = useState('ebook');
  const [savingProjectDetails, setSavingProjectDetails] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError('Impossible de restaurer la session : ' + sessionError.message);
      setSession(data.session);
      setAuthReady(true);
    }).catch((cause: unknown) => {
      if (!mounted) return;
      setError(cause instanceof Error ? cause.message : 'Impossible de restaurer la session.');
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setPassword('');
        setError('');
        setMessage('Choisissez un nouveau mot de passe pour votre compte.');
      }
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    function handleEditorShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && activeProject) {
        event.preventDefault();
        document.getElementById('save-chapter-button')?.click();
      }
    }
    window.addEventListener('keydown', handleEditorShortcut);
    return () => window.removeEventListener('keydown', handleEditorShortcut);
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject || !hasUnsavedChapterChanges()) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [activeProject, activeAsset, projectAssets, editorContent]);

  useEffect(() => {
    if (session?.user.id) {
      void loadProjects();
      void loadProfile();
    } else {
      setProjects([]);
      setProfile(null);
      setProfileName('');
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (session?.user.id && activeOrganizationId) void loadProjects();
  }, [activeOrganizationId]);

  async function loadProfile() {
    if (!supabase || !session?.user.id) return;
    setLoadingProfile(true);
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, preferred_language, timezone, role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profileError) {
        setError('Impossible de charger le profil : ' + profileError.message);
      } else if (data) {
        const current = data as UserProfile;
        setProfile(current);
        setProfileName(current.display_name ?? '');
        setProfileLanguage(current.preferred_language || 'fr');
        setProfileTimezone(current.timezone || 'Africa/Porto-Novo');
      } else {
        setProfile(null);
        setProfileName((session.user.user_metadata?.display_name as string | undefined) ?? '');
      }
    } catch (cause) {
      setError('Impossible de charger le profil : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setLoadingProfile(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session?.user.id) return;
    setSavingProfile(true); setError(''); setMessage('');
    const values = { display_name: profileName.trim() || null, preferred_language: profileLanguage, timezone: profileTimezone, updated_at: new Date().toISOString() };
    const result = profile
      ? await supabase.from('profiles').update(values).eq('id', session.user.id).select('id, display_name, preferred_language, timezone, role').single()
      : await supabase.from('profiles').insert({ id: session.user.id, ...values }).select('id, display_name, preferred_language, timezone, role').single();
    setSavingProfile(false);
    if (result.error) {
      setError('Enregistrement du profil impossible : ' + result.error.message);
      return;
    }
    const saved = result.data as UserProfile;
    setProfile(saved); setProfileName(saved.display_name ?? ''); setMessage('Profil enregistré avec succès.');
  }

  async function loadProjects() {
    if (!supabase || !session?.user.id) return;
    setLoadingProjects(true);
    setError('');
    try {
      const schemaProbe = await supabase.from('studio_projects').select('organization_id').limit(1);
      const missingTenantColumn = Boolean(schemaProbe.error && (
        schemaProbe.error.code === '42703'
        || (schemaProbe.error.code === 'PGRST204' && /organization_id/i.test(schemaProbe.error.message))
      ));
      if (schemaProbe.error && !missingTenantColumn) throw schemaProbe.error;
      const hasTenantColumn = !missingTenantColumn;
      setTenantProjectsEnabled(hasTenantColumn);
      const [ownedResult, membershipResult] = await Promise.all([
        supabase.from('studio_projects')
          .select('*')
          .eq('owner_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('studio_project_members').select('project_id').eq('user_id', session.user.id),
      ]);
      if (ownedResult.error) {
        setError('Impossible de charger les projets : ' + ownedResult.error.message);
        return;
      }
      let organizationProjects: StudioProject[] = [];
      if (hasTenantColumn && activeOrganizationId) {
        const organizationResult = await supabase.from('studio_projects')
          .select('*').eq('organization_id', activeOrganizationId)
          .order('created_at', { ascending: false });
        if (organizationResult.error) {
          setError('Impossible de charger les projets de l’organisation active : ' + organizationResult.error.message);
        } else {
          organizationProjects = (organizationResult.data ?? []) as StudioProject[];
        }
      }
      const owned = (ownedResult.data ?? []) as StudioProject[];
      if (membershipResult.error) {
        setError('Impossible de charger les projets partagés : ' + membershipResult.error.message);
        setProjects(owned);
        return;
      }
      const sharedIds = [...new Set((membershipResult.data ?? []).map(row => row.project_id as string))]
        .filter(id => !owned.some(project => project.id === id));
      let shared: StudioProject[] = [];
      if (sharedIds.length) {
        const sharedResult = await supabase.from('studio_projects')
          .select('id, owner_id, title, description, project_type, status, created_at')
          .in('id', sharedIds)
          .order('created_at', { ascending: false });
        if (sharedResult.error) setError('Impossible de charger les projets partagés : ' + sharedResult.error.message);
        else shared = (sharedResult.data ?? []) as StudioProject[];
      }
      const uniqueProjects = new Map<string, StudioProject>();
      [...owned, ...shared, ...organizationProjects].forEach(project => uniqueProjects.set(project.id, project));
      setProjects([...uniqueProjects.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (cause) {
      setError('Impossible de charger les projets : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setLoadingProjects(false);
    }
  }

  async function openProject(project: StudioProject) {
    if (!supabase || !session?.user.id) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data, error: assetError } = await supabase.from('studio_assets')
        .select('id, project_id, owner_id, title, content, kind, updated_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });
      if (assetError) {
        setError('Ouverture impossible : ' + assetError.message);
        return;
      }
      const assets = (data ?? []) as StudioAsset[];
      setActiveProject(project);
      setProjectAssets(assets);
      setActiveAsset(assets[0] ?? null);
      setEditorContent(assets[0]?.content ?? '');
    } catch (cause) {
      setError('Ouverture impossible : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveProjectContent() {
    if (!supabase || !session?.user.id || !activeProject) return;
    setSavingContent(true); setError(''); setMessage('');
    try {
      const payload = {
        project_id: activeProject.id,
        owner_id: session.user.id,
        kind: activeProject.project_type === 'ebook' ? 'ebook' : activeProject.project_type === 'course' ? 'course_material' : activeProject.project_type === 'translation' ? 'translation' : 'document',
        title: activeAsset?.title || 'Chapitre 1',
        content: editorContent,
        language: 'fr',
      };
      const result = activeAsset
        ? await supabase.from('studio_assets').update({ title: activeAsset.title || 'Chapitre', content: editorContent, updated_at: new Date().toISOString() }).eq('id', activeAsset.id).eq('project_id', activeProject.id).select('id, project_id, owner_id, title, content, kind, updated_at').single()
        : await supabase.from('studio_assets').insert(payload).select('id, project_id, owner_id, title, content, kind, updated_at').single();
      if (result.error) {
        setError('Enregistrement impossible : ' + result.error.message);
        return;
      }
      const saved = result.data as StudioAsset;
      setActiveAsset(saved);
      setProjectAssets((current) => activeAsset ? current.map((asset) => asset.id === saved.id ? saved : asset) : [...current, saved]);
      setMessage('Contenu enregistré dans Supabase.');
    } catch (cause) {
      setError('Enregistrement impossible : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setSavingContent(false);
    }
  }

  function exportProjectMarkdown() {
    if (!activeProject) return;
    const content = [
      `# ${activeProject.title}`,
      activeProject.description?.trim() ? `\n${activeProject.description.trim()}` : '',
      ...projectAssets.map((asset, index) => `\n## ${asset.title?.trim() || `Chapitre ${index + 1}`}\n\n${asset.id === activeAsset?.id ? editorContent : (asset.content ?? '')}`),
    ].join('\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = activeProject.title.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'projet';
    link.href = url;
    link.download = `${safeName}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage('Export Markdown préparé pour votre projet.');
    setError('');
  }

  function navigateWorkspace(section: string) {
    if (!confirmDiscardUnsavedChapterChanges()) return;
    setActiveSection(section);
    setActiveProject(null);
    setActiveAsset(null);
    setProjectAssets([]);
    setEditorContent('');
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hasUnsavedChapterChanges() {
    if (!activeProject) return false;
    const savedAsset = activeAsset ? projectAssets.find((asset) => asset.id === activeAsset.id) : null;
    if (!activeAsset) return editorContent.length > 0;
    return editorContent !== (savedAsset?.content ?? '') || activeAsset.title !== (savedAsset?.title ?? '');
  }

  function confirmDiscardUnsavedChapterChanges() {
    if (!hasUnsavedChapterChanges()) return true;
    return window.confirm('Vous avez des modifications non enregistrées dans ce chapitre. Voulez-vous les abandonner ?');
  }

  function selectAsset(asset: StudioAsset) {
    if (asset.id === activeAsset?.id || !confirmDiscardUnsavedChapterChanges()) return;
    setActiveAsset(asset);
    setEditorContent(asset.content ?? '');
    setError(''); setMessage('');
  }

  async function createChapter() {
    if (!supabase || !session?.user.id || !activeProject || !confirmDiscardUnsavedChapterChanges()) return;
    const chapterNumber = projectAssets.length + 1;
    setSavingContent(true); setError(''); setMessage('');
    try {
      const { data, error: insertError } = await supabase.from('studio_assets').insert({
        project_id: activeProject.id, owner_id: session.user.id,
        kind: activeProject.project_type === 'ebook' ? 'ebook' : activeProject.project_type === 'course' ? 'course_material' : 'document',
        title: `Chapitre ${chapterNumber}`, content: '', language: 'fr',
      }).select('id, project_id, owner_id, title, content, kind, updated_at').single();
      if (insertError) {
        setError('Création du chapitre impossible : ' + insertError.message);
        return;
      }
      const asset = data as StudioAsset;
      setProjectAssets((current) => [...current, asset]);
      setActiveAsset(asset);
      setEditorContent('');
      setMessage('Nouveau chapitre créé.');
    } catch (cause) {
      setError('Création du chapitre impossible : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setSavingContent(false);
    }
  }

  async function deleteChapter(asset: StudioAsset) {
    if (!supabase || !session?.user.id || !activeProject) return;
    if (!window.confirm(`Supprimer définitivement « ${asset.title || 'ce chapitre'} » ?`)) return;
    if (activeAsset?.id === asset.id && !confirmDiscardUnsavedChapterChanges()) return;
    setSavingContent(true); setError(''); setMessage('');
    try {
      const { error: deleteError } = await supabase.from('studio_assets')
        .delete().eq('id', asset.id).eq('project_id', activeProject.id);
      if (deleteError) {
        setError('Suppression du chapitre impossible : ' + deleteError.message);
        return;
      }
      const remaining = projectAssets.filter((item) => item.id !== asset.id);
      setProjectAssets(remaining);
      if (activeAsset?.id === asset.id) {
        const next = remaining[0] ?? null;
        setActiveAsset(next);
        setEditorContent(next?.content ?? '');
      }
      setMessage('Chapitre supprimé.');
    } catch (cause) {
      setError('Suppression du chapitre impossible : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setSavingContent(false);
    }
  }

  async function updateProjectStatus(status: StudioProject['status']) {
    if (!supabase || !session?.user.id || !activeProject) return;
    setError(''); setMessage('');
    const { data, error: updateError } = await supabase.from('studio_projects').update({ status }).eq('id', activeProject.id).select('id, owner_id, title, description, project_type, status, created_at').single();
    if (updateError) { setError('Modification du statut impossible : ' + updateError.message); return; }
    const updated = data as StudioProject;
    setActiveProject(updated); setProjects((current) => current.map((project) => project.id === updated.id ? updated : project));
    setMessage('Statut du projet mis à jour.');
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!supabase) {
      setError('La connexion Supabase n’est pas configurée. Vérifiez les variables de .env.local.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        setMessage(data.session ? 'Compte créé et connecté.' : 'Compte créé. Vérifiez votre boîte e-mail pour confirmer votre inscription.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        setMessage('Connexion réussie.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur inattendue est survenue.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError('');
    setMessage('');
    if (!supabase) return setError('La connexion Supabase n’est pas configurée.');
    if (!email.trim()) return setError('Saisissez votre adresse e-mail pour recevoir le lien de réinitialisation.');
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setMessage('Si cette adresse est enregistrée, un e-mail de réinitialisation sera envoyé.');
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!supabase) { setError('La connexion Supabase n’est pas configurée.'); return; }
    if (password.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setIsRecovery(false);
      setPassword('');
      setMode('signin');
      setMessage('Mot de passe mis à jour. Vous pouvez vous reconnecter avec votre nouveau mot de passe.');
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError('Mot de passe modifié, mais la déconnexion automatique a échoué. Déconnectez-vous manuellement.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setBusy(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session?.user.id) return;
    if (activeOrganizationId && tenantProjectsEnabled !== true) {
      setError('Le rattachement B2B des projets n’est pas encore activé dans la base. Aucun projet n’a été créé. Revenez à votre espace personnel ou attendez la validation de la migration de sécurité.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const { data, error: insertError } = await supabase
        .from('studio_projects')
        .insert({
          owner_id: session.user.id,
          ...(activeOrganizationId ? { organization_id: activeOrganizationId } : {}),
          title: title.trim(),
          description: description.trim() || null,
          project_type: projectType,
          status: 'draft',
        })
        .select('id, owner_id, title, description, project_type, status, created_at')
        .single();
      if (insertError) {
        setError(insertError.code === '42501'
          ? 'Création refusée par les règles de sécurité Supabase (RLS). Vérifiez que la politique autorise chaque utilisateur connecté à créer un projet avec son propre owner_id.'
          : 'Création impossible : ' + insertError.message);
        return;
      }
      setProjects((current) => [data as StudioProject, ...current]);
      setTitle('');
      setDescription('');
      setMessage('Projet créé avec succès.');
    } catch (cause) {
      setError('Création impossible : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setBusy(false);
    }
  }

  function beginEditProject(project: StudioProject) {
    setEditingProjectId(project.id);
    setEditProjectTitle(project.title);
    setEditProjectDescription(project.description ?? '');
    setEditProjectType(project.project_type);
    setError('');
    setMessage('');
  }

  async function saveProjectDetails(event: FormEvent<HTMLFormElement>, project: StudioProject) {
    event.preventDefault();
    if (!supabase || !session?.user.id || !editProjectTitle.trim()) return;
    setSavingProjectDetails(true); setError(''); setMessage('');
    try {
      const { data, error: updateError } = await supabase.from('studio_projects')
        .update({ title: editProjectTitle.trim(), description: editProjectDescription.trim() || null, project_type: editProjectType })
        .eq('id', project.id)
        .select('id, owner_id, title, description, project_type, status, created_at').single();
      if (updateError) {
        setError('Modification du projet impossible : ' + updateError.message);
        return;
      }
      const updated = data as StudioProject;
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (activeProject?.id === updated.id) setActiveProject(updated);
      setEditingProjectId(null);
      setMessage('Détails du projet mis à jour.');
    } catch (cause) {
      setError('Modification du projet impossible : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    } finally {
      setSavingProjectDetails(false);
    }
  }

  async function deleteProject(project: StudioProject) {
    if (!supabase || !session?.user.id || !window.confirm(`Supprimer le projet « ${project.title} » ?`)) return;
    setError(''); setMessage('');
    try {
      const { error: deleteError } = await supabase.from('studio_projects').delete().eq('id', project.id);
      if (deleteError) {
        setError('Suppression impossible : ' + deleteError.message);
        return;
      }
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setMessage('Projet supprimé.');
    } catch (cause) {
      setError('Suppression impossible : ' + (cause instanceof Error ? cause.message : 'une erreur réseau inattendue est survenue.'));
    }
  }

  async function signOut() {
    if (!supabase || !confirmDiscardUnsavedChapterChanges()) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else { setMessage('Vous êtes déconnecté.'); setError(''); }
  }

  const projectLabel: Record<string, string> = {
    ebook: 'E-book', course: 'Formation', document: 'Document', translation: 'Traduction', other: 'Autre',
  };
  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const matchesQuery = !query || project.title.toLocaleLowerCase().includes(query) || (project.description ?? '').toLocaleLowerCase().includes(query);
    return matchesQuery && (statusFilter === 'all' || project.status === statusFilter);
  });
  const statusLabel: Record<string, string> = {
    draft: 'Brouillon', in_progress: 'En cours', completed: 'Terminé', archived: 'Archivé',
  };

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="JDV NEXORA accueil">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>JDV <strong>NEXORA</strong><small>AI STUDIO</small></span>
        </a>
        {session && <label className="mockup-global-search"><Search size={16}/><input aria-label="Rechercher" placeholder="Rechercher un projet, une ressource, une formation…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /><kbd>⌘ K</kbd></label>}
        <div className="topbar-actions">
          <span className="secure-label"><ShieldCheck size={16} /> Espace sécurisé</span>
          {session && <span className="mockup-user-chip"><span className="mockup-avatar">{(profileName || session.user.email || 'N').slice(0,1).toUpperCase()}</span><span><b>{profileName || (session.user.email ?? '').split('@')[0] || 'Créateur'}</b><small>{profile?.role === 'admin' ? 'Administrateur' : 'Créateur'}</small></span></span>}
          {session && <button className="logout-button" onClick={signOut}><LogOut size={15} /> Déconnexion</button>}
        </div>
      </header>

      {!authReady ? (
        <section className="auth-card session-loading" aria-live="polite">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <h2>Restauration de votre espace…</h2>
          <p className="muted">Nous vérifions votre session sécurisée avant d’afficher vos projets.</p>
        </section>
      ) : isRecovery ? (
        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">SÉCURITÉ DU COMPTE</p>
            <h1>Reprenez le contrôle de <span>votre espace.</span></h1>
            <p className="hero-description">Définissez un nouveau mot de passe pour sécuriser votre compte JDV NEXORA.</p>
          </div>
          <section className="auth-card" aria-labelledby="recovery-title">
            <p className="eyebrow">RÉINITIALISATION</p>
            <h2 id="recovery-title">Nouveau mot de passe</h2>
            <p className="muted">Choisissez au moins 8 caractères et gardez ce mot de passe confidentiel.</p>
            <form onSubmit={updatePassword}>
              <label htmlFor="new-password">Nouveau mot de passe</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button className="primary-button" type="submit" disabled={busy || password.length < 8}>{busy ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'} <ShieldCheck size={17} /></button>
            </form>
            {error && <p className="feedback error" role="alert">{error}</p>}
            {message && <p className="feedback success" role="status">{message}</p>}
          </section>
        </section>
      ) : session ? (
        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">VOTRE ESPACE DE TRAVAIL</p>
              <h1>Votre écosystème <span>digital.</span></h1>
              <p className="hero-description">Pilotez les acteurs que vous avez sélectionnés, les médias et les parcours de formation dans un espace de travail unifié.</p>
              <p className="user-email"><ShieldCheck size={14} /> {session.user.email}</p>
            </div>
            <div className="workspace-mark"><FolderKanban size={30} /></div>
          </div>

        <div className="workspace-layout">
          <nav className="workspace-sidebar" aria-label="Navigation principale NEXORA">
            <div className="nav-section-label">ESPACE DE TRAVAIL</div>
            <a className={activeSection === 'dashboard' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#dashboard" onClick={(event) => { event.preventDefault(); navigateWorkspace('dashboard'); }}><FolderKanban size={17} /> <span>Tableau de bord</span></a>
            <div className="nav-section-label">CRÉATION</div>
            <a className={activeSection === 'studio' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#studio-ia" onClick={(event) => { event.preventDefault(); navigateWorkspace('studio'); }}><Sparkles size={17} /> <span>Studio de création</span></a>
            <a className={activeSection === 'media' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#media-library" onClick={(event) => { event.preventDefault(); navigateWorkspace('media'); }}><Film size={17} /> <span>Vidéothèque</span></a>
            <a className={activeSection === 'discover' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#discover" onClick={(event) => { event.preventDefault(); navigateWorkspace('discover'); }}><Compass size={17} /> <span>Découvrir</span></a>
            <a className={activeSection === 'library' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#library" onClick={(event) => { event.preventDefault(); navigateWorkspace('library'); }}><Bookmark size={17} /> <span>Bibliothèque</span></a>
            <a className={activeSection === 'academy' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#academy" onClick={(event) => { event.preventDefault(); navigateWorkspace('academy'); }}><BookOpen size={17} /> <span>Académie</span></a>
            <a className={activeSection === 'resources' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#resource-library" onClick={(event) => { event.preventDefault(); navigateWorkspace('resources'); }}><Bookmark size={17} /> <span>Ressources</span></a>
            <a className={activeSection === 'projects' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#projects" onClick={(event) => { event.preventDefault(); navigateWorkspace('projects'); }}><FolderKanban size={17} /> <span>Mes projets</span></a>
            <div className="nav-section-label">PILOTAGE</div>
            <a className={activeSection === 'roadmap' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#roadmap" onClick={(event) => { event.preventDefault(); navigateWorkspace('roadmap'); }}><CalendarClock size={17} /> <span>Roadmap</span></a>
            <a className={activeSection === 'timeline' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#timeline" onClick={(event) => { event.preventDefault(); navigateWorkspace('timeline'); }}><CalendarDays size={17} /> <span>Timeline</span></a>
            <a className={activeSection === 'insights' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#insights" onClick={(event) => { event.preventDefault(); navigateWorkspace('insights'); }}><Sparkles size={17} /> <span>Insights</span></a>
            <div className="nav-section-label">COMPTE & OUTILS</div>
            <a className={activeSection === 'organizations' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#organizations" onClick={(event) => { event.preventDefault(); navigateWorkspace('organizations'); }}><Building2 size={17} /> <span>Organisations & équipe</span></a>
            <a className={activeSection === 'profile' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#profile-title" onClick={(event) => { event.preventDefault(); navigateWorkspace('profile'); }}><UserRound size={17} /> <span>Profil & préférences</span></a>
            <a className={activeSection === 'billing' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#billing" onClick={(event) => { event.preventDefault(); navigateWorkspace('billing'); }}><ShieldCheck size={17} /> <span>Facturation & sécurité</span></a>
            <a className={activeSection === 'administration' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#administration" onClick={(event) => { event.preventDefault(); navigateWorkspace('administration'); }}><ShieldCheck size={17} /> <span>Administration</span></a>
            {profile?.role === 'admin' && <a className={activeSection === 'design' ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#visual-design-studio" onClick={(event) => { event.preventDefault(); navigateWorkspace('design'); }}><Palette size={17} /> <span>Studio de conception visuelle</span></a>}
            <button className="workspace-nav-link" type="button" onClick={() => { if (!confirmDiscardUnsavedChapterChanges()) return; setSearchQuery(''); setStatusFilter('all'); setActiveProject(null); setActiveAsset(null); setProjectAssets([]); setEditorContent(''); void loadProjects(); }}> <RefreshCw size={17} /> <span>Actualiser</span></button>
            <div className="sidebar-upgrade"><span className="sidebar-crown">♛</span><b>Passez à la vitesse supérieure</b><p>Accédez à plus de modèles IA et d’outils avancés.</p><button type="button" onClick={() => navigateWorkspace('billing')}>Voir les offres <ArrowRight size={14}/></button></div>
            <div className="sidebar-footer"><b>JDV NEXORA AI STUDIO</b><span>Créer · Apprendre · Partager · Innover</span></div>
          </nav>
          <div className="workspace-main" data-active-section={activeSection}>

          {!activeProject && activeSection === 'dashboard' && <ReferenceDashboard
            displayName={profileName || (session.user.email ?? '').split('@')[0] || 'Créateur'}
            projects={projects}
            projectCount={projects.length}
            inProgressCount={projects.filter((project) => project.status === 'in_progress').length}
            onNewProject={() => navigateWorkspace('projects')}
            onOpenStudio={() => navigateWorkspace('studio')}
            onOpenProjects={() => navigateWorkspace('projects')}
            onOpenDiscover={() => navigateWorkspace('discover')}
            onOpenMedia={() => navigateWorkspace('media')}
            onOpenAcademy={() => navigateWorkspace('academy')}
            onOpenTeam={() => navigateWorkspace('organizations')}
            onOpenProfile={() => navigateWorkspace('profile')}
            onOpenResources={() => navigateWorkspace('resources')}
          />}

          {!activeProject && activeSection === 'profile' && <section className="project-panel profile-panel" aria-labelledby="profile-title" aria-busy={loadingProfile || savingProfile}>
            <div className="section-heading">
              <div><p className="eyebrow">VOTRE COMPTE</p><h2 id="profile-title"><UserRound size={20} /> Profil et préférences</h2><p className="muted">Personnalisez les informations affichées dans votre espace de travail.</p></div>
              <button className="icon-button" type="button" onClick={() => void loadProfile()} disabled={loadingProfile || savingProfile} aria-label="Actualiser le profil"><RefreshCw size={16} /></button>
            </div>
            <form className="project-form profile-form" onSubmit={saveProfile}>
              <label htmlFor="profile-email">Adresse e-mail du compte</label>
              <input id="profile-email" type="email" value={session.user.email ?? ''} readOnly aria-readonly="true" />
              <label htmlFor="profile-name">Nom d’affichage</label>
              <input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} placeholder="Comment souhaitez-vous être appelé ?" />
              <label htmlFor="profile-language"><Globe2 size={14} /> Langue préférée</label>
              <select id="profile-language" value={profileLanguage} onChange={(event) => setProfileLanguage(event.target.value)}><option value="fr">Français</option><option value="en">English</option><option value="pt">Português</option></select>
              <label htmlFor="profile-timezone">Fuseau horaire</label>
              <select id="profile-timezone" value={profileTimezone} onChange={(event) => setProfileTimezone(event.target.value)}><option value="Africa/Porto-Novo">Bénin — Porto-Novo / Cotonou (UTC+1)</option><option value="Africa/Lagos">Nigeria — Lagos (UTC+1)</option><option value="UTC">UTC</option><option value="Europe/Paris">France — Paris</option><option value="America/New_York">États-Unis — New York</option></select>
              <div className="profile-footer"><p className="muted">Rôle du compte : <strong>{profile?.role ?? 'Utilisateur'}</strong>. Le rôle est en lecture seule ici.</p><button className="primary-button" type="submit" disabled={savingProfile || loadingProfile}>{savingProfile ? 'Enregistrement…' : 'Enregistrer le profil'} <Save size={16} /></button></div>
            </form>
          </section>}

  

          {activeSection === 'dashboard' && <div className="dashboard-stats" aria-label="Résumé de vos projets" aria-busy={loadingProjects}>
            <article className="stat-card"><span className="stat-icon"><FolderKanban size={18} /></span><div><p>Total des projets</p><strong>{loadingProjects ? '…' : projects.length}</strong><small>Tous vos espaces</small></div></article>
            <article className="stat-card"><span className="stat-icon"><Clock3 size={18} /></span><div><p>En cours</p><strong>{loadingProjects ? '…' : projects.filter((project) => project.status === 'in_progress').length}</strong><small>À faire avancer</small></div></article>
            <article className="stat-card"><span className="stat-icon"><ShieldCheck size={18} /></span><div><p>Terminés</p><strong>{loadingProjects ? '…' : projects.filter((project) => project.status === 'completed').length}</strong><small>Projets finalisés</small></div></article>
            <article className="stat-card"><span className="stat-icon"><Sparkles size={18} /></span><div><p>Brouillons</p><strong>{loadingProjects ? '…' : projects.filter((project) => project.status === 'draft').length}</strong><small>Idées à développer</small></div></article>
          </div>}

          {!activeProject && activeSection === 'organizations' && <OrganizationPanel userId={session.user.id} onActiveOrganizationChange={setActiveOrganizationId} />}

          {!activeProject && activeSection === 'dashboard' && <section className="pipeline-section" aria-labelledby="pipeline-title">
            <div className="pipeline-heading">
              <div><p className="eyebrow">FLUX DE PRODUCTION</p><h2 id="pipeline-title">Pipeline des projets</h2><p className="muted">Visualisez l’avancement de vos créations et ouvrez un projet en un clic.</p></div>
              <span className="pipeline-total">{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
            </div>
            <div className="pipeline-board" aria-busy={loadingProjects}>
              {([
                { key: 'draft', title: 'À cadrer', note: 'Idées et brouillons' },
                { key: 'in_progress', title: 'En production', note: 'Travail en cours' },
                { key: 'completed', title: 'Finalisés', note: 'Prêts à livrer' },
                { key: 'archived', title: 'Archives', note: 'Mis de côté' },
              ] as const).map((lane) => {
                const laneProjects = projects.filter((project) => project.status === lane.key);
                return <section className={'pipeline-lane pipeline-lane-' + lane.key} key={lane.key} aria-label={lane.title}>
                  <div className="pipeline-lane-heading"><div><h3>{lane.title}</h3><p>{lane.note}</p></div><span>{laneProjects.length}</span></div>
                  <div className="pipeline-lane-cards">
                    {laneProjects.length === 0 ? <p className="pipeline-empty">{loadingProjects ? 'Chargement…' : 'Aucun projet ici'}</p> : laneProjects.map((project) => <button type="button" className="pipeline-card" key={project.id} onClick={() => void openProject(project)} disabled={busy}>
                      <span className="pipeline-card-type">{projectLabel[project.project_type] || project.project_type}</span>
                      <strong>{project.title}</strong>
                      <span className="pipeline-card-description">{project.description || 'Ajoutez une description pour clarifier la prochaine étape.'}</span>
                      <span className="pipeline-card-footer"><span>{new Date(project.created_at).toLocaleDateString('fr-FR')}</span><span>Ouvrir <ArrowRight size={13} /></span></span>
                    </button>)}
                  </div>
                </section>;
              })}
            </div>
          </section>}

          {!activeProject && activeSection === 'dashboard' && <section className="project-panel recent-activity-panel" aria-labelledby="recent-activity-title" aria-busy={loadingProjects}>
            <div className="section-heading">
              <div><p className="eyebrow">VUE D’ENSEMBLE</p><h2 id="recent-activity-title">Activité récente</h2><p className="muted">Retrouvez rapidement les derniers projets enregistrés dans votre espace.</p></div>
              <button className="icon-button" type="button" onClick={() => void loadProjects()} disabled={loadingProjects} aria-label="Actualiser l’activité récente"><RefreshCw size={16} /></button>
            </div>
            {loadingProjects ? <p className="empty-state" role="status">Synchronisation des projets depuis Supabase…</p> : projects.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><FolderKanban size={24} /></div><h3>Votre espace est prêt</h3><p>Votre activité apparaîtra ici dès que vous aurez créé un premier projet.</p><button type="button" className="primary-button" onClick={() => document.getElementById('create-project')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Créer mon premier projet <ArrowRight size={16} /></button></div>
            ) : (
              <div className="project-list">
                {projects.slice(0, 4).map((project) => <article className="project-item" key={project.id}>
                  <div className="project-type-icon"><FolderKanban size={19} /></div>
                  <div className="project-info"><h3>{project.title}</h3><p>{project.description || 'Aucune description renseignée'}</p><div className="project-meta"><span className="project-type-label">{projectLabel[project.project_type] || project.project_type}</span><span className={`status-badge status-${project.status}`}><Clock3 size={12} /> {statusLabel[project.status] || project.status}</span></div></div>
                  <span className="muted">{new Date(project.created_at).toLocaleDateString('fr-FR')}</span>
                  <button className="open-project-button" type="button" onClick={() => void openProject(project)} disabled={busy}>Ouvrir <ArrowRight size={14} /></button>
                </article>)}
              </div>
            )}
          </section>}

          {!activeProject && activeSection === 'studio' && <StudioIA />}
          {!activeProject && activeSection === 'academy' && <Academy userId={session.user.id} />}
          {!activeProject && activeSection === 'resources' && <ResourceLibrary userId={session.user.id} />}
          {!activeProject && activeSection === 'discover' && <Discover userId={session.user.id} />}
          {!activeProject && activeSection === 'media' && <MediaLibrary userId={session.user.id} />}

          {!activeProject && activeSection === 'timeline' && <Timeline />}

          {!activeProject && activeSection === 'insights' && <Insights />}

          {!activeProject && activeSection === 'library' && <LearningLibrary userId={session.user.id} />}

          {!activeProject && activeSection === 'roadmap' && <Roadmap userId={session.user.id} />}

          {!activeProject && activeSection === 'billing' && <BillingPanel userId={session.user.id} role={profile?.role ?? 'user'} />}

          {!activeProject && activeSection === 'administration' && <AdminPanel userId={session.user.id} role={profile?.role ?? 'user'} />}

          {!activeProject && activeSection === 'design' && profile?.role === 'admin' && <VisualDesignStudio userId={session.user.id} role={profile.role} />}

          {!activeProject && activeSection === 'dashboard' && <section className="quick-access" aria-label="Accès rapides">
            <div className="quick-access-heading"><div><p className="eyebrow">CENTRE DE COMMANDE</p><h2>Accès rapides</h2><p className="muted">Reprenez votre travail ou démarrez une nouvelle création.</p></div></div>
            <div className="quick-access-grid">
              <button type="button" className="quick-access-card" onClick={() => document.getElementById('create-project')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span className="quick-access-icon"><Plus size={20} /></span><span><strong>Nouveau projet</strong><small>Créer un e-book, une formation ou un document</small></span><ArrowRight size={16} /></button>
              <button type="button" className="quick-access-card" onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span className="quick-access-icon"><FolderKanban size={20} /></span><span><strong>Bibliothèque de projets</strong><small>Retrouver et organiser vos créations</small></span><ArrowRight size={16} /></button>
              <button type="button" className="quick-access-card" onClick={() => { setSearchQuery(''); setStatusFilter('in_progress'); document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="quick-access-icon"><Clock3 size={20} /></span><span><strong>Reprendre un projet</strong><small>Afficher les projets en cours</small></span><ArrowRight size={16} /></button>
              <button type="button" className="quick-access-card" onClick={() => void loadProjects()}><span className="quick-access-icon"><RefreshCw size={20} /></span><span><strong>Synchroniser</strong><small>Recharger les données depuis Supabase</small></span><ArrowRight size={16} /></button>
            </div>
          </section>}

          {activeProject ? (
            activeProject.owner_id !== session.user.id ? (
              <CollaborationPanel projectId={activeProject.id} ownerId={activeProject.owner_id} userId={session.user.id} assets={projectAssets} />
            ) : <>
            <section id="studio-editor" className="project-panel editor-panel">
              <div className="section-heading editor-heading"><div><p className="eyebrow">ESPACE DE CRÉATION</p><h2>{activeProject.title}</h2><p className="muted">Rédigez votre contenu. Vos modifications sont enregistrées dans votre espace Supabase.</p></div><button className="logout-button" onClick={() => { if (!confirmDiscardUnsavedChapterChanges()) return; setActiveProject(null); setActiveAsset(null); setProjectAssets([]); setEditorContent(''); setError(''); setMessage(''); }}>Retour aux projets</button></div>
              <div className="editor-toolbar"><span><FolderKanban size={14} /> {projectLabel[activeProject.project_type] || activeProject.project_type}</span><label className="status-picker">Statut <select aria-label="Statut du projet" value={activeProject.status} onChange={(event) => void updateProjectStatus(event.target.value as StudioProject['status'])}><option value="draft">Brouillon</option><option value="in_progress">En cours</option><option value="completed">Terminé</option><option value="archived">Archivé</option></select></label><span>{projectAssets.length} chapitre(s)</span><span>{editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0} mots</span><span>{editorContent.length.toLocaleString("fr-FR")} caractères</span></div>
              <div className="chapter-layout"><aside className="chapter-sidebar"><div className="chapter-sidebar-heading"><strong>Structure</strong><button type="button" className="icon-button" onClick={() => void createChapter()} disabled={savingContent} aria-label="Ajouter un chapitre"><Plus size={16} /></button></div>{projectAssets.map((asset, index) => <div className="chapter-row" key={asset.id}><button type="button" className={activeAsset?.id === asset.id ? 'chapter-item active' : 'chapter-item'} onClick={() => selectAsset(asset)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{asset.title || `Chapitre ${index + 1}`}</strong></button><button type="button" className="chapter-delete-button" onClick={() => void deleteChapter(asset)} disabled={savingContent} aria-label={`Supprimer ${asset.title || 'le chapitre'}`} title="Supprimer le chapitre"><Trash2 size={14} /></button></div>)}{projectAssets.length === 0 && <p className="chapter-empty">Aucun chapitre. Ajoutez-en un pour commencer.</p>}</aside><div className="chapter-editor"><label className="editor-label" htmlFor="chapter-title">Titre du chapitre</label><input id="chapter-title" className="chapter-title-input" value={activeAsset?.title ?? ''} onChange={(event) => { const value = event.target.value; setActiveAsset((current) => current ? { ...current, title: value } : current); }} placeholder="Titre du chapitre" /><label className="editor-label" htmlFor="project-content">Contenu du chapitre</label>
              <textarea id="project-content" className="content-editor" value={editorContent} onChange={(event) => setEditorContent(event.target.value)} placeholder="Commencez à écrire ici…\n\nStructurez votre texte en sections et paragraphes." />
              <div className="editor-actions"><p className="muted">Exportez l’ensemble du projet en Markdown. Enregistrez les modifications avant l’export pour conserver la dernière version dans Supabase. Raccourci : Ctrl/⌘ + S.</p><div className="editor-button-group"><button type="button" className="logout-button" onClick={exportProjectMarkdown} disabled={projectAssets.length === 0}><ArrowRight size={15} /> Exporter le projet (.md)</button><button id="save-chapter-button" className="primary-button save-button" onClick={() => void saveProjectContent()} disabled={savingContent}>{savingContent ? 'Enregistrement…' : 'Enregistrer le chapitre'} <ShieldCheck size={16} /></button></div></div></div></div>
            </section>
            <CollaborationPanel projectId={activeProject.id} ownerId={activeProject.owner_id} userId={session.user.id} />
            </>
          ) : activeSection === 'projects' ? <>
          <div className="project-layout">
            <section className="project-panel">
              <div className="section-heading">
                <div><h2>Mes projets</h2><p className="muted">Vos créations enregistrées dans Supabase.</p></div>
                <button className="icon-button" onClick={() => void loadProjects()} disabled={loadingProjects} aria-label="Actualiser les projets"><RefreshCw size={16} /></button>
              </div>
              <div className="project-filters">
                <label className="search-field"><Search size={16} /><input aria-label="Rechercher un projet" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher un projet…" /></label>
                <select aria-label="Filtrer par statut" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tous les statuts</option><option value="draft">Brouillons</option><option value="in_progress">En cours</option><option value="completed">Terminés</option><option value="archived">Archivés</option></select>
              </div>
              {loadingProjects ? <p className="empty-state">Chargement des projets…</p> : projects.length === 0 ? (
                <div className="empty-state"><div className="empty-icon"><FolderKanban size={24} /></div><h3>Aucun projet pour le moment</h3><p>Créez votre premier projet depuis le formulaire. La création dépend des permissions de votre compte.</p></div>
              ) : (
                <div className="project-list">
                  {filteredProjects.length === 0 ? <p className="empty-state">Aucun projet ne correspond à votre recherche.</p> : filteredProjects.map((project) => (
                    <article className="project-item" key={project.id}>
                      <div className="project-type-icon"><FolderKanban size={19} /></div>
                      <div className="project-info"><h3>{project.title}</h3><p>{project.description || 'Aucune description'}</p><div className="project-meta"><span className="project-type-label">{projectLabel[project.project_type] || project.project_type}</span><span className={`status-badge status-${project.status}`}><Clock3 size={12} /> {statusLabel[project.status] || project.status}</span></div></div>
                      <button className="open-project-button" onClick={() => void openProject(project)} disabled={busy}>Ouvrir <ArrowRight size={14} /></button>
                      <button className="icon-button" type="button" onClick={() => editingProjectId === project.id ? setEditingProjectId(null) : beginEditProject(project)} aria-label={`Modifier ${project.title}`} title="Modifier le projet"><Pencil size={15} /></button>
                      <button className="delete-button" onClick={() => void deleteProject(project)} aria-label={`Supprimer ${project.title}`}><Trash2 size={16} /></button>
                      {editingProjectId === project.id && <form className="project-form project-edit-form" onSubmit={(event) => void saveProjectDetails(event, project)}>
                        <label htmlFor={`edit-title-${project.id}`}>Nom du projet</label><input id={`edit-title-${project.id}`} value={editProjectTitle} onChange={(event) => setEditProjectTitle(event.target.value)} maxLength={120} required />
                        <label htmlFor={`edit-type-${project.id}`}>Type</label><select id={`edit-type-${project.id}`} value={editProjectType} onChange={(event) => setEditProjectType(event.target.value)}><option value="ebook">E-book</option><option value="course">Formation</option><option value="document">Document</option><option value="translation">Traduction</option><option value="other">Autre</option></select>
                        <label htmlFor={`edit-description-${project.id}`}>Description</label><textarea id={`edit-description-${project.id}`} value={editProjectDescription} onChange={(event) => setEditProjectDescription(event.target.value)} rows={3} maxLength={1000} />
                        <div className="editor-actions"><button className="primary-button" type="submit" disabled={savingProjectDetails || !editProjectTitle.trim()}>{savingProjectDetails ? 'Enregistrement…' : 'Enregistrer'} <Check size={15} /></button><button className="logout-button" type="button" onClick={() => setEditingProjectId(null)} disabled={savingProjectDetails}><X size={15} /> Annuler</button></div>
                      </form>}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="create-project" className="project-panel create-panel">
              <p className="eyebrow">NOUVELLE CRÉATION</p>
              <h2>Créer un projet</h2>
              <p className="muted">{activeOrganizationId ? 'Espace entreprise sélectionné : le projet sera rattaché à cette organisation si la migration B2B est active.' : 'Enregistrez une nouvelle idée dans votre espace personnel.'}</p>
              {activeOrganizationId && tenantProjectsEnabled !== true && <p className="feedback error" role="status">Le rattachement B2B n’est pas encore disponible sur la base actuelle. La création dans cette organisation est bloquée pour éviter un projet mal isolé.</p>}
              <form onSubmit={createProject} className="project-form">
                <label htmlFor="project-title">Nom du projet</label>
                <input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Mon premier e-book" maxLength={120} required />
                <label htmlFor="project-type">Type de projet</label>
                <select id="project-type" value={projectType} onChange={(event) => setProjectType(event.target.value)}>
                  <option value="ebook">E-book</option><option value="course">Formation</option><option value="document">Document</option><option value="translation">Traduction</option><option value="other">Autre</option>
                </select>
                <label htmlFor="project-description">Description (facultatif)</label>
                <textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Décrivez votre idée…" rows={3} maxLength={1000} />
                <button className="primary-button" type="submit" disabled={busy || !title.trim()}>{busy ? 'Enregistrement…' : 'Créer le projet'} <Plus size={17} /></button>
              </form>
            </section>
          </div></> : null}
          {error && <p className="feedback error" role="alert">{error}</p>}
          {message && <p className="feedback success" role="status">{message}</p>}
          <p className="workspace-footnote">Studio IA est disponible pour les demandes authentifiées. Les réponses nécessitent la configuration du fournisseur côté serveur.</p>
          </div>
          </div>
        </section>
      ) : (
        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">VOTRE ESPACE DE CRÉATION</p>
            <h1>Donnez vie à vos idées avec <span>l’intelligence artificielle.</span></h1>
            <p className="hero-description">Un espace de travail conçu pour organiser vos projets, vos contenus et vos prochaines créations.</p>
            <div className="feature-list">
              <div><span className="feature-dot">✓</span><span>Un compte personnel sécurisé</span></div>
              <div><span className="feature-dot">✓</span><span>Vos projets réunis au même endroit</span></div>
              <div><span className="feature-dot">✓</span><span>Une base prête pour les prochaines fonctionnalités</span></div>
            </div>
          </div>
          <section className="auth-card" aria-labelledby="auth-title">
            <p className="eyebrow">BIENVENUE CHEZ JDV NEXORA</p>
            <h2 id="auth-title">{mode === 'signin' ? 'Connectez-vous' : 'Créer un compte'}</h2>
            <p className="muted">{mode === 'signin' ? 'Retrouvez votre espace de travail.' : 'Commencez par créer votre compte personnel.'}</p>
            <div className="mode-switch" role="tablist" aria-label="Type d’accès">
              <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Connexion</button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Inscription</button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              <label htmlFor="email">Adresse e-mail</label>
              <input id="email" type="email" autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <label htmlFor="password">Mot de passe</label>
              <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="8 caractères minimum conseillé" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
              {mode === 'signin' && <button className="text-button forgot" type="button" onClick={resetPassword} disabled={busy}>Mot de passe oublié ?</button>}
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Veuillez patienter…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'} <ArrowRight size={17} /></button>
            </form>
            {!isSupabaseConfigured && <p className="config-warning">Configuration requise : créez un fichier <code>.env.local</code> à partir de <code>.env.example</code>.</p>}
            {error && <p className="feedback error" role="alert">{error}</p>}
            {message && <p className="feedback success" role="status">{message}</p>}
            <p className="terms">En continuant, vous acceptez les règles d’utilisation de JDV NEXORA.</p>
          </section>
        </section>
      )}
      <footer className="footer"><span>© {new Date().getFullYear()} JDV GLOBAL CENTER</span><span>Conçu pour créer. Pensé pour évoluer.</span></footer>
    </main>
  );
}
