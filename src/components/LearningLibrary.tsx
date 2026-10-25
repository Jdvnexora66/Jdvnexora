import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bookmark, CheckCircle2, Heart, RefreshCw, StickyNote, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LearningItem = {
  id: string; user_id: string; content_item_id: string | null; entrepreneur_id: string | null;
  item_type: 'favorite' | 'note' | 'bookmark' | 'goal'; note: string | null; progress: number;
  completed_at: string | null; created_at: string;
  entrepreneur: { name: string } | null;
  content: { title: string; canonical_url: string } | null;
};

export default function LearningLibrary({ userId }: { userId: string }) {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'favorite' | 'note' | 'bookmark' | 'goal'>('note');
  const [targetType, setTargetType] = useState<'entrepreneur' | 'content'>('entrepreneur');
  const [entrepreneurId, setEntrepreneurId] = useState('');
  const [contentId, setContentId] = useState('');
  const [note, setNote] = useState('');
  const [entrepreneurs, setEntrepreneurs] = useState<{id:string;name:string}[]>([]);
  const [contents, setContents] = useState<{id:string;title:string}[]>([]);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré.'); return; }
    setLoading(true); setError('');
    const [library, people, media] = await Promise.all([
      supabase.from('user_learning_items').select('id,user_id,content_item_id,entrepreneur_id,item_type,note,progress,completed_at,created_at,entrepreneur:entrepreneurs(name),content:content_items(title,canonical_url)').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      supabase.from('entrepreneurs').select('id,name').eq('visibility','public').order('name').limit(200),
      supabase.from('content_items').select('id,title').order('title').limit(200),
    ]);
    if (library.error) setError(library.error.message.includes('user_learning_items') ? 'La bibliothèque sera disponible après application de la migration Supabase.' : library.error.message);
    else setItems((library.data ?? []) as unknown as LearningItem[]);
    if (!people.error) setEntrepreneurs(people.data ?? []);
    if (!media.error) setContents(media.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const entityId = targetType === 'entrepreneur' ? entrepreneurId : contentId;
    if (!entityId) { setError('Choisissez un entrepreneur ou un contenu.'); return; }
    setError(''); setMessage('');
    const payload = { user_id: userId, item_type: kind, note: note.trim() || null, entrepreneur_id: targetType === 'entrepreneur' ? entityId : null, content_item_id: targetType === 'content' ? entityId : null };
    const { error: insertError } = await supabase.from('user_learning_items').insert(payload);
    if (insertError) { setError(insertError.message); return; }
    setNote(''); setMessage('Élément ajouté à votre bibliothèque.'); await load();
  }

  async function updateProgress(item: LearningItem, progress: number) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('user_learning_items').update({ progress, completed_at: progress === 100 ? new Date().toISOString() : null }).eq('id', item.id).eq('user_id', userId);
    if (updateError) setError(updateError.message);
    else { setItems(current => current.map(row => row.id === item.id ? { ...row, progress, completed_at: progress === 100 ? new Date().toISOString() : null } : row)); setMessage('Progression mise à jour.'); }
  }

  async function remove(item: LearningItem) {
    if (!supabase || !window.confirm('Retirer cet élément de votre bibliothèque ?')) return;
    const { error: deleteError } = await supabase.from('user_learning_items').delete().eq('id', item.id).eq('user_id', userId);
    if (deleteError) setError(deleteError.message);
    else { setItems(current => current.filter(row => row.id !== item.id)); setMessage('Élément retiré.'); }
  }

  const label: Record<string,string> = { favorite:'Favori', note:'Note', bookmark:'À consulter', goal:'Objectif' };
  const icon = (type: string) => type === 'favorite' ? <Heart size={16}/> : type === 'bookmark' ? <Bookmark size={16}/> : type === 'goal' ? <CheckCircle2 size={16}/> : <StickyNote size={16}/>;

  return <section id="library" className="project-panel learning-panel">
    <div className="section-heading"><div><p className="eyebrow">BIBLIOTHÈQUE PERSONNELLE · APPRENTISSAGE</p><h2><Bookmark size={21}/> Favoris, notes et progression</h2><p className="muted">Conservez des ressources et suivez votre apprentissage dans votre espace privé.</p></div><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser la bibliothèque"><RefreshCw size={16}/></button></div>
    <form className="learning-form" onSubmit={add}>
      <div className="learning-form-grid">
        <label>Type<select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="note">Note</option><option value="favorite">Favori</option><option value="bookmark">À consulter</option><option value="goal">Objectif</option></select></label>
        <label>Ressource<select value={targetType} onChange={e => setTargetType(e.target.value as typeof targetType)}><option value="entrepreneur">Entrepreneur</option><option value="content">Contenu</option></select></label>
        {targetType === 'entrepreneur' ? <label className="learning-target">Entrepreneur<select required value={entrepreneurId} onChange={e => setEntrepreneurId(e.target.value)}><option value="">Choisir un profil…</option>{entrepreneurs.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label> : <label className="learning-target">Contenu<select required value={contentId} onChange={e => setContentId(e.target.value)}><option value="">Choisir un contenu…</option>{contents.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        <label className="learning-note">Note personnelle<textarea rows={2} maxLength={3000} value={note} onChange={e => setNote(e.target.value)} placeholder="Pourquoi garder cette ressource ? Que retenir ?"/></label>
      </div>
      <div className="learning-form-actions"><button className="primary-button" type="submit">Ajouter à ma bibliothèque</button></div>
    </form>
    {error && <p className="feedback error" role="alert">{error}</p>}{message && <p className="feedback success" role="status">{message}</p>}
    {loading ? <p className="empty-state">Chargement de votre bibliothèque…</p> : items.length === 0 ? <div className="empty-state"><div className="empty-icon"><Bookmark size={24}/></div><h3>Votre bibliothèque est vide</h3><p>Ajoutez un profil ou un contenu, puis conservez vos notes et votre progression ici.</p></div> : <div className="learning-list">{items.map(item => <article className="learning-item" key={item.id}><div className="learning-item-icon">{icon(item.item_type)}</div><div className="learning-item-main"><span className="insight-type">{label[item.item_type]}</span><h3>{item.content?.title ?? item.entrepreneur?.name ?? 'Ressource'}</h3>{item.content?.canonical_url && <a href={item.content.canonical_url} target="_blank" rel="noreferrer">Ouvrir le contenu ↗</a>}{item.note && <p>{item.note}</p>}<div className="learning-progress"><label>Progression <strong>{item.progress}%</strong></label><input type="range" min="0" max="100" step="10" value={item.progress} aria-label={'Progression pour ' + (item.content?.title ?? item.entrepreneur?.name ?? 'la ressource')} onChange={e => { const value = Number(e.target.value); setItems(current => current.map(row => row.id === item.id ? {...row,progress:value} : row)); }} onMouseUp={e => void updateProgress(item, Number(e.currentTarget.value))} onTouchEnd={e => void updateProgress(item, Number(e.currentTarget.value))} onKeyUp={e => { if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) void updateProgress(item, Number(e.currentTarget.value)); }}/></div></div><button className="chapter-delete-button" type="button" onClick={() => void remove(item)} aria-label="Retirer de la bibliothèque"><Trash2 size={15}/></button></article>)}</div>}
  </section>;
}
