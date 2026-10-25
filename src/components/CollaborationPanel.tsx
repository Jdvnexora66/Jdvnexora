import { FormEvent, useCallback, useEffect, useState } from 'react';
import { MessageSquare, Send, Trash2, UserPlus, Users, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Member = { id: string; project_id: string; user_id: string; role: 'viewer'|'commenter'|'editor'; created_at: string };
type Comment = { id: string; project_id: string; user_id: string; body: string; created_at: string; updated_at: string };

export default function CollaborationPanel({ projectId, ownerId, userId }: { projectId: string; ownerId: string; userId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState<Member['role']>('commenter');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isOwner = ownerId === userId;

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase n’est pas configuré.'); setLoading(false); return; }
    setLoading(true); setError('');
    const [memberResult, commentResult] = await Promise.all([
      supabase.from('studio_project_members').select('id,project_id,user_id,role,created_at').eq('project_id', projectId).order('created_at'),
      supabase.from('studio_project_comments').select('id,project_id,user_id,body,created_at,updated_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(100),
    ]);
    if (memberResult.error) setError('Chargement des membres impossible : ' + memberResult.error.message);
    else setMembers((memberResult.data ?? []) as Member[]);
    if (commentResult.error) setError('Chargement des commentaires impossible : ' + commentResult.error.message);
    else setComments((commentResult.data ?? []) as Comment[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !memberId.trim()) return;
    setSaving(true); setError(''); setNotice('');
    const { error: insertError } = await supabase.from('studio_project_members').insert({
      project_id: projectId, user_id: memberId.trim(), role, invited_by: userId,
    });
    setSaving(false);
    if (insertError) { setError(insertError.code === '23505' ? 'Cet utilisateur est déjà membre du projet.' : 'Ajout du membre impossible : ' + insertError.message); return; }
    setMemberId(''); setNotice('Membre ajouté. Communiquez-lui l’identifiant du projet pour le retrouver dans son espace.');
    await load();
  }

  async function changeRole(member: Member, nextRole: Member['role']) {
    if (!supabase || !isOwner) return;
    const { error: updateError } = await supabase.from('studio_project_members').update({ role: nextRole }).eq('id', member.id);
    if (updateError) { setError('Modification du rôle impossible : ' + updateError.message); return; }
    setMembers(current => current.map(item => item.id === member.id ? { ...item, role: nextRole } : item));
  }

  async function removeMember(member: Member) {
    if (!supabase || !isOwner || !window.confirm('Retirer ce membre du projet ?')) return;
    const { error: deleteError } = await supabase.from('studio_project_members').delete().eq('id', member.id);
    if (deleteError) { setError('Retrait du membre impossible : ' + deleteError.message); return; }
    setMembers(current => current.filter(item => item.id !== member.id));
    setNotice('Membre retiré du projet.');
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !body.trim()) return;
    setSaving(true); setError(''); setNotice('');
    const { data, error: insertError } = await supabase.from('studio_project_comments')
      .insert({ project_id: projectId, user_id: userId, body: body.trim() })
      .select('id,project_id,user_id,body,created_at,updated_at').single();
    setSaving(false);
    if (insertError) { setError('Publication impossible : ' + insertError.message); return; }
    setComments(current => [data as Comment, ...current]); setBody(''); setNotice('Commentaire publié.');
  }

  async function deleteComment(comment: Comment) {
    if (!supabase || (comment.user_id !== userId && !isOwner) || !window.confirm('Supprimer ce commentaire ?')) return;
    const { error: deleteError } = await supabase.from('studio_project_comments').delete().eq('id', comment.id);
    if (deleteError) { setError('Suppression impossible : ' + deleteError.message); return; }
    setComments(current => current.filter(item => item.id !== comment.id));
  }

  const roleLabel: Record<Member['role'], string> = { viewer: 'Lecture seule', commenter: 'Commentaire', editor: 'Éditeur' };

  return <section className="project-panel collaboration-panel" aria-labelledby="collaboration-title">
    <div className="section-heading">
      <div><p className="eyebrow">ESPACE PARTAGÉ</p><h2 id="collaboration-title"><Users size={21} /> Collaboration</h2><p className="muted">Gérez les membres et échangez sur ce projet.</p></div>
      <button type="button" className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Actualiser la collaboration"><RefreshCw size={16} /></button>
    </div>
    {isOwner && <div className="collaboration-members">
      <h3><Users size={17} /> Membres du projet</h3>
      <form className="project-form collaboration-member-form" onSubmit={addMember}>
        <label htmlFor="collab-user-id">Identifiant utilisateur (UUID Supabase)</label>
        <input id="collab-user-id" value={memberId} onChange={event => setMemberId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required pattern="[0-9a-fA-F-]{36}" title="Saisissez l’UUID du compte Supabase." />
        <label htmlFor="collab-role">Rôle</label>
        <select id="collab-role" value={role} onChange={event => setRole(event.target.value as Member['role'])}>
          <option value="viewer">Lecture seule</option><option value="commenter">Commentaire</option><option value="editor">Éditeur (commentaires uniquement pour le moment)</option>
        </select>
        <button className="primary-button" type="submit" disabled={saving}><UserPlus size={16} /> Ajouter un membre</button>
      </form>
      {members.length ? <ul className="collaboration-member-list">{members.map(member => <li key={member.id}>
        <div><strong>{member.user_id === userId ? 'Vous' : member.user_id}</strong><small>{roleLabel[member.role]}</small></div>
        <div className="collaboration-member-actions"><select aria-label="Rôle du membre" value={member.role} onChange={event => void changeRole(member, event.target.value as Member['role'])}><option value="viewer">Lecture seule</option><option value="commenter">Commentaire</option><option value="editor">Éditeur</option></select><button type="button" className="icon-button" onClick={() => void removeMember(member)} aria-label="Retirer le membre"><Trash2 size={15}/></button></div>
      </li>)}</ul> : <p className="muted">Aucun membre ajouté pour le moment.</p>}
    </div>}
    {!isOwner && <p className="muted">Vous consultez ce projet en tant que collaborateur. L’édition des chapitres partagés n’est pas encore activée.</p>}
    <div className="collaboration-comments">
      <h3><MessageSquare size={17} /> Commentaires ({comments.length})</h3>
      <form className="project-form" onSubmit={addComment}>
        <label htmlFor="collab-comment">Votre commentaire</label>
        <textarea id="collab-comment" value={body} onChange={event => setBody(event.target.value)} rows={3} maxLength={4000} placeholder="Partagez une idée, une question ou un retour…" required />
        <button className="primary-button" type="submit" disabled={saving || !body.trim()}><Send size={15} /> Publier le commentaire</button>
      </form>
      {loading ? <p className="empty-state">Chargement des commentaires…</p> : comments.length === 0 ? <p className="empty-state">Aucun commentaire. Lancez la discussion.</p> : <div className="collaboration-comment-list">{comments.map(comment => <article className="collaboration-comment" key={comment.id}>
        <div className="collaboration-comment-meta"><strong>{comment.user_id === userId ? 'Vous' : 'Membre ' + comment.user_id.slice(0, 8)}</strong><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString('fr-FR')}</time></div>
        <p>{comment.body}</p>
        {(comment.user_id === userId || isOwner) && <button type="button" className="text-button" onClick={() => void deleteComment(comment)}><Trash2 size={14}/> Supprimer</button>}
      </article>)}</div>}
    </div>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {notice && <p className="feedback success" role="status">{notice}</p>}
  </section>;
}
