import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, RefreshCw, ShieldCheck, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

type Entrepreneur = { id: string; name: string; visibility: string };
type EventRow = { id: string; event_date: string | null; title: string; description: string | null; category: string; confidence: string; entrepreneur_id: string; entrepreneur: { name: string; slug: string } | null; source: { title: string; source_url: string; publisher: string | null } | null };
type EventDraft = { entrepreneur_id: string; event_date: string; title: string; description: string; category: string; confidence: string };
const emptyDraft: EventDraft = { entrepreneur_id: '', event_date: '', title: '', description: '', category: 'milestone', confidence: 'unverified' };

export default function Timeline({ userId }: { userId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [ownedProfiles, setOwnedProfiles] = useState<Entrepreneur[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré.'); return; }
    setLoading(true); setError('');
    try {
      const [eventsResult, profilesResult] = await Promise.all([
        supabase.from('timeline_events').select('id,event_date,title,description,category,confidence,entrepreneur_id,entrepreneur:entrepreneurs!inner(name,slug,visibility),source:content_sources(title,source_url,publisher)').order('event_date', { ascending: false, nullsFirst: false }).limit(300),
        supabase.from('entrepreneurs').select('id,name,visibility').eq('created_by', userId).order('name').limit(200),
      ]);
      if (eventsResult.error) throw eventsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      const profiles = (profilesResult.data ?? []) as Entrepreneur[];
      setOwnedProfiles(profiles);
      const rows = (eventsResult.data ?? []) as unknown as (EventRow & { entrepreneur: EventRow['entrepreneur'] & { visibility?: string } })[];
      setEvents(rows.filter(row => row.entrepreneur?.visibility === 'public' || profiles.some(profile => profile.id === row.entrepreneur_id)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de charger la chronologie. Vérifiez la connexion puis réessayez.'); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  const filtered = events.filter(e => (e.title + ' ' + (e.description ?? '') + ' ' + (e.entrepreneur?.name ?? '')).toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr').trim()));
  const confidenceLabel = (value: string) => value === 'multiple_sources' ? 'Sources multiples' : value === 'source_supported' ? 'Source associée' : 'À vérifier';
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z')) : 'Date non précisée';
  function openCreate() { setEditingId(null); setDraft({ ...emptyDraft, entrepreneur_id: ownedProfiles[0]?.id ?? '' }); setShowForm(true); setError(''); setNotice(''); }
  function openEdit(event: EventRow) {
    if (!ownedProfiles.some(profile => profile.id === event.entrepreneur_id)) return;
    setEditingId(event.id);
    setDraft({ entrepreneur_id: event.entrepreneur_id, event_date: event.event_date ?? '', title: event.title, description: event.description ?? '', category: event.category, confidence: event.confidence });
    setShowForm(true); setError(''); setNotice('');
  }
  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || saving || !ownedProfiles.some(profile => profile.id === draft.entrepreneur_id)) return;
    setSaving(true); setError(''); setNotice('');
    const payload = { entrepreneur_id: draft.entrepreneur_id, event_date: draft.event_date || null, title: draft.title.trim(), description: draft.description.trim() || null, category: draft.category, confidence: draft.confidence };
    try {
      const result = editingId ? await supabase.from('timeline_events').update(payload).eq('id', editingId).select('id').single() : await supabase.from('timeline_events').insert(payload).select('id').single();
      if (result.error) throw result.error;
      setNotice(editingId ? 'Événement mis à jour.' : 'Événement ajouté à la chronologie.');
      setShowForm(false); setDraft(emptyDraft); setEditingId(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible. Vérifiez vos droits et réessayez.'); }
    finally { setSaving(false); }
  }
  async function removeEvent(event: EventRow) {
    if (!supabase || saving || !ownedProfiles.some(profile => profile.id === event.entrepreneur_id) || !window.confirm('Supprimer cet événement de votre chronologie ?')) return;
    setSaving(true); setError(''); setNotice('');
    const { error: deleteError } = await supabase.from('timeline_events').delete().eq('id', event.id);
    setSaving(false);
    if (deleteError) { setError('Suppression impossible : ' + deleteError.message); return; }
    setEvents(current => current.filter(row => row.id !== event.id)); setNotice('Événement supprimé.');
  }
  return <section id="timeline" className="project-panel timeline-panel">
    <div className="section-heading"><div><p className="eyebrow">TIMELINE · PARCOURS DOCUMENTÉS</p><h2><CalendarDays size={21}/> Chronologie</h2><p className="muted">Consultez les étapes publiques documentées et gérez les événements de vos propres profils.</p></div><div className="timeline-heading-actions"><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser la chronologie"><RefreshCw size={16}/></button>{ownedProfiles.length>0&&<button className="primary-button" type="button" onClick={openCreate}><Plus size={15}/> Ajouter un événement</button>}</div></div>
    <ModuleDataOverview sources={["timeline_events","entrepreneurs"]} metrics={[{ label: "Événements chargés", value: events.length }, { label: "Résultats visibles", value: filtered.length }, { label: "Mes profils", value: ownedProfiles.length }]} loading={loading} error={Boolean(error)} />
    {ownedProfiles.length===0&&!loading&&<p className="workspace-footnote">Pour ajouter vos propres événements, créez d’abord un profil dans Découvrir. Les événements des profils publics restent consultables ici.</p>}
    {showForm&&<form className="project-form timeline-event-form" onSubmit={saveEvent}>
      <div className="section-heading"><div><h3>{editingId?'Modifier un événement':'Nouvel événement'}</h3><p className="muted">N’ajoutez que des dates et informations que vous pouvez justifier.</p></div><button type="button" className="icon-button" onClick={()=>setShowForm(false)} aria-label="Fermer le formulaire"><X size={16}/></button></div>
      <label>Profil entrepreneur<select required value={draft.entrepreneur_id} onChange={e=>setDraft(current=>({...current,entrepreneur_id:e.target.value}))}><option value="">Choisir un profil…</option>{ownedProfiles.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
      <label>Titre de l’événement<input required maxLength={180} value={draft.title} onChange={e=>setDraft(current=>({...current,title:e.target.value}))} placeholder="Ex. Lancement de l’entreprise"/></label>
      <label>Date (facultative)<input type="date" value={draft.event_date} onChange={e=>setDraft(current=>({...current,event_date:e.target.value}))}/></label>
      <label>Description<textarea rows={3} maxLength={1800} value={draft.description} onChange={e=>setDraft(current=>({...current,description:e.target.value}))} placeholder="Contexte et importance de cette étape…"/></label>
      <div className="timeline-form-row"><label>Catégorie<select value={draft.category} onChange={e=>setDraft(current=>({...current,category:e.target.value}))}><option value="milestone">Étape clé</option><option value="foundation">Création</option><option value="funding">Financement</option><option value="launch">Lancement</option><option value="growth">Croissance</option><option value="partnership">Partenariat</option><option value="other">Autre</option></select></label><label>Niveau de documentation<select value={draft.confidence} onChange={e=>setDraft(current=>({...current,confidence:e.target.value}))}><option value="unverified">À vérifier</option><option value="source_supported">Source associée</option><option value="multiple_sources">Sources multiples</option></select></label></div>
      <div className="profile-footer"><button type="button" className="logout-button" onClick={()=>setShowForm(false)}>Annuler</button><button type="submit" className="primary-button" disabled={saving||!draft.title.trim()||!draft.entrepreneur_id}>{saving?'Enregistrement…':editingId?'Enregistrer les modifications':'Ajouter à la chronologie'} <Save size={15}/></button></div>
    </form>}
    <input className="timeline-search" aria-label="Rechercher dans la chronologie" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un événement ou un entrepreneur…"/>
    {error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback success" role="status">{notice}</p>}
    {loading?<p className="empty-state">Chargement des événements documentés…</p>:filtered.length===0?<div className="empty-state"><div className="empty-icon"><CalendarDays size={24}/></div><h3>Aucun événement documenté</h3><p>Ajoutez un événement depuis un profil que vous gérez ou consultez les événements publics vérifiables.</p>{ownedProfiles.length>0&&<button type="button" className="primary-button" onClick={openCreate}><Plus size={15}/> Ajouter le premier événement</button>}</div>:<div className="timeline-list">{filtered.map(event=>{const canEdit=ownedProfiles.some(profile=>profile.id===event.entrepreneur_id);return <article className="timeline-event" key={event.id}><div className="timeline-rail"><span/></div><div className="timeline-event-card"><div className="timeline-event-meta"><time>{formatDate(event.event_date)}</time><span className={'verification-tag verification-'+(event.confidence==='multiple_sources'?'verified':event.confidence==='source_supported'?'reviewed':'unverified')}><ShieldCheck size={12}/>{confidenceLabel(event.confidence)}</span></div><h3>{event.title}</h3>{event.entrepreneur&&<p className="timeline-person">{event.entrepreneur.name}</p>}{event.description&&<p>{event.description}</p>}{event.source&&<a className="timeline-source" href={event.source.source_url} target="_blank" rel="noreferrer">Source : {event.source.title}{event.source.publisher?' · '+event.source.publisher:''} <ExternalLink size={12}/></a>}{canEdit&&<div className="timeline-event-actions"><button type="button" className="text-button" onClick={()=>openEdit(event)}><Pencil size={13}/> Modifier</button><button type="button" className="text-button" onClick={()=>void removeEvent(event)} disabled={saving}><Trash2 size={13}/> Supprimer</button></div>}</div></article>})}</div>}
    <p className="workspace-footnote">Les événements sans date restent explicitement non datés. Le niveau de documentation est conservé pour ne pas présenter une information non vérifiée comme un fait établi.</p>
  </section>;
}