import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Bookmark, Compass, ExternalLink, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

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
  created_by: string;
  visibility: 'public' | 'private';
};

type CreatorSource = { id: string; entrepreneur_id: string | null; title: string; source_url: string; publisher: string | null; source_type: string; excerpt: string | null; credibility_note: string | null; checked_at: string | null };
type CreatorSocial = { id: string; entrepreneur_id: string; platform: string; handle: string | null; profile_url: string; is_official: boolean };

function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch { return null; }
}

type Props = { userId: string };

export default function Discover({ userId }: Props) {
  const [items, setItems] = useState<Entrepreneur[]>([]);
  const [sourcesByProfile, setSourcesByProfile] = useState<Record<string, CreatorSource[]>>({});
  const [socialsByProfile, setSocialsByProfile] = useState<Record<string, CreatorSocial[]>>({});
  const [country, setCountry] = useState('');
  const [basketSearches, setBasketSearches] = useState<Record<string, string>>({ content: '', saas: '', digital: '' });
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [website, setWebsite] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'facebook' | 'x' | 'other'>('youtube');
  const [socialUrl, setSocialUrl] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
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
    try {
      let request = supabase.from('entrepreneurs')
        .select('id,name,slug,summary,biography,country,industry,website_url,verification_status,created_by,visibility')
        .or('visibility.eq.public,created_by.eq.' + userId).order('name', { ascending: true }).limit(300);
      if (country.trim()) request = request.ilike('country', '%' + country.trim() + '%');
      const { data, error: loadError } = await request;
      if (loadError) {
        setError(loadError.message.includes('entrepreneurs') ? 'Le module Discover attend l’application de la migration Supabase.' : 'Impossible de charger les créateurs. Réessayez.');
        return;
      }
      const profiles = (data ?? []) as Entrepreneur[];
      setItems(profiles);
      if (profiles.length) {
        const profileIds = profiles.map(item => item.id);
        const [sourceResult, socialResult] = await Promise.all([
          supabase.from('content_sources')
            .select('id,entrepreneur_id,title,source_url,publisher,source_type,excerpt,credibility_note,checked_at')
            .in('entrepreneur_id', profileIds),
          supabase.from('social_accounts')
            .select('id,entrepreneur_id,platform,handle,profile_url,is_official')
            .in('entrepreneur_id', profileIds),
        ]);
        const groupedSources: Record<string, CreatorSource[]> = {};
        for (const source of (sourceResult.data ?? []) as CreatorSource[]) {
          if (!source.entrepreneur_id) continue;
          (groupedSources[source.entrepreneur_id] ??= []).push(source);
        }
        setSourcesByProfile(groupedSources);
        const groupedSocials: Record<string, CreatorSocial[]> = {};
        for (const social of (socialResult.data ?? []) as CreatorSocial[]) {
          (groupedSocials[social.entrepreneur_id] ??= []).push(social);
        }
        setSocialsByProfile(groupedSocials);
        if (sourceResult.error) setError('Les créateurs sont chargés, mais leurs sources sont temporairement indisponibles.');
        else if (socialResult.error && !socialResult.error.message.includes('social_accounts')) {
          setError('Les créateurs sont chargés, mais certains réseaux sociaux sont temporairement indisponibles.');
        }
      } else {
        setSourcesByProfile({});
        setSocialsByProfile({});
      }
    } catch {
      setError('Erreur réseau pendant le chargement de Discover. Vérifiez la connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, [country, userId]);

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
    return visibleItems.filter(item => belongsToBasket(item, basketId) && (!term || [item.name, item.summary, item.biography, item.country, item.industry, ...(socialsByProfile[item.id] ?? []).flatMap(social => [social.platform, social.handle])].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(term)));
  }
  function openAddForm(basketId: 'content' | 'saas' | 'digital') {
    setEditingProfileId(null);setName('');setSummary('');setWebsite('');setSocialUrl('');setNewCountry('');
    setFormBasket(basketId);
    const defaults = { content: 'Création de contenu', saas: 'SaaS · Technologie', digital: 'Produits numériques' };
    setNewIndustry(defaults[basketId]);
    setShowForm(true);
  }
  function beginEditProfile(item: Entrepreneur) {
    setEditingProfileId(item.id);setName(item.name);setSummary(item.summary??'');
    setWebsite(item.website_url??'');setNewCountry(item.country??'');setNewIndustry(item.industry??'');
    const social=(socialsByProfile[item.id]??[])[0];
    setSocialPlatform((social?.platform as typeof socialPlatform)??'youtube');
    setSocialUrl(social?.profile_url??'');
    setShowForm(true);setError('');setMessage('');
  }

  function closeProfileForm() {
    setShowForm(false);setEditingProfileId(null);setName('');setSummary('');setWebsite('');
    setSocialUrl('');setNewCountry('');setNewIndustry('');setSocialPlatform('youtube');
  }

  async function setProfileVisibility(item:Entrepreneur, visibility:'public'|'private') {
    if(!supabase||item.created_by!==userId||saving)return;
    setSaving(true);setError('');setMessage('');
    const {error:updateError}=await supabase.from('entrepreneurs').update({visibility})
      .eq('id',item.id).eq('created_by',userId);
    setSaving(false);
    if(updateError){setError('Impossible de modifier la visibilité de ce profil. Vérifiez vos droits puis réessayez.');return;}
    setItems(current=>current.map(row=>row.id===item.id?{...row,visibility}:row));
    setMessage(visibility==='public'?'Profil rendu public.':'Profil retiré du catalogue public.');
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !userId || !name.trim()) return;
    const normalizedSocialUrl = safeExternalUrl(socialUrl.trim());
    const normalizedWebsite = safeExternalUrl(website.trim());
    if (socialUrl.trim() && !normalizedSocialUrl) { setError('Le lien du réseau social doit être une URL HTTP ou HTTPS valide.'); return; }
    if (website.trim() && !normalizedWebsite) { setError('Le site web doit être une URL HTTP ou HTTPS valide.'); return; }
    setSaving(true);setError('');setMessage('');
    const warnings:string[]=[];
    try {
      if(editingProfileId) {
        const {error:updateError}=await supabase.from('entrepreneurs').update({
          name:name.trim(),summary:summary.trim()||null,country:newCountry.trim()||null,
          industry:newIndustry.trim()||null,website_url:normalizedWebsite,
        }).eq('id',editingProfileId).eq('created_by',userId);
        if(updateError){setError('Impossible de modifier ce profil. Vérifiez vos droits puis réessayez.');return;}
        const currentSources=sourcesByProfile[editingProfileId]??[];
        const websiteSource=currentSources.find(source=>source.source_type==='website');
        if(normalizedWebsite&&websiteSource) {
          const {error:sourceError}=await supabase.from('content_sources').update({
            title:name.trim()+' — site de référence',source_url:normalizedWebsite,publisher:name.trim(),
            credibility_note:'Lien mis à jour par le propriétaire du profil. Vérifier les faits et la date de consultation avant validation.',
          }).eq('id',websiteSource.id);
          if(sourceError)warnings.push('La source du site n’a pas pu être mise à jour.');
        } else if(normalizedWebsite&&!websiteSource) {
          const {error:sourceError}=await supabase.from('content_sources').insert({
            entrepreneur_id:editingProfileId,title:name.trim()+' — site de référence',source_url:normalizedWebsite,
            source_type:'website',publisher:name.trim(),created_by:userId,
            credibility_note:'Lien ajouté par le propriétaire du profil. Vérifier les faits avant validation.',
          });
          if(sourceError)warnings.push('La source du site n’a pas pu être créée.');
        }
        const currentSocial=(socialsByProfile[editingProfileId]??[])[0];
        if(normalizedSocialUrl&&currentSocial) {
          const {error:socialError}=await supabase.from('social_accounts').update({
            platform:socialPlatform,profile_url:normalizedSocialUrl,is_official:false,
          }).eq('id',currentSocial.id);
          if(socialError)warnings.push('Le lien social n’a pas pu être mis à jour.');
        } else if(normalizedSocialUrl&&!currentSocial) {
          const {error:socialError}=await supabase.from('social_accounts').insert({
            entrepreneur_id:editingProfileId,platform:socialPlatform,profile_url:normalizedSocialUrl,is_official:false,
          });
          if(socialError)warnings.push('Le lien social n’a pas pu être créé.');
        }
        setMessage('Profil mis à jour. Les sources restent à vérifier.'+(warnings.length?' '+warnings.join(' '):''));
      } else {
        const slug=name.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Math.random().toString(36).slice(2,7);
        const {data:createdProfile,error:insertError}=await supabase.from('entrepreneurs').insert({
          name:name.trim(),slug,summary:summary.trim()||null,country:newCountry.trim()||null,
          industry:newIndustry.trim()||null,website_url:normalizedWebsite,created_by:userId,visibility:'public',
        }).select('id,name,website_url').single();
        if(insertError||!createdProfile){setError(insertError?.message.includes('entrepreneurs')?'La table Discover n’est pas encore disponible. Appliquez la migration Supabase.':insertError?.message||'Le profil n’a pas pu être créé.');return;}
        if(createdProfile.website_url) {
          const {error:sourceError}=await supabase.from('content_sources').insert({
            entrepreneur_id:createdProfile.id,title:createdProfile.name+' — site de référence',
            source_url:createdProfile.website_url,source_type:'website',publisher:createdProfile.name,
            credibility_note:'Lien ajouté lors de la création du profil. Vérifier les faits et la date de consultation avant validation.',created_by:userId,
          });
          if(sourceError)warnings.push('Le site officiel n’a pas pu être enregistré comme source.');
        }
        if(normalizedSocialUrl) {
          const {error:socialError}=await supabase.from('social_accounts').insert({
            entrepreneur_id:createdProfile.id,platform:socialPlatform,profile_url:normalizedSocialUrl,is_official:false,
          });
          if(socialError)warnings.push('Le lien social n’a pas pu être enregistré.');
        }
        setMessage('Créateur ajouté. Le profil et ses liens restent à vérifier.'+(warnings.length?' '+warnings.join(' '):''));
      }
      closeProfileForm();
      await load();
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Impossible d’enregistrer ce profil.');
    } finally {
      setSaving(false);
    }
  }

  return <section id="discover" className="project-panel discover-panel">
    <div className="section-heading">
      <div><p className="eyebrow">DISCOVER · VEILLE ENTREPRENEURIALE</p><h2><Compass size={21} /> Catalogue des acteurs sélectionnés</h2><p className="muted">Ajoutez uniquement les acteurs que vous avez choisis après vos recherches. Chaque fiche doit documenter son site professionnel, son parcours et ses sources avant validation.</p></div>
      <div className="discover-heading-actions"><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser Discover"><RefreshCw size={16}/></button><button className="primary-button discover-add" type="button" onClick={() => setShowForm(v => !v)}><Plus size={16}/> Ajouter un profil</button></div>
    </div>
    <ModuleDataOverview sources={["entrepreneurs", "content_sources", "social_accounts", "followed_entrepreneurs"]} metrics={[{ label: "Profils du catalogue", value: items.length }, { label: "Profils suivis", value: followedIds.length }, { label: "Profils documentés avec sources", value: Object.keys(sourcesByProfile).length }]} loading={loading} error={Boolean(error)} />

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
        <label>Réseau principal<select value={socialPlatform} onChange={e => setSocialPlatform(e.target.value as typeof socialPlatform)}><option value="youtube">YouTube</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option><option value="facebook">Facebook</option><option value="x">X</option><option value="other">Autre</option></select></label>
        <label>URL du profil social<input type="url" value={socialUrl} onChange={e => setSocialUrl(e.target.value)} placeholder="https://…" /></label>
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
        {basketItems.length === 0 ? <div className="discover-basket-empty"><p>{showFollowedOnly ? 'Aucun créateur suivi dans ce panier.' : basketSearches[basket.id] ? 'Aucun résultat. Essayez un autre nom, pays ou mot-clé.' : 'Aucun profil dans ce panier pour le moment.'}</p><button type="button" className="secondary-button" onClick={() => openAddForm(basket.id)}><Plus size={14}/> Ajouter le premier créateur</button></div> : <div className="discover-list">{basketItems.map(item => <article className="discover-item" key={item.id}><div className="discover-avatar"><Compass size={20}/></div><div className="discover-item-main"><div className="discover-card-title"><h3>{item.name}</h3><button type="button" className={followedIds.includes(item.id) ? 'discover-follow-button following' : 'discover-follow-button'} disabled={followingBusyId === item.id} onClick={() => void toggleFollow(item.id)} aria-pressed={followedIds.includes(item.id)}><Bookmark size={14} fill={followedIds.includes(item.id) ? 'currentColor' : 'none'}/>{followingBusyId === item.id ? 'En cours…' : followedIds.includes(item.id) ? 'Suivi' : 'Suivre'}</button></div><div className="discover-meta">{item.country && <span>{item.country}</span>}{item.industry && <span>{item.industry}</span>}<span className={'verification-tag verification-' + item.verification_status}><ShieldCheck size={12}/>{item.verification_status === 'verified' ? 'Vérifié' : item.verification_status === 'reviewed' ? 'Relu' : 'À vérifier'}</span></div>{item.summary && <p>{item.summary}</p>}{item.biography && <details className="discover-biography"><summary>Parcours et pistes d’apprentissage</summary><p>{item.biography}</p></details>}{safeExternalUrl(item.website_url) && <a href={safeExternalUrl(item.website_url)!} target="_blank" rel="noreferrer">{safeExternalUrl(item.website_url)!.replace(/^https?:\/\//, '')} <ExternalLink size={12}/></a>}{(socialsByProfile[item.id] ?? []).length > 0 && <div className="discover-socials" aria-label="Réseaux sociaux du créateur">{(socialsByProfile[item.id] ?? []).map(social => safeExternalUrl(social.profile_url) && <a key={social.id} href={safeExternalUrl(social.profile_url)!} target="_blank" rel="noreferrer"><span>{social.platform}</span>{social.handle && <small>{social.handle}</small>}{social.is_official && <span className="discover-social-official">Officiel</span>}<ExternalLink size={11}/></a>)}</div>}{(sourcesByProfile[item.id] ?? []).length > 0 && <details className="discover-sources"><summary>Sources de référence ({sourcesByProfile[item.id].length})</summary><ul>{sourcesByProfile[item.id].map(source => <li key={source.id}>{safeExternalUrl(source.source_url) && <a href={safeExternalUrl(source.source_url)!} target="_blank" rel="noreferrer">{source.title || source.publisher || source.source_url} <ExternalLink size={11}/></a>}{source.excerpt && <p>{source.excerpt}</p>}{source.credibility_note && <small>{source.credibility_note}</small>}{source.checked_at && <small>Consultée le {new Date(source.checked_at).toLocaleDateString('fr-FR')}</small>}</li>)}</ul></details>}</div></article>)}</div>}
      </section>;
    })}</div>}
    <p className="workspace-footnote">Les profils ajoutés par un utilisateur sont identifiés dans la base. Le statut « vérifié » ne doit être attribué qu’après contrôle des sources.</p>
  </section>;
}
