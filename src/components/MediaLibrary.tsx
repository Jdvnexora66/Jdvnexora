import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Film, Headphones, Play, Plus, Search, Trash2, Youtube, Video, RefreshCw, Globe2, LockKeyhole, Link2, Unplug, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './media-provider.css';
import CreatorCatalog from './CreatorCatalog';
import './creator-catalog.css';

type Platform = 'YouTube' | 'TikTok' | 'Instagram' | 'Spotify' | 'SoundCloud';
type PlatformDb = 'youtube' | 'tiktok' | 'instagram' | 'spotify' | 'soundcloud' | 'other';
type MediaKind = 'video' | 'podcast' | 'interview' | 'audio' | 'short' | 'other';
type Visibility = 'private' | 'public';

type MediaItem = {
  id: string;
  owner_id: string;
  title: string;
  source_url: string;
  embed_url: string;
  platform: PlatformDb;
  content_type: MediaKind;
  creator_name: string | null;
  thumbnail_url: string | null;
  description: string | null;
  visibility: Visibility;
  created_at: string;
  storage_path: string | null;
  playback_url?: string | null;
};

type EmbedInfo = { platform: PlatformDb; embedUrl: string; contentType: MediaKind };

type ProviderConnection = { platform: 'youtube' | 'tiktok' | 'instagram'; account_name: string | null; connected_at: string; last_synced_at: string | null; last_sync_error: string | null };
type Props = { userId: string };

function buildEmbed(source: string): EmbedInfo | null {
  let url: URL;
  try {
    url = new URL(source.trim());
    if (url.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be' || host === 'youtube.com') {
    const segments = url.pathname.split('/').filter(Boolean);
    const videoId = host === 'youtu.be'
      ? segments[0]
      : url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(segments[0] ?? '') ? segments[1] : undefined);
    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null;
    return { platform: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/' + videoId, contentType: segments[0] === 'shorts' ? 'short' : 'video' };
  }

  if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    const match = url.pathname.match(/\/video\/(\d+)/);
    if (!match) return null;
    return { platform: 'tiktok', embedUrl: 'https://www.tiktok.com/player/v1/' + match[1], contentType: 'video' };
  }

  if (host === 'instagram.com') {
    const match = url.pathname.match(/^\/(p|reel|tv)\/([\w-]+)/);
    if (!match) return null;
    return { platform: 'instagram', embedUrl: 'https://www.instagram.com/' + match[1] + '/' + match[2] + '/embed/', contentType: match[1] === 'reel' ? 'short' : 'video' };
  }

  if (host === 'open.spotify.com') {
    const match = url.pathname.match(/^\/(episode|show|track|album)\/([\w]+)/);
    if (!match) return null;
    return { platform: 'spotify', embedUrl: 'https://open.spotify.com/embed/' + match[1] + '/' + match[2], contentType: match[1] === 'episode' || match[1] === 'show' ? 'podcast' : 'audio' };
  }

  if (host === 'soundcloud.com') {
    return { platform: 'soundcloud', embedUrl: 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url.toString()) + '&auto_play=false&visual=true', contentType: 'podcast' };
  }

  // Higgsfield share pages are external project pages, not embeddable video files.
  // Save the HTTPS link and open it on Higgsfield instead of forcing an iframe.
  if (host === 'higgsfield.ai') {
    if (!url.pathname.startsWith('/s/')) return null;
    return { platform: 'other', embedUrl: url.toString(), contentType: 'video' };
  }

  return null;
}

function platformIcon(platform: PlatformDb) {
  if (platform === 'youtube') return <Youtube size={15} />;
  if (platform === 'spotify' || platform === 'soundcloud') return <Headphones size={15} />;
  if (platform === 'tiktok') return <Video size={15} />;
  return <Film size={15} />;
}

