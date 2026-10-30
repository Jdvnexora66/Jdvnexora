import { FormEvent, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, LoaderCircle, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

type Message = { role: 'user' | 'assistant'; content: string };
type StoredMessage = Message & { id: string; conversation_id: string; created_at: string };
type UsageSummary = { quota: number; used: number; remaining: number; plan: string };

type StructuredAnalysis = { summary: string; key_insights: string[]; strategies: string[]; action_steps: string[] };

function parseStructuredAnalysis(raw: string): StructuredAnalysis | null {
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first < 0 || last <= first) return null;
  try {
    const value = JSON.parse(raw.slice(first, last + 1)) as Record<string, unknown>;
    const asStrings = (input: unknown) => Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string').slice(0, 20) : [];
    if (typeof value.summary !== 'string' || !value.summary.trim()) return null;
    return {
      summary: value.summary.trim().slice(0, 12000),
      key_insights: asStrings(value.key_insights),
      strategies: asStrings(value.strategies),
      action_steps: asStrings(value.action_steps),
    };
  } catch {
    return null;
  }
}

function formatStructuredAnalysis(value: StructuredAnalysis): string {
  const section = (title: string, items: string[]) => items.length ? `\n\n### ${title}\n${items.map(item => '- ' + item).join('\n')}` : '';
  return `### Résumé\n${value.summary}${section('Idées clés', value.key_insights)}${section('Stratégies', value.strategies)}${section("Plan d’action", value.action_steps)}`;
}

