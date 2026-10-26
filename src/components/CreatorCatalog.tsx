import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Plus, RefreshCw, Trash2, Youtube } from 'lucide-react';
import { supabase } from '../lib/supabase';

type CreatorChannel = { id: string; channel_id: string; channel_url: string; channel_name: string | null; last_synced_at: string | null; last_sync_error: string | null; created_at: string };

export default function CreatorCatalog() {
  const [channels, setChannels] = useState<CreatorChannel[]>([]);
  const [channelUrl, setChannelUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const invoke = useCallback(async (payload: Record<string, string>) => {
    if (!supabase) throw new Error('Supabase n’est pas configuré.');
    const { data, error: invokeError } = await supabase.functions.invoke('sync-public-creators', { body: payload });
    if (invokeError) throw new Error(data?.error || invokeError.message || 'Opération impossible.');
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase n’est pas configuré.'); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await invoke({ action: 'list' });
      setChannels((data.channels ?? []) as CreatorChannel[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de charger les créateurs.'); }
    finally { setLoading(false); }
  }, [invoke]);

  useEffect(() => { void load(); }, [load]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setBusy('add');
    try {
      const data = await invoke({ action: 'add', channel_url: channelUrl.trim() });
      setNotice('Chaîne ajoutée : ' + (data.channel?.channel_name || 'YouTube') + '. ' + (data.imported ?? 0) + ' vidéo(s) synchronisée(s).');
      setChannelUrl('');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible d’ajouter cette chaîne.'); }
    finally { setBusy(null); }
  }

  async function sync(channel: CreatorChannel) {
    setError(''); setNotice(''); setBusy(channel.id);
    try {
      const data = await invoke({ action: 'sync', id: channel.id });
      setNotice('Synchronisation terminée pour ' + (channel.channel_name || 'la chaîne') + ' : ' + (data.channel?.imported ?? 0) + ' vidéo(s) traitée(s).');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Synchronisation impossible.'); await load(); }
    finally { setBusy(null); }
  }

  async function remove(channel: CreatorChannel) {
    setError(''); setNotice(''); setBusy(channel.id);
    try {
      await invoke({ action: 'remove', id: channel.id });
      setChannels((current) => current.filter((item) => item.id !== channel.id));
      setNotice('Chaîne retirée de la liste de suivi. Les vidéos déjà importées restent dans votre vidéothèque.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de retirer la chaîne.'); }
    finally { setBusy(null); }
  }

  return <section className="creator-catalog">
    <div className="creator-catalog-heading">
      <div><p className="eyebrow">NEXORA · CATALOGUE DES CRÉATEURS</p><h3><Youtube size={19} /> Suivre des chaînes YouTube officielles</h3>
      <p className="muted">Ajoutez une chaîne publique pour importer ses dernières publications dans votre vidéothèque NEXORA. Les vidéos restent hébergées sur YouTube et sont lues via leur lecteur officiel.</p></div>
      <span className="media-provider-badge">Flux public</span>
    </div>
    <form className="creator-catalog-form" onSubmit={add}>
      <label htmlFor="creator-channel-url">URL officielle de la chaîne</label>
      <div className="creator-catalog-input-row"><input id="creator-channel-url" type="url" value={channelUrl} onChange={(event) => setChannelUrl(event.target.value)} required placeholder="https://www.youtube.com/channel/UC…" /><button className="primary-button" type="submit" disabled={busy !== null || !channelUrl.trim()}><Plus size={15} /> {busy === 'add' ? 'Ajout…' : 'Ajouter et synchroniser'}</button></div>
      <p className="muted">Pour cette première version, utilisez l’URL qui contient <code>/channel/UC…</code>. Les liens courts et les identifiants @nom seront pris en charge après la mise en place de la résolution officielle des chaînes.</p>
    </form>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {notice && <p className="feedback success" role="status">{notice}</p>}
    {loading ? <p className="muted">Chargement des chaînes suivies…</p> : channels.length === 0 ? <div className="creator-catalog-empty"><Youtube size={22} /><strong>Aucune chaîne suivie pour le moment</strong><span>Ajoutez la première chaîne publique à surveiller.</span></div> : <div className="creator-channel-list">
      {channels.map((channel) => <article className="creator-channel-card" key={channel.id}>
        <div className="creator-channel-info"><span className="creator-channel-icon"><Youtube size={18} /></span><div><strong>{channel.channel_name || 'Chaîne YouTube'}</strong><small>{channel.channel_id}</small>{channel.last_synced_at && <small>Dernière synchronisation : {new Date(channel.last_synced_at).toLocaleString('fr-FR')}</small>}{channel.last_sync_error && <small className="creator-channel-error">Dernière erreur : {channel.last_sync_error}</small>}</div></div>
        <div className="creator-channel-actions"><a href={channel.channel_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Ouvrir</a><button type="button" className="media-remove-button" onClick={() => void sync(channel)} disabled={busy !== null}><RefreshCw size={14} /> {busy === channel.id ? 'Synchronisation…' : 'Synchroniser'}</button><button type="button" className="media-remove-button" onClick={() => void remove(channel)} disabled={busy !== null}><Trash2 size={14} /> Retirer</button></div>
      </article>)}
    </div>}
    <p className="workspace-footnote">La synchronisation utilise le flux public YouTube, sans demander au créateur de connecter son compte. Cette première version récupère les publications récentes exposées par ce flux ; la synchronisation périodique en arrière-plan sera ajoutée après validation de cette brique.</p>
  </section>;
}
