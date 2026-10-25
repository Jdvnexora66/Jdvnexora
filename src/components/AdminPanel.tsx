import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Profile = { id: string; display_name: string | null; preferred_language: string; role: 'user'|'admin'; created_at: string };
type AuditLog = { id: number; actor_id: string | null; action: string; table_name: string | null; record_id: string | null; metadata: Record<string, unknown>; created_at: string };

export default function AdminPanel({ userId, role }: { userId: string; role: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    if (!supabase || !isAdmin) { setLoading(false); return; }
    setLoading(true); setError('');
    const [profileResult, logResult] = await Promise.all([
      supabase.from('profiles').select('id,display_name,preferred_language,role,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_logs').select('id,actor_id,action,table_name,record_id,metadata,created_at').order('created_at', { ascending: false }).limit(50),
    ]);
    if (profileResult.error) setError('Chargement des comptes impossible : ' + profileResult.error.message);
    else setProfiles((profileResult.data ?? []) as Profile[]);
    if (logResult.error) setError('Chargement du journal impossible : ' + logResult.error.message);
    else setLogs((logResult.data ?? []) as AuditLog[]);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  async function setRole(target: Profile, nextRole: Profile['role']) {
    if (!supabase || !isAdmin || target.id === userId) return;
    if (!window.confirm('Modifier le rôle de ce compte ?')) return;
    setError(''); setNotice('');
    const { error: updateError } = await supabase.from('profiles').update({ role: nextRole, updated_at: new Date().toISOString() }).eq('id', target.id);
    if (updateError) { setError('Modification du rôle refusée : ' + updateError.message); return; }
    setProfiles(current => current.map(item => item.id === target.id ? { ...item, role: nextRole } : item));
    setNotice('Rôle mis à jour. Le journal d’audit dépend des événements enregistrés par les fonctions métier.');
  }

  if (!isAdmin) return null;

  return <section id="administration" className="project-panel admin-panel">
    <div className="section-heading"><div><p className="eyebrow">CONTRÔLE DE LA PLATEFORME</p><h2><ShieldCheck size={21}/> Administration</h2><p className="muted">Gérez les rôles et consultez les événements d’audit enregistrés.</p></div><button type="button" className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Actualiser l’administration"><RefreshCw size={16}/></button></div>
    {loading ? <p className="empty-state">Chargement des données d’administration…</p> : <>
      <div className="dashboard-stats"><article className="stat-card"><span className="stat-icon"><Users size={18}/></span><div><p>Comptes visibles</p><strong>{profiles.length}</strong><small>Maximum 200 comptes récents</small></div></article><article className="stat-card"><span className="stat-icon"><Activity size={18}/></span><div><p>Événements d’audit</p><strong>{logs.length}</strong><small>Maximum 50 événements récents</small></div></article></div>
      <div className="admin-section"><h3><Users size={17}/> Comptes et rôles</h3>{profiles.length ? <div className="project-list">{profiles.map(item => <article className="project-item" key={item.id}><div className="project-type-icon"><Users size={18}/></div><div className="project-info"><h3>{item.display_name || 'Compte sans nom'}</h3><p>{item.id}</p><small>Langue : {item.preferred_language} · Créé le {new Date(item.created_at).toLocaleDateString('fr-FR')}</small></div><span className={item.role === 'admin' ? 'status-badge status-completed' : 'status-badge'}>{item.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span><select aria-label="Rôle du compte" value={item.role} disabled={item.id === userId} onChange={event => void setRole(item, event.target.value as Profile['role'])}><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select></article>)}</div> : <p className="empty-state">Aucun compte trouvé.</p>}</div>
      <div className="admin-section"><h3><Activity size={17}/> Journal d’audit</h3>{logs.length ? <div className="collaboration-comment-list">{logs.map(log => <article className="collaboration-comment" key={log.id}><div className="collaboration-comment-meta"><strong>{log.action}</strong><time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString('fr-FR')}</time></div><p>{log.table_name || 'Événement système'}{log.record_id ? ' · Enregistrement ' + log.record_id : ''}</p><small>Acteur : {log.actor_id || 'Système'}</small></article>)}</div> : <p className="empty-state">Aucun événement d’audit n’est encore enregistré.</p>}</div>
    </>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    {notice && <p className="feedback success" role="status">{notice}</p>}
  </section>;
}
