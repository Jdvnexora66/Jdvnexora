import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CreditCard, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Plan = { id: string; code: string; name: string; description: string | null; active: boolean; features: Record<string, unknown>; price_minor: number; currency: string; billing_interval: 'month'|'year'|'one_time'; trial_days: number; created_at: string };
type PlanBrief = { name: string; code: string; price_minor: number; currency: string; billing_interval: string };
type Subscription = { id: string; status: 'pending'|'active'|'trialing'|'past_due'|'canceled'|'expired'; starts_at: string | null; ends_at: string | null; provider: string | null; plan: PlanBrief[] | PlanBrief | null };

export default function BillingPanel({ userId, role }: { userId: string; role: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('XOF');
  const [interval, setInterval] = useState<Plan['billing_interval']>('month');
  const [trialDays, setTrialDays] = useState('0');
  const [featuresText, setFeaturesText] = useState('');

  const isAdmin = role === 'admin';
  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase n’est pas configuré.'); setLoading(false); return; }
    setLoading(true); setError('');
    const [planResult, subscriptionResult] = await Promise.all([
      supabase.from('plans').select('id,code,name,description,active,features,price_minor,currency,billing_interval,trial_days,created_at').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('id,status,starts_at,ends_at,provider,plan:plans(name,code,price_minor,currency,billing_interval)').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
    ]);
    if (planResult.error) setError('Chargement des forfaits impossible : ' + planResult.error.message);
    else setPlans((planResult.data ?? []) as Plan[]);
    if (subscriptionResult.error) setError('Chargement de votre abonnement impossible : ' + subscriptionResult.error.message);
    else setSubscription(((subscriptionResult.data ?? [])[0] ?? null) as unknown as Subscription | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    let features: Record<string, unknown>;
    try {
      features = Object.fromEntries(featuresText.split('\n').map(line => line.trim()).filter(Boolean).map(line => [line, true]));
    } catch { setError('La liste des fonctionnalités est invalide.'); return; }
    const amount = Number(price);
    const trial = Number(trialDays);
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isInteger(trial) || trial < 0 || trial > 365) {
      setError('Vérifiez le prix et la durée de l’essai (0 à 365 jours).'); return;
    }
    setSaving(true); setError(''); setNotice('');
    const { error: insertError } = await supabase.from('plans').insert({
      code: code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-'), name: name.trim(),
      description: description.trim() || null, price_minor: amount, currency,
      billing_interval: interval, trial_days: trial, features, active: true,
    });
    setSaving(false);
    if (insertError) { setError('Création du forfait impossible : ' + insertError.message); return; }
    setCode(''); setName(''); setDescription(''); setPrice('0'); setTrialDays('0'); setFeaturesText('');
    setNotice('Forfait créé. La collecte de paiement doit être reliée à un prestataire avant toute vente en ligne.');
    await load();
  }

  async function togglePlan(plan: Plan) {
    if (!supabase || !isAdmin) return;
    const { error: updateError } = await supabase.from('plans').update({ active: !plan.active }).eq('id', plan.id);
    if (updateError) { setError('Modification du forfait impossible : ' + updateError.message); return; }
    setPlans(current => current.map(item => item.id === plan.id ? { ...item, active: !plan.active } : item));
  }

  function formatPrice(plan: Pick<Plan, 'price_minor'|'currency'|'billing_interval'>) {
    const amount = plan.currency === 'XOF' ? plan.price_minor : plan.price_minor / 100;
    const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: plan.currency, maximumFractionDigits: plan.currency === 'XOF' ? 0 : 2 }).format(amount);
    return formatted + (plan.billing_interval === 'month' ? ' / mois' : plan.billing_interval === 'year' ? ' / an' : ' · paiement unique');
  }

  const statusLabel: Record<Subscription['status'], string> = { pending: 'En attente', active: 'Actif', trialing: 'Essai en cours', past_due: 'Paiement à régulariser', canceled: 'Résilié', expired: 'Expiré' };
  const subscribedPlan = subscription ? (Array.isArray(subscription.plan) ? subscription.plan[0] ?? null : subscription.plan) : null;

  return <section id="billing" className="project-panel billing-panel">
    <div className="section-heading"><div><p className="eyebrow">OFFRES & ABONNEMENTS</p><h2><CreditCard size={21}/> Forfaits et abonnement</h2><p className="muted">Consultez les offres et le statut de votre abonnement.</p></div><button type="button" className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Actualiser les forfaits"><RefreshCw size={16}/></button></div>
    <div className="billing-current">
      <h3><BadgeCheck size={17}/> Votre abonnement</h3>
      {subscription ? <div className="project-item"><div className="project-type-icon"><CreditCard size={18}/></div><div className="project-info"><h3>{subscribedPlan?.name ?? 'Forfait non disponible'}</h3><p>{statusLabel[subscription.status]}{subscription.ends_at ? ' · échéance ' + new Date(subscription.ends_at).toLocaleDateString('fr-FR') : ''}</p></div><span className="project-type-label">{subscribedPlan ? formatPrice({ price_minor: subscribedPlan.price_minor, currency: subscribedPlan.currency, billing_interval: subscribedPlan.billing_interval as Plan['billing_interval'] }) : subscription.status}</span></div> : <p className="muted">Aucun abonnement enregistré pour ce compte.</p>}
    </div>
    <div className="billing-plans">
      <h3>Forfaits disponibles</h3>
      {loading ? <p className="empty-state">Chargement des offres…</p> : plans.filter(plan => plan.active || isAdmin).length === 0 ? <p className="empty-state">Aucun forfait n’est encore publié. Un administrateur peut configurer les premières offres.</p> : <div className="project-list">{plans.filter(plan => plan.active || isAdmin).map(plan => <article className="project-item" key={plan.id}>
        <div className="project-type-icon"><ShieldCheck size={18}/></div><div className="project-info"><h3>{plan.name}</h3><p>{plan.description || 'Forfait JDV NEXORA'}</p><div className="project-meta"><span className="project-type-label">{formatPrice(plan)}</span><span className={plan.active ? 'status-badge status-completed' : 'status-badge status-archived'}>{plan.active ? 'Publié' : 'Masqué'}</span>{plan.trial_days > 0 && <span>{plan.trial_days} jour(s) d’essai</span>}</div><small>{Object.keys(plan.features ?? {}).join(' · ')}</small></div>
        {isAdmin && <button type="button" className="logout-button" onClick={() => void togglePlan(plan)}>{plan.active ? 'Désactiver' : 'Publier'}</button>}
      </article>)}</div>}
      {!isAdmin && <p className="muted">L’activation et les paiements en ligne seront disponibles après connexion d’un prestataire de paiement.</p>}
    </div>
    {isAdmin && <div className="billing-admin">
      <h3><ShieldCheck size={17}/> Administration des forfaits</h3>
      <form className="project-form" onSubmit={createPlan}>
        <label htmlFor="billing-code">Code unique</label><input id="billing-code" value={code} onChange={event => setCode(event.target.value)} placeholder="starter" pattern="[A-Za-z0-9_-]+" maxLength={60} required/>
        <label htmlFor="billing-name">Nom du forfait</label><input id="billing-name" value={name} onChange={event => setName(event.target.value)} maxLength={100} required/>
        <label htmlFor="billing-description">Description</label><textarea id="billing-description" value={description} onChange={event => setDescription(event.target.value)} rows={2} maxLength={500}/>
        <label htmlFor="billing-price">Prix (XOF en FCFA ; autres devises en centimes)</label><input id="billing-price" type="number" min="0" step="1" value={price} onChange={event => setPrice(event.target.value)} required/>
        <label htmlFor="billing-currency">Devise</label><select id="billing-currency" value={currency} onChange={event => setCurrency(event.target.value)}><option value="XOF">XOF — Franc CFA</option><option value="EUR">EUR — Euro</option><option value="USD">USD — Dollar US</option></select>
        <label htmlFor="billing-interval">Périodicité</label><select id="billing-interval" value={interval} onChange={event => setInterval(event.target.value as Plan['billing_interval'])}><option value="month">Mensuel</option><option value="year">Annuel</option><option value="one_time">Paiement unique</option></select>
        <label htmlFor="billing-trial">Essai gratuit (jours)</label><input id="billing-trial" type="number" min="0" max="365" step="1" value={trialDays} onChange={event => setTrialDays(event.target.value)} required/>
        <label htmlFor="billing-features">Fonctionnalités (une par ligne)</label><textarea id="billing-features" value={featuresText} onChange={event => setFeaturesText(event.target.value)} rows={4} placeholder={'Projets illimités\nStudio IA\nCollaboration'}/>
        <button className="primary-button" type="submit" disabled={saving}><Plus size={16}/>{saving ? 'Création…' : 'Créer le forfait'}</button>
      </form>
    </div>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    {notice && <p className="feedback success" role="status">{notice}</p>}
  </section>;
}
