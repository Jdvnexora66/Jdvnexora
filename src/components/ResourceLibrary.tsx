import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Headphones, RefreshCw, Search, Video, BookmarkCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Resource = {
  id: string; title: string; description: string; creator_name: string;
  resource_type: 'video'|'podcast'|'course'|'article'|'guide';
  topic: string; language: 'fr'|'en'|'multi'; url: string;
  thumbnail_url: string|null; duration_seconds: number|null; published_at: string|null;
  editorial_note_fr: string;
};
type Progress = { resource_id: string; status: 'saved'|'in_progress'|'completed' };
const typeLabels: Record<Resource['resource_type'], string> = {video:'Vidéo',podcast:'Podcast',course:'Cours',article:'Article',guide:'Guide'};
const topicLabels: Record<string,string> = {'entrepreneuriat':'Entrepreneuriat','intelligence-artificielle':'Intelligence artificielle','productivite':'Productivité','developpement':'Développement','marketing-digital':'Marketing digital','formation':'Formation'};
const langLabels = {fr:'Français',en:'Anglais',multi:'Multilingue'};

export default function ResourceLibrary({ userId }: { userId: string }) {
  const [resources,setResources]=useState<Resource[]>([]);
  const [progress,setProgress]=useState<Record<string,Progress['status']>>({});
  const [query,setQuery]=useState('');
  const [topic,setTopic]=useState('all');
  const [kind,setKind]=useState('all');
  const [language,setLanguage]=useState('all');
  const [progressFilter,setProgressFilter]=useState('all');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    if(!supabase){setError('Supabase n’est pas configuré.');setLoading(false);return;}
    setLoading(true);setError('');
    const [r,p]=await Promise.all([
      supabase.from('nexora_resources').select('id,title,description,creator_name,resource_type,topic,language,url,thumbnail_url,duration_seconds,published_at,editorial_note_fr').eq('is_published',true).order('published_at',{ascending:false,nullsFirst:false}).order('title'),
      supabase.from('nexora_resource_progress').select('resource_id,status').eq('user_id',userId)
    ]);
    if(r.error){setError('Chargement des ressources impossible : '+r.error.message);setLoading(false);return;}
    if(p.error){setError('Chargement de votre progression impossible : '+p.error.message);setLoading(false);return;}
    setResources((r.data??[]) as Resource[]);
    setProgress(Object.fromEntries(((p.data??[]) as Progress[]).map(item=>[item.resource_id,item.status])));
    setLoading(false);
  },[userId]);
  useEffect(()=>{void load();},[load]);

  const filtered=useMemo(()=>resources.filter(item=>{
    const text=(item.title+' '+item.description+' '+item.creator_name+' '+item.editorial_note_fr).toLocaleLowerCase();
    return (!query.trim()||text.includes(query.trim().toLocaleLowerCase()))&&(topic==='all'||item.topic===topic)&&(kind==='all'||item.resource_type===kind)&&(language==='all'||item.language===language)&&(progressFilter==='all'||(progressFilter==='not_started'?!progress[item.id]:progress[item.id]===progressFilter));
  }),[resources,query,topic,kind,language,progress,progressFilter]);

  async function setResourceStatus(resource:Resource,status:Progress['status']){
    if(!supabase)return;setNotice('');setError('');
    const {error:e}=await supabase.from('nexora_resource_progress').upsert({user_id:userId,resource_id:resource.id,status,updated_at:new Date().toISOString()},{onConflict:'user_id,resource_id'});
    if(e){setError('Enregistrement impossible : '+e.message);return;}
    setProgress(current=>({...current,[resource.id]:status}));
    setNotice('Progression mise à jour.');
  }
  const formatDuration=(seconds:number|null)=>seconds==null?'':Math.floor(seconds/60)+' min';
  const completedCount=Object.values(progress).filter(status=>status==='completed').length;
  const inProgressCount=Object.values(progress).filter(status=>status==='in_progress').length;
  const savedCount=Object.values(progress).filter(status=>status==='saved').length;
  return <section id="resource-library" className="project-panel">
    <div className="section-heading"><div><p className="eyebrow">JDV NEXORA · RESSOURCES</p><h2><BookOpen size={21}/> Bibliothèque numérique</h2><p className="muted">Vidéos, podcasts, cours et guides sélectionnés. Les ressources originales restent hébergées chez leurs éditeurs.</p></div><button className="icon-button" onClick={()=>void load()} disabled={loading} aria-label="Actualiser le catalogue"><RefreshCw size={16}/></button></div>
    <div className="project-filters">
      <label className="search-field"><Search size={16}/><input aria-label="Rechercher une ressource" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un expert, un sujet…"/></label>
      <select aria-label="Filtrer par thème" value={topic} onChange={e=>setTopic(e.target.value)}><option value="all">Tous les thèmes</option>{Object.entries(topicLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Filtrer par format" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Tous les formats</option>{Object.entries(typeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Filtrer par langue" value={language} onChange={e=>setLanguage(e.target.value)}><option value="all">Toutes les langues</option>{Object.entries(langLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Filtrer par progression" value={progressFilter} onChange={e=>setProgressFilter(e.target.value)}><option value="all">Toutes les progressions</option><option value="not_started">Non commencées</option><option value="saved">Enregistrées</option><option value="in_progress">En cours</option><option value="completed">Terminées</option></select>
    </div>
    <div className="roadmap-summary" aria-label="Résumé de votre apprentissage"><div><span>Ressources publiées</span><strong>{resources.length}</strong></div><div><span>Enregistrées</span><strong>{savedCount}</strong></div><div><span>En cours</span><strong>{inProgressCount}</strong></div><div><span>Terminées</span><strong>{completedCount}</strong></div></div>
    {loading?<p className="empty-state">Chargement du catalogue…</p>:filtered.length===0?<div className="empty-state"><BookOpen size={22}/><p>Aucune ressource ne correspond à ces filtres.</p></div>:<div className="project-list">{filtered.map(resource=><article className="project-item" key={resource.id}>
      <div className="project-type-icon">{resource.resource_type==='podcast'?<Headphones size={19}/>:resource.resource_type==='video'?<Video size={19}/>:<BookOpen size={19}/>}</div>
      <div className="project-info"><div className="project-meta"><span className="project-type-label">{typeLabels[resource.resource_type]}</span><span className="project-type-label">{langLabels[resource.language]}</span><span className="project-type-label">{topicLabels[resource.topic]??resource.topic}</span>{resource.duration_seconds!==null&&<span className="project-type-label">{formatDuration(resource.duration_seconds)}</span>}</div><h3>{resource.title}</h3><p>{resource.creator_name} · {resource.description}</p>{resource.editorial_note_fr&&<p><strong>À retenir :</strong> {resource.editorial_note_fr}</p>}<div className="project-meta"><span className="status-badge">{progress[resource.id]==='completed'?<CheckCircle2 size={12}/>:<BookmarkCheck size={12}/>} {progress[resource.id]==='completed'?'Terminée':progress[resource.id]==='in_progress'?'En cours':progress[resource.id]==='saved'?'Enregistrée':'Non commencée'}</span><button className="text-button" type="button" onClick={()=>void setResourceStatus(resource,'saved')}>Enregistrer</button><button className="text-button" type="button" onClick={()=>void setResourceStatus(resource,'in_progress')}>Commencer</button><button className="text-button" type="button" onClick={()=>void setResourceStatus(resource,'completed')}>Terminer</button><a className="text-button" href={resource.url} target="_blank" rel="noreferrer">Ouvrir la source <ExternalLink size={13}/></a></div></div>
    </article>)}</div>}
    {error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback success" role="status">{notice}</p>}
    <p className="workspace-footnote">Les compteurs reflètent uniquement la progression de votre compte. Le catalogue est éditorialisé. La synchronisation automatique des flux nécessite une tâche serveur sécurisée ; aucun secret d’administration n’est utilisé dans le navigateur.</p>
  </section>;
}
