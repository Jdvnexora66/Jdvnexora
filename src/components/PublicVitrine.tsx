import { FormEvent, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, BrainCircuit, CheckCircle2, Compass, FileText, Lightbulb, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react';

const CONTACT_EMAIL = 'centre.global.jdv@gmail.com';

type PublicVitrineProps = { onLogin?: () => void };

export default function PublicVitrine({ onLogin }: PublicVitrineProps) {
  const [feedbackType, setFeedbackType] = useState('Avis');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent(`NEXORA — ${feedbackType}`);
    const body = encodeURIComponent(`Type : ${feedbackType}\nNom : ${feedbackName || 'Non renseigné'}\nE-mail : ${feedbackEmail || 'Non renseigné'}\n\nMessage :\n${feedbackMessage}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setFeedbackStatus('Votre application de messagerie va s’ouvrir avec votre message préparé. Vérifiez puis envoyez l’e-mail pour nous le transmettre.');
  }

  const goToContact = () => document.getElementById('vitrine-contact')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="vitrine-page">
      <header className="vitrine-nav">
        <a className="vitrine-brand" href="#accueil" aria-label="JDV NEXORA AI STUDIO, accueil">
          <span className="vitrine-brand-mark"><Sparkles size={22} /></span>
          <span><strong>JDV NEXORA</strong><small>AI STUDIO</small></span>
        </a>
        <nav className="vitrine-links" aria-label="Navigation de la page">
          <a href="#vision">Notre vision</a><a href="#solutions">L’écosystème</a><a href="#avis">Avis & besoins</a><a href="#vitrine-contact">Contact</a>
        </nav>
        <a className="vitrine-login" href="/app" onClick={onLogin}>Se connecter <ArrowRight size={16} /></a>
      </header>

      <section id="accueil" className="vitrine-hero">
        <div className="vitrine-hero-copy">
          <span className="vitrine-pill"><span className="vitrine-live-dot" /> L’espace où les idées prennent forme</span>
          <p className="vitrine-eyebrow">JDV GLOBAL CENTER PRÉSENTE</p>
          <h1>De l’idée au projet.<br /><span>Du projet à l’action.</span></h1>
          <p className="vitrine-lead">JDV NEXORA AI STUDIO ambitionne de réunir les outils et les parcours de création numérique dans un espace de travail organisé, pour vous aider à transformer vos idées en projets concrets.</p>
          <div className="vitrine-hero-actions">
            <a className="vitrine-button primary" href="/app" onClick={onLogin}>Découvrir mon espace <ArrowRight size={17} /></a>
            <a className="vitrine-button secondary" href="#vision">Découvrir NEXORA <ArrowDown size={16} /></a>
          </div>
          <div className="vitrine-trust-line"><ShieldCheck size={16} /><span>Un projet numérique en évolution, construit autour des besoins de ses utilisateurs.</span></div>
        </div>
        <div className="vitrine-visual" aria-label="Illustration de l’écosystème numérique NEXORA">
          <div className="vitrine-orbit orbit-one" /><div className="vitrine-orbit orbit-two" />
          <div className="vitrine-visual-glow" />
          <div className="vitrine-float-card float-top"><span className="vitrine-mini-icon purple"><Lightbulb size={18} /></span><span><b>Une idée</b><small>Le point de départ</small></span><CheckCircle2 size={17} /></div>
          <div className="vitrine-core"><span className="vitrine-core-mark"><Sparkles size={35} /></span><b>NEXORA</b><small>AI STUDIO</small><div className="vitrine-core-line" /><span className="vitrine-core-caption">Imaginer · Organiser · Créer</span></div>
          <div className="vitrine-float-card float-left"><span className="vitrine-mini-icon cyan"><Workflow size={18} /></span><span><b>Structurer</b><small>Donner une forme au projet</small></span></div>
          <div className="vitrine-float-card float-bottom"><span className="vitrine-mini-icon green"><CheckCircle2 size={18} /></span><span><b>Passer à l’action</b><small>Avancer étape par étape</small></span></div>
          <div className="vitrine-visual-caption">Votre ambition est le point de départ.</div>
        </div>
      </section>

      <section className="vitrine-proof-strip" aria-label="Principes de NEXORA">
        <div><Compass size={21} /><span><b>Une vision claire</b><small>Partir d’un besoin réel</small></span></div>
        <div><Workflow size={21} /><span><b>Une démarche structurée</b><small>Organiser les étapes du projet</small></span></div>
        <div><Users size={21} /><span><b>Une plateforme à l’écoute</b><small>Construite avec vos retours</small></span></div>
      </section>

      <section id="vision" className="vitrine-section vitrine-story">
        <div className="vitrine-section-heading"><p className="vitrine-eyebrow">POURQUOI NEXORA ?</p><h2>Les idées méritent mieux<br />que de rester dans un carnet.</h2></div>
        <div className="vitrine-story-copy"><p>Une idée peut devenir un livre, une formation, un document, une activité ou un nouveau service. Mais entre l’inspiration et la réalisation, il faut souvent clarifier ses objectifs, organiser ses ressources et garder le cap.</p><p><strong>JDV NEXORA AI STUDIO est né de cette ambition :</strong> proposer un environnement numérique qui aide à rassembler, structurer et faire avancer les projets créatifs et professionnels.</p><p>La plateforme évolue progressivement. Votre avis et vos besoins contribuent à orienter les prochaines étapes.</p></div>
      </section>

      <section id="solutions" className="vitrine-section vitrine-solutions">
        <div className="vitrine-section-heading centered"><p className="vitrine-eyebrow">UN ESPACE, PLUSIEURS POSSIBILITÉS</p><h2>De quoi faire avancer<br /><span>vos projets numériques.</span></h2><p>Découvrez les grands axes de l’écosystème NEXORA, selon les modules disponibles dans votre espace.</p></div>
        <div className="vitrine-feature-grid">
          <article className="vitrine-feature-card"><span className="vitrine-feature-icon purple"><BookOpen size={23} /></span><h3>Créer des contenus</h3><p>Organisez des projets d’e-books, de formations et de documents depuis un espace de travail centralisé.</p><span className="vitrine-feature-tag">Création de projets</span></article>
          <article className="vitrine-feature-card"><span className="vitrine-feature-icon cyan"><BrainCircuit size={23} /></span><h3>Explorer le Studio IA</h3><p>Un axe de développement consacré à l’assistance à la création, avec des fonctions dépendantes de la configuration disponible.</p><span className="vitrine-feature-tag">IA selon configuration</span></article>
          <article className="vitrine-feature-card"><span className="vitrine-feature-icon green"><FileText size={23} /></span><h3>Structurer et suivre</h3><p>Retrouvez vos projets, suivez leur progression et conservez vos contenus dans votre espace personnel.</p><span className="vitrine-feature-tag">Organisation de projet</span></article>
        </div>
        <div className="vitrine-process"><div className="vitrine-process-heading"><p className="vitrine-eyebrow">UN PARCOURS SIMPLE</p><h3>Faites avancer votre idée, une étape à la fois.</h3></div><div className="vitrine-steps"><div><span>01</span><b>Clarifiez</b><small>Définissez votre idée et votre objectif.</small></div><div><span>02</span><b>Organisez</b><small>Créez un projet et posez ses bases.</small></div><div><span>03</span><b>Construisez</b><small>Développez votre contenu progressivement.</small></div><div><span>04</span><b>Faites évoluer</b><small>Apprenez, ajustez et poursuivez votre travail.</small></div></div></div>
      </section>

      <section className="vitrine-mission-band"><div className="vitrine-mission-symbol"><Sparkles size={28} /></div><div><p className="vitrine-eyebrow">NOTRE ENGAGEMENT</p><h2>Un outil utile se construit en restant à l’écoute.</h2><p>Nous souhaitons comprendre vos objectifs, vos difficultés et les fonctionnalités qui vous seraient réellement utiles.</p></div><a className="vitrine-button secondary" href="#avis">Donner mon avis <ArrowRight size={16} /></a></section>

      <section id="avis" className="vitrine-section vitrine-feedback-section">
        <div className="vitrine-feedback-intro"><p className="vitrine-eyebrow">VOTRE VOIX COMPTE</p><h2>Que souhaitez-vous<br /><span>accomplir avec NEXORA ?</span></h2><p>Partagez votre avis, décrivez un besoin ou signalez une difficulté. Vos retours nous aideront à mieux comprendre les attentes des utilisateurs.</p><div className="vitrine-feedback-note"><MessageCircle size={20} /><span><b>Un espace ouvert à vos idées</b><small>Vous pouvez nous écrire même sans compte utilisateur.</small></span></div></div>
        <form className="vitrine-feedback-form" onSubmit={submitFeedback}>
          <label htmlFor="vitrine-feedback-type">Quel est le sujet de votre message ?</label>
          <select id="vitrine-feedback-type" value={feedbackType} onChange={event => setFeedbackType(event.target.value)}><option>Avis</option><option>Besoin / nouvelle fonctionnalité</option><option>Question</option><option>Signalement d’un problème</option><option>Partenariat</option></select>
          <div className="vitrine-form-row"><div><label htmlFor="vitrine-feedback-name">Votre nom (facultatif)</label><input id="vitrine-feedback-name" value={feedbackName} onChange={event => setFeedbackName(event.target.value)} placeholder="Comment vous appeler ?" maxLength={100} /></div><div><label htmlFor="vitrine-feedback-email">Votre e-mail (facultatif)</label><input id="vitrine-feedback-email" type="email" value={feedbackEmail} onChange={event => setFeedbackEmail(event.target.value)} placeholder="vous@exemple.com" maxLength={254} /></div></div>
          <label htmlFor="vitrine-feedback-message">Votre message</label><textarea id="vitrine-feedback-message" value={feedbackMessage} onChange={event => setFeedbackMessage(event.target.value)} placeholder="Décrivez votre avis, votre besoin ou la difficulté rencontrée…" rows={5} maxLength={5000} required />
          <button className="vitrine-button primary full" type="submit">Préparer mon message <Send size={16} /></button>
          {feedbackStatus && <p className="vitrine-form-status" role="status">{feedbackStatus}</p>}
          <small className="vitrine-form-disclaimer">Le bouton ouvre votre messagerie avec le message prérempli. L’envoi n’est effectif qu’après confirmation dans votre application e-mail.</small>
        </form>
      </section>

      <section id="vitrine-contact" className="vitrine-section vitrine-contact-section">
        <div className="vitrine-section-heading"><p className="vitrine-eyebrow">RESTONS EN CONTACT</p><h2>Parlons de votre prochain projet.</h2><p>Pour une question, une suggestion ou une prise de contact, l’équipe JDV GLOBAL CENTER est joignable ici.</p></div>
        <div className="vitrine-contact-grid">
          <a className="vitrine-contact-card" href="tel:+2290151565878"><span><Phone size={20} /></span><small>Téléphone 1</small><b>01 51 56 58 78</b><em>Appeler l’équipe <ArrowRight size={14} /></em></a>
          <a className="vitrine-contact-card" href="tel:+2290166038221"><span><Phone size={20} /></span><small>Téléphone 2</small><b>01 66 03 82 21</b><em>Appeler l’équipe <ArrowRight size={14} /></em></a>
          <a className="vitrine-contact-card" href={`mailto:${CONTACT_EMAIL}`}><span><Mail size={20} /></span><small>Adresse e-mail</small><b>{CONTACT_EMAIL}</b><em>Écrire un e-mail <ArrowRight size={14} /></em></a>
          <div className="vitrine-contact-card"><span><MapPin size={20} /></span><small>Localisation</small><b>Cotonou, Bénin</b><em>JDV GLOBAL CENTER</em></div>
        </div>
      </section>

      <section className="vitrine-final-cta"><div><p className="vitrine-eyebrow">PRÊT À COMMENCER ?</p><h2>Votre prochaine idée peut commencer ici.</h2><p>Accédez à votre espace NEXORA pour poursuivre votre parcours de création.</p></div><a className="vitrine-button primary" href="/app" onClick={onLogin}>Entrer dans NEXORA <ArrowRight size={17} /></a></section>

      <footer className="vitrine-footer"><a className="vitrine-brand" href="#accueil"><span className="vitrine-brand-mark"><Sparkles size={20} /></span><span><strong>JDV NEXORA</strong><small>AI STUDIO</small></span></a><p>De l’idée au projet. Du projet à l’action.</p><div><a href="#vision">Notre vision</a><a href="#avis">Avis & besoins</a><a href="#vitrine-contact">Contact</a><a href="/app">Connexion</a></div><small>© {new Date().getFullYear()} JDV GLOBAL CENTER · Cotonou, Bénin</small></footer>
    </main>
  );
}
