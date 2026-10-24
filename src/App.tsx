import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type AuthMode = 'signin' | 'signup';

export default function App() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!supabase) {
      setError('La connexion Supabase n’est pas configurée. Renseignez les variables du fichier .env.local.');
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
    if (!supabase) {
      setError('La connexion Supabase n’est pas configurée.');
      return;
    }
    if (!email.trim()) {
      setError('Saisissez votre adresse e-mail pour recevoir le lien de réinitialisation.');
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setMessage('Si cette adresse est enregistrée, un e-mail de réinitialisation sera envoyé.');
  }

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else setMessage('Vous êtes déconnecté.');
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="JDV NEXORA accueil">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>JDV <strong>NEXORA</strong><small>AI STUDIO</small></span>
        </a>
        <span className="secure-label"><ShieldCheck size={16} /> Espace sécurisé</span>
      </header>

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
          {session ? (
            <div className="signed-in">
              <div className="success-icon"><ShieldCheck size={26} /></div>
              <p className="eyebrow">SESSION ACTIVE</p>
              <h2 id="auth-title">Bienvenue !</h2>
              <p className="muted">Connecté en tant que <strong>{session.user.email}</strong></p>
              <p className="notice">L’espace Studio reste désactivé pendant la validation des rôles et des règles de sécurité.</p>
              <button className="primary-button" onClick={signOut} disabled={busy}>Se déconnecter <ArrowRight size={17} /></button>
            </div>
          ) : (
            <>
              <p className="eyebrow">BIENVENUE CHEZ JDV NEXORA</p>
              <h2 id="auth-title">{mode === 'signin' ? 'Connectez-vous' : 'Créer un compte'}</h2>
              <p className="muted">{mode === 'signin' ? 'Retrouvez votre espace de travail.' : 'Commencez par créer votre compte personnel.'}</p>
              <div className="mode-switch" role="tablist" aria-label="Type d’accès">
                <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Connexion</button>
                <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Inscription</button>
              </div>
              <form onSubmit={handleSubmit}>
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
            </>
          )}
        </section>
      </section>
      <footer className="footer"><span>© {new Date().getFullYear()} JDV GLOBAL CENTER</span><span>Conçu pour créer. Pensé pour évoluer.</span></footer>
    </main>
  );
}
