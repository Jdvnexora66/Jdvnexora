import { ArrowRight, BookOpen, BrainCircuit, ChartNoAxesCombined, CheckCircle2, Compass, Film, FolderKanban, GraduationCap, Layers3, LibraryBig, LockKeyhole, Sparkles, Users, WandSparkles, Workflow } from 'lucide-react';

const modules = [
  { icon: BrainCircuit, title: 'Studio IA', text: 'Un espace destiné à structurer les idées et accompagner la création. Les fonctions IA dépendent encore de la configuration des services côté serveur.' },
  { icon: FolderKanban, title: 'Projets & contenus', text: 'Créez des projets, organisez vos contenus et retrouvez vos travaux dans un espace personnel.' },
  { icon: Film, title: 'Médiathèque', text: 'Centralisez vos ressources et médias pour garder vos éléments utiles à portée de main.' },
  { icon: Compass, title: 'Découverte & ressources', text: 'Explorez les ressources, parcours et outils présents dans l’écosystème NEXORA.' },
  { icon: GraduationCap, title: 'Académie & apprentissage', text: 'Accédez aux espaces de formation et aux ressources pédagogiques disponibles dans la plateforme.' },
  { icon: ChartNoAxesCombined, title: 'Insights & feuille de route', text: 'Prenez du recul sur vos projets et organisez les prochaines étapes de votre travail.' },
  { icon: Users, title: 'Collaboration', text: 'Retrouvez les outils de partage et de collaboration associés aux projets, selon les autorisations de votre compte.' },
  { icon: LibraryBig, title: 'Bibliothèque & parcours', text: 'Rassemblez les ressources utiles à vos projets et à votre progression.' },
];

