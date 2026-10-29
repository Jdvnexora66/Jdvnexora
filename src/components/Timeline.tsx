import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

type EventRow = {
  id: string; event_date: string | null; title: string; description: string | null;
  category: string; confidence: string; entrepreneur_id: string;
  entrepreneur: { name: string; slug: string } | null;
  source: { title: string; source_url: string; publisher: string | null } | null;
};

export default function Timeline() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: queryError } = await supabase.from('timeline_events')
        .select('id,event_date,title,description,category,confidence,entrepreneur_id,entrepreneur:entrepreneurs!inner(name,slug,visibility),source:content_sources(title,source_url,publisher)')
        .order('event_date', { ascending: false, nullsFirst: false }).limit(150);
      if (queryError) {
        setError(queryError.message.includes('timeline_events') ? 'La chronologie sera disponible après application de la migration Supabase.' : 'Impossible de charger la chronologie. Réessayez.');
        return;
      }
      const rows = (data ?? []) as unknown as (EventRow & { entrepreneur: EventRow['entrepreneur'] & { visibility?: string } })[];
      setEvents(rows.filter(row => row.entrepreneur?.visibility === 'public'));
    } catch {
      setError('Erreur réseau pendant le chargement de la chronologie. Vérifiez la connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = events.filter(e => (e.title + ' ' + (e.description ?? '') + ' ' + (e.entrepreneur?.name ?? '')).toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr').trim()));
  const confidenceLabel = (value: string) => value === 'multiple_sources' ? 'Sources multiples' : value === 'source_supported' ? 'Source associée' : 'À vérifier';
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z')) : 'Date non précisée';

  return <section id="timeline" className="project-panel timeline-panel">
    <div className="section-heading"><div><p className="eyebrow">TIMELINE · PARCOURS DOCUMENTÉS</p><h2><CalendarDays size={21}/> Chronologie</h2><p className="muted">Les étapes clés des parcours entrepreneuriaux, avec leur niveau de documentation.</p></div><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser la chronologie"><RefreshCw size={16}/></button></div>
    <ModuleDataOverview sources={["timeline_events"]} metrics={[{ label: "Événements chargés", value: events.length }, { label: "Résultats visibles", value: filtered.length }, { label: "Recherche", value: search.trim() ? "Active" : "Toutes les dates" }]} loading={loading} error={Boolean(error)} />


    <input className="timeline-search" aria-label="Rechercher dans la chronologie" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un événement ou un entrepreneur…"/>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {loading ? <p className="empty-state">Chargement des événements documentés…</p> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><CalendarDays size={24}/></div><h3>Aucun événement documenté</h3><p>Les événements apparaîtront ici lorsqu’ils seront enregistrés avec leur niveau de confiance. Aucune date n’est inventée pour remplir la chronologie.</p></div> : <div className="timeline-list">{filtered.map(event => <article className="timeline-event" key={event.id}><div className="timeline-rail"><span/></div><div className="timeline-event-card"><div className="timeline-event-meta"><time>{formatDate(event.event_date)}</time><span className={'verification-tag verification-' + (event.confidence === 'multiple_sources' ? 'verified' : event.confidence === 'source_supported' ? 'reviewed' : 'unverified')}><ShieldCheck size={12}/>{confidenceLabel(event.confidence)}</span></div><h3>{event.title}</h3>{event.entrepreneur && <p className="timeline-person">{event.entrepreneur.name}</p>}{event.description && <p>{event.description}</p>}{event.source && <a className="timeline-source" href={event.source.source_url} target="_blank" rel="noreferrer">Source : {event.source.title}{event.source.publisher ? ' · ' + event.source.publisher : ''} <ExternalLink size={12}/></a>}</div></article>)}</div>}
    <p className="workspace-footnote">Une chronologie fiable exige des dates traçables. Les événements sans date restent explicitement non datés.</p>
  </section>;
}
