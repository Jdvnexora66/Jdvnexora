import { FormEvent, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, LoaderCircle, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Message = { role: 'user' | 'assistant'; content: string };
type StoredMessage = Message & { id: string; conversation_id: string; created_at: string };
type UsageSummary = { quota: number; used: number; remaining: number; plan: string };

export default function StudioIA() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!supabase) { setHistoryReady(true); return; }
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const currentUser = authData.user;
        if (!currentUser) {
          if (!cancelled) { setError('Connectez-vous pour utiliser Studio IA.'); setHistoryReady(true); }
          return;
        }
        const { data: latest, error: latestError } = await supabase
          .from('studio_ai_messages')
          .select('conversation_id, created_at')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestError) throw latestError;
        const activeConversation = latest?.conversation_id ?? crypto.randomUUID();
        const { data, error: messagesError } = latest
          ? await supabase.from('studio_ai_messages')
              .select('id, conversation_id, role, content, created_at')
              .eq('user_id', currentUser.id)
              .eq('conversation_id', activeConversation)
              .order('created_at', { ascending: true })
              .limit(200)
          : { data: [], error: null };
        if (messagesError) throw messagesError;
        if (cancelled) return;
        setUserId(currentUser.id);
        setConversationId(activeConversation);
        setMessages(((data ?? []) as StoredMessage[]).map(({ role, content }) => ({ role, content })));
      } catch {
        if (!cancelled) setError('Impossible de charger l’historique. Vérifiez votre connexion puis actualisez la page.');
      } finally {
        if (!cancelled) setHistoryReady(true);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = prompt.trim();
    if (!question || busy) return;
    if (!supabase) { setError('Supabase n’est pas configuré.'); return; }
    if (!userId || !conversationId || !historyReady) {
      setError('Votre session ou votre historique n’est pas prêt. Réessayez dans un instant.');
      return;
    }

    const previousMessages = messages;
    setError('');
    setPrompt('');
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setBusy(true);

    let savedUserMessageId: string | null = null;
    try {
      const { data: savedUserMessage, error: saveUserError } = await supabase.from('studio_ai_messages').insert({
        conversation_id: conversationId, user_id: userId, role: 'user', content: question,
      }).select('id').single();
      if (saveUserError || !savedUserMessage) throw new Error('Votre demande n’a pas pu être enregistrée. Réessayez.');
      savedUserMessageId = savedUserMessage.id;

      const { data, error: invokeError } = await supabase.functions.invoke('studio-ai', {
        body: { prompt: question, history: previousMessages.slice(-8) },
      });
      if (invokeError) throw invokeError;
      if (!data?.text || typeof data.text !== 'string') {
        throw new Error(data?.error || 'Le service IA n’a pas renvoyé de réponse.');
      }
      const answer = data.text;
      if (data.usage && Number.isFinite(data.usage.quota) && Number.isFinite(data.usage.used) && Number.isFinite(data.usage.remaining)) {
        setUsage({ quota: data.usage.quota, used: data.usage.used, remaining: data.usage.remaining, plan: String(data.usage.plan ?? 'decouverte') });
      }
      const { error: saveAssistantError } = await supabase.from('studio_ai_messages').insert({
        conversation_id: conversationId, user_id: userId, role: 'assistant', content: answer,
      });
      if (saveAssistantError) {
        setError('Réponse générée, mais sa sauvegarde a échoué. Exportez-la pour éviter de la perdre.');
      }
      setMessages((current) => [...current, { role: 'assistant', content: answer }]);
    } catch (cause) {
      if (savedUserMessageId && supabase) {
        const { error: rollbackError } = await supabase.from('studio_ai_messages').delete()
          .eq('id', savedUserMessageId).eq('user_id', userId);
        if (rollbackError) setError('La réponse IA a échoué et votre demande reste dans l’historique. Vous pouvez la retrouver après actualisation.');
      }
      setMessages((current) => {
        const last = current[current.length - 1];
        return last?.role === 'user' && last.content === question ? current.slice(0, -1) : current;
      });
      setPrompt(question);
      const reason = cause instanceof Error ? cause.message : '';
      setError(reason.includes('Failed to send a request')
        ? 'Impossible de joindre Studio IA. Vérifiez la connexion, le déploiement de la fonction et la clé API configurée côté serveur, puis réessayez.'
        : reason || 'Le service IA est indisponible. Votre demande est conservée pour vous permettre de réessayer.');
    } finally {
      setBusy(false);
    }
  }

  function exportConversation() {
    if (messages.length === 0) return;
    const markdown = [
      '# JDV NEXORA — Conversation Studio IA',
      '',
      ...messages.flatMap((item) => [
        item.role === 'user' ? '## Votre demande' : '## Réponse de Studio IA',
        '', item.content, '',
      ]),
    ].join('\n');
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jdv-nexora-conversation-studio-ia.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function clearConversation() {
    if (busy) return;
    if (supabase && userId && conversationId) {
      const { error: deleteError } = await supabase.from('studio_ai_messages')
        .delete().eq('user_id', userId).eq('conversation_id', conversationId);
      if (deleteError) {
        setError('Impossible d’effacer cette conversation enregistrée. Réessayez.');
        return;
      }
    }
    setMessages([]);
    setConversationId(crypto.randomUUID());
    setError('');
    setPrompt('');
  }

  return <section className="project-panel" id="studio-ia">
    <div className="section-heading">
      <div><p className="eyebrow">ASSISTANT DE CRÉATION</p><h2><Sparkles size={21} style={{ verticalAlign: 'middle', marginRight: 8 }} />Studio IA</h2><p className="muted">Préparez, structurez et améliorez vos idées avec l’assistant.</p></div>
      {messages.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="text-button" onClick={exportConversation} disabled={busy} aria-label="Exporter la conversation en Markdown"><Download size={15} /> Exporter</button>
        <button type="button" className="icon-button" onClick={() => void clearConversation()} disabled={busy} aria-label="Effacer la conversation" title="Effacer la conversation"><Trash2 size={16} /></button>
      </div>}
    </div>
    {usage && <div className="project-meta" role="status" aria-label="Consommation du quota IA" style={{ marginTop: 12 }}><span className="project-type-label">Forfait : {usage.plan}</span><span>{usage.used} / {usage.quota} unités IA utilisées ce mois</span><span>{usage.remaining} restantes</span></div>}
    <div ref={transcriptRef} style={{ display: 'grid', gap: 12, margin: '18px 0', maxHeight: 420, overflowY: 'auto' }} aria-live="polite" aria-busy={busy}>
      {!historyReady && <p className="muted" role="status"><LoaderCircle size={15} className="spin" /> Chargement de votre historique…</p>}
      {historyReady && messages.length === 0 && <p className="empty-state">Décrivez votre idée, demandez un plan de chapitre ou faites améliorer un texte. Vérifiez toujours les informations importantes avant publication.</p>}
      {messages.map((item, index) => <article key={index} style={{ padding: 14, borderRadius: 12, background: item.role === 'user' ? 'var(--panel, #f3f6fa)' : 'var(--surface, #fff)', border: '1px solid var(--border, #e4e8ef)' }}><strong>{item.role === 'user' ? 'Vous' : 'Studio IA'}</strong><p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{item.content}</p></article>)}
      {busy && <p className="muted" role="status"><LoaderCircle size={15} className="spin" /> L’assistant prépare une réponse…</p>}
    </div>
    <form className="project-form" onSubmit={submit}>
      <label htmlFor="studio-ai-prompt">Votre demande</label>
      <textarea id="studio-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={8000} placeholder="Ex. Propose un plan détaillé pour mon e-book…" required />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <small className="muted">{prompt.length.toLocaleString('fr-FR')} / 8 000 caractères</small>
        <button className="primary-button" type="submit" disabled={busy || !historyReady || !prompt.trim()}>{busy ? 'Génération…' : 'Envoyer à Studio IA'} <Send size={16} /></button>
      </div>
    </form>
    {error && <p className="feedback error" role="alert">{error}</p>}
    <p className="workspace-footnote">L’historique est sauvegardé dans votre espace privé. Ne saisissez pas de mots de passe, de données sensibles ou de secrets dans vos demandes.</p>
  </section>;
}
