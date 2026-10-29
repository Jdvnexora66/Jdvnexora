import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, CreditCard, LockKeyhole, Plus, RefreshCw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

type Plan = { id: string; code: string; name: string; description: string | null; active: boolean; features: Record<string, unknown>; price_minor: number; currency: string; billing_interval: 'month'|'year'|'one_time'; trial_days: number; created_at: string };
type PlanBrief = { name: string; code: string; price_minor: number; currency: string; billing_interval: string };
type Subscription = { id: string; status: 'pending'|'active'|'trialing'|'past_due'|'canceled'|'expired'; starts_at: string | null; ends_at: string | null; provider: string | null; plan: PlanBrief[] | PlanBrief | null };
type PaymentMethod = 'mobile_money' | 'card';
type KkiapayResponse = { transactionId?: string; transaction_id?: string; id?: string };
declare global {
  interface Window {
    openKkiapayWidget?: (options: Record<string, unknown>) => void;
    addSuccessListener?: (callback: (response: KkiapayResponse) => void) => void;
    addFailedListener?: (callback: (error: unknown) => void) => void;
  }
}

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
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState('');
  const kkiapayPublicKey = (import.meta.env.VITE_KKIAPAY_PUBLIC_KEY as string | undefined)?.trim() ?? '';
  const kkiapaySandbox = import.meta.env.VITE_KKIAPAY_SANDBOX === 'true';

  const isAdmin = role === 'admin';
  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase n’est pas configuré.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [planResult, subscriptionResult] = await Promise.all([
        supabase.from('plans').select('id,code,name,description,active,features,price_minor,currency,billing_interval,trial_days,created_at').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('id,status,starts_at,ends_at,provider,plan:plans(name,code,price_minor,currency,billing_interval)').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
      ]);
      if (planResult.error) setError('Chargement des forfaits impossible : ' + planResult.error.message);
      else setPlans((planResult.data ?? []) as Plan[]);
      if (subscriptionResult.error) setError('Chargement de votre abonnement impossible : ' + subscriptionResult.error.message);
      else setSubscription(((subscriptionResult.data ?? [])[0] ?? null) as unknown as Subscription | null);
    } catch {
      setError('Erreur réseau pendant le chargement de la facturation. Vérifiez la connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
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

  function formatPrice(plan: Pick<Plan, 'price_minor'|'currency'|'billing_interval'> & Partial<Pick<Plan, 'code'|'features'>>) {
    if (plan.features?.billing_mode === 'quote') return 'Sur devis';
    if (plan.features?.billing_mode === 'free') return 'Gratuit';
    const amount = plan.currency === 'XOF' ? plan.price_minor : plan.price_minor / 100;
    const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: plan.currency, maximumFractionDigits: plan.currency === 'XOF' ? 0 : 2 }).format(amount);
    return formatted + (plan.billing_interval === 'month' ? ' / mois' : plan.billing_interval === 'year' ? ' / an' : ' · paiement unique');
  }

  function planDetails(plan: Plan) {
    const features = plan.features ?? {};
    const details: string[] = [];
    const quota = features.monthly_ai_units;
    const members = features.included_members;
    if (features.billing_mode === 'free') details.push('Accès aux fonctionnalités essentielles');
    if (typeof quota === 'number' || (typeof quota === 'string' && quota.trim())) details.push(`${quota} unités IA / mois`);
    if (typeof members === 'number' || (typeof members === 'string' && members.trim())) details.push(`${members} membre(s) inclus`);
    if (features.billing_mode === 'quote') details.push('Accompagnement et capacité adaptés à votre organisation');
    if (features.discount_months === 2) details.push('Économie de 2 mois sur la formule annuelle');
    const hiddenKeys = new Set(['billing_mode','monthly_ai_units','included_members','discount_months']);
    for (const [key, value] of Object.entries(features)) {
      if (hiddenKeys.has(key) || value === false || value == null || value === '') continue;
      if (typeof value === 'string' && value !== 'true') details.push(value);
      else if (value === true) details.push(key.replace(/[_-]+/g, ' ').replace(/^./, letter => letter.toUpperCase()));
      else if (typeof value === 'number' && key !== 'monthly_ai_units' && key !== 'included_members') details.push(`${key.replace(/[_-]+/g, ' ')} : ${value}`);
    }
    return [...new Set(details)].slice(0, 5);
  }

  function startCheckout(plan: Plan) {
    setSelectedPlan(plan);
    setPaymentMethod('mobile_money');
    setPaymentNotice('');
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function launchKkiapayPayment() {
    if (!selectedPlan || !supabase || paymentPending) return;
    if (selectedPlan.features?.billing_mode === 'quote') {
      setError('Cette offre est sur devis. Contactez l’équipe pour recevoir une proposition personnalisée.');
      return;
    }
    if (selectedPlan.features?.billing_mode === 'free' || selectedPlan.price_minor === 0) {
      setPaymentPending(true);
      setError('');
      const { error: activateError } = await supabase.functions.invoke('verify-kkiapay-payment', {
        body: { plan_id: selectedPlan.id, transaction_id: null },
      });
      setPaymentPending(false);
      if (activateError) { setError('Activation du forfait gratuit indisponible pour le moment. Réessayez plus tard.'); return; }
      setPaymentNotice('Votre demande d’activation a été envoyée. Actualisez votre abonnement pour vérifier son statut.');
      await load();
      return;
    }
    if (selectedPlan.currency !== 'XOF') {
      setError('Le paiement KKIAPAY est configuré en FCFA (XOF). Cette offre utilise une autre devise : contactez l’administrateur.');
      return;
    }
    if (!kkiapayPublicKey) {
      setError('Le paiement sécurisé n’est pas encore configuré. La clé publique KKIAPAY doit être ajoutée à VITE_KKIAPAY_PUBLIC_KEY ; aucun paiement ne sera simulé.');
      return;
    }
    setPaymentPending(true);
    setError('');
    setPaymentNotice('');
    try {
      if (!window.openKkiapayWidget) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>('script[data-kkiapay-sdk]');
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('SDK KKIAPAY indisponible')), { once: true });
            if (window.openKkiapayWidget) resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.kkiapay.me/k.js';
          script.async = true;
          script.dataset.kkiapaySdk = 'true';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Impossible de charger le SDK KKIAPAY.'));
          document.body.appendChild(script);
        });
      }
      if (!window.openKkiapayWidget) throw new Error('Le SDK KKIAPAY ne fournit pas le module de paiement.');
      window.addSuccessListener?.(async (response) => {
        const transactionId = response?.transactionId ?? response?.transaction_id ?? response?.id;
        if (!transactionId || !supabase || !selectedPlan) {
          setPaymentPending(false);
          setError('Référence de transaction absente. Vérifiez le paiement auprès de KKIAPAY avant de recommencer.');
          return;
        }
        const { data, error: verifyError } = await supabase.functions.invoke('verify-kkiapay-payment', {
          body: { plan_id: selectedPlan.id, transaction_id: transactionId },
        });
        setPaymentPending(false);
        if (verifyError || !data?.verified) {
          setError('Paiement reçu par le widget mais pas encore confirmé par le serveur. Votre abonnement reste inactif jusqu’à vérification.');
          return;
        }
        setPaymentNotice('Paiement confirmé par le serveur. Votre abonnement est activé.');
        setSelectedPlan(null);
        await load();
      });
      window.addFailedListener?.(() => {
        setPaymentPending(false);
        setError('Le paiement a échoué ou a été annulé. Aucun abonnement payant n’a été activé.');
      });
      window.openKkiapayWidget({
        amount: selectedPlan.price_minor,
        key: kkiapayPublicKey,
        position: 'center',
        theme: '#D6B66E',
        sandbox: kkiapaySandbox,
        paymentmethod: paymentMethod === 'mobile_money' ? 'momo' : 'card',
        countries: ['BJ'],
        partnerId: `nexora-${selectedPlan.id}-${userId}`,
        data: JSON.stringify({ plan_id: selectedPlan.id }),
      });
    } catch (paymentError) {
      setPaymentPending(false);
      setError(paymentError instanceof Error ? paymentError.message : 'Impossible de lancer KKIAPAY.');
    }
  }

  const statusLabel: Record<Subscription['status'], string> = { pending: 'En attente', active: 'Actif', trialing: 'Essai en cours', past_due: 'Paiement à régulariser', canceled: 'Résilié', expired: 'Expiré' };
  const subscribedPlan = subscription ? (Array.isArray(subscription.plan) ? subscription.plan[0] ?? null : subscription.plan) : null;

  if (selectedPlan) {
    const freePlan = selectedPlan.features?.billing_mode === 'free' || selectedPlan.price_minor === 0;
    return <section id="billing-checkout" className="project-panel billing-panel billing-checkout-page">
      <div className="section-heading billing-checkout-heading">
        <div><p className="eyebrow">ABONNEMENT SÉCURISÉ</p><h2><LockKeyhole size={21}/> Finaliser votre abonnement</h2><p className="muted">Vérifiez votre formule et choisissez votre moyen de paiement.</p></div>
        <button type="button" className="secondary-button billing-back-button" onClick={() => { setSelectedPlan(null); setError(''); setPaymentNotice(''); }}><ArrowLeft size={16}/> Retour aux forfaits</button>
      </div>
      <div className="billing-checkout-layout">
        <article className="billing-order-card">
          <div className="billing-order-kicker"><Sparkles size={16}/> FORMULE SÉLECTIONNÉE</div>
          <h3>{selectedPlan.name}</h3>
          <p>{selectedPlan.description || 'Votre espace JDV NEXORA AI STUDIO'}</p>
          <div className="billing-order-price">{formatPrice(selectedPlan)}</div>
          <ul className="billing-benefit-list">
            {planDetails(selectedPlan).length ? planDetails(selectedPlan).map((benefit) => <li key={benefit}><Check size={16}/><span>{benefit}</span></li>) : <li><Check size={16}/><span>Accès aux services inclus dans cette formule</span></li>}
            {selectedPlan.trial_days > 0 && <li><Check size={16}/><span>{selectedPlan.trial_days} jour(s) d’essai inclus</span></li>}
          </ul>
          <div className="billing-secure-note"><LockKeyhole size={16}/><span>Les informations de carte sont traitées par KKIAPAY et ne sont pas enregistrées dans NEXORA.</span></div>
        </article>
        <div className="billing-payment-card">
          <h3>Moyen de paiement</h3>
          <p className="muted">Les paiements sont traités par la fenêtre sécurisée KKIAPAY.</p>
          {freePlan ? <div className="billing-free-notice"><Check size={18}/><span>Cette formule est gratuite. Aucune carte ni aucun portefeuille mobile ne sera débité.</span></div> : <>
            <div className="billing-payment-methods" role="radiogroup" aria-label="Choisir un moyen de paiement">
              <button type="button" role="radio" aria-checked={paymentMethod === 'mobile_money'} className={paymentMethod === 'mobile_money' ? 'billing-method-card selected' : 'billing-method-card'} onClick={() => setPaymentMethod('mobile_money')}>
                <Smartphone size={22}/><span><strong>Mobile Money</strong><small>MTN · Moov · Celtiis*</small></span><span className="billing-method-radio">{paymentMethod === 'mobile_money' ? '●' : '○'}</span>
              </button>
              <button type="button" role="radio" aria-checked={paymentMethod === 'card'} className={paymentMethod === 'card' ? 'billing-method-card selected' : 'billing-method-card'} onClick={() => setPaymentMethod('card')}>
                <CreditCard size={22}/><span><strong>Carte bancaire</strong><small>Visa · Mastercard</small></span><span className="billing-method-radio">{paymentMethod === 'card' ? '●' : '○'}</span>
              </button>
            </div>
            <p className="billing-payment-footnote">*Les moyens effectivement proposés dépendent des options activées sur votre compte marchand KKIAPAY.</p>
          </>}
          <button type="button" className="primary-button billing-pay-button" onClick={() => void launchKkiapayPayment()} disabled={paymentPending || loading}>
            <LockKeyhole size={17}/>{paymentPending ? 'Vérification en cours…' : freePlan ? 'Activer le forfait gratuit' : `Payer ${formatPrice(selectedPlan)}`}
          </button>
          {error && <p className="feedback error" role="alert">{error}</p>}
          {paymentNotice && <p className="feedback success" role="status">{paymentNotice}</p>}
          {!freePlan && !kkiapayPublicKey && <p className="billing-config-notice">Configuration marchande requise avant l’ouverture du paiement réel.</p>}
        </div>
      </div>
    </section>;
  }

  return <section id="billing" className="project-panel billing-panel">
    <div className="section-heading"><div><p className="eyebrow">OFFRES & ABONNEMENTS</p><h2><CreditCard size={21}/> Forfaits et abonnement</h2><p className="muted">Consultez les offres et le statut de votre abonnement.</p></div><button type="button" className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Actualiser les forfaits"><RefreshCw size={16}/></button></div>
    <ModuleDataOverview sources={["plans", "subscriptions"]} metrics={[{ label: "Forfaits chargés", value: plans.length }, { label: "Abonnement", value: subscription ? statusLabel[subscription.status] : "Aucun enregistré" }, { label: "Forfait actif", value: subscribedPlan?.name ?? "Non disponible" }]} loading={loading} error={Boolean(error)} caption="Le statut est lu depuis la base; aucun paiement n'est déclaré réussi par cette page." />


    <div className="billing-current">
      <h3><BadgeCheck size={17}/> Votre abonnement</h3>
      {subscription ? <div className="project-item"><div className="project-type-icon"><CreditCard size={18}/></div><div className="project-info"><h3>{subscribedPlan?.name ?? 'Forfait non disponible'}</h3><p>{statusLabel[subscription.status]}{subscription.ends_at ? ' · échéance ' + new Date(subscription.ends_at).toLocaleDateString('fr-FR') : ''}</p></div><span className="project-type-label">{subscribedPlan ? formatPrice({ price_minor: subscribedPlan.price_minor, currency: subscribedPlan.currency, billing_interval: subscribedPlan.billing_interval as Plan['billing_interval'] }) : subscription.status}</span></div> : <p className="muted">Aucun abonnement enregistré pour ce compte.</p>}
    </div>
    <div className="billing-plans">
      <div className="billing-plans-heading"><div><p className="eyebrow">CHOISISSEZ VOTRE FORMULE</p><h3>Des offres simples, des avantages clairs</h3><p className="muted">Comparez les formules, puis cliquez sur « Choisir cet abonnement » pour continuer vers le paiement.</p></div></div>
      {loading ? <p className="empty-state">Chargement des offres…</p> : plans.filter(plan => plan.active || isAdmin).length === 0 ? <p className="empty-state">Aucun forfait n’est encore publié. Un administrateur peut configurer les premières offres.</p> : <div className="billing-plan-grid">{plans.filter(plan => plan.active || isAdmin).map((plan, index) => {
        const benefits = planDetails(plan);
        const featured = plan.features?.featured === true || plan.code.toLowerCase().includes('pro') || (plans.filter(item => item.active).length > 2 && index === 1);
        return <article className={featured ? 'billing-plan-card featured' : 'billing-plan-card'} key={plan.id}>
          {featured && <div className="billing-plan-ribbon"><Sparkles size={14}/> RECOMMANDÉ</div>}
          <div className="billing-plan-card-top"><span className="billing-plan-icon"><ShieldCheck size={20}/></span><span className={plan.active ? 'status-badge status-completed' : 'status-badge status-archived'}>{plan.active ? 'Disponible' : 'Masqué'}</span></div>
          <h4>{plan.name}</h4><p className="billing-plan-description">{plan.description || 'Une formule JDV NEXORA pour avancer à votre rythme.'}</p>
          <div className="billing-plan-price">{formatPrice(plan)}</div>
          {plan.trial_days > 0 && <span className="billing-trial-badge">{plan.trial_days} jours d’essai</span>}
          <div className="billing-plan-divider"/>
          <p className="billing-benefits-title">Ce qui est inclus</p>
          <ul className="billing-benefit-list">{(benefits.length ? benefits : ['Accès aux fonctionnalités de cette formule']).map((benefit) => <li key={benefit}><Check size={16}/><span>{benefit}</span></li>)}</ul>
          <button type="button" className={featured ? 'primary-button billing-select-button' : 'secondary-button billing-select-button'} onClick={() => startCheckout(plan)} disabled={!plan.active && !isAdmin}>Choisir cet abonnement <ArrowLeft className="billing-cta-arrow" size={16}/></button>
          {isAdmin && <button type="button" className="billing-toggle-plan" onClick={() => void togglePlan(plan)}>{plan.active ? 'Désactiver cette offre' : 'Publier cette offre'}</button>}
        </article>;
      })}</div>}
      {!isAdmin && <p className="billing-disclaimer">Le paiement est confirmé côté serveur avant l’activation d’un abonnement payant. Les informations de carte ne sont jamais stockées dans NEXORA.</p>}
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
