import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Plus, Save, Pencil, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Course = { id: string; title: string };
type Lesson = { id: string; course_id: string; title: string; description: string; content_type: 'text'|'video'|'document'|'external'; content: string|null; media_url: string|null; position: number; is_preview: boolean; is_published: boolean };
type LessonForm = { title: string; description: string; content_type: Lesson['content_type']; content: string; media_url: string; position: string; is_preview: boolean; is_published: boolean };
const emptyForm: LessonForm = { title:'', description:'', content_type:'text', content:'', media_url:'', position:'1', is_preview:false, is_published:false };

export default function CourseLessonManager({ course, onChange }: { course: Course; onChange?: () => void }) {
  const [lessons,setLessons] = useState<Lesson[]>([]);
  const [form,setForm] = useState<LessonForm>(emptyForm);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase n’est pas configuré.'); return; }
    setLoading(true); setError('');
    const {data,error:e} = await supabase.from('nexora_course_lessons').select('id,course_id,title,description,content_type,content,media_url,position,is_preview,is_published').eq('course_id',course.id).order('position',{ascending:true});
    if(e) setError('Impossible de charger les leçons : '+e.message);
    else setLessons((data??[]) as Lesson[]);
    setLoading(false);
  },[course.id]);
  useEffect(()=>{void load();},[load]);

  function edit(lesson: Lesson) {
    setEditingId(lesson.id);
    setForm({title:lesson.title,description:lesson.description,content_type:lesson.content_type,content:lesson.content??'',media_url:lesson.media_url??'',position:String(lesson.position),is_preview:lesson.is_preview,is_published:lesson.is_published});
    setError('');setNotice('');
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase)return;
    const position=Number(form.position);
    if(!Number.isSafeInteger(position)||position<1){setError('Le numéro de leçon doit être un entier supérieur ou égal à 1.');return;}
    if(form.media_url.trim() && !/^https:\/\//i.test(form.media_url.trim())){setError('L’URL du média doit commencer par https://.');return;}
    setSaving(true);setError('');setNotice('');
    const values={course_id:course.id,title:form.title.trim(),description:form.description.trim(),content_type:form.content_type,content:form.content.trim()||null,media_url:form.media_url.trim()||null,position,is_preview:form.is_preview,is_published:form.is_published,updated_at:new Date().toISOString()};
    const result=editingId
      ? await supabase.from('nexora_course_lessons').update(values).eq('id',editingId).select('id').single()
      : await supabase.from('nexora_course_lessons').insert(values).select('id').single();
    setSaving(false);
    if(result.error){setError('Enregistrement impossible : '+result.error.message+' (vérifiez que chaque leçon a un numéro unique dans cette formation).');return;}
    setNotice(editingId?'Leçon mise à jour.':'Leçon ajoutée.');
    setEditingId(null);setForm({...emptyForm,position:String(Math.max(0,...lessons.map(l=>l.position))+1)});
    await load();onChange?.();
  }
  return <div className="admin-section" style={{marginTop:18}}>
    <h3><BookOpen size={17}/> Contenu pédagogique — {course.title}</h3>
    <p className="muted">Ajoutez les leçons dans l’ordre. Une leçon d’aperçu est visible avant inscription; les autres exigent une inscription active. Les médias privés doivent être protégés côté stockage et ne pas utiliser une URL publique confidentielle.</p>
    <form className="project-form" onSubmit={save}>
      <label htmlFor="lesson-title">Titre de la leçon</label><input id="lesson-title" value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} maxLength={180} required/>
      <label htmlFor="lesson-description">Résumé (facultatif)</label><input id="lesson-description" value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} maxLength={500}/>
      <label htmlFor="lesson-type">Type de contenu</label><select id="lesson-type" value={form.content_type} onChange={e=>setForm(v=>({...v,content_type:e.target.value as LessonForm['content_type']}))}><option value="text">Texte</option><option value="video">Vidéo</option><option value="document">Document</option><option value="external">Lien externe</option></select>
      <label htmlFor="lesson-content">Contenu textuel / instructions</label><textarea id="lesson-content" rows={5} maxLength={30000} value={form.content} onChange={e=>setForm(v=>({...v,content:e.target.value}))} placeholder="Texte de la leçon, consignes ou notes…"/>
      <label htmlFor="lesson-media">URL média (facultatif, HTTPS)</label><input id="lesson-media" type="url" value={form.media_url} onChange={e=>setForm(v=>({...v,media_url:e.target.value}))} placeholder="https://…"/>
      <label htmlFor="lesson-position">Numéro d’ordre</label><input id="lesson-position" type="number" min="1" step="1" required value={form.position} onChange={e=>setForm(v=>({...v,position:e.target.value}))}/>
      <label className="checkbox-row"><input type="checkbox" checked={form.is_preview} onChange={e=>setForm(v=>({...v,is_preview:e.target.checked}))}/> Aperçu gratuit avant inscription</label>
      <label className="checkbox-row"><input type="checkbox" checked={form.is_published} onChange={e=>setForm(v=>({...v,is_published:e.target.checked}))}/> Publier cette leçon</label>
      <div className="editor-actions"><button className="primary-button" type="submit" disabled={saving}>{saving?'Enregistrement…':editingId?'Enregistrer la leçon':'Ajouter la leçon'} <Save size={15}/></button><button className="logout-button" type="button" onClick={()=>{setEditingId(null);setForm({...emptyForm,position:String(Math.max(0,...lessons.map(l=>l.position))+1)});}} disabled={saving}>Nouvelle leçon</button><button className="icon-button" type="button" onClick={()=>void load()} disabled={loading} aria-label="Actualiser les leçons"><RefreshCw size={15}/></button></div>
    </form>
    {loading?<p className="empty-state">Chargement des leçons…</p>:lessons.length===0?<p className="empty-state">Aucune leçon pour cette formation.</p>:<div className="project-list">{lessons.map(lesson=><article className="project-item" key={lesson.id}><div className="project-type-icon"><BookOpen size={17}/></div><div className="project-info"><p className="eyebrow">LEÇON {lesson.position} · {lesson.content_type.toUpperCase()}</p><h3>{lesson.title}</h3><p>{lesson.description||'Sans résumé'}</p><div className="project-meta"><span className="status-badge">{lesson.is_published?'Publiée':'Brouillon'}</span>{lesson.is_preview&&<span className="status-badge status-completed">Aperçu gratuit</span>}</div></div><button type="button" className="icon-button" onClick={()=>edit(lesson)} aria-label={'Modifier '+lesson.title} title="Modifier la leçon"><Pencil size={15}/></button></article>)}</div>}
    {error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback success" role="status">{notice}</p>}
  </div>;
}
