import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, RefreshCw, ShieldCheck, Users, GraduationCap, Plus, Save, Pencil, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CourseLessonManager from './CourseLessonManager';

type Profile = { id: string; display_name: string | null; preferred_language: string; role: 'user'|'admin'; created_at: string };
type AuditLog = { id: number; actor_id: string | null; action: string; table_name: string | null; record_id: string | null; metadata: Record<string, unknown>; created_at: string };
type Course = { id:string; slug:string; title:string; short_description:string; description:string; instructor_name:string|null; cover_image_url:string|null; price_xof:number; status:'draft'|'published'|'archived'; duration_minutes:number|null; level:string };
type CourseForm = { slug:string; title:string; short_description:string; description:string; instructor_name:string; cover_image_url:string; price_xof:string; duration_minutes:string; level:string; status:'draft'|'published'|'archived' };
const emptyCourse:CourseForm = {slug:'',title:'',short_description:'',description:'',instructor_name:'',cover_image_url:'',price_xof:'0',duration_minutes:'',level:'Tous niveaux',status:'draft'};
const money = (amount:number) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(amount)||0)+' FCFA';

export default function AdminPanel({ userId, role }: { userId: string; role: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [courses,setCourses]=useState<Course[]>([]);
  const [courseForm,setCourseForm]=useState<CourseForm>(emptyCourse);
  const [editingCourseId,setEditingCourseId]=useState<string|null>(null);
  const [lessonCourseId,setLessonCourseId]=useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCourse,setSavingCourse]=useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    if (!supabase || !isAdmin) { setLoading(false); return; }
    setLoading(true); setError('');
    const [profileResult, logResult,courseResult] = await Promise.all([
      supabase.from('profiles').select('id,display_name,preferred_language,role,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_logs').select('id,actor_id,action,table_name,record_id,metadata,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('nexora_courses').select('id,slug,title,short_description,description,instructor_name,cover_image_url,price_xof,status,duration_minutes,level').order('created_at',{ascending:false}),
    ]);
    if (profileResult.error) setError('Chargement des comptes impossible : ' + profileResult.error.message);
    else setProfiles((profileResult.data ?? []) as Profile[]);
    if (logResult.error) setError('Chargement du journal impossible : ' + logResult.error.message);
    else setLogs((logResult.data ?? []) as AuditLog[]);
    if (courseResult.error) setError('Chargement des formations impossible : '+courseResult.error.message);
    else setCourses((courseResult.data??[]) as Course[]);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  async function setRole(target: Profile, nextRole: Profile['role']) {
    if (!supabase || !isAdmin || target.id === userId) return;
    if (!window.confirm('Modifier le rôle de ce compte ?')) return;
    setError(''); setNotice('');
    const { error: updateError } = await supabase.from('profiles').update({ role: nextRole, updated_at: new Date().toISOString() }).eq('id', target.id);
    if (updateError) { setError('Modification du rôle refusée : ' + updateError.message); return; }
    setProfiles(current => current.map(item => item.id === target.id ? { ...item, role: nextRole } : item));
    setNotice('Rôle mis à jour. Le journal d’audit dépend des événements enregistrés par les fonctions métier.');
  }

  function editCourse(course:Course) {
    setEditingCourseId(course.id);
    setCourseForm({slug:course.slug,title:course.title,short_description:course.short_description,description:course.description,instructor_name:course.instructor_name??'',cover_image_url:course.cover_image_url??'',price_xof:String(course.price_xof),duration_minutes:course.duration_minutes===null?'':String(course.duration_minutes),level:course.level,status:course.status});
    setError('');setNotice('');
  }

  async function saveCourse(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase||!isAdmin)return;
    const price=Number(courseForm.price_xof);
    const duration=courseForm.duration_minutes.trim()===''?null:Number(courseForm.duration_minutes);
    if(!Number.isSafeInteger(price)||price<0){setError('Le prix doit être un montant entier positif en FCFA.');return;}
    if(duration!==null&&(!Number.isSafeInteger(duration)||duration<0)){setError('La durée doit être un nombre entier de minutes positif.');return;}
    const slug=courseForm.slug.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(!slug){setError('Ajoutez un identifiant de formation valide.');return;}
    setSavingCourse(true);setError('');setNotice('');
    const values={slug,title:courseForm.title.trim(),short_description:courseForm.short_description.trim(),description:courseForm.description.trim(),instructor_name:courseForm.instructor_name.trim()||null,cover_image_url:courseForm.cover_image_url.trim()||null,price_xof:price,duration_minutes:duration,level:courseForm.level.trim()||'Tous niveaux',status:courseForm.status,updated_at:new Date().toISOString(),...(editingCourseId?{}:{created_by:userId})};
    const result=editingCourseId
      ? await supabase.from('nexora_courses').update(values).eq('id',editingCourseId).select('id').single()
      : await supabase.from('nexora_courses').insert(values).select('id').single();
    setSavingCourse(false);
    if(result.error){setError('Enregistrement de la formation refusé : '+result.error.message);return;}
    setNotice(editingCourseId?'Formation mise à jour.':'Formation créée.');
    setEditingCourseId(null);setCourseForm(emptyCourse);await load();
  }

  async function toggleCourse(course:Course) {
    if(!supabase||!isAdmin)return;
    const status=course.status==='published'?'draft':'published';
    if(status==='published'&&!window.confirm('Publier cette formation avec le prix affiché ?'))return;
    setError('');setNotice('');
    const {error:e}=await supabase.from('nexora_courses').update({status,updated_at:new Date().toISOString()}).eq('id',course.id);
    if(e){setError('Changement de publication impossible : '+e.message);return;}
    setCourses(current=>current.map(c=>c.id===course.id?{...c,status}:c));
    setNotice(status==='published'?'Formation publiée dans l’Académie.':'Formation retirée du catalogue public.');
  }

  if (!isAdmin) return null;

  return <section id="administration" className="project-panel admin-panel">
    <div className="section-heading"><div><p className="eyebrow">CONTRÔLE DE LA PLATEFORME</p><h2><ShieldCheck size={21}/> Administration</h2><p className="muted">Gérez les rôles, les formations et consultez les événements d’audit.</p></div><button type="button" className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Actualiser l’administration"><RefreshCw size={16}/></button></div>
    {loading ? <p className="empty-state">Chargement des données d’administration…</p> : <>
      <div className="dashboard-stats"><article className="stat-card"><span className="stat-icon"><Users size={18}/></span><div><p>Comptes visibles</p><strong>{profiles.length}</strong><small>Maximum 200 comptes récents</small></div></article><article className="stat-card"><span className="stat-icon"><Activity size={18}/></span><div><p>Événements d’audit</p><strong>{logs.length}</strong><small>Maximum 50 événements récents</small></div></article><article className="stat-card"><span className="stat-icon"><GraduationCap size={18}/></span><div><p>Formations</p><strong>{courses.length}</strong><small>{courses.filter(c=>c.status==='published').length} publiées</small></div></article></div>
      <div className="admin-section"><h3><GraduationCap size={17}/> Gestion des formations et des tarifs</h3><p className="muted">Chaque cours a son propre prix en FCFA. Le prix zéro signifie gratuit. La publication rend la fiche visible dans l’Académie, mais ne déclenche pas de paiement.</p>
        <form className="project-form" onSubmit={saveCourse}>
          <label htmlFor="course-title">Nom de la formation</label><input id="course-title" value={courseForm.title} onChange={e=>setCourseForm(v=>({...v,title:e.target.value,slug:editingCourseId?v.slug:e.target.value}))} maxLength={180} required placeholder="Ex. Créer son premier e-book"/>
          <label htmlFor="course-slug">Identifiant (slug)</label><input id="course-slug" value={courseForm.slug} onChange={e=>setCourseForm(v=>({...v,slug:e.target.value}))} maxLength={180} required placeholder="creer-son-premier-ebook"/>
          <label htmlFor="course-short-description">Résumé</label><input id="course-short-description" value={courseForm.short_description} onChange={e=>setCourseForm(v=>({...v,short_description:e.target.value}))} maxLength={500} placeholder="Ce que l’apprenant va apprendre"/>
          <label htmlFor="course-description">Description complète</label><textarea id="course-description" rows={4} value={courseForm.description} onChange={e=>setCourseForm(v=>({...v,description:e.target.value}))} maxLength={12000}/>
          <label htmlFor="course-price">Prix de cette formation (FCFA)</label><input id="course-price" type="number" min="0" step="1" value={courseForm.price_xof} onChange={e=>setCourseForm(v=>({...v,price_xof:e.target.value}))} required/><small>0 FCFA = formation gratuite. Le tarif est propre à ce cours.</small>
          <label htmlFor="course-instructor">Formateur (facultatif)</label><input id="course-instructor" value={courseForm.instructor_name} onChange={e=>setCourseForm(v=>({...v,instructor_name:e.target.value}))} maxLength={160}/>
          <label htmlFor="course-cover">URL de l’image de couverture (facultatif)</label><input id="course-cover" type="url" value={courseForm.cover_image_url} onChange={e=>setCourseForm(v=>({...v,cover_image_url:e.target.value}))} placeholder="https://…"/>
          <label htmlFor="course-duration">Durée en minutes (facultatif)</label><input id="course-duration" type="number" min="0" step="1" value={courseForm.duration_minutes} onChange={e=>setCourseForm(v=>({...v,duration_minutes:e.target.value}))}/>
          <label htmlFor="course-level">Niveau</label><select id="course-level" value={courseForm.level} onChange={e=>setCourseForm(v=>({...v,level:e.target.value}))}><option>Tous niveaux</option><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option></select>
          <label htmlFor="course-status">Statut</label><select id="course-status" value={courseForm.status} onChange={e=>setCourseForm(v=>({...v,status:e.target.value as CourseForm['status']}))}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select>
          <div className="editor-actions"><button className="primary-button" type="submit" disabled={savingCourse}>{savingCourse?'Enregistrement…':editingCourseId?'Enregistrer les modifications':'Créer la formation'} <Save size={15}/></button><button className="logout-button" type="button" onClick={()=>{setEditingCourseId(null);setCourseForm(emptyCourse);}} disabled={savingCourse}>Réinitialiser</button></div>
        </form>
        <div className="project-list">{courses.map(course=><article className="project-item" key={course.id}><div className="project-type-icon"><GraduationCap size={18}/></div><div className="project-info"><h3>{course.title}</h3><p>{course.short_description||course.description||'Sans description'}</p><div className="project-meta"><span className="project-type-label">{Number(course.price_xof)===0?'Gratuit':money(Number(course.price_xof))}</span><span className={course.status==='published'?'status-badge status-completed':'status-badge'}>{course.status==='published'?'Publiée':course.status==='draft'?'Brouillon':'Archivée'}</span></div></div><button type="button" className="icon-button" onClick={()=>editCourse(course)} title="Modifier la formation" aria-label={'Modifier '+course.title}><Pencil size={15}/></button><button type="button" className="icon-button" onClick={()=>setLessonCourseId(current=>current===course.id?null:course.id)} title="Gérer les leçons" aria-label={"Gérer les leçons de "+course.title}><GraduationCap size={15}/></button><button type="button" className="icon-button" onClick={()=>void toggleCourse(course)} title={course.status==='published'?'Dépublier':'Publier'} aria-label={course.status==='published'?'Dépublier':'Publier'}>{course.status==='published'?<EyeOff size={15}/>:<Eye size={15}/>}</button></article>)}</div>{lessonCourseId&&courses.some(c=>c.id===lessonCourseId)&&<CourseLessonManager course={{id:lessonCourseId,title:courses.find(c=>c.id===lessonCourseId)!.title}} onChange={()=>void load()}/>
      </div>
      <div className="admin-section"><h3><Users size={17}/> Comptes et rôles</h3>{profiles.length ? <div className="project-list">{profiles.map(item => <article className="project-item" key={item.id}><div className="project-type-icon"><Users size={18}/></div><div className="project-info"><h3>{item.display_name || 'Compte sans nom'}</h3><p>{item.id}</p><small>Langue : {item.preferred_language} · Créé le {new Date(item.created_at).toLocaleDateString('fr-FR')}</small></div><span className={item.role === 'admin' ? 'status-badge status-completed' : 'status-badge'}>{item.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span><select aria-label="Rôle du compte" value={item.role} disabled={item.id === userId} onChange={event => void setRole(item, event.target.value as Profile['role'])}><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select></article>)}</div> : <p className="empty-state">Aucun compte trouvé.</p>}</div>
      <div className="admin-section"><h3><Activity size={17}/> Journal d’audit</h3>{logs.length ? <div className="collaboration-comment-list">{logs.map(log => <article className="collaboration-comment" key={log.id}><div className="collaboration-comment-meta"><strong>{log.action}</strong><time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString('fr-FR')}</time></div><p>{log.table_name || 'Événement système'}{log.record_id ? ' · Enregistrement ' + log.record_id : ''}</p><small>Acteur : {log.actor_id || 'Système'}</small></article>)}</div> : <p className="empty-state">Aucun événement d’audit n’est encore enregistré.</p>}</div>
    </>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    {notice && <p className="feedback success" role="status">{notice}</p>}
  </section>;
}
