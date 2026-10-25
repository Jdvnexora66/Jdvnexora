import { FormEvent, useState } from 'react';
import { Sparkles, Send, LoaderCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Message = { role: 'user' | 'assistant'; content: string };

export default function StudioIA() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = prompt.trim();
    if (!question || busy) return;
    if (!supabase) { setError('Supabase n’est pas configuré.'); return; }
    setError('');
    setPrompt('');
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('studio-ai', {
        body: { prompt: question, history: messages.slice(-8) },
      });
      if (invokeError) throw invokeError;
      if (!data?.text || typeof data.text !== 'string') throw new Error(data?.error || 'Le service IA n’a pas renvoyé de réponse.');
      setMessages((current) => [...current, { role: 'assistant', content: data.text }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le service IA est indisponible.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="project-panel" id="studio-ia">
    <div className="section-heading">
      <div><p className="eyebrow">ASSISTANT DE CRÉATION</p><h2><Sparkles size={21} style={{ verticalAlign: 'middle', marginRight: 8 }} />Studio IA</h2><p className="muted">Préparez, structurez et améliorez vos idées avec l’assistant.</p></div>
    </div>
    <div style={{ display: 'grid', gap: 12, margin: '18px 0', maxHeight: 420, overflowY: 'auto' }} aria-live="polite">
      {messages.length === 0 && <p className="empty-state">Décrivez votre idée, demandez un plan de chapitre ou faites améliorer un texte. Vérifiez toujours les informations importantes avant publication.</p>}
      {messages.map((item, index) => <article key={index} style={{ padding: 14, borderRadius: 12, background: item.role === 'user' ? 'var(--panel, #f3f6fa)' : 'var(--surface, #fff)', border: '1px solid var(--border, #e4e8ef)' }}><strong>{item.role === 'user' ? 'Vous' : 'Studio IA'}</strong><p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{item.content}</p></article>)}
      {busy && <p className="muted"><LoaderCircle size={15} className="spin" /> L’assistant prépare une réponse…</p>}
    </div>
    <form className="project-form" onSubmit={submit}>
      <label htmlFor="studio-ai-prompt">Votre demande</label>
      <textarea id="studio-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={8000} placeholder="Ex. Propose un plan détaillé pour mon e-book…" required />
      <button className="primary-button" type="submit" disabled={busy || !prompt.trim()}>{busy ? 'Génération…' : 'Envoyer à Studio IA'} <Send size={16} /></button>
    </form>
    {error && <p className="feedback error" role="alert">{error.includes('Failed to send a request') ? 'Le service IA n’est pas encore disponible. Vérifiez le déploiement de la fonction et sa clé API côté serveur.' : error}</p>}
    <p className="workspace-footnote">Ne saisissez pas de mots de passe, de données sensibles ou de secrets dans vos demandes.</p>
  </section>;
}
