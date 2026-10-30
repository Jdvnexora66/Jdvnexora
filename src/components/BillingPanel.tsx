import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, CreditCard, LockKeyhole, Plus, RefreshCw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clearKkiapayCallbacks, launchKkiapayWidget } from '../lib/kkiapay';
import ModuleDataOverview from './ModuleDataOverview';

type Plan = { id: string; code: string; name: string; description: string | null; active: boolean; features: Record<string, unknown>; price_minor: number; currency: string; billing_interval: 'month'|'year'|'one_time'; trial_days: number; created_at: string };
type PlanBrief = { name: string; code: string; price_minor: number; currency: string; billing_interval: string };
type Subscription = { id: string; status: 'pending'|'active'|'trialing'|'past_due'|'canceled'|'expired'; starts_at: string | null; ends_at: string | null; provider: string | null; amount_minor: number; currency: string; billing_interval: Plan['billing_interval']; plan: PlanBrief[] | PlanBrief | null };
type PaymentMethod = 'mobile_money' | 'card';
export default function BillingPanel({ userId, role }: { userId: string; role: string }) {
  useEffect(() => () => clearKkiapayCallbacks(), []);
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
  const [pendingSubscriptionPayment, setPendingSubscriptionPayment] = useState<{orderId:string;planId:string;transactionId:string}|null>(null);

  const isAdmin = role === 'admin';
  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase n’est pas configuré.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [planResult, subscriptionResult] = await Promise.all([
        supabase.from('plans').select('id,code,name,description,active,features,price_minor,currency,billing_interval,trial_days,created_at').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('id,status,starts_at,ends_at,provider,amount_minor,currency,billing_interval,plan:plans(name,code,price_minor,currency,billing_interval)').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
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
    const hiddenKeys = new Set(['billing_mode','monthly_ai_units','included_members','discount_months','audience']);
    const friendlyFeatures: Record<string, string> = { core_tools: 'Outils essentiels', advanced_tools: 'Outils avancés', multiple_projects: 'Projets multiples', export_when_available: 'Export disponible selon les fonctionnalités activées', professional_features: 'Fonctionnalités professionnelles', roles_and_access: 'Gestion des rôles et des accès', shared_workspace: 'Espace de travail partagé', collective_usage_tracking: 'Suivi des usages de l’équipe', custom_capacity: 'Capacité personnalisée', advanced_administration_subject_to_availability: 'Administration avancée selon disponibilité' };
    for (const [key, value] of Object.entries(features)) {
      if (hiddenKeys.has(key) || value === false || value == null || value === '') continue;
      if (typeof value === 'string' && value !== 'true') details.push(value);
      else if (value === true) details.push(friendlyFeatures[key] ?? key.replace(/[_-]+/g, ' ').replace(/^./, letter => letter.toUpperCase()));
      else if (typeof value === 'number' && key === 'projects') details.push(`${value} projet(s) inclus`);
      else if (typeof value === 'number' && key !== 'monthly_ai_units' && key !== 'included_members') details.push(`${key.replace(/[_-]+/g, ' ')} : ${value}`);
    }
    return [...new Set(details)].slice(0, 5);
  }

  function startCheckout(plan: Plan) {
    setSelectedPlan(plan);
    setPaymentMethod('mobile_money');
    setPaymentNotice('');
    setPendingSubscriptionPayment(null);
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function confirmSubscriptionPayment(orderId:string,planId:string,transactionId:string) {
    if(!supabase) return;
    setPaymentPending(true);setError('');setPaymentNotice('');
    try {
      const {data,error:verifyError}=await supabase.functions.invoke('verify-kkiapay-payment',{
        body:{subscription_order_id:orderId,transaction_id:transactionId}
      });
      if(data?.final) {
        setPendingSubscriptionPayment(null);
        setError(data?.error??'La transaction n’a pas été validée. Vous pouvez relancer un nouveau paiement.');
        return;
      }
      if(verifyError||!data?.verified) {
        setPendingSubscriptionPayment({orderId,planId,transactionId});
        setError(data?.error??verifyError?.message??'Paiement reçu, mais la confirmation serveur doit être réessayée. Votre abonnement reste inactif.');
        return;
      }
      setPendingSubscriptionPayment(null);
      setPaymentNotice('Paiement confirmé par le serveur. Votre abonnement est activé.');
      setSelectedPlan(null);
      await load();
    } catch(cause) {
      setPendingSubscriptionPayment({orderId,planId,transactionId});
      setError(cause instanceof Error?cause.message:'La confirmation serveur est momentanément indisponible. Réessayez sans refaire le paiement.');
    } finally {setPaymentPending(false);}
  }

  async function launchKkiapayPayment() {
    const planToPay=selectedPlan;
    if (!planToPay || !supabase || paymentPending) return;
    if (planToPay.features?.billing_mode === 'quote') {
      setError('Cette offre est sur devis. Contactez l’équipe d’administration pour recevoir une proposition personnalisée.');
      return;
    }
    if (planToPay.features?.billing_mode === 'free' || planToPay.price_minor === 0) {
      setPaymentPending(true);setError('');
      try {
        const {data,error:activateError}=await supabase.functions.invoke('verify-kkiapay-payment',{body:{plan_id:planToPay.id,transaction_id:null}});
        if(activateError||!data?.verified) throw new Error(data?.error??activateError?.message??'Activation du forfait gratuit indisponible.');
        setPaymentNotice('Votre forfait gratuit est activé.');
        setSelectedPlan(null);
        await load();
      } catch(cause) {
        setError(cause instanceof Error?cause.message:'Activation du forfait gratuit impossible. Réessayez.');
      } finally {setPaymentPending(false);}
      return;
    }
    setPaymentPending(true);setError('');setPaymentNotice('');setPendingSubscriptionPayment(null);
    try {
      const {data:order,error:orderError}=await supabase.functions.invoke('create-subscription-payment-order',{body:{plan_id:planToPay.id}});
      if(orderError) throw new Error(order?.error??orderError.message??'Impossible de préparer le paiement.');
      if(order?.already_active) {
        setPaymentPending(false);
        setPaymentNotice('Ce forfait est déjà actif sur votre compte. Aucun nouveau paiement n’a été lancé.');
        setSelectedPlan(null);
        await load();
        return;
      }
      if(order?.verification_required&&order?.order_id&&order?.transaction_id) {
        await confirmSubscriptionPayment(order.order_id,planToPay.id,order.transaction_id);
        return;
      }
      if(!order?.order_id||!order?.public_key||!Number.isSafeInteger(Number(order.amount_xof))||Number(order.amount_xof)<=0||order.currency!=='XOF') {
        throw new Error(order?.error??'La commande de paiement ou la configuration KKIAPAY est incomplète.');
      }
      if(order.provider_mode!=='sandbox'&&order.provider_mode!=='live') throw new Error('Mode KKIAPAY invalide. Contactez le support.');
      await launchKkiapayWidget({
        amount:Number(order.amount_xof),
        key:order.public_key,
        position:'center',
        theme:'#D6B66E',
        sandbox:order.provider_mode==='sandbox',
        paymentmethod:[paymentMethod==='mobile_money'?'momo':'card'],
        countries:['BJ'],
        partnerId:`nexora-subscription-${userId}-${planToPay.id}`,
        data:JSON.stringify({subscription_order_id:order.order_id,plan_id:planToPay.id})
      },{
        onSuccess:async response=>{
          const transactionId=response?.transactionId??response?.transaction_id??response?.id;
          if(!transactionId) {
            setPaymentPending(false);
            setError('Référence de transaction absente. Contactez le support KKIAPAY avant de recommencer.');
            return;
          }
          await confirmSubscriptionPayment(order.order_id,planToPay.id,transactionId);
        },
        onFailure:()=>{
          setPaymentPending(false);
          setError('Le paiement a échoué ou a été annulé. Aucun abonnement payant n’a été activé.');
        }
      });
    } catch(paymentError) {
      setPaymentPending(false);
      setError(paymentError instanceof Error?paymentError.message:'Impossible de lancer KKIAPAY.');
    }
  }

  const statusLabel: Record<Subscription['status'], string> = { pending: 'En attente', active: 'Actif', trialing: 'Essai en cours', past_due: 'Paiement à régulariser', canceled: 'Résilié', expired: 'Expiré' };
  const subscriptionStatus: Subscription['status'] = subscription && ['active','trialing'].includes(subscription.status) && subscription.ends_at && Date.parse(subscription.ends_at) <= Date.now() ? 'expired' : (subscription?.status ?? 'expired');
  const subscribedPlan = subscription ? (Array.isArray(subscription.plan) ? subscription.plan[0] ?? null : subscription.plan) : null;

  if (selectedPlan) {
    const quotePlan = selectedPlan.features?.billing_mode === 'quote';
    const freePlan = !quotePlan && (selectedPlan.features?.billing_mode === 'free' || selectedPlan.price_minor === 0);
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
          </ul>
          <div className="billing-secure-note"><LockKeyhole size={16}/><span>Les informations de paiement sont traitées par KKIAPAY et ne sont pas enregistrées dans NEXORA.</span></div><p className="muted">Les forfaits sont activés après confirmation du paiement. Le renouvellement est manuel à l’échéance ; aucun prélèvement automatique récurrent n’est effectué.</p>
        </article>
        <div className="billing-payment-card">
          <h3>Moyen de paiement</h3>
          <p className="muted">Les paiements sont traités par la fenêtre sécurisée KKIAPAY.</p>
          {quotePlan ? <div className="billing-free-notice"><ShieldCheck size={18}/><span>Cette formule est personnalisée. L’équipe doit confirmer les besoins et le montant avant tout engagement.</span></div> : freePlan ? <div className="billing-free-notice"><Check size={18}/><span>Cette formule est gratuite. Aucune carte ni aucun portefeuille mobile ne sera débité.</span></div> : <>
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
          {!quotePlan && <button type="button" className="primary-button billing-pay-button" onClick={() => void launchKkiapayPayment()} disabled={paymentPending || loading}>
            <LockKeyhole size={17}/>{paymentPending ? 'Vérification en cours…' : freePlan ? 'Activer le forfait gratuit' : `Payer ${formatPrice(selectedPlan)}`}
          </button>}
          {pendingSubscriptionPayment&&<div className="feedback warning" role="status"><p>Le paiement a été reçu, mais la confirmation serveur n’est pas terminée. Ne refaites pas le paiement : relancez uniquement la vérification.</p><button type="button" className="secondary-button" disabled={paymentPending} onClick={()=>void confirmSubscriptionPayment(pendingSubscriptionPayment.orderId,pendingSubscriptionPayment.planId,pendingSubscriptionPayment.transactionId)}>{paymentPending?'Vérification…':'Réessayer la vérification'}</button></div>}
          {error && <p className="feedback error" role="alert">{error}</p>}
          {paymentNotice && <p className="feedback success" role="status">{paymentNotice}</p>}
        </div>
      </div>
    </section>;
  }

  return <section id="billing" className="project-panel billing-panel">
    <div className="section-heading"><div><p className="eyebrow">OFFRES & ABONNEMENTS</p><h2><CreditCard size={21}/> Forfaits et abonnement</h2><p className="muted">Consultez les offres et le statut de votre abonnement.</p></div><button type="button" className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Actualiser les forfaits"><RefreshCw size={16}/></button></div>
    <ModuleDataOverview sources={["plans", "subscriptions"]} metrics={[{ label: "Forfaits chargés", value: plans.length }, { label: "Abonnement", value: subscription ? statusLabel[subscriptionStatus] : "Aucun enregistré" }, { label: "Forfait actif", value: subscribedPlan?.name ?? "Non disponible" }]} loading={loading} error={Boolean(error)} caption="Le statut est lu depuis la base; aucun paiement n'est déclaré réussi par cette page." />


    <div className="billing-current">
      <h3><BadgeCheck size={17}/> Votre abonnement</h3>
      {subscription ? <div className="project-item"><div className="project-type-icon"><CreditCard size={18}/></div><div className="project-info"><h3>{subscribedPlan?.name ?? 'Forfait non disponible'}</h3><p>{statusLabel[subscriptionStatus]}{subscription.ends_at ? ' · échéance ' + new Date(subscription.ends_at).toLocaleDateString('fr-FR') : ''}</p></div><span className="project-type-label">{subscription.amount_minor === 0 ? 'Gratuit' : formatPrice({ price_minor: subscription.amount_minor, currency: subscription.currency, billing_interval: subscription.billing_interval })}</span></div> : <p className="muted">Aucun abonnement enregistré pour ce compte.</p>}
      <p className="muted">Les forfaits mensuels et annuels sont renouvelés manuellement via KKIAPAY. Aucun prélèvement automatique récurrent n’est effectué.</p>
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
        <label htmlFor="billing-trial">Essai gratuit (jours) — non activé</label><input id="billing-trial" type="number" min="0" max="365" step="1" value={trialDays} onChange={event => setTrialDays(event.target.value)} required/><small className="muted">Les essais automatiques ne sont pas gérés par le paiement manuel KKIAPAY. Laissez 0 jusqu’à l’intégration d’un renouvellement récurrent.</small>
        <label htmlFor="billing-features">Fonctionnalités (une par ligne)</label><textarea id="billing-features" value={featuresText} onChange={event => setFeaturesText(event.target.value)} rows={4} placeholder={'Projets illimités\nStudio IA\nCollaboration'}/>
        <button className="primary-button" type="submit" disabled={saving}><Plus size={16}/>{saving ? 'Création…' : 'Créer le forfait'}</button>
      </form>
    </div>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    {notice && <p className="feedback success" role="status">{notice}</p>}
  </section>;
}
