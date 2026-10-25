import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Compass, ExternalLink, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Entrepreneur = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  country: string | null;
  industry: string | null;
  website_url: string | null;
  verification_status: 'unverified' | 'reviewed' | 'verified';
};

type Props = { userId: string };

export default function Discover({ userId }: Props) {
  const [items, setItems] = useState<Entrepreneur[]>([]);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [website, setWebsite] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré.'); return; }
    setLoading(true); setError('');
    let request = supabase.from('entrepreneurs')
      .select('id,name,slug,summary,country,industry,website_url,verification_status')
      .eq('visibility', 'public').order('name', { ascending: true }).limit(100);
    if (country.trim()) request = request.ilike('country', '%' + country.trim() + '%');
    if (industry.trim()) request = request.ilike('industry', '%' + industry.trim() + '%');
    if (query.trim()) request = request.or('name.ilike.%' + query.trim().replace(/[,%()]/g, '') + '%,summary.ilike.%' + query.trim().replace(/[,%()]/g, '') + '%');
    const { data, error: loadError } = await request;
    if (loadError) setError(loadError.message.includes('entrepreneurs') ? 'Le module Discover attend l’application de la migration Supabase.' : loadError.message);
    else setItems((data ?? []) as Entrepreneur[]);
    setLoading(false);
  }, [query, country, industry]);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (!name.trim()) return;
    setSaving(true); setError(''); setMessage('');
    const slug = name.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 7);
    const { error: insertError } = await supabase.from('entrepreneurs').insert({
      name: name.trim(), slug, summary: summary.trim() || null,
      country: newCountry.trim() || null, industry: newIndustry.trim() || null,
      website_url: website.trim() || null, created_by: userId, visibility: 'public',
    });
    setSaving(false);
    if (insertError) { setError(insertError.message.includes('entrepreneurs') ? 'La table Discover n’est pas encore disponible. Appliquez la migration Supabase.' : insertError.message); return; }
    setName(''); setSummary(''); setWebsite(''); setNewCountry(''); setNewIndustry(''); setShowForm(false);
    setMessage('Profil ajouté au répertoire.'); await load();
  }

  return <section id="discover" className="project-panel discover-panel">
    <div className="section-heading">
      <div><p className="eyebrow">DISCOVER · VEILLE ENTREPRENEURIALE</p><h2><Compass size={21} /> Découvrir des entrepreneurs</h2><p className="muted">Un répertoire documenté, prêt à accueillir des profils et leurs sources publiques.</p></div>
      <div className="discover-heading-actions"><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser Discover"><RefreshCw size={16}/></button><button className="primary-button discover-add" type="button" onClick={() => setShowForm(v => !v)}><Plus size={16}/> Ajouter un profil</button></div>
    </div>
    <div className="discover-filters">
      <label className="search-field"><Search size={16}/><input aria-label="Rechercher un entrepreneur" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou résumé…"/></label>
      <input aria-label="Filtrer par pays" value={country} onChange={e => setCountry(e.target.value)} placeholder="Pays"/>
      <input aria-label="Filtrer par secteur" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Secteur"/>
    </div>
    {showForm && <form className="discover-form" onSubmit={create}>
      <h3>Nouveau profil public</h3>
      <div className="discover-form-grid">
        <label>Nom de l’entrepreneur<input value={name} onChange={e => setName(e.target.value)} maxLength={140} required placeholder="Nom complet"/></label>
        <label>Pays<input value={newCountry} onChange={e => setNewCountry(e.target.value)} maxLength={100} placeholder="Ex. Bénin"/></label>
        <label>Secteur<input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} maxLength={120} placeholder="Ex. Technologie"/></label>
        <label>Site officiel<input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://…" /></label>
        <label className="discover-summary-field">Résumé<textarea value={summary} onChange={e => setSummary(e.target.value)} maxLength={1200} rows={3} placeholder="Résumé factuel, à vérifier avec des sources."/></label>
      </div>
      <div className="discover-form-actions"><button type="button" className="logout-button" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="primary-button" disabled={saving || !name.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer le profil'}</button></div>
    </form>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    {message && <p className="feedback success" role="status">{message}</p>}
    {loading ? <p className="empty-state">Chargement du répertoire…</p> : items.length === 0 ? <div className="empty-state"><div className="empty-icon"><Compass size={24}/></div><h3>Aucun profil trouvé</h3><p>Ajoutez un profil ou modifiez les filtres. Les sources et les faits doivent être vérifiés avant publication.</p></div> : <div className="discover-list">{items.map(item => <article className="discover-item" key={item.id}><div className="discover-avatar"><Compass size={20}/></div><div className="discover-item-main"><h3>{item.name}</h3><div className="discover-meta">{item.country && <span>{item.country}</span>}{item.industry && <span>{item.industry}</span>}<span className={'verification-tag verification-' + item.verification_status}><ShieldCheck size={12}/>{item.verification_status === 'verified' ? 'Vérifié' : item.verification_status === 'reviewed' ? 'Relu' : 'À vérifier'}</span></div>{item.summary && <p>{item.summary}</p>}{item.website_url && <a href={item.website_url} target="_blank" rel="noreferrer">{item.website_url.replace(/^https?:\/\//, '')} <ExternalLink size={12}/></a>}</div></article>)}</div>}
    <p className="workspace-footnote">Les profils ajoutés par un utilisateur sont identifiés dans la base. Le statut « vérifié » ne doit être attribué qu’après contrôle des sources.</p>
  </section>;
}
