import { FormEvent, useMemo, useState } from 'react';
import { Film, Headphones, Play, Plus, Search, Trash2, Youtube, Radio, Video } from 'lucide-react';

type Platform = 'YouTube' | 'TikTok' | 'Instagram' | 'Spotify' | 'SoundCloud';

type MediaItem = {
  id: string;
  title: string;
  sourceUrl: string;
  embedUrl: string;
  platform: Platform;
  kind: 'video' | 'audio';
};

function buildEmbed(source: string): { platform: Platform; embedUrl: string; kind: 'video' | 'audio' } | null {
  let url: URL;
  try {
    url = new URL(source.trim());
    if (url.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com') {
    const segments = url.pathname.split('/').filter(Boolean);
    const videoId = host === 'youtu.be'
      ? segments[0]
      : url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(segments[0] ?? '') ? segments[1] : undefined);
    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null;
    return { platform: 'YouTube', embedUrl: 'https://www.youtube-nocookie.com/embed/' + videoId, kind: 'video' };
  }

  if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    const match = url.pathname.match(/\/video\/(\d+)/);
    if (match) return { platform: 'TikTok', embedUrl: 'https://www.tiktok.com/embed/v2/' + match[1], kind: 'video' };
    return null;
  }

  if (host === 'instagram.com') {
    const match = url.pathname.match(/^\/(p|reel|tv)\/([\w-]+)/);
    if (!match) return null;
    return { platform: 'Instagram', embedUrl: 'https://www.instagram.com/' + match[1] + '/' + match[2] + '/embed/', kind: 'video' };
  }

  if (host === 'open.spotify.com') {
    const match = url.pathname.match(/^\/(episode|show|track|album)\/([\w]+)/);
    if (!match) return null;
    return { platform: 'Spotify', embedUrl: 'https://open.spotify.com/embed/' + match[1] + '/' + match[2], kind: 'audio' };
  }

  if (host === 'soundcloud.com') {
    return { platform: 'SoundCloud', embedUrl: 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url.toString()) + '&auto_play=false&visual=true', kind: 'audio' };
  }

  return null;
}

function platformIcon(platform: Platform) {
  if (platform === 'YouTube') return <Youtube size={15} />;
  if (platform === 'Spotify' || platform === 'SoundCloud') return <Headphones size={15} />;
  if (platform === 'TikTok') return <Video size={15} />;
  return <Film size={15} />;
}

export default function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return items.filter((item) => !search || item.title.toLocaleLowerCase().includes(search) || item.platform.toLocaleLowerCase().includes(search));
  }, [items, query]);

  function addMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const embed = buildEmbed(sourceUrl);
    if (!embed) {
      setError('Lien non reconnu ou non compatible. Utilisez un lien public YouTube, TikTok, Instagram (Reel/publication), Spotify ou SoundCloud en HTTPS.');
      return;
    }
    if (items.some((item) => item.sourceUrl === sourceUrl.trim())) {
      setError('Ce média est déjà présent dans cette liste.');
      return;
    }
    const item: MediaItem = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
      title: title.trim() || embed.platform + ' — ' + (embed.kind === 'audio' ? 'podcast / audio' : 'vidéo'),
      sourceUrl: sourceUrl.trim(),
      embedUrl: embed.embedUrl,
      platform: embed.platform,
      kind: embed.kind,
    };
    setItems((current) => [item, ...current]);
    setSourceUrl('');
    setTitle('');
    setNotice('Média ajouté au lecteur intégré. Cette liste de démonstration est conservée uniquement pendant cette session.');
  }

  return <section id="media-library" className="project-panel media-library-panel">
    <div className="section-heading">
      <div>
        <p className="eyebrow">NEXORA MEDIA · VIDÉOTHÈQUE</p>
        <h2><Play size={21} /> Vidéos, interviews et podcasts dans NEXORA</h2>
        <p className="muted">Lisez les contenus compatibles directement ici, sans ouvrir une autre application.</p>
      </div>
      <span className="media-count">{items.length} média{items.length === 1 ? '' : 's'}</span>
    </div>

    <form className="media-import-form" onSubmit={addMedia}>
      <div className="media-import-heading">
        <div><strong>Ajouter un contenu à lire</strong><p>Collez le lien public d’une vidéo ou d’un podcast.</p></div>
        <span className="media-platforms" aria-label="Plateformes prises en charge"><Youtube size={17} /><Video size={17} /><Film size={17} /><Headphones size={17} /></span>
      </div>
      <label htmlFor="media-title">Titre (facultatif)</label>
      <input id="media-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Ex. Interview, conférence, podcast…" />
      <label htmlFor="media-url">Lien du média</label>
      <input id="media-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required placeholder="https://www.youtube.com/watch?v=…" />
      {error && <p className="feedback error" role="alert">{error}</p>}
      {notice && <p className="feedback success" role="status">{notice}</p>}
      <button className="primary-button media-add-button" type="submit"><Plus size={16} /> Ajouter au lecteur</button>
    </form>

    <div className="media-search-row">
      <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher dans cette vidéothèque…" aria-label="Rechercher dans la vidéothèque" /></label>
      <span className="muted">Lecture intégrée · contenus publics compatibles</span>
    </div>

    {filtered.length === 0 ? <div className="empty-state media-empty-state">
      <div className="empty-icon"><Play size={24} /></div>
      <h3>{items.length ? 'Aucun média correspondant' : 'Votre vidéothèque commence ici'}</h3>
      <p>{items.length ? 'Essayez un autre titre ou une autre plateforme.' : 'Ajoutez un lien public compatible : le lecteur vidéo ou audio apparaîtra dans cette page, au lieu de vous envoyer directement sur la plateforme.'}</p>
    </div> : <div className="media-grid">
      {filtered.map((item) => <article className="media-card" key={item.id}>
        <div className={'media-player-wrap ' + (item.kind === 'audio' ? 'media-audio' : '')}>
          <iframe
            src={item.embedUrl}
            title={item.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="media-card-details">
          <div className="media-card-title"><span>{platformIcon(item.platform)}</span><h3>{item.title}</h3></div>
          <div className="media-card-meta"><span>{item.platform}</span><span>{item.kind === 'audio' ? 'Podcast / audio' : 'Vidéo'}</span></div>
          <button type="button" className="media-remove-button" onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}><Trash2 size={14} /> Retirer de la liste</button>
        </div>
      </article>)}
    </div>}

    <p className="workspace-footnote">Important : cette première étape lit les contenus via les lecteurs officiels intégrables ; elle ne télécharge pas les fichiers vidéo. L’import automatique et la synchronisation des comptes nécessitent les API officielles, l’autorisation du propriétaire des comptes, un stockage autorisé et une configuration serveur. La liste actuelle n’est pas encore synchronisée avec Supabase.</p>
  </section>;
}
