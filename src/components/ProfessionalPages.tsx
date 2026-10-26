import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Bell, BookOpen, CheckCircle2, CircleHelp, FileText, Globe, LifeBuoy, LockKeyhole, MessageCircle, Search, Settings2, ShieldCheck, Sparkles, Users, WandSparkles } from 'lucide-react';

type ProfessionalPagesProps = { userId: string; role: string };

const tools = [
  { name: 'Assistant de rédaction', description: 'Préparer des textes, plans, résumés et documents.', category: 'Rédaction', icon: FileText },
  { name: 'Générateur d’idées', description: 'Transformer une idée en pistes concrètes.', category: 'Créativité', icon: Sparkles },
  { name: 'Planificateur de projet', description: 'Découper un objectif en étapes réalisables.', category: 'Productivité', icon: Activity },
  { name: 'Assistant d’apprentissage', description: 'Organiser un parcours et réviser les notions.', category: 'Formation', icon: BookOpen },
];

export default function ProfessionalPages({ userId, role }: ProfessionalPagesProps) {
  const [query, setQuery] = useState('');
  const [supportTopic, setSupportTopic] = useState('Compte et connexion');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const [supportSaving, setSupportSaving] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [marketingTab, setMarketingTab] = useState<'features' | 'pricing' | 'about' | 'contact'>('features');
  const filteredTools = tools.filter((tool) => (tool.name + ' ' + tool.description + ' ' + tool.category).toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  async function submitSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupportError('');
    if (!supabase) {
      setSupportError('Le service de support n’est pas configuré. Réessayez plus tard.');
      return;
    }
    const message = supportMessage.trim();
    if (!message) {
      setSupportError('Décrivez votre demande avant de l’envoyer.');
      return;
    }
    setSupportSaving(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: userId,
      topic: supportTopic,
      message,
    });
    setSupportSaving(false);
    if (error) {
      setSupportError('La demande n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.');
      return;
    }
    setSupportMessage(message);
    setSupportSent(true);
  }

  return <div className="professional-pages">
    <section id="ai-catalog" className="project-panel pro-page" aria-labelledby="ai-catalog-title">
      <div className="section-heading"><div><p className="eyebrow">CATALOGUE DES OUTILS</p><h2 id="ai-catalog-title"><WandSparkles size={20} /> Catalogue des assistants IA</h2><p className="muted">Explorez les outils disponibles dans l’écosystème NEXORA.</p></div><span className="pro-pill">Catalogue initial</span></div>
      <label className="search-field pro-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un assistant ou une catégorie…" aria-label="Rechercher dans le catalogue IA"/></label>
      <div className="pro-card-grid">{filteredTools.map((tool) => <article className="pro-card" key={tool.name}><span className="pro-card-icon"><tool.icon size={20}/></span><span className="pro-card-category">{tool.category}</span><h3>{tool.name}</h3><p>{tool.description}</p><a href="#studio-ia" className="pro-text-link">Accéder au Studio IA →</a></article>)}</div>
      {filteredTools.length === 0 && <p className="empty-state">Aucun outil ne correspond à votre recherche.</p>}
      <p className="pro-note">Les assistants présentés constituent la vitrine initiale. Leur disponibilité dépendra de la configuration et des services IA réellement connectés.</p>
    </section>

    <section id="notifications" className="project-panel pro-page" aria-labelledby="notifications-title">
      <div className="section-heading"><div><p className="eyebrow">CENTRE DE NOTIFICATIONS</p><h2 id="notifications-title"><Bell size={20}/> Notifications</h2><p className="muted">Suivez les informations utiles de votre espace.</p></div><button className="logout-button" type="button" onClick={() => setNotificationsRead(true)}>{notificationsRead ? 'Tout est lu' : 'Tout marquer comme lu'}</button></div>
      <div className={notificationsRead ? 'pro-notification is-read' : 'pro-notification'}><span className="pro-notification-icon"><ShieldCheck size={18}/></span><div><strong>Votre espace sécurisé est prêt</strong><p>Complétez vos préférences de compte et gardez vos informations à jour.</p><small>Conseil du système · Informations locales</small></div>{!notificationsRead && <span className="pro-unread-dot" aria-label="Non lu"/>}</div>
      <div className="pro-notification is-read"><span className="pro-notification-icon"><FolderKanbanIcon/></span><div><strong>Organisez vos projets</strong><p>Utilisez les statuts et la bibliothèque de projets pour retrouver votre travail.</p><small>Conseil du système</small></div></div>
      <label className="pro-toggle"><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)}/> Recevoir les mises à jour produit par e-mail <span>{emailUpdates ? 'Activé localement' : 'Désactivé localement'}</span></label>
      <p className="pro-note">Les préférences de notification ne sont pas encore enregistrées dans une table Supabase.</p>
    </section>

    <section id="account-security" className="project-panel pro-page" aria-labelledby="account-security-title">
      <div className="section-heading"><div><p className="eyebrow">COMPTE ET SÉCURITÉ</p><h2 id="account-security-title"><LockKeyhole size={20}/> Paramètres du compte</h2><p className="muted">Un point d’entrée clair pour la gestion de votre compte.</p></div></div>
      <div className="pro-settings-list">
        <div><span className="pro-settings-icon"><Users size={18}/></span><div><strong>Identité du compte</strong><p>Identifiant utilisateur : <code>{userId.slice(0, 8)}…</code></p></div><span className="pro-pill">Connecté</span></div>
        <div><span className="pro-settings-icon"><ShieldCheck size={18}/></span><div><strong>Rôle et permissions</strong><p>Rôle actuel : <b>{role}</b>. Les droits doivent toujours être contrôlés côté serveur par Supabase RLS.</p></div></div>
        <div><span className="pro-settings-icon"><Settings2 size={18}/></span><div><strong>Profil et préférences</strong><p>Modifiez votre nom, langue et fuseau horaire dans le formulaire de profil au début de l’espace.</p></div><a className="pro-text-link" href="#profile-title">Ouvrir le profil →</a></div>
        <div><span className="pro-settings-icon"><ShieldCheck size={18}/></span><div><strong>Mot de passe</strong><p>Utilisez le parcours « Mot de passe oublié » sur l’écran de connexion pour demander un lien de réinitialisation.</p></div></div>
      </div>
      <p className="pro-note">La gestion des sessions actives et la suppression de compte nécessitent un flux serveur dédié ; aucun bouton destructif fictif n’est proposé.</p>
    </section>

    <section id="help-center" className="project-panel pro-page" aria-labelledby="help-center-title">
      <div className="section-heading"><div><p className="eyebrow">ASSISTANCE</p><h2 id="help-center-title"><LifeBuoy size={20}/> Centre d’aide et support</h2><p className="muted">Décrivez votre demande pour préparer un message de support.</p></div></div>
      {supportSent ? <div className="pro-success"><CheckCircle2 size={20}/><div><strong>Demande enregistrée</strong><p>Votre demande a été enregistrée de manière sécurisée dans votre espace support. Conservez ce récapitulatif pour votre suivi.</p><blockquote>{supportMessage}</blockquote><button className="logout-button" type="button" onClick={() => { setSupportSent(false); setSupportMessage(''); setSupportError(''); }}>Nouvelle demande</button></div></div> : <form className="project-form pro-support-form" onSubmit={(event) => void submitSupport(event)}><label htmlFor="support-topic">Sujet</label><select id="support-topic" value={supportTopic} onChange={(event) => setSupportTopic(event.target.value)}><option>Compte et connexion</option><option>Projets et fichiers</option><option>Studio IA</option><option>Facturation</option><option>Signaler un problème</option></select><label htmlFor="support-message">Votre demande</label><textarea id="support-message" rows={4} maxLength={2000} required value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder="Expliquez le problème rencontré et ce que vous souhaitiez faire…"/>{supportError && <p className="feedback error" role="alert">{supportError}</p>}<button className="primary-button" type="submit" disabled={supportSaving}>{supportSaving ? 'Envoi en cours…' : 'Envoyer la demande'} <MessageCircle size={16}/></button></form>}
      <div className="pro-faq"><h3><CircleHelp size={17}/> Questions fréquentes</h3><details><summary>Pourquoi mes projets ne s’affichent-ils pas ?</summary><p>Vérifiez la connexion, actualisez la page et contrôlez les politiques RLS des tables de projets.</p></details><details><summary>Comment récupérer mon mot de passe ?</summary><p>Déconnectez-vous puis utilisez le lien de réinitialisation sur la page de connexion.</p></details><details><summary>Le catalogue IA est-il entièrement connecté ?</summary><p>Cette première version présente les entrées de catalogue. Chaque outil doit être relié à son service et à ses autorisations avant mise en production.</p></details></div>
    </section>

    <section id="public-pages" className="project-panel pro-page" aria-labelledby="public-pages-title">
      <div className="section-heading"><div><p className="eyebrow">SITE PUBLIC</p><h2 id="public-pages-title"><Globe size={20}/> Présentation de NEXORA</h2><p className="muted">Aperçu des rubriques destinées aux visiteurs avant inscription.</p></div></div>
      <div className="pro-tabs" role="tablist" aria-label="Rubriques du site public">{([{id:'features',label:'Fonctionnalités'},{id:'pricing',label:'Offres'},{id:'about',label:'À propos'},{id:'contact',label:'Contact'}] as const).map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={marketingTab === tab.id} className={marketingTab === tab.id ? 'active' : ''} onClick={() => setMarketingTab(tab.id)}>{tab.label}</button>)}</div>
      {marketingTab === 'features' && <div className="pro-marketing-content"><h3>Un espace unifié pour créer et progresser.</h3><p>Centralisez vos projets, ressources, parcours d’apprentissage et outils de création dans une interface unique.</p><div className="pro-mini-grid"><span>Studio de création</span><span>Catalogue IA</span><span>Académie</span><span>Gestion de projets</span></div></div>}
      {marketingTab === 'pricing' && <div className="pro-marketing-content"><h3>Des offres claires, sans frais inventés.</h3><p>Les niveaux gratuit, professionnel et équipe peuvent être configurés ici après validation des tarifs, quotas et moyens de paiement réels.</p><a href="#billing" className="pro-text-link">Consulter la facturation →</a></div>}
      {marketingTab === 'about' && <div className="pro-marketing-content"><h3>La vision JDV NEXORA</h3><p>Un écosystème numérique modulaire conçu pour réunir des outils, des ressources et des parcours dans une expérience cohérente.</p></div>}
      {marketingTab === 'contact' && <div className="pro-marketing-content"><h3>Parlons de votre besoin</h3><p>Utilisez le centre d’aide pour préparer une demande. Les coordonnées publiques officielles seront ajoutées après validation.</p><a href="#help-center" className="pro-text-link">Ouvrir le centre d’aide →</a></div>}
      <p className="pro-note">Cette vitrine est intégrée à l’espace connecté pour le moment. Une vraie page publique séparée et ses routes de production seront une étape distincte.</p>
    </section>

    <section id="legal-pages" className="project-panel pro-page" aria-labelledby="legal-pages-title">
      <div className="section-heading"><div><p className="eyebrow">TRANSPARENCE</p><h2 id="legal-pages-title"><FileText size={20}/> Informations légales et confidentialité</h2><p className="muted">Rubriques à compléter avec les informations juridiques réelles de l’éditeur.</p></div></div>
      <div className="pro-card-grid pro-legal-grid"><article className="pro-card"><h3>Conditions d’utilisation</h3><p>Règles d’accès, responsabilités, usages autorisés et disponibilité des services.</p><span className="pro-pill">À valider juridiquement</span></article><article className="pro-card"><h3>Politique de confidentialité</h3><p>Finalités, données collectées, durées de conservation, droits des personnes et contact.</p><span className="pro-pill">À compléter</span></article><article className="pro-card"><h3>Cookies et données</h3><p>Inventaire des cookies et traceurs effectivement utilisés par l’application.</p><span className="pro-pill">À auditer</span></article><article className="pro-card"><h3>Mentions légales</h3><p>Identité de l’éditeur, contact, hébergeur et informations légales applicables.</p><span className="pro-pill">Informations requises</span></article></div>
      <p className="pro-note">Ces éléments sont des emplacements éditoriaux, pas des textes juridiques définitifs. Ils ne doivent pas être publiés avant vérification.</p>
    </section>

    <section id="system-pages" className="project-panel pro-page" aria-labelledby="system-pages-title">
      <div className="section-heading"><div><p className="eyebrow">ÉTATS SYSTÈME</p><h2 id="system-pages-title"><ShieldCheck size={20}/> Pages système</h2><p className="muted">Prévisualisations des états essentiels à une application robuste.</p></div></div>
      <div className="pro-card-grid"><article className="pro-card system-state"><strong className="system-code">404</strong><h3>Page introuvable</h3><p>Le lien demandé n’existe pas ou a été déplacé.</p><a href="#projects" className="pro-text-link">Retour à l’espace →</a></article><article className="pro-card system-state"><strong className="system-code">403</strong><h3>Accès non autorisé</h3><p>Votre compte ne dispose pas des permissions requises pour cette ressource.</p><a href="#help-center" className="pro-text-link">Demander de l’aide →</a></article><article className="pro-card system-state"><strong className="system-code">503</strong><h3>Service temporairement indisponible</h3><p>Réessayez plus tard ou consultez le centre d’aide.</p><a href="#help-center" className="pro-text-link">Centre d’aide →</a></article></div>
    </section>
  </div>;
}

function FolderKanbanIcon() {
  return <Activity size={18}/>;
}
