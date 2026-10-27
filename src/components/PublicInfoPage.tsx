import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleHelp, Compass, Mail, ShieldCheck, Sparkles } from 'lucide-react';

type PublicPageKey = 'features' | 'about' | 'contact' | 'faq';
type PublicPage = { eyebrow: string; title: string; intro: string };

const pages: Record<PublicPageKey, PublicPage> = {
  features: {
    eyebrow: 'FONCTIONNALITÉS',
    title: 'Un espace pour organiser vos idées et vos projets.',
    intro: 'NEXORA rassemble des espaces de création, des ressources et des parcours de progression. La disponibilité de chaque outil dépend de son état de développement, de la configuration des services et des permissions du compte.',
  },
  about: {
    eyebrow: 'À PROPOS',
    title: 'Un écosystème numérique pensé pour progresser.',
    intro: 'JDV NEXORA STUDIO AI a pour ambition de réunir plusieurs outils et ressources dans une expérience cohérente, afin d’aider les utilisateurs à structurer leurs idées, organiser leurs projets et apprendre.',
  },
  contact: {
    eyebrow: 'CONTACT',
    title: 'Comment pouvons-nous vous orienter ?',
    intro: 'Pour éviter de publier des coordonnées non vérifiées, contactez actuellement l’équipe depuis le centre d’aide disponible après connexion. Les coordonnées publiques officielles seront ajoutées après validation.',
  },
  faq: {
    eyebrow: 'QUESTIONS FRÉQUENTES',
    title: 'Les premières réponses sur NEXORA.',
    intro: 'Retrouvez des réponses générales sur l’accès, les modules et la disponibilité des fonctionnalités. Les détails évoluent avec la mise en service de la plateforme.',
  },
};

const modules = [
  ['Studio IA', 'Espace de création assistée. Les fonctions IA nécessitent des services serveur configurés et disponibles.'],
  ['Projets & contenus', 'Organiser ses projets et retrouver ses contenus de travail.'],
  ['Médiathèque & ressources', 'Retrouver les médias et ressources proposés par la plateforme.'],
  ['Académie & bibliothèque', 'Accéder aux espaces d’apprentissage et aux ressources disponibles.'],
  ['Insights & feuille de route', 'Consulter les outils de suivi et organiser les prochaines étapes.'],
  ['Collaboration', 'Utiliser les fonctions collaboratives disponibles selon les droits du compte.'],
];

