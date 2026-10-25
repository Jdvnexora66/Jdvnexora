import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, ShieldCheck, Sparkles, FolderKanban, Plus, Trash2, RefreshCw, LogOut, Clock3, Search, CalendarDays, Compass, Bookmark, CalendarClock } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import Discover from './components/Discover';
import Timeline from './components/Timeline';
import Insights from './components/Insights';
import LearningLibrary from './components/LearningLibrary';
import Academy from './components/Academy';
import Roadmap from './components/Roadmap';

type AuthMode = 'signin' | 'signup';
type StudioAsset = { id: string; project_id: string; owner_id: string; title: string; content: string | null; kind: string; updated_at: string; };
type StudioProject = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  project_type: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
};

export default function App() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [projects, setProjects] = useState<StudioProject[]>([]);
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
    if (session?.user.id) void loadProjects();
    else setProjects([]);
  }, [session?.user.id]);

  async function loadProjects() {
    if (!supabase || !session?.user.id) return;
    setLoadingProjects(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('studio_projects')
      .select('id, owner_id, title, description, project_type, status, created_at')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false });
    if (queryError) setError('Impossible de charger les projets : ' + queryError.message);
    else setProjects((data ?? []) as StudioProject[]);
    setLoadingProjects(false);
  }

  async function openProject(project: StudioProject) {
    if (!supabase || !session?.user.id) return;
    setBusy(true); setError(''); setMessage('');
    const { data, error: assetError } = await supabase.from('studio_assets').select('id, project_id, owner_id, title, content, kind, updated_at').eq('project_id', project.id).eq('owner_id', session.user.id).order('created_at', { ascending: true });
    if (assetError) { setError('Ouverture impossible : ' + assetError.message); setBusy(false); return; }
    const assets = (data ?? []) as StudioAsset[];
    setActiveProject(project); setProjectAssets(assets); setActiveAsset(assets[0] ?? null); setEditorContent(assets[0]?.content ?? ''); setBusy(false);
  }

  async function saveProjectContent() {
    if (!supabase || !session?.user.id || !activeProject) return;
    setSavingContent(true); setError(''); setMessage('');
    const payload = { project_id: activeProject.id, owner_id: session.user.id, kind: activeProject.project_type === 'ebook' ? 'ebook' : activeProject.project_type === 'course' ? 'course_material' : activeProject.project_type === 'translation' ? 'translation' : 'document', title: activeAsset?.title || 'Chapitre 1', content: editorContent, language: 'fr' };
    const result = activeAsset ? await supabase.from('studio_assets').update({ title: activeAsset.title || 'Chapitre', content: editorContent, updated_at: new Date().toISOString() }).eq('id', activeAsset.id).eq('owner_id', session.user.id).select('id, project_id, owner_id, title, content, kind, updated_at').single() : await supabase.from('studio_assets').insert(payload).select('id, project_id, owner_id, title, content, kind, updated_at').single();
    setSavingContent(false);
    if (result.error) { setError('Enregistrement impossible : ' + result.error.message); return; }
    const saved = result.data as StudioAsset;
    setActiveAsset(saved); setProjectAssets((current) => activeAsset ? current.map((asset) => asset.id === saved.id ? saved : asset) : [...current, saved]); setMessage('Contenu enregistré dans Supabase.');
  }

  function selectAsset(asset: StudioAsset) {
    setActiveAsset(asset);
    setEditorContent(asset.content ?? '');
    setError(''); setMessage('');
  }

  async function createChapter() {
    if (!supabase || !session?.user.id || !activeProject) return;
    const chapterNumber = projectAssets.length + 1;
    setSavingContent(true); setError(''); setMessage('');
    const { data, error: insertError } = await supabase.from('studio_assets').insert({
      project_id: activeProject.id, owner_id: session.user.id,
      kind: activeProject.project_type === 'ebook' ? 'ebook' : activeProject.project_type === 'course' ? 'course_material' : 'document',
      title: `Chapitre ${chapterNumber}`, content: '', language: 'fr',
    }).select('id, project_id, owner_id, title, content, kind, updated_at').single();
    setSavingContent(false);
    if (insertError) { setError('Création du chapitre impossible : ' + insertError.message); return; }
    const asset = data as StudioAsset;
    setProjectAssets((current) => [...current, asset]); setActiveAsset(asset); setEditorContent(''); setMessage('Nouveau chapitre créé.');
  }

  async function deleteChapter(asset: StudioAsset) {
    if (!supabase || !session?.user.id || !activeProject) return;
    if (!window.confirm(`Supprimer définitivement « ${asset.title || 'ce chapitre'} » ?`)) return;
    setSavingContent(true); setError(''); setMessage('');
    const { error: deleteError } = await supabase.from('studio_assets')
      .delete().eq('id', asset.id).eq('project_id', activeProject.id).eq('owner_id', session.user.id);
    setSavingContent(false);
    if (deleteError) { setError('Suppression du chapitre impossible : ' + deleteError.message); return; }
    const remaining = projectAssets.filter((item) => item.id !== asset.id);
    setProjectAssets(remaining);
    if (activeAsset?.id === asset.id) {
      const next = remaining[0] ?? null;
      setActiveAsset(next);
      setEditorContent(next?.content ?? '');
    }
    setMessage('Chapitre supprimé.');
  }

  async function updateProjectStatus(status: StudioProject['status']) {
    if (!supabase || !session?.user.id || !activeProject) return;
    setError(''); setMessage('');
    const { data, error: updateError } = await supabase.from('studio_projects').update({ status }).eq('id', activeProject.id).eq('owner_id', session.user.id).select('id, owner_id, title, description, project_type, status, created_at').single();
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
    setBusy(true);
    setError('');
    setMessage('');
    const { data, error: insertError } = await supabase
      .from('studio_projects')
      .insert({
        owner_id: session.user.id,
        title: title.trim(),
        description: description.trim() || null,
        project_type: projectType,
        status: 'draft',
      })
      .select('id, owner_id, title, description, project_type, status, created_at')
      .single();
    setBusy(false);
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
  }

  async function deleteProject(project: StudioProject) {
    if (!supabase || !session?.user.id || !window.confirm(`Supprimer le projet « ${project.title} » ?`)) return;
    setError('');
    const { error: deleteError } = await supabase.from('studio_projects').delete().eq('id', project.id).eq('owner_id', session.user.id);
    if (deleteError) setError('Suppression impossible : ' + deleteError.message);
    else {
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setMessage('Projet supprimé.');
    }
  }

  async function signOut() {
    if (!supabase) return;
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
        <div className="topbar-actions">
          <span className="secure-label"><ShieldCheck size={16} /> Espace sécurisé</span>
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
              <h1>Bonjour, <span>créateur.</span></h1>
              <p className="hero-description">Organisez vos idées et retrouvez vos projets au même endroit.</p>
              <p className="user-email"><ShieldCheck size={14} /> {session.user.email}</p>
            </div>
            <div className="workspace-mark"><FolderKanban size={30} /></div>
          </div>

          <nav className="workspace-nav" aria-label="Navigation de l’espace">
            <a className="workspace-nav-link" href="#roadmap" onClick={(event) => { event.preventDefault(); document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><CalendarClock size={16} /> Roadmap</a>
            <a className="workspace-nav-link" href="#library" onClick={(event) => { event.preventDefault(); document.getElementById('library')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><Bookmark size={16} /> Bibliothèque</a>
            <a className="workspace-nav-link" href="#insights" onClick={(event) => { event.preventDefault(); document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><Sparkles size={16} /> Insights</a>
            <a className="workspace-nav-link" href="#timeline" onClick={(event) => { event.preventDefault(); document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><CalendarDays size={16} /> Timeline</a>
            <a className="workspace-nav-link" href="#discover" onClick={(event) => { event.preventDefault(); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><Compass size={16} /> Discover</a>
            <a className={!activeProject ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#projects" onClick={(event) => { event.preventDefault(); setActiveProject(null); setActiveAsset(null); setProjectAssets([]); setEditorContent(''); setError(''); setMessage(''); }}><FolderKanban size={16} /> Mes projets</a>
            <a className={activeProject ? 'workspace-nav-link active' : 'workspace-nav-link'} href="#studio" onClick={(event) => { event.preventDefault(); if (activeProject) document.getElementById('studio-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else document.getElementById('create-project')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><Sparkles size={16} /> Studio de création</a>
            <button className="workspace-nav-link" type="button" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setActiveProject(null); setActiveAsset(null); setProjectAssets([]); setEditorContent(''); void loadProjects(); }}><RefreshCw size={15} /> Actualiser</button>
          </nav>

          <div className="dashboard-stats" aria-label="Résumé de vos projets">
            <article className="stat-card"><span className="stat-icon"><FolderKanban size={18} /></span><div><p>Total des projets</p><strong>{projects.length}</strong><small>Tous vos espaces</small></div></article>
            <article className="stat-card"><span className="stat-icon"><Clock3 size={18} /></span><div><p>En cours</p><strong>{projects.filter((project) => project.status === 'in_progress').length}</strong><small>À faire avancer</small></div></article>
            <article className="stat-card"><span className="stat-icon"><ShieldCheck size={18} /></span><div><p>Terminés</p><strong>{projects.filter((project) => project.status === 'completed').length}</strong><small>Projets finalisés</small></div></article>
            <article className="stat-card"><span className="stat-icon"><Sparkles size={18} /></span><div><p>Brouillons</p><strong>{projects.filter((project) => project.status === 'draft').length}</strong><small>Idées à développer</small></div></article>
          </div>

          {!activeProject && <Academy userId={session.user.id} />}
          {!activeProject && <Discover userId={session.user.id} />}

          {!activeProject && <Timeline />}

          {!activeProject && <Insights />}

          {!activeProject && <LearningLibrary userId={session.user.id} />}

          {!activeProject && <Roadmap userId={session.user.id} />}

          {!activeProject && <section className="quick-access" aria-label="Accès rapides">
            <div className="quick-access-heading"><div><p className="eyebrow">CENTRE DE COMMANDE</p><h2>Accès rapides</h2><p className="muted">Reprenez votre travail ou démarrez une nouvelle création.</p></div></div>
            <div className="quick-access-grid">
              <button type="button" className="quick-access-card" onClick={() => document.getElementById('create-project')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span className="quick-access-icon"><Plus size={20} /></span><span><strong>Nouveau projet</strong><small>Créer un e-book, une formation ou un document</small></span><ArrowRight size={16} /></button>
              <button type="button" className="quick-access-card" onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span className="quick-access-icon"><FolderKanban size={20} /></span><span><strong>Bibliothèque de projets</strong><small>Retrouver et organiser vos créations</small></span><ArrowRight size={16} /></button>
              <button type="button" className="quick-access-card" onClick={() => { setSearchQuery(''); setStatusFilter('in_progress'); document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="quick-access-icon"><Clock3 size={20} /></span><span><strong>Reprendre un projet</strong><small>Afficher les projets en cours</small></span><ArrowRight size={16} /></button>
              <button type="button" className="quick-access-card" onClick={() => void loadProjects()}><span className="quick-access-icon"><RefreshCw size={20} /></span><span><strong>Synchroniser</strong><small>Recharger les données depuis Supabase</small></span><ArrowRight size={16} /></button>
            </div>
          </section>}

          {activeProject ? (
            <section id="studio-editor" className="project-panel editor-panel">
              <div className="section-heading editor-heading"><div><p className="eyebrow">ESPACE DE CRÉATION</p><h2>{activeProject.title}</h2><p className="muted">Rédigez votre contenu. Vos modifications sont enregistrées dans votre espace Supabase.</p></div><button className="logout-button" onClick={() => { setActiveProject(null); setActiveAsset(null); setProjectAssets([]); setEditorContent(''); setError(''); setMessage(''); }}>Retour aux projets</button></div>
              <div className="editor-toolbar"><span><FolderKanban size={14} /> {projectLabel[activeProject.project_type] || activeProject.project_type}</span><label className="status-picker">Statut <select aria-label="Statut du projet" value={activeProject.status} onChange={(event) => void updateProjectStatus(event.target.value as StudioProject['status'])}><option value="draft">Brouillon</option><option value="in_progress">En cours</option><option value="completed">Terminé</option><option value="archived">Archivé</option></select></label><span>{projectAssets.length} chapitre(s)</span><span>{editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0} mots</span><span>{editorContent.length.toLocaleString("fr-FR")} caractères</span></div>
              <div className="chapter-layout"><aside className="chapter-sidebar"><div className="chapter-sidebar-heading"><strong>Structure</strong><button type="button" className="icon-button" onClick={() => void createChapter()} disabled={savingContent} aria-label="Ajouter un chapitre"><Plus size={16} /></button></div>{projectAssets.map((asset, index) => <div className="chapter-row" key={asset.id}><button type="button" className={activeAsset?.id === asset.id ? 'chapter-item active' : 'chapter-item'} onClick={() => selectAsset(asset)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{asset.title || `Chapitre ${index + 1}`}</strong></button><button type="button" className="chapter-delete-button" onClick={() => void deleteChapter(asset)} disabled={savingContent} aria-label={`Supprimer ${asset.title || 'le chapitre'}`} title="Supprimer le chapitre"><Trash2 size={14} /></button></div>)}{projectAssets.length === 0 && <p className="chapter-empty">Aucun chapitre. Ajoutez-en un pour commencer.</p>}</aside><div className="chapter-editor"><label className="editor-label" htmlFor="chapter-title">Titre du chapitre</label><input id="chapter-title" className="chapter-title-input" value={activeAsset?.title ?? ''} onChange={(event) => { const value = event.target.value; setActiveAsset((current) => current ? { ...current, title: value } : current); }} placeholder="Titre du chapitre" /><label className="editor-label" htmlFor="project-content">Contenu du chapitre</label>
              <textarea id="project-content" className="content-editor" value={editorContent} onChange={(event) => setEditorContent(event.target.value)} placeholder="Commencez à écrire ici…\n\nStructurez votre texte en sections et paragraphes." />
              <div className="editor-actions"><p className="muted">Enregistrez chaque chapitre avant de quitter. Raccourci : Ctrl/⌘ + S.</p><button id="save-chapter-button" className="primary-button save-button" onClick={() => void saveProjectContent()} disabled={savingContent}>{savingContent ? 'Enregistrement…' : 'Enregistrer le chapitre'} <ShieldCheck size={16} /></button></div></div></div>
            </section>
          ) : <>
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
                      <button className="open-project-button" onClick={() => void openProject(project)} disabled={busy}>Ouvrir <ArrowRight size={14} /></button><button className="delete-button" onClick={() => void deleteProject(project)} aria-label={`Supprimer ${project.title}`}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="create-project" className="project-panel create-panel">
              <p className="eyebrow">NOUVELLE CRÉATION</p>
              <h2>Créer un projet</h2>
              <p className="muted">Enregistrez une nouvelle idée dans votre espace.</p>
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
          </div></>}
          {error && <p className="feedback error" role="alert">{error}</p>}
          {message && <p className="feedback success" role="status">{message}</p>}
          <p className="workspace-footnote">Le Studio IA complet reste en préparation. Les autorisations Supabase sont appliquées à chaque opération.</p>
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
