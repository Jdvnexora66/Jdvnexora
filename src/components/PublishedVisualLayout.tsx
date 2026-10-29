import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isPageActionTarget, isPageDataBindingKey, loadPageDataBindings, PAGE_DATA_BINDINGS, pageActionTargetLabel, pageDataBindingLabel, type PageActionTarget, type PageDataBindingKey } from '../lib/pageDataBindings';

type Block = { id: string; type: string; title: string; content?: string; dataBinding?: PageDataBindingKey; actionTarget?: PageActionTarget; color?: string; background?: string; radius?: number; padding?: number; width?: string; hidden?: boolean; url?: string; objectFit?: 'cover' | 'contain' };
type Config = { schemaVersion: 1; theme: string; components: Block[] };
type Published = { name: string; config: Config; published_at: string };
const themes: Record<string,{background:string;surface:string;text:string}> = {
  // Legacy palettes remain for the approved reference dashboard only.
  'nexora-dark': {background:'#0b1120',surface:'#141e34',text:'#f4f6ff'},
  'nexora-light': {background:'#f2f5fb',surface:'#ffffff',text:'#172039'},
  ocean: {background:'#071b2b',surface:'#103449',text:'#ecfeff'},
};
function normalizeTextColor(value: unknown): string {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return ['#F5F2EA','#C9C1B2','#D6B66E'].includes(normalized) ? normalized : '#F5F2EA';
}
function normalizeBackgroundColor(value: unknown): string {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return ['#0B0B0D','#202024'].includes(normalized) ? normalized : '#202024';
}
function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isAllowedVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (((url.hostname === 'youtube-nocookie.com' || url.hostname === 'www.youtube-nocookie.com') && url.pathname.startsWith('/embed/')) ||
       (url.hostname === 'player.vimeo.com' && url.pathname.startsWith('/video/')));
  } catch {
    return false;
  }
}

