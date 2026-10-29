import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Circle, LoaderCircle, RefreshCw, Sparkles, GraduationCap, Clock3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

type PathRow = { id:string; title:string; audience:string; description:string; position:number };
type ModuleRow = { id:string; path_id:string; title:string; summary:string; project_task:string; position:number };
type ProgressRow = { module_id:string; status:'not_started'|'in_progress'|'completed'; notes:string|null };
type CourseRow = { id:string; slug:string; title:string; short_description:string; description:string; instructor_name:string|null; cover_image_url:string|null; price_xof:number; is_free:boolean; duration_minutes:number|null; level:string };
type LessonRow = { id:string; course_id:string; title:string; description:string; content_type:'text'|'video'|'document'|'external'; content:string|null; media_url:string|null; position:number; is_preview:boolean; is_published:boolean };
const statusLabel = { not_started:'À commencer', in_progress:'En cours', completed:'Terminé' };
const formatXof = (amount:number) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(amount) + ' FCFA';

export default function Academy({ userId }: { userId:string }) {
  const [paths,setPaths]=useState<PathRow[]>([]);
  const [modules,setModules]=useState<ModuleRow[]>([]);
  const [courses,setCourses]=useState<CourseRow[]>([]);
  const [lessons,setLessons]=useState<LessonRow[]>([]);
  const [enrolledCourseIds,setEnrolledCourseIds]=useState<string[]>([]);
  const [enrollingCourseId,setEnrollingCourseId]=useState('');
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
      const [p,m,g,c,e,l]=await Promise.all([
        supabase.from('nexora_learning_paths').select('id,title,audience,description,position').order('position'),
        supabase.from('nexora_learning_modules').select('id,path_id,title,summary,project_task,position').order('position'),
        supabase.from('nexora_learning_progress').select('module_id,status,notes').eq('user_id',userId),
        supabase.from('nexora_courses').select('id,slug,title,short_description,description,instructor_name,cover_image_url,price_xof,is_free,duration_minutes,level').eq('status','published').order('created_at',{ascending:false}),
        supabase.from('nexora_course_enrollments').select('course_id').eq('user_id',userId).eq('status','active'),
        supabase.from('nexora_course_lessons').select('id,course_id,title,description,content_type,content,media_url,position,is_preview,is_published').order('position',{ascending:true})
      ]);
      if(p.error||m.error||g.error){setError('Le programme Académie nécessite l’application de la migration Supabase.');return;}
      const pathRows=(p.data??[]) as PathRow[];
      setPaths(pathRows);setModules((m.data??[]) as ModuleRow[]);
      setCourses((c.data??[]) as CourseRow[]);
      setLessons(l.error?[]:(l.data??[]) as LessonRow[]);
      if(c.error) setMessage('Le catalogue des formations est temporairement indisponible.');
      setEnrolledCourseIds(e.error?[]:(e.data??[]).map(row=>row.course_id as string));
      setProgress(Object.fromEntries(((g.data??[]) as ProgressRow[]).map(row=>[row.module_id,row])));
      setSelected(current => pathRows.length && !pathRows.some(row=>row.id===current) ? pathRows[0].id : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l’Académie. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  },[userId]);
  useEffect(()=>{void load();},[load]);

  async function enrollFreeCourse(course:CourseRow){
    if(!supabase)return;
    setEnrollingCourseId(course.id);setError('');setMessage('');
    try {
      const {data,error:e}=await supabase.rpc('nexora_enroll_free_course',{p_course_id:course.id});
      if(e)throw new Error(e.message);
      if(!data?.enrolled)throw new Error('L’inscription n’a pas été confirmée.');
      setEnrolledCourseIds(current=>current.includes(course.id)?current:[...current,course.id]);
      const {data:availableLessons}=await supabase.from('nexora_course_lessons').select('id,course_id,title,description,content_type,content,media_url,position,is_preview,is_published').eq('course_id',course.id).order('position',{ascending:true});
      if(availableLessons) setLessons(current=>[...current.filter(lesson=>lesson.course_id!==course.id),...(availableLessons as LessonRow[])]);
      setMessage('Inscription confirmée. Vous pouvez accéder aux leçons publiées de cette formation.');
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Impossible de vous inscrire à cette formation. Réessayez.');
    } finally {setEnrollingCourseId('');}
  }

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
    <div className="section-heading"><div><p className="eyebrow">JDV NEXORA · ACADÉMIE</p><h2><BookOpen size={21}/> Apprendre en construisant</h2><p className="muted">Parcours pratiques et formations indépendantes, avec un tarif propre à chaque cours.</p></div><button className="icon-button" onClick={()=>void load()} disabled={loading} aria-label="Actualiser l’Académie"><RefreshCw size={16}/></button></div>
    <ModuleDataOverview sources={["nexora_learning_paths", "nexora_learning_modules", "nexora_learning_progress", "nexora_courses", "nexora_course_enrollments", "nexora_course_lessons"]} metrics={[{ label: "Formations disponibles", value: courses.length }, { label: "Parcours", value: paths.length }, { label: "Inscriptions gratuites", value: enrolledCourseIds.length }]} loading={loading} error={Boolean(error)} />

    <ModuleDataOverview sources={["nexora_learning_paths", "nexora_learning_modules", "nexora_learning_progress", "nexora_courses", "nexora_course_enrollments", "nexora_course_lessons"]} metrics={[{ label: "Formations disponibles", value: courses.length }, { label: "Parcours", value: paths.length }, { label: "Inscriptions gratuites", value: enrolledCourseIds.length }]} loading={loading} error={Boolean(error)} />

    {loading?<p className="empty-state">Chargement du programme…</p>:<>
      <section aria-labelledby="paid-courses-heading" className="academy-courses-section">
        <div className="section-heading"><div><h3 id="paid-courses-heading"><GraduationCap size={19}/> Formations et cours</h3><p className="muted">Chaque formation possède son propre prix. Les montants sont définis formation par formation.</p></div></div>
        {courses.length===0?<p className="empty-state">Aucune formation publiée pour le moment. Les formations ajoutées et publiées par l’équipe apparaîtront ici avec leur tarif.</p>:
          <div className="feature-list academy-course-grid">
            {courses.map(course=><article key={course.id} className="project-item academy-course-card">
              {course.cover_image_url&&<img src={course.cover_image_url} alt="" loading="lazy" className="academy-course-cover"/>}
              <div className="project-info"><p className="eyebrow">{course.level}</p><h3>{course.title}</h3><p>{course.short_description||course.description}</p>
                {course.instructor_name&&<small>Formateur : {course.instructor_name}</small>}
                {course.duration_minutes!==null&&<p className="muted"><Clock3 size={14} className="academy-inline-icon"/> {course.duration_minutes} minutes</p>}
              </div>
              <div className="academy-course-footer">
                <strong>{course.is_free||Number(course.price_xof)===0?'Gratuit':formatXof(Number(course.price_xof))}</strong>
                {course.is_free||Number(course.price_xof)===0 ? (enrolledCourseIds.includes(course.id) ? <span className="status-badge status-completed">Inscrit</span> : <button type="button" className="primary-button" onClick={()=>void enrollFreeCourse(course)} disabled={enrollingCourseId===course.id}>{enrollingCourseId===course.id?'Inscription…':'S’inscrire gratuitement'}</button>) : <span className="muted academy-payment-pending">Paiement bientôt disponible</span>}
              </div>
              {lessons.filter(lesson=>lesson.course_id===course.id&&lesson.is_published).length>0&&<div className="project-list academy-course-lessons"><h4>Leçons disponibles</h4>{lessons.filter(lesson=>lesson.course_id===course.id&&lesson.is_published).map((lesson,index)=><article key={lesson.id} className="project-item"><div className="project-type-icon"><BookOpen size={16}/></div><div className="project-info"><p className="eyebrow">LEÇON {lesson.position||index+1}{lesson.is_preview?' · APERÇU':''}</p><h4>{lesson.title}</h4>{lesson.description&&<p>{lesson.description}</p>}{lesson.content&&<p className="academy-lesson-content">{lesson.content}</p>}{lesson.media_url&&<a href={lesson.media_url} target="_blank" rel="noopener noreferrer">{lesson.content_type==='video'?'Ouvrir la vidéo':lesson.content_type==='document'?'Ouvrir le document':'Ouvrir la ressource'}</a>}</div></article>)}</div>}
            </article>)}
          </div>}
        <p className="muted academy-course-disclaimer">Le paiement et l’activation automatique des formations payantes ne sont pas encore ouverts : aucun paiement n’est demandé depuis cet écran.</p>
      </section>
      <div className="section-heading"><div><h3>Parcours d’apprentissage</h3><p className="muted">Trois parcours, des exercices concrets et une progression sauvegardée dans votre compte.</p></div></div>
      <div className="feature-list academy-path-grid">
        {paths.map(path=><button key={path.id} type="button" onClick={()=>setSelected(path.id)} className={`project-item academy-path-button${selected===path.id?' is-selected':''}`}><div className="project-type-icon"><Sparkles size={18}/></div><div className="project-info"><h3>{path.title}</h3><p>{path.audience}</p><small>{path.description}</small></div></button>)}
      </div>
      <div className="section-heading"><div><h3>{paths.find(p=>p.id===selected)?.title??'Parcours'}</h3><p className="muted">{completed} sur {activeModules.length} étapes terminées</p></div><strong>{activeModules.length?Math.round(completed/activeModules.length*100):0}%</strong></div>
      <div className="academy-progress-track" role="progressbar" aria-label="Progression du parcours" aria-valuemin={0} aria-valuemax={100} aria-valuenow={activeModules.length?Math.round(completed/activeModules.length*100):0}><div className="academy-progress-fill" style={{width:`${activeModules.length?completed/activeModules.length*100:0}%`}}/></div>
      <div className="project-list">{activeModules.map((module,index)=>{const status=progress[module.id]?.status??'not_started';return <article key={module.id} className="project-item"><div className="project-type-icon">{status==='completed'?<CheckCircle2 size={19}/>:status==='in_progress'?<LoaderCircle size={19}/>:<Circle size={19}/>}</div><div className="project-info"><p className="eyebrow">ÉTAPE {index+1} · {statusLabel[status].toUpperCase()}</p><h3>{module.title}</h3><p>{module.summary}</p><p><strong>Projet pratique :</strong> {module.project_task}</p></div><select aria-label={`Progression : ${module.title}`} value={status} disabled={saving===module.id} onChange={e=>void setStatus(module,e.target.value as ProgressRow['status'])}><option value="not_started">À commencer</option><option value="in_progress">En cours</option><option value="completed">Terminé</option></select></article>})}</div>
    </>}
    {error&&<p className="feedback error" role="alert">{error}</p>}{message&&<p className="feedback success" role="status">{message}</p>}
  </section>;
}
