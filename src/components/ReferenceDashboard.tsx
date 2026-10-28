import { ArrowRight, Bot, Compass, Folder, Image, GraduationCap, Users, Settings, Plus, Sparkles, Activity, BookOpen, FileText, CircleHelp } from 'lucide-react';

type ProjectPreview = { id: string; title: string; description: string | null; project_type: string; status: string; created_at: string };
type Props = {
  displayName: string;
  projects: ProjectPreview[];
  projectCount: number;
  inProgressCount: number;
  onNewProject: () => void;
  onOpenStudio: () => void;
  onOpenProjects: () => void;
  onOpenDiscover: () => void;
  onOpenMedia: () => void;
  onOpenAcademy: () => void;
  onOpenTeam: () => void;
  onOpenProfile: () => void;
  onOpenResources: () => void;
};
export default function ReferenceDashboard({displayName,projects,projectCount,inProgressCount,onNewProject,onOpenStudio,onOpenProjects,onOpenDiscover,onOpenMedia,onOpenAcademy,onOpenTeam,onOpenProfile,onOpenResources}:Props) {
const name = displayName.trim().split(/\s+/)[0] || 'Créateur';
  return <section className="reference-dashboard" aria-label="Tableau de bord NEXORA">
    <div className="reference-main-column">
      <section className="reference-hero">
        <div className="reference-hero-copy">
          <p className="reference-greeting">Bonjour {name},</p>
          <h1>Bienvenue dans votre studio IA</h1>
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
        <button className="reference-module module-teal" onClick={onOpenDiscover}><span><Compass/></span><b>Découverte & Insights</b><small>Sources · Actualités · Analyse</small></button>
        <button className="reference-module module-pink" onClick={onOpenMedia}><span><Image/></span><b>Bibliothèque & Design</b><small>Médias · Templates · Création</small></button>
      </div>
      <section className="reference-projects">
        <div className="reference-section-head"><div><h2>Mes projets</h2><p>Reprenez là où vous en étiez ou créez un nouveau projet.</p></div><button onClick={onOpenProjects}>Voir tous <ArrowRight size={14}/></button></div>
        <div className="reference-project-summary">
          {projects.slice(0,4).map((project,index)=><article key={project.id} className={`reference-live-project project-art-${index+1}`}>
            <span className={`reference-project-art ${index===0?'art-book':index===1?'art-app':index===2?'art-campaign':'art-doc'}`}>{index===0?<BookOpen/>:index===1?<Folder/>:index===2?<Compass/>:<FileText/>}</span>
            <b>{project.title}</b><strong>{project.status==='completed'?'Terminé':project.status==='in_progress'?'En cours':project.status==='archived'?'Archivé':'Brouillon'}</strong>
            <small>{project.description || 'Créé le '+new Date(project.created_at).toLocaleDateString('fr-FR')}</small>
          </article>)}
          {projects.length===0 && <article><span className="reference-project-art art-book"><BookOpen/></span><b>Vos créations</b><strong>Prêt à démarrer</strong><small>Votre premier projet apparaîtra ici.</small></article>}
          <button className="reference-new-project" onClick={onNewProject}><Plus/><b>Nouveau projet</b><small>Créer une nouvelle réalisation</small></button>
        </div>
      </section>
      <section className="reference-quick">
        <div className="reference-section-head"><div><h2>Accès rapide</h2><p>Vos outils préférés, toujours à portée de main.</p></div></div>
        <div className="reference-quick-grid">
          <button onClick={onNewProject}><Plus/><span>Nouveau projet</span></button>
          <button onClick={onOpenStudio}><Bot/><span>Studio IA</span></button>
          <button onClick={onOpenMedia}><Folder/><span>Mes fichiers</span></button>
          <button onClick={onOpenAcademy}><GraduationCap/><span>Académie</span></button>
          <button onClick={onOpenTeam}><Users/><span>Équipe</span></button>
          <button onClick={onOpenProfile}><Settings/><span>Paramètres</span></button>
        </div>
      </section>
      <div className="reference-bottom-grid">
        <section className="reference-side-card reference-next-tasks">
          <div className="reference-section-head"><h3>Vos prochaines tâches</h3><button onClick={onOpenProjects}>Voir les projets <ArrowRight size={14}/></button></div>
          <button className="reference-task" onClick={onNewProject}><span className="reference-task-check"/><span><b>Créer votre prochain projet</b><small>Commencer une nouvelle réalisation</small></span><ArrowRight size={14}/></button>
          <button className="reference-task" onClick={onOpenStudio}><span className="reference-task-check"/><span><b>Explorer le Studio IA</b><small>Transformer une idée en contenu</small></span><ArrowRight size={14}/></button>
          <button className="reference-task" onClick={onOpenAcademy}><span className="reference-task-check"/><span><b>Découvrir une formation</b><small>Développer vos compétences</small></span><ArrowRight size={14}/></button>
        </section>
        <section className="reference-side-card reference-usage">
          <h3>Utilisation de vos ressources</h3>
          <div className="reference-usage-empty"><Activity/><b>Suivi des ressources</b><p>Les indicateurs apparaîtront ici lorsque les données de consommation seront connectées.</p></div>
          <button className="reference-usage-link" onClick={onOpenProfile}>Gérer mes préférences <ArrowRight size={14}/></button>
        </section>
      </div>
    </div>
    <aside className="reference-right-column">
      <section className="reference-side-card reference-progress"><h3>Votre progression</h3><div className="reference-progress-body"><div className="reference-ring"><strong>{Math.min(100,Math.round((projectCount?Math.min(projectCount,10):0)/10*100))}%</strong></div><div className="reference-progress-lines"><span><Folder size={14}/> Projets <b>{Math.min(projectCount,10)} / 10</b></span><span><GraduationCap size={14}/> Cours <b>À découvrir</b></span><span><Activity size={14}/> Objectifs <b>À définir</b></span></div></div></section>
      <section className="reference-side-card"><div className="reference-section-head"><h3>Activité récente</h3><span>En direct</span></div><div className="reference-activity"><span className="activity-purple"><Sparkles/></span><div><b>Espace de travail prêt</b><small>Votre studio IA est disponible</small></div></div><div className="reference-activity"><span className="activity-blue"><Folder/></span><div><b>Vos projets</b><small>{projectCount} projet(s) dans votre espace</small></div></div><div className="reference-activity"><span className="activity-teal"><GraduationCap/></span><div><b>Parcours de formation</b><small>Explorez les ressources de l’académie</small></div></div></section>
      <section className="reference-side-card"><div className="reference-section-head"><h3>Ressources</h3><CircleHelp size={15}/></div><button className="reference-resource" onClick={onOpenResources}><BookOpen/><span><b>Documentation</b><small>Guides et bonnes pratiques</small></span><ArrowRight/></button><button className="reference-resource" onClick={onOpenAcademy}><GraduationCap/><span><b>Tutoriels & formation</b><small>Apprendre pas à pas</small></span><ArrowRight/></button><button className="reference-resource" onClick={onOpenTeam}><Users/><span><b>Communauté</b><small>Créer ensemble</small></span><ArrowRight/></button></section>
      <section className="reference-community"><Sparkles/><b>Ensemble, allons plus loin</b><p>Rejoignez votre espace de création et partagez vos projets.</p><button onClick={onOpenTeam}>Découvrir l’espace équipe <ArrowRight size={14}/></button></section>
    </aside>
  </section>;
}