function validate(value: unknown, enforceBrandPalette: boolean): Config | null {
  if (!value || typeof value !== 'object') return null;
  const config = value as Partial<Config>;
  if (config.schemaVersion !== 1 || !Array.isArray(config.components) || config.components.length > 80) return null;
  const allowed = new Set(['heading','text','stat','action','card','divider','image','video']);
  const components = config.components.filter((item): item is Block => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string' && allowed.has((item as Block).type))).map(item => ({...item, color: enforceBrandPalette ? normalizeTextColor(item.color) : (typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : undefined), background: enforceBrandPalette ? normalizeBackgroundColor(item.background) : (typeof item.background === 'string' && /^#[0-9a-f]{6}$/i.test(item.background) ? item.background : undefined), dataBinding: isPageDataBindingKey(item.dataBinding) ? item.dataBinding : undefined, actionTarget: isPageActionTarget(item.actionTarget) ? item.actionTarget : undefined, url: typeof item.url === 'string' && (item.type === 'image' ? isAllowedImageUrl(item.url) : item.type === 'video' ? isAllowedVideoUrl(item.url) : false) ? item.url.slice(0, 2000) : undefined, objectFit: item.objectFit === 'contain' ? 'contain' as const : 'cover' as const}));
  const theme = enforceBrandPalette ? 'nexora-dark' : (typeof config.theme === 'string' && themes[config.theme] ? config.theme : 'nexora-dark');
  return {schemaVersion:1,theme,components};
}
export default function PublishedVisualLayout({ scope }: { scope: string }) {
  const [published,setPublished] = useState<Published|null>(null);
  const [bindingValues,setBindingValues] = useState<Record<string, number | null>>({});
  useEffect(() => {
    let active = true;
    setPublished(null);
    setBindingValues({});
    if (!supabase) return;
    supabase.from('visual_studio_publications').select('name,config,published_at').eq('is_default',true).eq('scope', scope).limit(1).maybeSingle().then(({data,error}) => {
      if (!active || error || !data) return;
      const config = validate(data.config, scope !== 'dashboard');
      if (!config) return;
      setPublished({name:data.name,config,published_at:data.published_at});
      const keys = config.components.flatMap(block => block.dataBinding ? [block.dataBinding] : []);
      void loadPageDataBindings(keys).then(values => { if (active) setBindingValues(values); });
    });
    return () => { active = false; };
  },[scope]);
  if (!published) return null;
  const palette = themes[published.config.theme] ?? themes['nexora-dark'];
  const blocks = published.config.components.filter(block=>!block.hidden);
  if (!blocks.length) return null;
  return <section className="project-panel published-visual-layout" aria-label={published.name} style={{background:palette.background,color:palette.text}}>
    <div className="section-heading"><div><p className="eyebrow">DISPOSITION PUBLIÉE</p><h2>{published.name}</h2><p className="muted">Configuration visuelle validée par l’administration.</p></div></div>
    <div className="published-visual-grid">{blocks.map(block=><article key={block.id} className={`published-visual-block width-${['full','half','third'].includes(block.width??'')?block.width:'full'}`} style={{background:block.background??palette.surface,color:block.color??palette.text,borderRadius:Math.max(0,Math.min(32,block.radius??12)),padding:Math.max(0,Math.min(48,block.padding??16))}}>
      {block.type==='heading'?<h3>{block.title}</h3>:block.type==='divider'?<div className="published-visual-divider"/>:block.type==='image'?<><strong>{block.title}</strong>{block.url&&<img src={block.url} alt={block.content||block.title} loading="lazy" style={{width:'100%',maxHeight:420,objectFit:block.objectFit??'cover',borderRadius:8,marginTop:8}}/>}{block.content&&<p>{block.content}</p>}</>:block.type==='video'?<><strong>{block.title}</strong>{block.url&&<iframe src={block.url} title={block.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; picture-in-picture" style={{width:'100%',aspectRatio:'16/9',border:0,borderRadius:8,marginTop:8}}/>}{block.content&&<p>{block.content}</p>}</>:<><strong>{block.title}</strong>{(block.type==='stat'||block.type==='card'||block.type==='text')&&block.dataBinding?<div className="published-visual-data"><strong>{bindingValues[block.dataBinding] == null?'N/D':bindingValues[block.dataBinding]!.toLocaleString('fr-FR')}</strong><small>{pageDataBindingLabel(block.dataBinding)} · {PAGE_DATA_BINDINGS[block.dataBinding].source}</small></div>:block.content&&<p>{block.content}</p>}{block.type==='stat'&&!block.dataBinding&&<small>Source non reliée. Choisissez-la dans le Studio de conception.</small>}{block.type==='action'&&<button type="button" className="published-visual-action" onClick={()=>{const target=block.actionTarget??'projects';window.location.href='/?section='+encodeURIComponent(target);}}>{block.content||block.title||'Ouvrir le module'} <small>{pageActionTargetLabel(block.actionTarget??'projects')}</small></button>}</>}
    </article>)}</div>
    <style>{`.published-visual-layout{margin:24px 0}.published-visual-grid{display:flex;flex-wrap:wrap;align-items:stretch;gap:12px}.published-visual-block{min-width:0;overflow-wrap:anywhere;border:1px solid ${scope === 'dashboard' ? '#ffffff18' : 'rgba(214,182,110,.24)'}}.published-visual-block.width-full{width:100%}.published-visual-block.width-half{width:calc(50% - 6px)}.published-visual-block.width-third{width:calc(33.333% - 8px)}.published-visual-block h3{margin:0;font-size:clamp(16px,2vw,24px)}.published-visual-block p{font-size:13px;line-height:1.7;margin:8px 0 0}.published-visual-block small{display:block;margin-top:8px;opacity:.7;font-size:11px}.published-visual-divider{height:1px;background:currentColor;opacity:.3}.published-visual-data{display:flex;flex-direction:column;gap:5px;margin-top:8px}.published-visual-data>strong{font-size:clamp(24px,3vw,34px);letter-spacing:-.04em}.published-visual-data>small{opacity:.75;font-size:11px}.published-visual-action{display:flex;flex-direction:column;align-items:flex-start;gap:5px;margin-top:10px;padding:11px 14px;border:1px solid ${scope === 'dashboard' ? '#8b9bff66' : 'rgba(214,182,110,.7)'};border-radius:10px;background:${scope === 'dashboard' ? 'linear-gradient(135deg,#6775e9,#6352bd)' : 'linear-gradient(135deg,#D6B66E,#B89449)'};color:${scope === 'dashboard' ? '#fff' : '#0B0B0D'};font:inherit;font-weight:750;cursor:pointer;max-width:100%;overflow-wrap:anywhere}.published-visual-action:hover{filter:brightness(1.08)}.published-visual-action:focus-visible{outline:2px solid currentColor;outline-offset:3px}.published-visual-action small{font-weight:500;opacity:.8}@media(max-width:680px){.published-visual-block.width-half,.published-visual-block.width-third{width:100%}}`}</style>
  </section>;
}
