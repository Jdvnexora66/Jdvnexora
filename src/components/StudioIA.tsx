import { FormEvent, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, LoaderCircle, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Message = { role: 'user' | 'assistant'; content: string };

export default function StudioIA() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = prompt.trim();
    if (!question || busy) return;
    if (!supabase) { setError('Supabase n’est pas configuré.'); return; }

    const previousMessages = messages;
    setError('');
    setPrompt('');
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setBusy(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('studio-ai', {
        body: { prompt: question, history: previousMessages.slice(-8) },
      });
      if (invokeError) throw invokeError;
      if (!data?.text || typeof data.text !== 'string') {
        throw new Error(data?.error || 'Le service IA n’a pas renvoyé de réponse.');
      }
      setMessages((current) => [...current, { role: 'assistant', content: data.text }]);
    } catch (cause) {
      // Keep the user's request in the composer so a transient failure does not lose their work.
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
        '',
        item.content,
        '',
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

  function clearConversation() {
    if (busy) return;
    setMessages([]);
    setError('');
    setPrompt('');
  }

  return <section className="project-panel" id="studio-ia">
    <div className="section-heading">
      <div><p className="eyebrow">ASSISTANT DE CRÉATION</p><h2><Sparkles size={21} style={{ verticalAlign: 'middle', marginRight: 8 }} />Studio IA</h2><p className="muted">Préparez, structurez et améliorez vos idées avec l’assistant.</p></div>
      {messages.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="text-button" onClick={exportConversation} disabled={busy} aria-label="Exporter la conversation en Markdown"><Download size={15} /> Exporter</button>
        <button type="button" className="icon-button" onClick={clearConversation} disabled={busy} aria-label="Effacer la conversation" title="Effacer la conversation"><Trash2 size={16} /></button>
      </div>}
    </div>
    <div ref={transcriptRef} style={{ display: 'grid', gap: 12, margin: '18px 0', maxHeight: 420, overflowY: 'auto' }} aria-live="polite" aria-busy={busy}>
      {messages.length === 0 && <p className="empty-state">Décrivez votre idée, demandez un plan de chapitre ou faites améliorer un texte. Vérifiez toujours les informations importantes avant publication.</p>}
      {messages.map((item, index) => <article key={index} style={{ padding: 14, borderRadius: 12, background: item.role === 'user' ? 'var(--panel, #f3f6fa)' : 'var(--surface, #fff)', border: '1px solid var(--border, #e4e8ef)' }}><strong>{item.role === 'user' ? 'Vous' : 'Studio IA'}</strong><p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{item.content}</p></article>)}
      {busy && <p className="muted" role="status"><LoaderCircle size={15} className="spin" /> L’assistant prépare une réponse…</p>}
    </div>
    <form className="project-form" onSubmit={submit}>
      <label htmlFor="studio-ai-prompt">Votre demande</label>
      <textarea id="studio-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={8000} placeholder="Ex. Propose un plan détaillé pour mon e-book…" required />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <small className="muted">{prompt.length.toLocaleString('fr-FR')} / 8 000 caractères</small>
        <button className="primary-button" type="submit" disabled={busy || !prompt.trim()}>{busy ? 'Génération…' : 'Envoyer à Studio IA'} <Send size={16} /></button>
      </div>
    </form>
    {error && <p className="feedback error" role="alert">{error}</p>}
    <p className="workspace-footnote">Les conversations ne sont pas encore enregistrées après fermeture ou actualisation de la page. Ne saisissez pas de mots de passe, de données sensibles ou de secrets dans vos demandes.</p>
  </section>;
}
