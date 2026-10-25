import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Circle, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

type PathRow = { id:string; title:string; audience:string; description:string; position:number };
type ModuleRow = { id:string; path_id:string; title:string; summary:string; project_task:string; position:number };
type ProgressRow = { module_id:string; status:'not_started'|'in_progress'|'completed'; notes:string|null };
const statusLabel = { not_started:'À commencer', in_progress:'En cours', completed:'Terminé' };

export default function Academy({ userId }: { userId:string }) {
  const [paths,setPaths]=useState<PathRow[]>([]);
  const [modules,setModules]=useState<ModuleRow[]>([]);
  const [progress,setProgress]=useState<Record<string,ProgressRow>>({});
  const [selected,setSelected]=useState('discover');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  const load=useCallback(async()=>{
    if(!supabase){setLoading(false);setError('Supabase n’est pas configuré.');return;}
    setLoading(true);setError('');
    try {
      const [p,m,g]=await Promise.all([
        supabase.from('nexora_learning_paths').select('id,title,audience,description,position').order('position'),
        supabase.from('nexora_learning_modules').select('id,path_id,title,summary,project_task,position').order('position'),
        supabase.from('nexora_learning_progress').select('module_id,status,notes').eq('user_id',userId)
      ]);
      if(p.error||m.error||g.error){setError('Le programme Académie nécessite l’application de la migration Supabase.');return;}
      const pathRows=(p.data??[]) as PathRow[];
      setPaths(pathRows);setModules((m.data??[]) as ModuleRow[]);
      setProgress(Object.fromEntries(((g.data??[]) as ProgressRow[]).map(row=>[row.module_id,row])));
      setSelected(current => pathRows.length && !pathRows.some(row=>row.id===current) ? pathRows[0].id : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l’Académie. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  },[userId]);
  useEffect(()=>{void load();},[load]);

  async function setStatus(module:ModuleRow,status:ProgressRow['status']){
    if(!supabase)return;
    setSaving(module.id);setError('');setMessage('');
    try {
      const {error:e}=await supabase.from('nexora_learning_progress').upsert({user_id:userId,module_id:module.id,status,updated_at:new Date().toISOString()},{onConflict:'user_id,module_id'});
      if(e) throw new Error(e.message);
      setProgress(current=>({...current,[module.id]:{module_id:module.id,status,notes:current[module.id]?.notes??null}}));
      setMessage('Progression enregistrée.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer la progression. Vérifiez votre connexion puis réessayez.');
    } finally {
      setSaving('');
    }
  }
  const activeModules=modules.filter(m=>m.path_id===selected);
  const completed=activeModules.filter(m=>progress[m.id]?.status==='completed').length;
  return <section id="academy" className="project-panel">
    <div className="section-heading"><div><p className="eyebrow">JDV NEXORA · ACADÉMIE</p><h2><BookOpen size={21}/> Apprendre en construisant</h2><p className="muted">Trois parcours, des exercices concrets et une progression sauvegardée dans votre compte.</p></div><button className="icon-button" onClick={()=>void load()} disabled={loading} aria-label="Actualiser l’Académie"><RefreshCw size={16}/></button></div>
    {loading?<p className="empty-state">Chargement du programme…</p>:<>
      <div className="feature-list" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',marginBottom:24}}>
        {paths.map(path=><button key={path.id} type="button" onClick={()=>setSelected(path.id)} className="project-item" style={{textAlign:'left',cursor:'pointer',borderColor:selected===path.id?'#7e8cff':undefined,background:selected===path.id?'rgba(126,140,255,.12)':undefined}}><div className="project-type-icon"><Sparkles size={18}/></div><div className="project-info"><h3>{path.title}</h3><p>{path.audience}</p><small>{path.description}</small></div></button>)}
      </div>
      <div className="section-heading"><div><h3>{paths.find(p=>p.id===selected)?.title??'Parcours'}</h3><p className="muted">{completed} sur {activeModules.length} étapes terminées</p></div><strong>{activeModules.length?Math.round(completed/activeModules.length*100):0}%</strong></div>
      <div style={{height:6,borderRadius:8,background:'#202a43',overflow:'hidden',marginBottom:20}}><div style={{height:'100%',width:`${activeModules.length?completed/activeModules.length*100:0}%`,background:'linear-gradient(90deg,#7885ff,#5dcebb)',transition:'width .2s'}}/></div>
      <div className="project-list">{activeModules.map((module,index)=>{const status=progress[module.id]?.status??'not_started';return <article key={module.id} className="project-item"><div className="project-type-icon">{status==='completed'?<CheckCircle2 size={19}/>:status==='in_progress'?<LoaderCircle size={19}/>:<Circle size={19}/>}</div><div className="project-info"><p className="eyebrow">ÉTAPE {index+1} · {statusLabel[status].toUpperCase()}</p><h3>{module.title}</h3><p>{module.summary}</p><p><strong>Projet pratique :</strong> {module.project_task}</p></div><select aria-label={`Progression : ${module.title}`} value={status} disabled={saving===module.id} onChange={e=>void setStatus(module,e.target.value as ProgressRow['status'])}><option value="not_started">À commencer</option><option value="in_progress">En cours</option><option value="completed">Terminé</option></select></article>})}</div>
    </>}
    {error&&<p className="feedback error" role="alert">{error}</p>}{message&&<p className="feedback success" role="status">{message}</p>}
  </section>;
}