function platformLabel(platform: PlatformDb) {
  return ({ youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', spotify: 'Spotify', soundcloud: 'SoundCloud', other: 'Lien externe' } as const)[platform];
}

function mediaKindLabel(kind: MediaKind) {
  return ({ video: 'Vidéo', podcast: 'Podcast', interview: 'Interview', audio: 'Audio', short: 'Vidéo courte', other: 'Autre' } as const)[kind];
}

export default function MediaLibrary({ userId }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [contentType, setContentType] = useState<MediaKind>('video');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [providerBusy, setProviderBusy] = useState<string | null>(null);
  const [providerError, setProviderError] = useState('');
  const [providerNotice, setProviderNotice] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Supabase n’est pas configuré. La vidéothèque ne peut pas enregistrer les médias.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: loadError } = await supabase
        .from('media_library_items')
        .select('id,owner_id,title,source_url,embed_url,platform,content_type,creator_name,thumbnail_url,description,visibility,created_at,storage_path')
        .order('created_at', { ascending: false })
        .limit(100);
      if (loadError) throw loadError;
      const loadedItems = (data ?? []) as MediaItem[];
      const hostedItems = loadedItems.filter((item) => Boolean(item.storage_path));
      if (hostedItems.length) {
        const { data: signedFiles, error: signedError } = await supabase.storage.from('nexora-media').createSignedUrls(hostedItems.map((item) => item.storage_path as string), 3600);
        if (signedError) throw signedError;
        const urls = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]));
        setItems(loadedItems.map((item) => ({ ...item, playback_url: item.storage_path ? urls.get(item.storage_path) ?? null : null })));
      } else {
        setItems(loadedItems);
      }
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes('media_library_items')
        ? 'La vidéothèque persistante attend la migration Supabase. Actualisez après la mise à jour du schéma.'
        : cause instanceof Error ? cause.message : 'Impossible de charger la vidéothèque.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    if (!supabase) return [] as ProviderConnection[];
    const { data, error: invokeError } = await supabase.functions.invoke('media-integrations?action=status', { body: {} });
    if (invokeError) { setProviderError('Le service de connexion média n’est pas encore disponible. Vérifiez le déploiement de la fonction Supabase.'); return [] as ProviderConnection[]; }
    const loadedConnections = (data?.connections ?? []) as ProviderConnection[];
    setConnections(loadedConnections);
    return loadedConnections;
  }, []);

  useEffect(() => {
    void load();
    void loadConnections().then((loadedConnections) => {
      const staleBefore = Date.now() - 12 * 60 * 60 * 1000;
      for (const connection of loadedConnections) {
        if (!connection.last_synced_at || new Date(connection.last_synced_at).getTime() < staleBefore) void syncProvider(connection.platform);
      }
    });
    const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const allowedOrigin = configuredUrl ? new URL(configuredUrl).origin : '';
    const onOAuthMessage = (event: MessageEvent) => {
      if (!allowedOrigin || event.origin !== allowedOrigin || event.data?.type !== 'nexora-media-oauth') return;
      if (event.data.ok) {
        setProviderNotice('Compte connecté. Première synchronisation en cours…');
        const platform = event.data.platform;
        void loadConnections().then(() => {
          if (platform === 'youtube' || platform === 'tiktok' || platform === 'instagram') void syncProvider(platform);
        });
      } else {
        setProviderError('La connexion a échoué. Vérifiez la configuration de la plateforme et réessayez.');
        void loadConnections();
      }
    };
    const onCreatorSync = () => { void load(); };
    window.addEventListener('message', onOAuthMessage);
    window.addEventListener('nexora-media-library-refresh', onCreatorSync);
    return () => {
      window.removeEventListener('message', onOAuthMessage);
      window.removeEventListener('nexora-media-library-refresh', onCreatorSync);
    };
  }, [load, loadConnections]);

  async function connectProvider(platform: ProviderConnection['platform']) {
    if (!supabase) return;
    setProviderBusy(platform); setProviderError(''); setProviderNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('media-integrations?action=connect', { body: { platform } });
      if (invokeError) throw new Error(data?.error || invokeError.message || 'Impossible de démarrer la connexion.');
      if (!data?.authorization_url) throw new Error(data?.error || 'La plateforme n’a pas fourni de lien d’autorisation.');
      const popup = window.open(data.authorization_url, 'nexora-media-oauth', 'popup,width=600,height=760');
      if (!popup) window.location.assign(data.authorization_url);
      else popup.focus();
    } catch (cause) {
      setProviderError(cause instanceof Error ? cause.message : 'Connexion impossible. Vérifiez les secrets développeur dans Supabase.');
    } finally {
      setProviderBusy(null);
    }
  }

  async function syncProvider(platform: ProviderConnection['platform']) {
    if (!supabase) return;
    setProviderBusy(platform); setProviderError(''); setProviderNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('media-integrations?action=sync', { body: { platform } });
      if (invokeError) throw new Error(data?.error || invokeError.message || 'La synchronisation a échoué.');
      if (data?.error) throw new Error(data.error);
      setProviderNotice(data?.message || 'Synchronisation terminée.');
      await Promise.all([load(), loadConnections()]);
    } catch (cause) {
      setProviderError(cause instanceof Error ? cause.message : 'Synchronisation impossible.');
      await loadConnections();
    } finally {
      setProviderBusy(null);
    }
  }

  async function disconnectProvider(platform: ProviderConnection['platform']) {
    if (!supabase) return;
    setProviderBusy(platform); setProviderError(''); setProviderNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('media-integrations?action=disconnect', { body: { platform } });
      if (invokeError) throw new Error(data?.error || invokeError.message);
      setConnections((current) => current.filter((item) => item.platform !== platform));
      setProviderNotice('Compte déconnecté de NEXORA. Les médias déjà importés restent dans votre bibliothèque.');
    } catch (cause) {
      setProviderError(cause instanceof Error ? cause.message : 'Déconnexion impossible.');
    } finally {
      setProviderBusy(null);
    }
  }

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return items.filter((item) => !search || item.title.toLocaleLowerCase().includes(search) || (item.creator_name ?? '').toLocaleLowerCase().includes(search) || item.platform.includes(search) || (item.description ?? '').toLocaleLowerCase().includes(search));
  }, [items, query]);

  async function addMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setError('Supabase n’est pas configuré.'); return; }
    setError('');
    setNotice('');
    const embed = buildEmbed(sourceUrl);
    if (!embed) {
      let isYoutubeChannel = false;
      try {
        const candidate = new URL(sourceUrl.trim());
        const host = candidate.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
        isYoutubeChannel = candidate.protocol === 'https:' && host === 'youtube.com' && (/^\/channel\/UC[\w-]+/.test(candidate.pathname) || /^\/@[\w.-]+/.test(candidate.pathname) || /^\/user\/[\w.-]+/.test(candidate.pathname) || /^\/c\/[\w.-]+/.test(candidate.pathname));
      } catch { /* Le message générique couvre les URL mal formées. */ }
      setError(isYoutubeChannel
        ? 'Ce lien correspond à une chaîne YouTube, pas à une vidéo. Utilisez le champ « URL officielle de la chaîne » dans « Suivre des chaînes YouTube officielles », en haut de cette page.'
        : 'Lien non reconnu ou non compatible. Utilisez un lien public YouTube, TikTok (URL de vidéo complète), Instagram Reel/publication, Spotify ou SoundCloud en HTTPS.');
      return;
    }
    if (items.some((item) => item.source_url === sourceUrl.trim())) {
      setError('Ce média est déjà présent dans votre vidéothèque.');
      return;
    }
    setSaving(true);
    try {
      const { data, error: insertError } = await supabase.from('media_library_items').insert({
        owner_id: userId,
        title: title.trim() || platformLabel(embed.platform) + ' — ' + mediaKindLabel(contentType),
        creator_name: creatorName.trim() || null,
        platform: embed.platform,
        source_url: sourceUrl.trim(),
        embed_url: embed.embedUrl,
        content_type: contentType === 'video' ? embed.contentType : contentType,
        visibility,
        sync_source: 'manual',
      }).select('id,owner_id,title,source_url,embed_url,platform,content_type,creator_name,thumbnail_url,description,visibility,created_at,storage_path').single();
      if (insertError) throw insertError;
      setItems((current) => [data as MediaItem, ...current]);
      setSourceUrl('');
      setTitle('');
      setCreatorName('');
      setContentType('video');
      setVisibility('private');
      setNotice('Média enregistré dans votre vidéothèque. Il restera disponible après votre reconnexion.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer ce média.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadOwnedFile() {
    if (!supabase || !uploadFile) return;
    setError(''); setNotice('');
    if (!uploadFile.type.startsWith('video/') && !uploadFile.type.startsWith('audio/')) {
      setError('Choisissez un fichier vidéo ou audio pris en charge.');
      return;
    }
    if (uploadFile.size > 524288000) {
      setError('Le fichier dépasse la limite de 500 Mo.');
      return;
    }
    setUploadingFile(true);
    let uploadedPath = '';
    try {
      const safeName = uploadFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-150) || 'media-file';
      uploadedPath = userId + '/' + crypto.randomUUID() + '-' + safeName;
      const { error: uploadError } = await supabase.storage.from('nexora-media').upload(uploadedPath, uploadFile, { contentType: uploadFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
      const authenticatedUrl = baseUrl + '/storage/v1/object/authenticated/nexora-media/' + uploadedPath.split('/').map(encodeURIComponent).join('/');
      const kind: MediaKind = uploadFile.type.startsWith('audio/') ? 'audio' : (contentType === 'interview' || contentType === 'podcast' ? contentType : 'video');
      const { data, error: insertError } = await supabase.from('media_library_items').insert({
        owner_id: userId,
        title: title.trim() || uploadFile.name.slice(0, 240),
        creator_name: creatorName.trim() || null,
        platform: 'other',
        source_url: authenticatedUrl,
        embed_url: authenticatedUrl,
        storage_path: uploadedPath,
        content_type: kind,
        visibility,
        sync_source: 'authorized_import',
        provider_metadata: { uploaded_file: true, original_file_name: uploadFile.name, mime_type: uploadFile.type, file_size: uploadFile.size },
      }).select('id,owner_id,title,source_url,embed_url,platform,content_type,creator_name,thumbnail_url,description,visibility,created_at,storage_path').single();
      if (insertError) throw insertError;
      const { data: signed, error: signedError } = await supabase.storage.from('nexora-media').createSignedUrl(uploadedPath, 3600);
      if (signedError) throw signedError;
      setItems((current) => [{ ...(data as MediaItem), playback_url: signed.signedUrl }, ...current]);
      setUploadFile(null);
      setTitle('');
      setCreatorName('');
      setNotice('Fichier hébergé dans le stockage privé NEXORA et prêt à être lu dans l’application.');
    } catch (cause) {
      if (uploadedPath) await supabase.storage.from('nexora-media').remove([uploadedPath]);
      setError(cause instanceof Error ? cause.message : 'Impossible d’importer ce fichier.');
    } finally {
      setUploadingFile(false);
    }
  }

  async function removeMedia(item: MediaItem) {
    if (!supabase || item.owner_id !== userId) return;
    setBusyId(item.id); setError(''); setNotice('');
    try {
      if (item.storage_path) {
        const { error: storageError } = await supabase.storage.from('nexora-media').remove([item.storage_path]);
        if (storageError) throw storageError;
      }
      const { error: deleteError } = await supabase.from('media_library_items').delete().eq('id', item.id).eq('owner_id', userId);
      if (deleteError) throw deleteError;
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de retirer ce média.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleVisibility(item: MediaItem) {
    if (!supabase || item.owner_id !== userId) return;
    const nextVisibility: Visibility = item.visibility === 'public' ? 'private' : 'public';
    setBusyId(item.id); setError(''); setNotice('');
    try {
      const { data, error: updateError } = await supabase.from('media_library_items')
        .update({ visibility: nextVisibility })
        .eq('id', item.id).eq('owner_id', userId)
        .select('id,owner_id,title,source_url,embed_url,platform,content_type,creator_name,thumbnail_url,description,visibility,created_at,storage_path').single();
      if (updateError) throw updateError;
      setItems((current) => current.map((candidate) => candidate.id === item.id ? data as MediaItem : candidate));
      setNotice(nextVisibility === 'public' ? 'Ce média est maintenant visible dans le catalogue public NEXORA.' : 'Ce média est désormais privé.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier la visibilité.');
    } finally {
      setBusyId(null);
    }
  }

  return <section id="media-library" className="project-panel media-library-panel">
    <CreatorCatalog />
    <div className="section-heading">
      <div>
        <p className="eyebrow">NEXORA MEDIA · VIDÉOTHÈQUE</p>
        <h2><Play size={21} /> Vidéos, interviews et podcasts dans NEXORA</h2>
        <p className="muted">Conservez des liens et médias de référence utiles à vos recherches. Cette bibliothèque est complémentaire au catalogue des créateurs.</p>
      </div>
      <button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser la vidéothèque"><RefreshCw size={16} /></button>
    </div>

    <section className="media-provider-panel" aria-labelledby="media-provider-title">
      <div className="media-provider-heading"><div><h3 id="media-provider-title"><Link2 size={17} /> Intégrations personnelles (optionnelles)</h3><p>Facultatif : connectez un compte uniquement si vous souhaitez importer vos propres contenus autorisés. Ce n’est pas nécessaire pour découvrir les créateurs référencés dans NEXORA.</p></div><span className="media-provider-badge">API officielle</span></div>
      <div className="media-provider-grid">
        {(['youtube','tiktok','instagram'] as const).map((platform) => {
          const connection = connections.find((item) => item.platform === platform);
          const label = platform === 'youtube' ? 'YouTube' : platform === 'tiktok' ? 'TikTok' : 'Instagram';
          return <article className="media-provider-card" key={platform}>
            <div className="media-provider-card-top"><strong>{label}</strong><span className={connection ? 'media-provider-status connected' : 'media-provider-status'}>{connection ? 'Connecté' : 'Non connecté'}</span></div>
            {connection ? <><p className="media-provider-account">{connection.account_name || 'Compte autorisé'}</p><p className="media-provider-last-sync">{connection.last_synced_at ? 'Dernière synchronisation : ' + new Date(connection.last_synced_at).toLocaleString('fr-FR') : 'Aucune synchronisation effectuée'}</p><div className="media-provider-actions"><button type="button" className="primary-button" disabled={providerBusy === platform} onClick={() => void syncProvider(platform)}><RefreshCw size={14} /> {providerBusy === platform ? 'Synchronisation…' : 'Synchroniser'}</button><button type="button" className="media-remove-button" disabled={providerBusy === platform} onClick={() => void disconnectProvider(platform)}><Unplug size={14} /> Déconnecter</button></div></> : <><p className="media-provider-last-sync">Connexion facultative : importez uniquement les contenus de votre propre compte ou ceux que vous êtes autorisé à gérer.</p><button type="button" className="primary-button" disabled={providerBusy === platform} onClick={() => void connectProvider(platform)}><Link2 size={14} /> {providerBusy === platform ? 'Préparation…' : 'Connecter ' + label}</button></>}
          </article>;
        })}
      </div>
      {providerError && <p className="feedback error" role="alert">{providerError}</p>}
      {providerNotice && <p className="feedback success" role="status">{providerNotice}</p>}
      <p className="workspace-footnote">Cette intégration est secondaire et facultative ; le répertoire des créateurs fonctionne sans connexion à vos comptes personnels. La synchronisation automatique concerne uniquement les comptes autorisés par leur propriétaire. Les identifiants développeur OAuth doivent être configurés comme secrets côté Supabase avant de pouvoir connecter YouTube, TikTok ou Instagram. Les vidéos sont intégrées depuis leurs plateformes ; aucun fichier protégé n’est téléchargé.</p>
    </section>

    <form className="media-import-form" onSubmit={addMedia}>
      <div className="media-import-heading">
        <div><strong>Ajouter un contenu à votre vidéothèque</strong><p>Collez le lien public d’une vidéo, d’une interview ou d’un podcast.</p></div>
        <span className="media-platforms" aria-label="Plateformes prises en charge"><Youtube size={17} /><Video size={17} /><Film size={17} /><Headphones size={17} /></span>
      </div>
      <label htmlFor="media-title">Titre (facultatif)</label>
      <input id="media-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Ex. Interview, conférence, podcast…" />
      <label htmlFor="media-creator">Personnalité / créateur (facultatif)</label>
      <input id="media-creator" value={creatorName} onChange={(event) => setCreatorName(event.target.value)} maxLength={180} placeholder="Nom du personnage ou du créateur" />
      <label htmlFor="media-kind">Type de contenu</label>
      <select id="media-kind" value={contentType} onChange={(event) => setContentType(event.target.value as MediaKind)}>
        <option value="video">Vidéo</option><option value="interview">Interview</option><option value="podcast">Podcast</option><option value="audio">Audio</option><option value="short">Vidéo courte</option><option value="other">Autre</option>
      </select>
      <div className="media-file-upload">
        <label htmlFor="media-file">Ou importer un fichier vidéo/audio (maximum 500 Mo)</label>
        <input id="media-file" type="file" accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
        <button type="button" className="primary-button" onClick={() => void uploadOwnedFile()} disabled={!uploadFile || uploadingFile}><Film size={16} /> {uploadingFile ? 'Importation…' : 'Héberger et lire dans NEXORA'}</button>
        <p className="muted">Pour les vidéos appartenant à votre compte ou pour lesquelles vous disposez des droits. Les médias importés sont stockés dans un espace privé.</p>
      </div>
      <label htmlFor="media-url">Lien du média</label>
      <input id="media-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required placeholder="https://www.youtube.com/watch?v=…" />
      <label htmlFor="media-visibility">Visibilité initiale</label>
      <select id="media-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
        <option value="private">Privé — visible uniquement par moi</option><option value="public">Public — visible par les utilisateurs connectés</option>
      </select>
      {error && <p className="feedback error" role="alert">{error}</p>}
      {notice && <p className="feedback success" role="status">{notice}</p>}
      <button className="primary-button media-add-button" type="submit" disabled={saving || !sourceUrl.trim()}><Plus size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer le média'}</button>
    </form>

    <div className="media-search-row">
      <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher titre, personnalité ou plateforme…" aria-label="Rechercher dans la vidéothèque" /></label>
      <span className="muted">{filtered.length} média{filtered.length === 1 ? '' : 's'} · lecture intégrée</span>
    </div>

    {error && <p className="feedback error" role="alert">{error}</p>}
    {loading ? <p className="empty-state" role="status">Chargement de la vidéothèque depuis Supabase…</p> : filtered.length === 0 ? <div className="empty-state media-empty-state">
      <div className="empty-icon"><Play size={24} /></div>
      <h3>{items.length ? 'Aucun média correspondant' : 'Votre vidéothèque est prête'}</h3>
      <p>{items.length ? 'Essayez un autre titre ou une autre plateforme.' : 'Ajoutez un lien public compatible. Les médias enregistrés seront conservés et disponibles après votre reconnexion.'}</p>
    </div> : <div className="media-grid">
      {filtered.map((item) => <article className="media-card" key={item.id}>
        <div className={'media-player-wrap ' + (item.content_type === 'podcast' || item.content_type === 'audio' ? 'media-audio' : '')}>
          {item.storage_path ? (item.playback_url ? (item.content_type === 'audio' || item.content_type === 'podcast'
            ? <audio className="media-native-audio" controls preload="metadata" src={item.playback_url}>Votre navigateur ne prend pas en charge la lecture audio.</audio>
            : <video className="media-native-video" controls playsInline preload="metadata" poster={item.thumbnail_url ?? undefined} src={item.playback_url}>Votre navigateur ne prend pas en charge la lecture vidéo.</video>)
            : <p className="media-playback-error">Le fichier n’est pas accessible. Actualisez la vidéothèque.</p>)
            : item.platform === 'other' ? <div className="media-external-link"><ExternalLink size={28} /><p>Ce contenu est hébergé sur Higgsfield.</p><a href={item.source_url} target="_blank" rel="noopener noreferrer">Ouvrir le projet sur Higgsfield</a></div>
            : <iframe src={item.embed_url} title={item.title} loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
        </div>
        <div className="media-card-details">
          <div className="media-card-title"><span>{platformIcon(item.platform)}</span><h3>{item.title}</h3></div>
          {item.creator_name && <p className="media-creator-name">{item.creator_name}</p>}
          {item.description && <p className="media-description">{item.description}</p>}
          <div className="media-card-meta"><span>{platformLabel(item.platform)}</span><span>{mediaKindLabel(item.content_type)}</span><span>{item.visibility === 'public' ? 'Public' : 'Privé'}</span></div>
          {item.owner_id === userId && <div className="media-card-actions">
            <button type="button" className="media-remove-button" onClick={() => void toggleVisibility(item)} disabled={busyId === item.id}>{item.visibility === 'public' ? <LockKeyhole size={14} /> : <Globe2 size={14} />}{item.visibility === 'public' ? 'Rendre privé' : 'Partager au public'}</button>
            <button type="button" className="media-remove-button" onClick={() => void removeMedia(item)} disabled={busyId === item.id}><Trash2 size={14} /> Retirer</button>
          </div>}
        </div>
      </article>)}
    </div>}

    <p className="workspace-footnote">La bibliothèque est persistante dans Supabase. Les fichiers dont vous détenez les droits peuvent être hébergés et lus directement dans NEXORA ; les autres plateformes utilisent leur lecteur officiel. La synchronisation automatique de comptes YouTube, TikTok et Instagram nécessite encore les identifiants API/OAuth, les autorisations de chaque plateforme et la validation de leurs applications. Les contenus privés ou non intégrables resteront indisponibles sans autorisation explicite.</p>
  </section>;
}
