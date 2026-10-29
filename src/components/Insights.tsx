import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

type InsightRow = {
  id: string; title: string; canonical_url: string; description: string | null;
  platform: string; content_type: string; published_at: string | null;
  entrepreneur: { name: string } | null;
  analyses: { id: string; analysis_type: string; status: string; summary: string | null; key_insights: unknown; strategies: unknown; action_steps: unknown; model_label: string | null; created_at: string }[];
};

function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => typeof item === 'string' ? item : item && typeof item === 'object' && 'text' in item && typeof item.text === 'string' ? item.text : '').filter(Boolean);
}

export default function Insights() {
  const [items, setItems] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: queryError } = await supabase.from('content_items')
        .select('id,title,canonical_url,description,platform,content_type,published_at,entrepreneur:entrepreneurs(name),analyses:content_analyses(id,analysis_type,status,summary,key_insights,strategies,action_steps,model_label,created_at)')
        .order('published_at', { ascending: false, nullsFirst: false }).limit(100);
      if (queryError) {
        setError(queryError.message.includes('content_items') ? 'Insights sera disponible après application de la migration Supabase.' : 'Impossible de charger les analyses. Réessayez.');
        return;
      }
      setItems((data ?? []) as unknown as InsightRow[]);
    } catch {
      setError('Erreur réseau pendant le chargement des analyses. Vérifiez la connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = items.filter(item => (item.title + ' ' + (item.description ?? '') + ' ' + (item.entrepreneur?.name ?? '')).toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')));
  const analysisCount = items.reduce((n, item) => n + item.analyses.filter(a => a.status === 'completed').length, 0);
  const typeLabel: Record<string, string> = { summary: 'Résumé', strategy: 'Stratégie', business_model: 'Modèle économique', lessons: 'Leçons', action_plan: 'Plan d’action', transcript_notes: 'Notes de transcription' };

  return <section id="insights" className="project-panel insights-panel">
    <div className="section-heading"><div><p className="eyebrow">INSIGHTS · COMPRENDRE ET APPRENDRE</p><h2><BrainCircuit size={21}/> Analyses et enseignements</h2><p className="muted">Retrouvez les contenus et analyses déjà enregistrés. Aucun résultat d’analyse n’est inventé ici.</p></div><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser Insights"><RefreshCw size={16}/></button></div>
    <div className="insights-metrics"><div><span>Contenus répertoriés</span><strong>{items.length}</strong></div><div><span>Analyses terminées</span><strong>{analysisCount}</strong></div></div>
    <input className="insights-search" aria-label="Rechercher un contenu" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un contenu, un entrepreneur…"/>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {loading ? <p className="empty-state">Chargement des contenus et analyses…</p> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><Sparkles size={24}/></div><h3>Pas encore d’insights</h3><p>Ajoutez des contenus publics et leurs sources pour construire progressivement une bibliothèque d’enseignements vérifiables.</p></div> : <div className="insights-list">{filtered.map(item => <article className="insight-item" key={item.id}><div className="insight-item-head"><div><span className="insight-type">{item.content_type.replace('_', ' ')}</span><h3>{item.title}</h3><p className="muted">{item.entrepreneur?.name ?? 'Entrepreneur non précisé'} · {item.platform}</p></div><a href={item.canonical_url} target="_blank" rel="noreferrer" aria-label={'Ouvrir la source : ' + item.title}><ExternalLink size={16}/></a></div>{item.description && <p className="insight-description">{item.description}</p>}{item.analyses.length === 0 ? <p className="insight-pending">Aucune analyse enregistrée pour ce contenu.</p> : item.analyses.map(analysis => <div className="analysis-result" key={analysis.id}><div className="analysis-result-head"><strong>{typeLabel[analysis.analysis_type] ?? analysis.analysis_type}</strong><span className={'analysis-status analysis-' + analysis.status}>{analysis.status === 'completed' ? 'Terminée' : analysis.status === 'processing' ? 'En cours' : analysis.status === 'failed' ? 'Échec' : 'Brouillon'}</span></div>{analysis.summary && <p>{analysis.summary}</p>}{asTextList(analysis.key_insights).length > 0 && <><h4>Idées clés</h4><ul>{asTextList(analysis.key_insights).map((text, i) => <li key={i}>{text}</li>)}</ul></>}{asTextList(analysis.strategies).length > 0 && <><h4>Stratégies</h4><ul>{asTextList(analysis.strategies).map((text, i) => <li key={i}>{text}</li>)}</ul></>}{asTextList(analysis.action_steps).length > 0 && <><h4>Étapes d’action</h4><ol>{asTextList(analysis.action_steps).map((text, i) => <li key={i}>{text}</li>)}</ol></>}{analysis.model_label && <small>Analyse générée avec : {analysis.model_label}</small>}</div>)}</article>)}</div>}
    <p className="workspace-footnote">Les analyses affichées proviennent des enregistrements de la base. La génération IA et la collecte automatique des contenus ne sont pas activées par ce tableau.</p>
  </section>;
}
