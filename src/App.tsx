import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, ShieldCheck, Sparkles, FolderKanban, Plus, Trash2, RefreshCw, LogOut, Clock3 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type AuthMode = 'signin' | 'signup';
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
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('ebook');
  const [busy, setBusy] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

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
        ? 'Création bloquée par les permissions actuelles du Studio. Le compte doit disposer d’un accès Studio autorisé (administrateur ou abonnement actif).'
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

      {session ? (
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

          <div className="project-layout">
            <section className="project-panel">
              <div className="section-heading">
                <div><h2>Mes projets</h2><p className="muted">Vos créations enregistrées dans Supabase.</p></div>
                <button className="icon-button" onClick={() => void loadProjects()} disabled={loadingProjects} aria-label="Actualiser les projets"><RefreshCw size={16} /></button>
              </div>
              {loadingProjects ? <p className="empty-state">Chargement des projets…</p> : projects.length === 0 ? (
                <div className="empty-state"><div className="empty-icon"><FolderKanban size={24} /></div><h3>Aucun projet pour le moment</h3><p>Créez votre premier projet depuis le formulaire. La création dépend des permissions de votre compte.</p></div>
              ) : (
                <div className="project-list">
                  {projects.map((project) => (
                    <article className="project-item" key={project.id}>
                      <div className="project-type-icon"><FolderKanban size={19} /></div>
                      <div className="project-info"><h3>{project.title}</h3><p>{project.description || 'Aucune description'}</p><div className="project-meta"><span>{projectLabel[project.project_type] || project.project_type}</span><span><Clock3 size={12} /> {statusLabel[project.status] || project.status}</span></div></div>
                      <button className="delete-button" onClick={() => void deleteProject(project)} aria-label={`Supprimer ${project.title}`}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="project-panel create-panel">
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
          </div>
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
