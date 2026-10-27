import { ArrowRight, Bot, Compass, Folder, Image, GraduationCap, Users, Settings, Plus, Sparkles, Activity, BookOpen, FileText, CircleHelp } from 'lucide-react';

type Props = {
  displayName: string;
  projectCount: number;
  inProgressCount: number;
  onNewProject: () => void;
  onOpenStudio: () => void;
  onOpenProjects: () => void;
};
export default function ReferenceDashboard({displayName,projectCount,inProgressCount,onNewProject,onOpenStudio,onOpenProjects}:Props) {
  const name = displayName.trim().split(/\\s+/)[0] || 'Créateur';
  return <section className="reference-dashboard" aria-label="Tableau de bord NEXORA">
    <div className="reference-main-column">
      <section className="reference-hero">
        <div className="reference-hero-copy">
          <p className="reference-eyebrow">VOTRE ESPACE CRÉATIF</p>
          <h1>Bonjour {name},<br/><span>Bienvenue dans votre studio IA</span></h1>
          <p>Créez, apprenez, collaborez et donnez vie à vos idées avec la puissance de l’IA.</p>
          <div className="reference-hero-actions">
            <button type="button" className="reference-primary" onClick={onOpenStudio}><Bot size={17}/> Lancer une conversation IA</button>
            <button type="button" className="reference-secondary" onClick={onOpenProjects}><ArrowRight size={17}/> Voir mes projets</button>
          </div>
        </div>
        <div className="reference-orb" aria-hidden="true"><Sparkles size={76}/></div>
      </section>
      <div className="reference-module-grid">
        <button className="reference-module module-purple" onClick={onOpenStudio}><span><Bot/></span><b>Studio IA</b><small>Chat · Génération · Analyse</small></button>
        <button className="reference-module module-blue" onClick={onOpenProjects}><span><Folder/></span><b>Mes projets</b><small>Organiser · Créer · Collaborer</small></button>
        <button className="reference-module module-teal" onClick={()=>document.getElementById('discover')?.scrollIntoView({behavior:'smooth'})}><span><Compass/></span><b>Découverte & Insights</b><small>Sources · Actualités · Analyse</small></button>
        <button className="reference-module module-pink" onClick={()=>document.getElementById('media-library')?.scrollIntoView({behavior:'smooth'})}><span><Image/></span><b>Bibliothèque & Design</b><small>Médias · Templates · Création</small></button>
      </div>
      <section className="reference-projects">
        <div className="reference-section-head"><div><h2>Mes projets</h2><p>Reprenez là où vous en étiez ou créez un nouveau projet.</p></div><button onClick={onOpenProjects}>Voir tous <ArrowRight size={14}/></button></div>
        <div className="reference-project-summary">
          <article><span className="reference-project-art art-book"><BookOpen/></span><b>Vos créations</b><strong>{projectCount} projet{projectCount===1?'':'s'}</strong><small>Enregistrés dans votre espace</small></article>
          <article><span className="reference-project-art art-app"><Folder/></span><b>En cours</b><strong>{inProgressCount}</strong><small>À faire avancer</small></article>
          <article><span className="reference-project-art art-doc"><FileText/></span><b>Nouvelle idée</b><strong>Donnez-lui vie</strong><small>Commencez en quelques clics</small></article>
          <button className="reference-new-project" onClick={onNewProject}><Plus/><b>Nouveau projet</b><small>Créer une nouvelle réalisation</small></button>
        </div>
      </section>
      <section className="reference-quick">
        <div className="reference-section-head"><div><h2>Accès rapide</h2><p>Vos outils préférés, toujours à portée de main.</p></div></div>
        <div className="reference-quick-grid">
          <button onClick={onNewProject}><Plus/><span>Nouveau projet</span></button>
          <button onClick={onOpenStudio}><Bot/><span>Studio IA</span></button>
          <button onClick={()=>document.getElementById('media-library')?.scrollIntoView({behavior:'smooth'})}><Folder/><span>Mes fichiers</span></button>
          <button onClick={()=>document.getElementById('academy')?.scrollIntoView({behavior:'smooth'})}><GraduationCap/><span>Académie</span></button>
          <button onClick={()=>document.getElementById('organizations')?.scrollIntoView({behavior:'smooth'})}><Users/><span>Équipe</span></button>
          <button onClick={()=>document.getElementById('profile-title')?.scrollIntoView({behavior:'smooth'})}><Settings/><span>Paramètres</span></button>
        </div>
      </section>
    </div>
    <aside className="reference-right-column">
      <section className="reference-side-card reference-progress"><h3>Votre progression</h3><div className="reference-progress-body"><div className="reference-ring"><strong>{Math.min(100,Math.round((projectCount?Math.min(projectCount,10):0)/10*100))}%</strong></div><div className="reference-progress-lines"><span><Folder size={14}/> Projets <b>{Math.min(projectCount,10)} / 10</b></span><span><GraduationCap size={14}/> Cours <b>0 / 8</b></span><span><Activity size={14}/> Objectifs <b>0 / 5</b></span></div></div></section>
      <section className="reference-side-card"><div className="reference-section-head"><h3>Activité récente</h3><span>En direct</span></div><div className="reference-activity"><span className="activity-purple"><Sparkles/></span><div><b>Espace de travail prêt</b><small>Votre studio IA est disponible</small></div></div><div className="reference-activity"><span className="activity-blue"><Folder/></span><div><b>Vos projets</b><small>{projectCount} projet(s) dans votre espace</small></div></div><div className="reference-activity"><span className="activity-teal"><GraduationCap/></span><div><b>Parcours de formation</b><small>Explorez les ressources de l’académie</small></div></div></section>
      <section className="reference-side-card"><div className="reference-section-head"><h3>Ressources</h3><CircleHelp size={15}/></div><button className="reference-resource" onClick={()=>document.getElementById('resource-library')?.scrollIntoView({behavior:'smooth'})}><BookOpen/><span><b>Documentation</b><small>Guides et bonnes pratiques</small></span><ArrowRight/></button><button className="reference-resource" onClick={()=>document.getElementById('academy')?.scrollIntoView({behavior:'smooth'})}><GraduationCap/><span><b>Tutoriels & formation</b><small>Apprendre pas à pas</small></span><ArrowRight/></button><button className="reference-resource" onClick={()=>document.getElementById('organizations')?.scrollIntoView({behavior:'smooth'})}><Users/><span><b>Communauté</b><small>Créer ensemble</small></span><ArrowRight/></button></section>
      <section className="reference-community"><Sparkles/><b>Ensemble, allons plus loin</b><p>Rejoignez votre espace de création et partagez vos projets.</p><button onClick={()=>document.getElementById('organizations')?.scrollIntoView({behavior:'smooth'})}>Découvrir l’espace équipe <ArrowRight size={14}/></button></section>
    </aside>
  </section>;
}