export default function OfficialLandingPage() {
  return <div className="nexora-official">
    <style>{`
      .nexora-official{min-height:100vh;background:#080d19;color:#f4f7ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
      .nexora-official *{box-sizing:border-box}.nexora-official a{color:inherit;text-decoration:none}
      .nexora-official .wrap{width:min(1160px,calc(100% - 40px));margin:0 auto}
      .nexora-official .nav{height:78px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #ffffff12}
      .nexora-official .brand{display:flex;align-items:center;gap:11px;font-weight:800;letter-spacing:.02em}.nexora-official .brandmark{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#7c5cff,#22d3ee);color:white;box-shadow:0 8px 30px #6d5cff35}
      .nexora-official .brand small{display:block;color:#9ba9c7;font-size:10px;letter-spacing:.22em;margin-top:2px}
      .nexora-official .navlinks{display:flex;align-items:center;gap:24px;color:#b6c0d7;font-size:13px}
      .nexora-official .cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid #ffffff20;border-radius:12px;padding:12px 17px;font-weight:700;font-size:13px;cursor:pointer;background:#ffffff08;color:#fff}
      .nexora-official .cta.primary{background:linear-gradient(110deg,#7258ff,#4d8dff);border-color:transparent;box-shadow:0 12px 30px #5c61ff30}
      .nexora-official .hero{position:relative;padding:92px 0 78px;display:grid;grid-template-columns:1.08fr .92fr;align-items:center;gap:54px}
      .nexora-official .glow{position:absolute;pointer-events:none;width:520px;height:420px;right:-110px;top:0;background:radial-gradient(ellipse,#635bff2b,transparent 68%);filter:blur(12px)}
      .nexora-official .eyebrow{color:#a9a0ff;text-transform:uppercase;letter-spacing:.19em;font-size:11px;font-weight:800;display:flex;align-items:center;gap:9px}
      .nexora-official h1{font-size:clamp(38px,5.4vw,66px);line-height:1.04;letter-spacing:-.055em;margin:22px 0}.nexora-official h1 span{background:linear-gradient(100deg,#b8aaff,#6ce7f3);color:transparent;background-clip:text}
      .nexora-official .lead{color:#aab6ce;line-height:1.8;font-size:16px;max-width:610px}
      .nexora-official .heroactions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
      .nexora-official .proof{display:flex;flex-wrap:wrap;gap:16px;margin-top:28px;color:#b9c5dc;font-size:12px}.nexora-official .proof span{display:flex;align-items:center;gap:7px}
      .nexora-official .preview{border:1px solid #ffffff1c;border-radius:24px;padding:17px;background:linear-gradient(145deg,#151d32,#0c1322);box-shadow:0 30px 90px #0008;transform:rotate(1deg)}
      .nexora-official .previewtop{display:flex;justify-content:space-between;align-items:center;padding:5px 4px 17px;color:#aab6ce;font-size:11px}
      .nexora-official .dot{display:inline-block;width:7px;height:7px;background:#5ee6b0;border-radius:50%;margin-right:7px}
      .nexora-official .previewbody{display:grid;grid-template-columns:100px 1fr;gap:13px;min-height:280px}
      .nexora-official .side{border-radius:13px;background:#080e1a;padding:13px 9px;display:flex;flex-direction:column;gap:14px;color:#7785a2;font-size:9px}
      .nexora-official .side span{display:flex;align-items:center;gap:6px}.nexora-official .side span:first-child{color:#bfb6ff}
      .nexora-official .dashmain{min-width:0}.nexora-official .dashmain h3{margin:4px 0 5px;font-size:17px}.nexora-official .dashmain p{margin:0;color:#7f8da9;font-size:10px}
      .nexora-official .statrow{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:16px 0}.nexora-official .stat{padding:13px;border:1px solid #ffffff12;background:#ffffff05;border-radius:12px}.nexora-official .stat strong{display:block;font-size:19px}.nexora-official .stat small{font-size:9px;color:#8290ac}
      .nexora-official .projecttile{border:1px solid #ffffff12;border-radius:12px;padding:12px;margin-top:9px;display:flex;align-items:center;gap:10px}.nexora-official .tileicon{height:31px;width:31px;border-radius:9px;background:#7863ff24;color:#b9acff;display:grid;place-items:center}.nexora-official .projecttile strong{display:block;font-size:10px}.nexora-official .projecttile small{color:#8593ad;font-size:9px}
      .nexora-official .section{padding:78px 0}.nexora-official .section.alt{background:#ffffff04;border-top:1px solid #ffffff0b;border-bottom:1px solid #ffffff0b}
      .nexora-official .sectionhead{text-align:center;max-width:700px;margin:0 auto 38px}.nexora-official h2{font-size:clamp(28px,4vw,42px);letter-spacing:-.04em;margin:13px 0}.nexora-official .sub{color:#9daac4;line-height:1.8}
      .nexora-official .modulegrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
      .nexora-official .module{border:1px solid #ffffff13;border-radius:18px;background:linear-gradient(145deg,#ffffff08,#ffffff03);padding:22px;min-height:205px;transition:transform .2s,border-color .2s}
      .nexora-official .module:hover{transform:translateY(-3px);border-color:#8273ff70}.nexora-official .moduleicon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#7666ff20;color:#b7aaff}
      .nexora-official .module h3{font-size:15px;margin:18px 0 8px}.nexora-official .module p{color:#98a6c0;font-size:12px;line-height:1.75;margin:0}
      .nexora-official .valuegrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.nexora-official .value{padding:25px;border-radius:18px;background:#10192a;border:1px solid #ffffff10}.nexora-official .value h3{margin:14px 0 8px;font-size:16px}.nexora-official .value p{color:#9daac4;font-size:13px;line-height:1.8;margin:0}
      .nexora-official .banner{padding:42px;border-radius:24px;border:1px solid #ffffff18;background:radial-gradient(ellipse at top right,#7160ff2b,transparent 55%),#10192a;display:flex;align-items:center;justify-content:space-between;gap:25px}
      .nexora-official .banner h2{max-width:650px;margin:0 0 12px}.nexora-official .banner p{color:#aab6ce;line-height:1.7;margin:0}
      .nexora-official .footer{border-top:1px solid #ffffff12;padding:28px 0;color:#8492ad;font-size:12px;display:flex;justify-content:space-between;gap:18px}
      @media(max-width:900px){.nexora-official .hero{grid-template-columns:1fr;gap:34px;padding-top:65px}.nexora-official .preview{max-width:600px;width:100%;margin:0 auto}.nexora-official .modulegrid{grid-template-columns:repeat(2,minmax(0,1fr))}.nexora-official .navlinks{display:none}}
      @media(max-width:560px){.nexora-official .wrap{width:min(100% - 28px,1160px)}.nexora-official .nav{height:68px}.nexora-official .nav .cta{padding:10px 12px;font-size:11px}.nexora-official .hero{padding:52px 0}.nexora-official .preview{padding:10px;border-radius:18px}.nexora-official .previewbody{grid-template-columns:75px 1fr;min-height:245px}.nexora-official .side{padding:10px 6px;font-size:8px}.nexora-official .modulegrid,.nexora-official .valuegrid{grid-template-columns:1fr}.nexora-official .module{min-height:auto}.nexora-official .section{padding:55px 0}.nexora-official .banner{padding:25px;align-items:flex-start;flex-direction:column}.nexora-official .footer{flex-direction:column}}
    `}</style>
    <header className="wrap nav">
      <a className="brand" href="/presentation" aria-label="NEXORA STUDIO AI">
        <span className="brandmark"><Sparkles size={22}/></span><span>NEXORA <span style={{color:'#b9acff'}}>STUDIO AI</span><small>JDV GLOBAL CENTER</small></span>
      </a>
      <nav className="navlinks" aria-label="Navigation principale"><a href="#modules">Modules</a><a href="#avantages">Pourquoi NEXORA</a><a href="#securite">Sécurité</a></nav>
      <a className="cta primary" href="/">Accéder à la plateforme <ArrowRight size={16}/></a>
    </header>
    <main>
      <section className="wrap hero">
        <div className="glow"/>
        <div>
          <p className="eyebrow"><Sparkles size={14}/> L’écosystème de création numérique</p>
          <h1>De l’idée au projet concret, <span>dans un seul espace.</span></h1>
          <p className="lead">NEXORA STUDIO AI réunit des outils pour organiser vos projets, structurer vos contenus, explorer des ressources et avancer dans vos créations numériques. Un environnement pensé pour évoluer avec vos ambitions.</p>
          <div className="heroactions"><a className="cta primary" href="/">Découvrir mon espace <ArrowRight size={17}/></a><a className="cta" href="#modules">Explorer les modules <Layers3 size={16}/></a></div>
          <div className="proof"><span><CheckCircle2 size={15}/> Projets réunis au même endroit</span><span><LockKeyhole size={15}/> Espace personnel sécurisé</span><span><Workflow size={15}/> Écosystème évolutif</span></div>
        </div>
        <div className="preview" aria-label="Aperçu illustratif du tableau de bord NEXORA">
          <div className="previewtop"><strong>◈ NEXORA / WORKSPACE</strong><span><i className="dot"/>Espace de travail</span></div>
          <div className="previewbody"><aside className="side"><span><Sparkles size={12}/> Studio IA</span><span><FolderKanban size={12}/> Projets</span><span><Film size={12}/> Médias</span><span><BookOpen size={12}/> Ressources</span><span><Users size={12}/> Équipe</span></aside>
            <div className="dashmain"><h3>Votre espace créatif</h3><p>Un aperçu visuel illustratif de l’écosystème</p><div className="statrow"><div className="stat"><strong>01</strong><small>Projets personnels</small></div><div className="stat"><strong>08</strong><small>Familles de modules</small></div></div>
              <div className="projecttile"><span className="tileicon"><WandSparkles size={16}/></span><div><strong>Structurer une nouvelle idée</strong><small>Studio de création</small></div></div>
              <div className="projecttile"><span className="tileicon"><FolderKanban size={16}/></span><div><strong>Mon espace de projets</strong><small>Organisation & contenus</small></div></div>
              <div className="projecttile"><span className="tileicon"><BookOpen size={16}/></span><div><strong>Parcours de ressources</strong><small>Découverte & apprentissage</small></div></div>
            </div>
          </div>
          <p style={{fontSize:10,color:'#7887a4',margin:'12px 4px 2px'}}>Maquette illustrative — les fonctions dépendent des modules activés.</p>
        </div>
      </section>
      <section className="section alt" id="modules"><div className="wrap">
        <div className="sectionhead"><p className="eyebrow" style={{justifyContent:'center'}}>UN ÉCOSYSTÈME MODULAIRE</p><h2>Les composants de NEXORA STUDIO AI</h2><p className="sub">Une vue d’ensemble des espaces et modules présents dans le projet. Leur disponibilité peut varier selon l’état de développement et les droits du compte.</p></div>
        <div className="modulegrid">{modules.map(({icon:Icon,title,text})=><article className="module" key={title}><span className="moduleicon"><Icon size={21}/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div></section>
      <section className="section" id="avantages"><div className="wrap">
        <div className="sectionhead"><p className="eyebrow" style={{justifyContent:'center'}}>PENSÉ POUR VOS PROJETS</p><h2>Plus de clarté. Une meilleure organisation.</h2><p className="sub">NEXORA vise à réduire la dispersion entre les outils et à offrir un point de départ commun à vos activités créatives et numériques.</p></div>
        <div className="valuegrid"><article className="value"><span className="moduleicon"><FolderKanban size={20}/></span><h3>Centraliser le travail</h3><p>Retrouvez vos projets et vos contenus dans un espace de travail structuré, plutôt que de repartir de zéro à chaque session.</p></article><article className="value"><span className="moduleicon"><Workflow size={20}/></span><h3>Avancer par étapes</h3><p>Organisez les idées, les ressources et les prochaines actions pour transformer progressivement une intention en projet.</p></article><article className="value"><span className="moduleicon"><Users size={20}/></span><h3>Construire ensemble</h3><p>Utilisez les espaces collaboratifs disponibles pour travailler avec d’autres personnes en fonction des permissions attribuées.</p></article></div>
      </div></section>
      <section className="section alt" id="securite"><div className="wrap">
        <div className="banner"><div><p className="eyebrow"><LockKeyhole size={14}/> Accès & confiance</p><h2>Un espace personnel, conçu avec attention à la sécurité.</h2><p>La plateforme s’appuie sur l’authentification et les permissions configurées dans l’application. Les fonctions avancées et les services externes sont présentés comme disponibles uniquement lorsqu’ils sont effectivement configurés.</p></div><a className="cta primary" href="/">Créer mon compte <ArrowRight size={16}/></a></div>
      </div></section>
    </main>
    <footer className="wrap footer"><span>© {new Date().getFullYear()} JDV GLOBAL CENTER · NEXORA STUDIO AI</span><span>Créer · Organiser · Faire évoluer</span></footer>
  </div>;
}