export default function PublicInfoPage({ page }: { page: PublicPageKey }) {
  const item = pages[page];
  return <main className="nexora-public-page">
    <style>{`
      .nexora-public-page{min-height:100vh;background:#080d19;color:#f4f7ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:0 0 64px}
      .nexora-public-page *{box-sizing:border-box}.nexora-public-page a{color:inherit;text-decoration:none}
      .nexora-public-page .wrap{width:min(1080px,calc(100% - 36px));margin:0 auto}
      .nexora-public-page header{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff18;gap:16px}
      .nexora-public-page .brand{font-weight:850;letter-spacing:.04em}.nexora-public-page .navlinks{display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-size:14px;color:#b8c4dd}
      .nexora-public-page .hero{padding:76px 0 44px;max-width:820px}.nexora-public-page .eyebrow{color:#8b9dff;font-size:12px;font-weight:800;letter-spacing:.16em}
      .nexora-public-page h1{font-size:clamp(34px,6vw,60px);line-height:1.06;letter-spacing:-.04em;margin:16px 0}
      .nexora-public-page .intro{font-size:18px;line-height:1.8;color:#b8c4dd;max-width:760px}
      .nexora-public-page .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:28px}
      .nexora-public-page .card{border:1px solid #ffffff19;background:linear-gradient(145deg,#111a2d,#0d1423);border-radius:18px;padding:22px}
      .nexora-public-page .card h2,.nexora-public-page .card h3{font-size:18px;margin:12px 0 8px}.nexora-public-page .card p{color:#b8c4dd;line-height:1.65;font-size:14px}
      .nexora-public-page .icon{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:#7764ff22;color:#a99cff}
      .nexora-public-page .cta{display:inline-flex;align-items:center;gap:9px;padding:12px 16px;border-radius:12px;background:linear-gradient(100deg,#765cff,#277de8);font-weight:750;margin:10px 10px 0 0}
      .nexora-public-page .secondary{background:#ffffff0c;border:1px solid #ffffff25}
      .nexora-public-page details{padding:18px 0;border-bottom:1px solid #ffffff1a} .nexora-public-page summary{font-weight:750;cursor:pointer}.nexora-public-page details p{color:#b8c4dd;line-height:1.7}
      .nexora-public-page footer{border-top:1px solid #ffffff18;margin-top:64px;padding-top:24px;color:#9ba9c7;font-size:13px}
      @media(max-width:700px){.nexora-public-page .grid{grid-template-columns:1fr}.nexora-public-page header{height:auto;min-height:76px;align-items:flex-start;padding:18px 0;flex-direction:column}.nexora-public-page .navlinks{gap:12px}.nexora-public-page .hero{padding-top:48px}}
    `}</style>
    <div className="wrap">
      <header>
        <a className="brand" href="/presentation" aria-label="NEXORA accueil">✦ NEXORA STUDIO AI</a>
        <nav className="navlinks" aria-label="Navigation principale">
          <a href="/presentation">Présentation</a><a href="/features">Fonctionnalités</a><a href="/about">À propos</a><a href="/faq">FAQ</a><a href="/contact">Contact</a>
        </nav>
      </header>
      <section className="hero">
        <p className="eyebrow">{item.eyebrow}</p><h1>{item.title}</h1><p className="intro">{item.intro}</p>
        {page === 'features' && <><a className="cta" href="/presentation">Découvrir NEXORA <ArrowRight size={17}/></a><a className="cta secondary" href="/">Accéder à l’application</a></>}
        {page === 'about' && <a className="cta" href="/presentation">Voir la présentation <ArrowRight size={17}/></a>}
        {page === 'contact' && <a className="cta" href="/"><Mail size={17}/> Accéder au centre d’aide</a>}
        {page === 'faq' && <a className="cta" href="/presentation">Découvrir la plateforme <ArrowRight size={17}/></a>}
      </section>
      {page === 'features' && <section className="grid" aria-label="Modules NEXORA">{modules.map(([title, text]) => <article className="card" key={title}><span className="icon"><Sparkles size={20}/></span><h2>{title}</h2><p>{text}</p></article>)}</section>}
      {page === 'about' && <section className="grid"><article className="card"><span className="icon"><Compass size={20}/></span><h2>Une expérience unifiée</h2><p>Un point d’entrée commun pour retrouver les espaces et ressources disponibles.</p></article><article className="card"><span className="icon"><ShieldCheck size={20}/></span><h2>La confiance d’abord</h2><p>Les accès aux données doivent être protégés par l’authentification, les autorisations et les règles serveur.</p></article><article className="card"><span className="icon"><BookOpen size={20}/></span><h2>Progresser étape par étape</h2><p>Les modules sont améliorés progressivement, avec une distinction entre fonctions disponibles et fonctions en préparation.</p></article></section>}
      {page === 'faq' && <section className="card">
        <details><summary>NEXORA est-il entièrement disponible ?</summary><p>Les modules n’ont pas tous nécessairement le même niveau de disponibilité. Certaines fonctions dépendent de la configuration du backend, des services externes et des droits du compte.</p></details>
        <details><summary>Comment accéder à mon espace ?</summary><p>Utilisez l’entrée de l’application et connectez-vous avec votre compte. Si l’authentification rencontre un problème, utilisez le parcours de récupération proposé sur l’écran de connexion.</p></details>
        <details><summary>Les outils d’intelligence artificielle fonctionnent-ils tous ?</summary><p>La présence d’un outil dans le catalogue ne garantit pas à elle seule que son fournisseur ou son service serveur est configuré. La disponibilité doit être vérifiée pour chaque outil.</p></details>
        <details><summary>Comment demander de l’aide ?</summary><p>Le centre d’aide et les demandes de support sont accessibles dans l’espace connecté lorsque le service Supabase correspondant est configuré.</p></details>
        <details><summary>Où trouver les prix et payer ?</summary><p>Les offres et les moyens de paiement doivent être confirmés avant toute commercialisation. Cette page ne constitue pas une activation de paiement.</p></details>
      </section>}
      {page === 'contact' && <section className="grid"><article className="card"><span className="icon"><Mail size={20}/></span><h2>Support utilisateur</h2><p>Utilisez le centre d’aide connecté pour soumettre une demande et consulter les demandes récentes, selon la configuration disponible.</p></article><article className="card"><span className="icon"><ShieldCheck size={20}/></span><h2>Confidentialité</h2><p>Évitez d’envoyer des mots de passe, clés secrètes ou données de paiement dans une demande de support.</p></article></section>}
      <footer><a href="/presentation">← Retour à la présentation</a><p>Les descriptions reflètent l’objectif du produit ; la disponibilité de chaque fonction doit être vérifiée dans l’application.</p></footer>
    </div>
  </main>;
}
