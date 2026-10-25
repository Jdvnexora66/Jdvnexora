import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Film, Headphones, Play, Plus, Search, Trash2, Youtube, Video, RefreshCw, Globe2, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Platform = 'YouTube' | 'TikTok' | 'Instagram' | 'Spotify' | 'SoundCloud';
type PlatformDb = 'youtube' | 'tiktok' | 'instagram' | 'spotify' | 'soundcloud';
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
};

type EmbedInfo = { platform: PlatformDb; embedUrl: string; contentType: MediaKind };

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

  return null;
}

function platformIcon(platform: PlatformDb) {
  if (platform === 'youtube') return <Youtube size={15} />;
  if (platform === 'spotify' || platform === 'soundcloud') return <Headphones size={15} />;
  if (platform === 'tiktok') return <Video size={15} />;
  return <Film size={15} />;
}

function platformLabel(platform: PlatformDb) {
  return ({ youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', spotify: 'Spotify', soundcloud: 'SoundCloud' } as const)[platform];
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
        .select('id,owner_id,title,source_url,embed_url,platform,content_type,creator_name,thumbnail_url,description,visibility,created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (loadError) throw loadError;
      setItems((data ?? []) as MediaItem[]);
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes('media_library_items')
        ? 'La vidéothèque persistante attend la migration Supabase. Actualisez après la mise à jour du schéma.'
        : cause instanceof Error ? cause.message : 'Impossible de charger la vidéothèque.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
      setError('Lien non reconnu ou non compatible. Utilisez un lien public YouTube, TikTok (URL de vidéo complète), Instagram Reel/publication, Spotify ou SoundCloud en HTTPS.');
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
      }).select('id,owner_id,title,source_url,embed_url,platform,content_type,creator_name,thumbnail_url,description,visibility,created_at').single();
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

  async function removeMedia(item: MediaItem) {
    if (!supabase || item.owner_id !== userId) return;
    setBusyId(item.id); setError(''); setNotice('');
    try {
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
        .select('id,owner_id,title,source_url,embed_url,platform,content_type,creator_name,thumbnail_url,description,visibility,created_at').single();
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
    <div className="section-heading">
      <div>
        <p className="eyebrow">NEXORA MEDIA · VIDÉOTHÈQUE</p>
        <h2><Play size={21} /> Vidéos, interviews et podcasts dans NEXORA</h2>
        <p className="muted">Retrouvez vos médias dans l’application, avec une lecture intégrée et une bibliothèque synchronisée.</p>
      </div>
      <button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Actualiser la vidéothèque"><RefreshCw size={16} /></button>
    </div>

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
          <iframe src={item.embed_url} title={item.title} loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
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

    <p className="workspace-footnote">La bibliothèque est désormais persistante dans Supabase. Les lecteurs officiels permettent de regarder les contenus compatibles dans NEXORA, mais n’en téléchargent pas les fichiers. La synchronisation automatique de comptes YouTube, TikTok et Instagram nécessite encore les identifiants API/OAuth, les autorisations de chaque plateforme et la validation de leurs applications. Les contenus privés ou non intégrables resteront indisponibles sans autorisation explicite.</p>
  </section>;
}