export default function StudioIA() {
  const [prompt, setPrompt] = useState(() => new URLSearchParams(window.location.search).get('prompt')?.slice(0, 8000) ?? '');
  const [analysisContentId, setAnalysisContentId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('contentId'));
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
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('prompt');
    currentUrl.searchParams.delete('contentId');
    window.history.replaceState({}, '', currentUrl.toString());
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
      const rawAnswer = data.text;
      const structuredAnalysis = analysisContentId ? parseStructuredAnalysis(rawAnswer) : null;
      const answer = structuredAnalysis ? formatStructuredAnalysis(structuredAnalysis) : rawAnswer;
      if (analysisContentId) {
        const payload = structuredAnalysis ?? { summary: rawAnswer, key_insights: [], strategies: [], action_steps: [] };
        const { error: analysisSaveError } = await supabase.from('content_analyses').insert({
          content_item_id: analysisContentId,
          analysis_type: 'strategy',
          status: 'completed',
          summary: payload.summary,
          key_insights: payload.key_insights,
          strategies: payload.strategies,
          action_steps: payload.action_steps,
          model_label: String(data.model_label ?? data.model ?? 'Studio IA'),
        });
        if (analysisSaveError) {
          setError('Réponse générée, mais l’enregistrement dans Insights a échoué. Vérifiez que le contenu vous appartient puis réessayez.');
        } else {
          setAnalysisContentId(null);
        }
      }
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
    setError('');
    if (supabase && userId && conversationId) {
      setBusy(true);
      try {
        const { error: deleteError } = await supabase.from('studio_ai_messages')
          .delete().eq('user_id', userId).eq('conversation_id', conversationId);
        if (deleteError) {
          setError('Impossible d’effacer cette conversation enregistrée. Réessayez.');
          return;
        }
      } catch {
        setError('La suppression de la conversation a échoué à cause d’un problème réseau. Votre historique enregistré est conservé.');
        return;
      } finally {
        setBusy(false);
      }
    }
    setMessages([]);
    setConversationId(crypto.randomUUID());
    setPrompt('');
  }

  return <section className="studio-workspace" id="studio-ia" aria-label="Studio IA">
    <div className="studio-workspace-heading">
      <div>
        <p className="eyebrow">ESPACE DE CRÉATION INTELLIGENTE</p>
        <h2><Sparkles size={23} aria-hidden="true" /> Studio IA</h2>
        <p className="muted">Passez de l’idée au livrable : rédigez, structurez, analysez et améliorez vos créations.</p>
      </div>
      <div className="studio-heading-actions">
        {messages.length > 0 && <button type="button" className="studio-quiet-button" onClick={exportConversation} disabled={busy}><Download size={15} /> Exporter</button>}
        {messages.length > 0 && <button type="button" className="studio-quiet-button" onClick={() => void clearConversation()} disabled={busy}><Trash2 size={15} /> Nouvelle conversation</button>}
      </div>
    </div>
    <ModuleDataOverview sources={["studio_ai_messages", "Edge Function: studio-ai"]} metrics={[{ label: "Messages dans la conversation", value: messages.length }, { label: "Quota restant", value: usage ? usage.remaining : "N/D", note: usage ? usage.plan : "Disponible après réponse IA" }, { label: "Historique", value: historyReady ? "Chargé" : "En cours" }]} loading={!historyReady || busy} error={Boolean(error)} />


    <div className="studio-feature-banner">
      <div className="studio-feature-orb"><Sparkles size={28} /></div>
      <div className="studio-feature-copy">
        <span className="studio-feature-label">VOTRE COPILOTE CRÉATIF</span>
        <h3>Qu’allez-vous créer aujourd’hui ?</h3>
        <p>Expliquez votre objectif. Studio IA vous aide à organiser les étapes et à transformer votre idée en résultat exploitable.</p>
      </div>
      <div className="studio-feature-status"><span className="studio-status-dot" /> Espace privé</div>
    </div>

    <div className="studio-workspace-grid">
      <div className="studio-chat-column">
        <section className="studio-chat-card" aria-label="Conversation avec Studio IA">
          <div className="studio-chat-topbar">
            <div className="studio-assistant-avatar"><Sparkles size={18} /></div>
            <div><strong>Assistant NEXORA</strong><small>Création · Analyse · Organisation</small></div>
            <span className="studio-online-label"><span className="studio-status-dot" /> Prêt à vous aider</span>
          </div>
          <div ref={transcriptRef} className="studio-transcript" aria-live="polite" aria-busy={busy}>
            {!historyReady && <p className="studio-system-message" role="status"><LoaderCircle size={15} className="spin" /> Chargement de votre historique…</p>}
            {historyReady && messages.length === 0 && <div className="studio-empty-conversation">
              <div className="studio-empty-icon"><Sparkles size={25} /></div>
              <h3>Votre prochaine idée commence ici</h3>
              <p>Choisissez un point de départ ou écrivez directement votre demande ci-dessous.</p>
              <div className="studio-prompt-suggestions">
                <button type="button" onClick={() => setPrompt('Aide-moi à structurer un e-book avec un sommaire détaillé, des chapitres et des exercices.')}> <span>✦</span><b>Créer un e-book</b><small>Plan, chapitres et exercices</small></button>
                <button type="button" onClick={() => setPrompt('Transforme mon idée en plan de projet SaaS avec fonctionnalités, étapes, risques et critères de réussite.')}> <span>⌘</span><b>Concevoir un projet SaaS</b><small>Fonctionnalités et feuille de route</small></button>
                <button type="button" onClick={() => setPrompt('Analyse ce projet, identifie ses points faibles et propose un plan d’amélioration priorisé.')}> <span>↗</span><b>Analyser une idée</b><small>Diagnostic et actions prioritaires</small></button>
                <button type="button" onClick={() => setPrompt('Améliore le texte que je vais te fournir en conservant le sens, avec un style clair et professionnel.')}> <span>✎</span><b>Améliorer un contenu</b><small>Clarté et qualité éditoriale</small></button>
              </div>
            </div>}
            {messages.map((item, index) => <article key={index} className={item.role === 'user' ? 'studio-message studio-message-user' : 'studio-message studio-message-assistant'}>
              <div className="studio-message-avatar">{item.role === 'user' ? 'Vous' : <Sparkles size={15} />}</div>
              <div className="studio-message-body"><strong>{item.role === 'user' ? 'Votre demande' : 'Studio IA'}</strong><p>{item.content}</p></div>
            </article>)}
            {busy && <p className="studio-system-message" role="status"><LoaderCircle size={15} className="spin" /> Studio IA prépare votre réponse…</p>}
          </div>
          <form className="studio-composer" onSubmit={submit}>
            <label htmlFor="studio-ai-prompt">Décrivez ce que vous souhaitez accomplir</label>
            <textarea id="studio-ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={8000} placeholder="Ex. Aide-moi à construire une feuille de route claire pour mon projet…" required />
            <div className="studio-composer-footer">
              <small>{prompt.length.toLocaleString('fr-FR')} / 8 000 caractères · Ne partagez aucun mot de passe ni secret.</small>
              <button className="primary-button studio-send-button" type="submit" disabled={busy || !historyReady || !prompt.trim()}>{busy ? <><LoaderCircle size={16} className="spin" /> Génération…</> : <><Send size={16} /> Envoyer</>}</button>
            </div>
          </form>
          {error && <p className="feedback error studio-error" role="alert">{error}</p>}
        </section>
        <p className="studio-privacy-note"><span>✓</span> Votre historique est conservé dans votre espace privé. Vérifiez les informations importantes avant de les publier.</p>
      </div>

      <aside className="studio-context-column" aria-label="Outils et utilisation">
        <section className="studio-context-card">
          <div className="studio-context-heading"><span className="studio-context-icon"><Sparkles size={16} /></span><div><h3>Capacités du Studio</h3><p>Vos outils de création</p></div></div>
          <div className="studio-capability"><span className="studio-capability-symbol">Aa</span><div><b>Rédaction & édition</b><small>Plans, contenus, synthèses</small></div></div>
          <div className="studio-capability"><span className="studio-capability-symbol">⌘</span><div><b>Projets numériques</b><small>Spécifications et étapes</small></div></div>
          <div className="studio-capability"><span className="studio-capability-symbol">↗</span><div><b>Analyse & stratégie</b><small>Diagnostic et priorités</small></div></div>
          <div className="studio-capability"><span className="studio-capability-symbol">文</span><div><b>Amélioration de texte</b><small>Reformulation et traduction sur demande</small></div></div>
        </section>
        <section className="studio-context-card studio-usage-card">
          <div className="studio-context-heading"><span className="studio-context-icon"><Download size={16} /></span><div><h3>Votre consommation</h3><p>Quota mensuel du Studio IA</p></div></div>
          {usage ? <>
            <div className="studio-usage-plan"><span>Forfait actuel</span><strong>{usage.plan}</strong></div>
            <div className="studio-usage-numbers"><strong>{usage.remaining}</strong><span>unités restantes sur {usage.quota}</span></div>
            <div className="studio-usage-track" role="progressbar" aria-label="Consommation du quota mensuel" aria-valuemin={0} aria-valuemax={usage.quota || 1} aria-valuenow={Math.min(usage.used, usage.quota)}><span style={{width: (usage.quota > 0 ? Math.min(100, usage.used / usage.quota * 100) : 0) + '%'}} /></div>
            <small>{usage.used} unités utilisées ce mois-ci</small>
          </> : <div className="studio-usage-placeholder"><strong>Suivi du quota</strong><p>Le résumé de consommation apparaîtra après votre première réponse IA.</p></div>}
        </section>
        <section className="studio-context-card studio-safety-card">
          <div className="studio-safety-mark">✓</div><div><h3>Vous gardez le contrôle</h3><p>L’IA propose. Vous relisez, corrigez et décidez quoi conserver ou publier.</p></div>
        </section>
      </aside>
    </div>
  </section>;
}
