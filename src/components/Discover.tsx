import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Bookmark, Compass, ExternalLink, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Entrepreneur = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  biography: string | null;
  country: string | null;
  industry: string | null;
  website_url: string | null;
  verification_status: 'unverified' | 'reviewed' | 'verified';
};

type CreatorSource = { id: string; entrepreneur_id: string | null; title: string; source_url: string; publisher: string | null; source_type: string; excerpt: string | null; credibility_note: string | null; checked_at: string | null };

type Props = { userId: string };

export default function Discover({ userId }: Props) {
  const [items, setItems] = useState<Entrepreneur[]>([]);
  const [sourcesByProfile, setSourcesByProfile] = useState<Record<string, CreatorSource[]>>({});
  const [country, setCountry] = useState('');
  const [basketSearches, setBasketSearches] = useState<Record<string, string>>({ content: '', saas: '', digital: '' });
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [website, setWebsite] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formBasket, setFormBasket] = useState<'content' | 'saas' | 'digital'>('content');
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [followingBusyId, setFollowingBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré.'); return; }
    setLoading(true); setError('');
    let request = supabase.from('entrepreneurs')
      .select('id,name,slug,summary,biography,country,industry,website_url,verification_status')
      .eq('visibility', 'public').order('name', { ascending: true }).limit(200);
    if (country.trim()) request = request.ilike('country', '%' + country.trim() + '%');
    const { data, error: loadError } = await request;
    if (loadError) setError(loadError.message.includes('entrepreneurs') ? 'Le module Discover attend l’application de la migration Supabase.' : loadError.message);
    else {
      const profiles = (data ?? []) as Entrepreneur[];
      setItems(profiles);
      if (profiles.length) {
        const { data: sourceRows } = await supabase.from('content_sources')
          .select('id,entrepreneur_id,title,source_url,publisher,source_type,excerpt,credibility_note,checked_at')
          .in('entrepreneur_id', profiles.map(item => item.id));
        const grouped: Record<string, CreatorSource[]> = {};
        for (const source of (sourceRows ?? []) as CreatorSource[]) {
          if (!source.entrepreneur_id) continue;
          (grouped[source.entrepreneur_id] ??= []).push(source);
        }
        setSourcesByProfile(grouped);
      } else setSourcesByProfile({});
    }
    setLoading(false);
  }, [country]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    async function loadFollowed() {
      if (!supabase || !userId) return;
      const { data, error: followError } = await supabase.from('followed_entrepreneurs').select('entrepreneur_id').eq('user_id', userId);
      if (active && !followError) setFollowedIds((data ?? []).map(row => row.entrepreneur_id as string));
    }
    void loadFollowed();
    return () => { active = false; };
  }, [userId]);

  async function toggleFollow(entrepreneurId: string) {
    if (!supabase || !userId) return;
    setFollowingBusyId(entrepreneurId); setError(''); setMessage('');
    const isFollowing = followedIds.includes(entrepreneurId);
    const result = isFollowing
      ? await supabase.from('followed_entrepreneurs').delete().eq('user_id', userId).eq('entrepreneur_id', entrepreneurId)
      : await supabase.from('followed_entrepreneurs').insert({ user_id: userId, entrepreneur_id: entrepreneurId });
    setFollowingBusyId(null);
    if (result.error) { setError('Impossible de mettre à jour vos créateurs suivis : ' + result.error.message); return; }
    setFollowedIds(current => isFollowing ? current.filter(id => id !== entrepreneurId) : [...current, entrepreneurId]);
  }

  const visibleItems = showFollowedOnly ? items.filter(item => followedIds.includes(item.id)) : items;
  const baskets = [
    { id: 'content' as const, title: 'Créateurs de contenu', description: 'YouTube, médias, éducation, podcasts et création éditoriale.', terms: ['contenu', 'youtube', 'podcast', 'créateur', 'media', 'média', 'divertissement'] },
    { id: 'saas' as const, title: 'Créateurs de SaaS et startups', description: 'Logiciels, applications, fintech et entreprises technologiques.', terms: ['saas', 'logiciel', 'startup', 'technologie', 'tech', 'fintech', 'marketplace', 'commerce en ligne'] },
    { id: 'digital' as const, title: 'Créateurs de produits numériques', description: 'E-books, formations, cours, templates et produits vendus en ligne.', terms: ['produit', 'formation', 'ebook', 'numérique', 'digital', 'cours', 'template', 'auteur'] },
  ];
  function belongsToBasket(item: Entrepreneur, basketId: 'content' | 'saas' | 'digital') {
    const basket = baskets.find(value => value.id === basketId)!;
    const haystack = [item.industry, item.summary, item.name].filter(Boolean).join(' ').toLocaleLowerCase('fr');
    return basket.terms.some(term => haystack.includes(term));
  }
  function itemsForBasket(basketId: 'content' | 'saas' | 'digital') {
    const term = basketSearches[basketId].trim().toLocaleLowerCase('fr');
    return visibleItems.filter(item => belongsToBasket(item, basketId) && (!term || [item.name, item.summary, item.biography, item.country, item.industry].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(term)));
  }
  function openAddForm(basketId: 'content' | 'saas' | 'digital') {
    setFormBasket(basketId);
    const defaults = { content: 'Création de contenu', saas: 'SaaS · Technologie', digital: 'Produits numériques' };
    setNewIndustry(defaults[basketId]);
    setShowForm(true);
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (!name.trim()) return;
    setSaving(true); setError(''); setMessage('');
    const slug = name.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 7);
    const { data: createdProfile, error: insertError } = await supabase.from('entrepreneurs').insert({
      name: name.trim(), slug, summary: summary.trim() || null,
      country: newCountry.trim() || null, industry: newIndustry.trim() || null,
      website_url: website.trim() || null, created_by: userId, visibility: 'public',
    }).select('id,name,website_url').single();
    setSaving(false);
    if (insertError) { setError(insertError.message.includes('entrepreneurs') ? 'La table Discover n’est pas encore disponible. Appliquez la migration Supabase.' : insertError.message); return; }
    if (createdProfile?.website_url) {
      const { error: sourceError } = await supabase.from('content_sources').insert({
        entrepreneur_id: createdProfile.id, title: createdProfile.name + ' — site de référence',
        source_url: createdProfile.website_url, source_type: 'website', publisher: createdProfile.name,
        credibility_note: 'Lien ajouté lors de la création du profil. Vérifier les faits et la date de consultation avant validation.', created_by: userId,
      });
      if (sourceError) setMessage('Profil ajouté. Le lien officiel n’a pas pu être enregistré comme source : ' + sourceError.message);
    }
    setName(''); setSummary(''); setWebsite(''); setNewCountry(''); setNewIndustry(''); setShowForm(false);
    setMessage('Créateur ajouté au panier « ' + baskets.find(basket => basket.id === formBasket)?.title + ' ». Le profil reste à vérifier.'); await load();
  }

  return <section id="discover" className="project-panel discover-panel">
    <div className="section-heading">
      <div><p className="eyebrow">DISCOVER · VEILLE ENTREPRENEURIALE</p><h2><Compass size={21} /> Découvrir des entrepreneurs</h2><p className="muted">Explorez les créateurs de contenu, fondateurs de SaaS et créateurs de produits numériques. Les profils sont sourcés et leur statut de vérification reste visible.</p></div>
      <div className="discover-heading-actions"><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser Discover"><RefreshCw size={16}/></button><button className="primary-button discover-add" type="button" onClick={() => setShowForm(v => !v)}><Plus size={16}/> Ajouter un profil</button></div>
    </div>
    <div className="discover-global-filters">
      <label className="discover-country-filter">Filtrer tous les paniers par pays<input aria-label="Filtrer tous les paniers par pays" value={country} onChange={e => setCountry(e.target.value)} placeholder="Ex. Bénin, Sénégal, Canada"/></label>
      <button type="button" className={showFollowedOnly ? 'secondary-button active' : 'secondary-button'} onClick={() => setShowFollowedOnly(value => !value)}><Bookmark size={14}/>{showFollowedOnly ? 'Afficher tous les profils' : 'Mes créateurs suivis (' + followedIds.length + ')'}</button>
    </div>
    {showForm && <form className="discover-form" onSubmit={create}>
      <h3>Ajouter à : {baskets.find(basket => basket.id === formBasket)?.title}</h3>
      <div className="discover-form-grid">
        <label>Nom de l’entrepreneur<input value={name} onChange={e => setName(e.target.value)} maxLength={140} required placeholder="Nom complet"/></label>
        <label>Pays<input value={newCountry} onChange={e => setNewCountry(e.target.value)} maxLength={100} placeholder="Ex. Bénin"/></label>
        <label>Panier<select value={formBasket} onChange={e => { const id = e.target.value as 'content' | 'saas' | 'digital'; setFormBasket(id); setNewIndustry(({ content: 'Création de contenu', saas: 'SaaS · Technologie', digital: 'Produits numériques' })[id]); }}><option value="content">Créateurs de contenu</option><option value="saas">Créateurs de SaaS et startups</option><option value="digital">Produits numériques</option></select></label><label>Secteur / spécialité<input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} maxLength={120} required placeholder="Ex. SaaS · Éducation"/></label>
        <label>Site officiel<input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://…" /></label>
        <label className="discover-summary-field">Résumé<textarea value={summary} onChange={e => setSummary(e.target.value)} maxLength={1200} rows={3} placeholder="Résumé factuel, à vérifier avec des sources."/></label>
      </div>
      <div className="discover-form-actions"><button type="button" className="logout-button" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="primary-button" disabled={saving || !name.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer le profil'}</button></div>
    </form>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    {message && <p className="feedback success" role="status">{message}</p>}
    {loading ? <p className="empty-state">Chargement du répertoire…</p> : <div className="discover-baskets">{baskets.map(basket => {
      const basketItems = itemsForBasket(basket.id);
      return <section className="discover-basket" key={basket.id} aria-labelledby={'basket-' + basket.id}>
        <div className="discover-basket-heading"><div><h3 id={'basket-' + basket.id}>{basket.title}</h3><p>{basket.description}</p><span className="discover-basket-count">{basketItems.length} profil{basketItems.length > 1 ? 's' : ''}</span></div><button type="button" className="primary-button discover-add" onClick={() => openAddForm(basket.id)}><Plus size={15}/> Ajouter ici</button></div>
        <label className="discover-basket-search"><Search size={16}/><input aria-label={'Rechercher dans ' + basket.title} value={basketSearches[basket.id]} onChange={e => setBasketSearches(current => ({ ...current, [basket.id]: e.target.value }))} placeholder={'Rechercher un créateur dans « ' + basket.title + ' »…'}/></label>
        {basketItems.length === 0 ? <div className="discover-basket-empty"><p>{showFollowedOnly ? 'Aucun créateur suivi dans ce panier.' : basketSearches[basket.id] ? 'Aucun résultat. Essayez un autre nom, pays ou mot-clé.' : 'Aucun profil dans ce panier pour le moment.'}</p><button type="button" className="secondary-button" onClick={() => openAddForm(basket.id)}><Plus size={14}/> Ajouter le premier créateur</button></div> : <div className="discover-list">{basketItems.map(item => <article className="discover-item" key={item.id}><div className="discover-avatar"><Compass size={20}/></div><div className="discover-item-main"><div className="discover-card-title"><h3>{item.name}</h3><button type="button" className={followedIds.includes(item.id) ? 'discover-follow-button following' : 'discover-follow-button'} disabled={followingBusyId === item.id} onClick={() => void toggleFollow(item.id)} aria-pressed={followedIds.includes(item.id)}><Bookmark size={14} fill={followedIds.includes(item.id) ? 'currentColor' : 'none'}/>{followingBusyId === item.id ? 'En cours…' : followedIds.includes(item.id) ? 'Suivi' : 'Suivre'}</button></div><div className="discover-meta">{item.country && <span>{item.country}</span>}{item.industry && <span>{item.industry}</span>}<span className={'verification-tag verification-' + item.verification_status}><ShieldCheck size={12}/>{item.verification_status === 'verified' ? 'Vérifié' : item.verification_status === 'reviewed' ? 'Relu' : 'À vérifier'}</span></div>{item.summary && <p>{item.summary}</p>}{item.biography && <details className="discover-biography"><summary>Parcours et pistes d’apprentissage</summary><p>{item.biography}</p></details>}{item.website_url && <a href={item.website_url} target="_blank" rel="noreferrer">{item.website_url.replace(/^https?:\/\//, '')} <ExternalLink size={12}/></a>}{(sourcesByProfile[item.id] ?? []).length > 0 && <details className="discover-sources"><summary>Sources de référence ({sourcesByProfile[item.id].length})</summary><ul>{sourcesByProfile[item.id].map(source => <li key={source.id}><a href={source.source_url} target="_blank" rel="noreferrer">{source.title || source.publisher || source.source_url} <ExternalLink size={11}/></a>{source.excerpt && <p>{source.excerpt}</p>}{source.credibility_note && <small>{source.credibility_note}</small>}{source.checked_at && <small>Consultée le {new Date(source.checked_at).toLocaleDateString('fr-FR')}</small>}</li>)}</ul></details>}</div></article>)}</div>}
      </section>;
    })}</div>}
    <p className="workspace-footnote">Les profils ajoutés par un utilisateur sont identifiés dans la base. Le statut « vérifié » ne doit être attribué qu’après contrôle des sources.</p>
  </section>;
}
