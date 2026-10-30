import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Circle, Plus, RefreshCw, Trash2, Pencil, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

type Task = { id:string; user_id:string; title:string; description:string|null; status:'planned'|'in_progress'|'completed'|'paused'; priority:'low'|'medium'|'high'; due_date:string|null; position:number; completed_at:string|null; created_at:string };
export default function Roadmap({ userId }: { userId:string }) {
  const [tasks,setTasks]=useState<Task[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [priority,setPriority]=useState<Task['priority']>('medium');
  const [dueDate,setDueDate]=useState('');
  const [filter,setFilter]=useState('all');
  const [editingTaskId,setEditingTaskId]=useState<string|null>(null);

  const load=useCallback(async()=>{
    if(!supabase){setLoading(false);setError('Supabase n’est pas configuré.');return;}
    setLoading(true);setError('');
    try {
      const {data,error:queryError}=await supabase.from('roadmap_tasks').select('id,user_id,title,description,status,priority,due_date,position,completed_at,created_at').eq('user_id',userId).order('position').order('created_at',{ascending:false}).limit(300);
      if(queryError)setError(queryError.message.includes('roadmap_tasks')?'La Roadmap sera disponible après application des migrations Supabase.':'Impossible de charger la Roadmap. Réessayez.');
      else setTasks((data??[]) as Task[]);
    } catch {
      setError('Erreur réseau pendant le chargement de la Roadmap. Vérifiez la connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  },[userId]);
  useEffect(()=>{void load();},[load]);

  function resetForm() {
    setEditingTaskId(null);setTitle('');setDescription('');setPriority('medium');setDueDate('');
  }

  function beginEdit(task:Task) {
    setEditingTaskId(task.id);setTitle(task.title);setDescription(task.description??'');
    setPriority(task.priority);setDueDate(task.due_date??'');setError('');setMessage('');
    document.getElementById('roadmap-task-title')?.focus();
  }

  async function saveTask(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!supabase||!title.trim()||saving)return;
    setSaving(true);setError('');setMessage('');
    const values={title:title.trim(),description:description.trim()||null,priority,due_date:dueDate||null};
    try {
      if(editingTaskId) {
        const {data,error:updateError}=await supabase.from('roadmap_tasks').update(values)
          .eq('id',editingTaskId).eq('user_id',userId)
          .select('id,user_id,title,description,status,priority,due_date,position,completed_at,created_at').single();
        if(updateError||!data){setError('Impossible de modifier cet objectif. Actualisez la Roadmap puis réessayez.');return;}
        setTasks(current=>current.map(row=>row.id===editingTaskId?data as Task:row));
        setMessage('Objectif modifié et enregistré.');
      } else {
        const {data,error:insertError}=await supabase.from('roadmap_tasks').insert({
          user_id:userId,...values,position:tasks.length,
        }).select('id,user_id,title,description,status,priority,due_date,position,completed_at,created_at').single();
        if(insertError||!data){setError('Impossible d’ajouter cet objectif. Vérifiez la connexion puis réessayez.');return;}
        setTasks(current=>[data as Task,...current]);
        setMessage('Objectif ajouté à votre Roadmap.');
      }
      resetForm();
    } catch {
      setError('Erreur réseau pendant l’enregistrement. Actualisez la Roadmap pour vérifier les données sauvegardées.');
    } finally {
      setSaving(false);
    }
  }
  async function update(task:Task,patch:Partial<Task>){
    if(!supabase||saving)return;
    setSaving(true);setError('');setMessage('');
    try {
      const {data,error:updateError}=await supabase.from('roadmap_tasks').update(patch).eq('id',task.id).eq('user_id',userId).select('id,user_id,title,description,status,priority,due_date,position,completed_at,created_at').single();
      if(updateError){setError('Impossible de modifier cet objectif. Actualisez la Roadmap puis réessayez.');return;}
      setTasks(current=>current.map(row=>row.id===task.id?data as Task:row));setMessage('Roadmap mise à jour.');
    } catch {
      setError('Erreur réseau pendant la modification. Actualisez la Roadmap pour vérifier le statut enregistré.');
    } finally {
      setSaving(false);
    }
  }
  async function remove(task:Task){
    if(!supabase||saving||!window.confirm('Supprimer cet objectif de la Roadmap ?'))return;
    setSaving(true);setError('');setMessage('');
    try {
      const {error:deleteError}=await supabase.from('roadmap_tasks').delete().eq('id',task.id).eq('user_id',userId);
      if(deleteError){setError('Impossible de supprimer cet objectif. Actualisez la Roadmap puis réessayez.');return;}
      setTasks(current=>current.filter(row=>row.id!==task.id));if(editingTaskId===task.id)resetForm();setMessage('Objectif supprimé.');
    } catch {
      setError('Erreur réseau pendant la suppression. Actualisez la Roadmap pour vérifier si l’objectif existe encore.');
    } finally {
      setSaving(false);
    }
  }
  const visible=useMemo(()=>tasks.filter(task=>filter==='all'||task.status===filter),[tasks,filter]);
  const completed=tasks.filter(task=>task.status==='completed').length;
  const percent=tasks.length?Math.round(completed/tasks.length*100):0;
  const statusLabel:Record<Task['status'],string>={planned:'À faire',in_progress:'En cours',completed:'Terminé',paused:'En pause'};
  const priorityLabel:Record<Task['priority'],string>={low:'Basse',medium:'Moyenne',high:'Haute'};
  return <section id="roadmap" className="project-panel roadmap-panel">
    <div className="section-heading"><div><p className="eyebrow">ROADMAP · OBJECTIFS ET EXÉCUTION</p><h2><CalendarClock size={21}/> Ma feuille de route</h2><p className="muted">Transformez vos apprentissages en actions suivies, avec échéances et priorités.</p></div><button className="icon-button" type="button" onClick={()=>void load()} disabled={loading} aria-label="Actualiser la Roadmap"><RefreshCw size={16}/></button></div>
    <ModuleDataOverview sources={["roadmap_tasks"]} loading={loading} error={Boolean(error)} caption="Les objectifs, statuts et échéances proviennent de votre feuille de route sauvegardée." />


    <div className="roadmap-summary"><div><span>Objectifs terminés</span><strong>{completed}/{tasks.length}</strong></div><div><span>Progression globale</span><strong>{percent}%</strong><div className="roadmap-progress-track"><span style={{width:percent+'%'}}/></div></div></div>
    <form className="roadmap-form" onSubmit={saveTask}><h3>{editingTaskId?<Pencil size={16}/>:<Plus size={16}/>} {editingTaskId?"Modifier un objectif":"Ajouter un objectif"}</h3><label htmlFor="roadmap-task-title">Titre<input id="roadmap-task-title" required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Étudier trois modèles économiques"/></label><label>Description<textarea rows={2} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Résultat attendu ou prochaines actions"/></label><div className="roadmap-form-row"><label>Priorité<select value={priority} onChange={e=>setPriority(e.target.value as Task['priority'])}><option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option></select></label><label>Échéance<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label></div><div className="roadmap-form-actions"><button className="primary-button" type="submit" disabled={saving||!title.trim()}>{saving?'Enregistrement…':editingTaskId?'Enregistrer les modifications':'Ajouter à la Roadmap'} <Save size={15}/></button>{editingTaskId&&<button className="logout-button" type="button" onClick={resetForm} disabled={saving}><X size={15}/> Annuler</button>}</div></form>
    <div className="roadmap-filter"><label htmlFor="roadmap-status-filter">Afficher</label><select id="roadmap-status-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tous les objectifs</option><option value="planned">À faire</option><option value="in_progress">En cours</option><option value="completed">Terminés</option><option value="paused">En pause</option></select></div>
    {error&&<p className="feedback error" role="alert">{error}</p>}{message&&<p className="feedback success" role="status">{message}</p>}
    {loading?<p className="empty-state">Chargement de votre Roadmap…</p>:visible.length===0?<div className="empty-state"><div className="empty-icon"><CalendarClock size={24}/></div><h3>Aucun objectif dans cette vue</h3><p>Ajoutez un objectif pour planifier vos prochaines étapes. Chaque objectif est privé à votre compte.</p></div>:<div className="roadmap-list">{visible.map(task=><article className={'roadmap-task roadmap-task-'+task.status} key={task.id}><div className="roadmap-task-symbol">{task.status==='completed'?<CheckCircle2 size={19}/>:<Circle size={19}/>}</div><div className="roadmap-task-main"><div className="roadmap-task-heading"><h3>{task.title}</h3><span className={'roadmap-priority priority-'+task.priority}>{priorityLabel[task.priority]}</span></div>{task.description&&<p>{task.description}</p>}<div className="roadmap-task-meta">{task.due_date&&<span>Échéance : {new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(task.due_date+'T00:00:00Z'))}</span>}<span>{statusLabel[task.status]}</span></div><label className="roadmap-status-label">Statut<select aria-label={'Statut de '+task.title} disabled={saving} value={task.status} onChange={e=>{const status=e.target.value as Task['status'];void update(task,{status,completed_at:status==='completed'?new Date().toISOString():null});}}><option value="planned">À faire</option><option value="in_progress">En cours</option><option value="completed">Terminé</option><option value="paused">En pause</option></select></label></div><div className="roadmap-task-actions"><button className="icon-button" type="button" onClick={()=>beginEdit(task)} disabled={saving} aria-label={'Modifier '+task.title} title="Modifier"><Pencil size={15}/></button><button className="chapter-delete-button" type="button" onClick={()=>void remove(task)} disabled={saving} aria-label={'Supprimer '+task.title} title="Supprimer"><Trash2 size={15}/></button></div></article>)}</div>}
  </section>;
}
