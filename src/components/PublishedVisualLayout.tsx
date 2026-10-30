import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isPageActionTarget, isPageDataBindingKey, loadPageDataBindings, PAGE_DATA_BINDINGS, pageActionTargetLabel, pageDataBindingLabel, type PageActionTarget, type PageDataBindingKey } from '../lib/pageDataBindings';

type Block = { id: string; type: string; title: string; content?: string; dataBinding?: PageDataBindingKey; actionTarget?: PageActionTarget; color?: string; background?: string; radius?: number; padding?: number; width?: string; hidden?: boolean; url?: string; objectFit?: 'cover' | 'contain' };
type NativeElementOverride = { tag: string; label: string; originalText?: string; text?: string; background?: string; color?: string; radius?: number; padding?: number; fontSize?: number; fontWeight?: 'normal'|'500'|'600'|'700'|'800' };
type Config = { schemaVersion: 1; theme: string; pageStyle?: { density: 'comfortable' | 'compact'; textScale: 'small' | 'normal' | 'large'; radius: number; background: string; surface: string; text: string; accent: string }; nativeStyles?: Partial<Record<'panel' | 'card' | 'form' | 'heading' | 'button', { background: string; color: string; radius: number; padding: number }>>; nativeElements?: Record<string, NativeElementOverride>; components: Block[] };
type Published = { name: string; config: Config; published_at: string };
const themes: Record<string,{background:string;surface:string;text:string;accent:string}> = {
  'nexora-dark': {background:'#0B0B0D',surface:'#202024',text:'#F5F2EA',accent:'#D6B66E'},
  'nexora-light': {background:'#F2F5FB',surface:'#FFFFFF',text:'#172039',accent:'#2457A6'},
  ocean: {background:'#071B2B',surface:'#103449',text:'#ECFEFF',accent:'#3CC9B7'},
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

function isSafeNativeElementPath(path: string): boolean {
  return path.length <= 1400 && /^body(?: > [a-z][a-z0-9-]*:nth-of-type\([1-9][0-9]*\))*$/.test(path);
}
function isNativeTextEditable(element: HTMLElement): boolean {
  return element.childElementCount === 0 && ['h1','h2','h3','h4','h5','p','span','strong','em','small','label','button','a','li'].includes(element.tagName.toLowerCase());
}

function validate(value: unknown, enforceBrandPalette: boolean): Config | null {
  if (!value || typeof value !== 'object') return null;
  const config = value as Partial<Config>;
  if (config.schemaVersion !== 1 || !Array.isArray(config.components) || config.components.length > 80) return null;
  const allowed = new Set(['heading','text','stat','action','card','divider','image','video']);
  const components = config.components.filter((item): item is Block => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string' && allowed.has((item as Block).type))).map(item => ({...item, color: enforceBrandPalette ? normalizeTextColor(item.color) : (typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : undefined), background: enforceBrandPalette ? normalizeBackgroundColor(item.background) : (typeof item.background === 'string' && /^#[0-9a-f]{6}$/i.test(item.background) ? item.background : undefined), dataBinding: isPageDataBindingKey(item.dataBinding) ? item.dataBinding : undefined, actionTarget: isPageActionTarget(item.actionTarget) ? item.actionTarget : undefined, url: typeof item.url === 'string' && (item.type === 'image' ? isAllowedImageUrl(item.url) : item.type === 'video' ? isAllowedVideoUrl(item.url) : false) ? item.url.slice(0, 2000) : undefined, objectFit: item.objectFit === 'contain' ? 'contain' as const : 'cover' as const}));
  const theme = typeof config.theme === 'string' && themes[config.theme] ? config.theme : 'nexora-dark';
  const rawStyle = config.pageStyle as Partial<NonNullable<Config['pageStyle']>> | undefined;
  const safeColor = (candidate: unknown, fallback: string) => typeof candidate === 'string' && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toUpperCase() : fallback;
  const palette = themes[theme];
  const pageStyle = { density: rawStyle?.density === 'compact' ? 'compact' as const : 'comfortable' as const, textScale: rawStyle?.textScale === 'small' || rawStyle?.textScale === 'large' ? rawStyle.textScale : 'normal' as const, radius: Number.isFinite(rawStyle?.radius) ? Math.max(4, Math.min(28, Number(rawStyle?.radius))) : 14, background: safeColor(rawStyle?.background, palette.background), surface: safeColor(rawStyle?.surface, palette.surface), text: safeColor(rawStyle?.text, palette.text), accent: safeColor(rawStyle?.accent, palette.accent) };
  const rawNative = config.nativeStyles as Partial<Record<'panel' | 'card' | 'form' | 'heading' | 'button', { background?: unknown; color?: unknown; radius?: unknown; padding?: unknown }>> | undefined;
  const nativeStyles: NonNullable<Config['nativeStyles']> = {};
  for (const target of ['panel','card','form','heading','button'] as const) { const value = rawNative?.[target]; if (value) nativeStyles[target] = { background: safeColor(value.background, palette.surface), color: safeColor(value.color, palette.text), radius: Number.isFinite(value.radius) ? Math.max(0, Math.min(32, Number(value.radius))) : 12, padding: Number.isFinite(value.padding) ? Math.max(0, Math.min(48, Number(value.padding))) : 12 }; }
  const rawElements = config.nativeElements && typeof config.nativeElements === 'object' ? config.nativeElements as Record<string, Partial<NativeElementOverride>> : {};
  const nativeElements: Record<string, NativeElementOverride> = {};
  for (const [path, value] of Object.entries(rawElements).slice(0, 120)) {
    if (!isSafeNativeElementPath(path) || !value || typeof value !== 'object') continue;
    const tag = typeof value.tag === 'string' && /^[a-z][a-z0-9-]{0,30}$/.test(value.tag) ? value.tag : 'div';
    nativeElements[path] = {
      tag,
      label: typeof value.label === 'string' ? value.label.slice(0, 100) : tag,
      originalText: typeof value.originalText === 'string' ? value.originalText.slice(0, 2000) : undefined,
      text: typeof value.text === 'string' ? value.text.slice(0, 2000) : undefined,
      background: typeof value.background === 'string' && /^#[0-9a-f]{6}$/i.test(value.background) ? value.background.toUpperCase() : undefined,
      color: typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color.toUpperCase() : undefined,
      radius: Number.isFinite(value.radius) ? Math.max(0, Math.min(32, Number(value.radius))) : undefined,
      padding: Number.isFinite(value.padding) ? Math.max(0, Math.min(48, Number(value.padding))) : undefined,
      fontSize: Number.isFinite(value.fontSize) ? Math.max(10, Math.min(48, Number(value.fontSize))) : undefined,
      fontWeight: ['normal','500','600','700','800'].includes(value.fontWeight ?? '') ? value.fontWeight as NativeElementOverride['fontWeight'] : undefined,
    };
  }
  return {schemaVersion:1,theme,pageStyle,nativeStyles,nativeElements,components};
}
export default function PublishedVisualLayout({ scope }: { scope: string }) {
  const [published,setPublished] = useState<Published|null>(null);
  const [bindingValues,setBindingValues] = useState<Record<string, number | null>>({});
  useEffect(() => {
    if (!published) return;
    const safeScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '');
    const root = document.querySelector<HTMLElement>('.workspace-main[data-active-section="' + safeScope + '"]');
    if (!root) return;
    const originals: Array<{ element: HTMLElement; style: string | null; text?: string }> = [];
    for (const [path, override] of Object.entries(published.config.nativeElements ?? {})) {
      if (!isSafeNativeElementPath(path)) continue;
      let element: HTMLElement | null = null;
      try { element = document.querySelector<HTMLElement>(path); } catch { element = null; }
      if (!element || !root.contains(element)) continue;
      originals.push({ element, style: element.getAttribute('style'), text: isNativeTextEditable(element) ? element.textContent ?? '' : undefined });
      if (override.background) element.style.setProperty('background', override.background, 'important');
      if (override.color) element.style.setProperty('color', override.color, 'important');
      if (Number.isFinite(override.radius)) element.style.setProperty('border-radius', Number(override.radius) + 'px', 'important');
      if (Number.isFinite(override.padding)) element.style.setProperty('padding', Number(override.padding) + 'px', 'important');
      if (Number.isFinite(override.fontSize)) element.style.setProperty('font-size', Number(override.fontSize) + 'px', 'important');
      if (override.fontWeight) element.style.setProperty('font-weight', override.fontWeight, 'important');
      if (override.text !== undefined && isNativeTextEditable(element)) element.textContent = override.text;
    }
    return () => {
      originals.forEach(({ element, style, text }) => {
        if (style === null) element.removeAttribute('style');
        else element.setAttribute('style', style);
        if (text !== undefined) element.textContent = text;
      });
    };
  }, [published, scope]);

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
  const safeScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '');
  const styleConfig = published.config.pageStyle ?? { density: 'comfortable', textScale: 'normal', radius: 14, background: palette.background, surface: palette.surface, text: palette.text, accent: palette.accent };
  const pageStyle = `.workspace-main[data-active-section="${safeScope}"]{--nexora-page-bg:${styleConfig.background};--nexora-page-surface:${styleConfig.surface};--nexora-page-text:${styleConfig.text};--nexora-page-accent:${styleConfig.accent};--nexora-page-radius:${styleConfig.radius}px;--nexora-page-font:${styleConfig.textScale==='small'?'0.92':styleConfig.textScale==='large'?'1.08':'1'};--nexora-page-density:${styleConfig.density==='compact'?'8':'14'}px;background:var(--nexora-page-bg);color:var(--nexora-page-text);}
.workspace-main[data-active-section="${safeScope}"] .project-panel{background:var(--nexora-page-surface)!important;color:var(--nexora-page-text)!important;border-color:color-mix(in srgb,var(--nexora-page-accent) 24%,transparent)!important;border-radius:var(--nexora-page-radius)!important;font-size:var(--nexora-page-font)}
.workspace-main[data-active-section="${safeScope}"] .project-panel h2,.workspace-main[data-active-section="${safeScope}"] .project-panel h3,.workspace-main[data-active-section="${safeScope}"] .project-panel h4{color:var(--nexora-page-text)}
.workspace-main[data-active-section="${safeScope}"] .project-item,.workspace-main[data-active-section="${safeScope}"] .timeline-event-card,.workspace-main[data-active-section="${safeScope}"] .insight-item{background:var(--nexora-page-bg);border-color:color-mix(in srgb,var(--nexora-page-accent) 20%,transparent);border-radius:var(--nexora-page-radius);padding:var(--nexora-page-density)}
.workspace-main[data-active-section="${safeScope}"] input,.workspace-main[data-active-section="${safeScope}"] select,.workspace-main[data-active-section="${safeScope}"] textarea{border-color:color-mix(in srgb,var(--nexora-page-accent) 42%,transparent)}
.workspace-main[data-active-section="${safeScope}"] .primary-button{background:var(--nexora-page-accent);border-color:var(--nexora-page-accent);color:${published.config.theme==='nexora-light'?'#FFFFFF':published.config.theme==='ocean'?'#071B2B':'#0B0B0D'}}
.workspace-main[data-active-section="${safeScope}"] .eyebrow{color:var(--nexora-page-accent)}`;
  const nativeSelectors: Record<'panel' | 'card' | 'form' | 'heading' | 'button', string> = { panel: '.project-panel', card: '.project-item', form: '.project-form', heading: '.section-heading', button: '.primary-button' };
  const nativeRules = Object.entries(published.config.nativeStyles ?? {}).map(([target, override]) => { const value = override!; return `.workspace-main[data-active-section="${safeScope}"] ${nativeSelectors[target as keyof typeof nativeSelectors]}{background:${value.background}!important;color:${value.color}!important;border-radius:${value.radius}px!important;padding:${value.padding}px!important}`; }).join('');
  const completePageStyle = pageStyle + nativeRules;
  return <><style>{completePageStyle}</style>{!blocks.length ? null : <section className="project-panel published-visual-layout" aria-label={published.name} style={{background:palette.background,color:palette.text}}>
    <div className="section-heading"><div><p className="eyebrow">DISPOSITION PUBLIÉE</p><h2>{published.name}</h2><p className="muted">Configuration visuelle validée par l’administration.</p></div></div>
    <div className="published-visual-grid">{blocks.map(block=><article key={block.id} className={`published-visual-block width-${['full','half','third'].includes(block.width??'')?block.width:'full'}`} style={{background:block.background??palette.surface,color:block.color??palette.text,borderRadius:Math.max(0,Math.min(32,block.radius??12)),padding:Math.max(0,Math.min(48,block.padding??16))}}>
      {block.type==='heading'?<h3>{block.title}</h3>:block.type==='divider'?<div className="published-visual-divider"/>:block.type==='image'?<><strong>{block.title}</strong>{block.url&&<img src={block.url} alt={block.content||block.title} loading="lazy" style={{width:'100%',maxHeight:420,objectFit:block.objectFit??'cover',borderRadius:8,marginTop:8}}/>}{block.content&&<p>{block.content}</p>}</>:block.type==='video'?<><strong>{block.title}</strong>{block.url&&<iframe src={block.url} title={block.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; picture-in-picture" style={{width:'100%',aspectRatio:'16/9',border:0,borderRadius:8,marginTop:8}}/>}{block.content&&<p>{block.content}</p>}</>:<><strong>{block.title}</strong>{(block.type==='stat'||block.type==='card'||block.type==='text')&&block.dataBinding?<div className="published-visual-data"><strong>{bindingValues[block.dataBinding] == null?'N/D':bindingValues[block.dataBinding]!.toLocaleString('fr-FR')}</strong><small>{pageDataBindingLabel(block.dataBinding)} · {PAGE_DATA_BINDINGS[block.dataBinding].source}</small></div>:block.content&&<p>{block.content}</p>}{block.type==='stat'&&!block.dataBinding&&<small>Source non reliée. Choisissez-la dans le Studio de conception.</small>}{block.type==='action'&&<button type="button" className="published-visual-action" onClick={()=>{const target=block.actionTarget??'projects';window.location.href='/app?section='+encodeURIComponent(target);}}>{block.content||block.title||'Ouvrir le module'} <small>{pageActionTargetLabel(block.actionTarget??'projects')}</small></button>}</>}
    </article>)}</div>
    <style>{`.published-visual-layout{margin:24px 0}.published-visual-grid{display:flex;flex-wrap:wrap;align-items:stretch;gap:12px}.published-visual-block{min-width:0;overflow-wrap:anywhere;border:1px solid ${scope === 'dashboard' ? '#ffffff18' : 'rgba(214,182,110,.24)'}}.published-visual-block.width-full{width:100%}.published-visual-block.width-half{width:calc(50% - 6px)}.published-visual-block.width-third{width:calc(33.333% - 8px)}.published-visual-block h3{margin:0;font-size:clamp(16px,2vw,24px)}.published-visual-block p{font-size:13px;line-height:1.7;margin:8px 0 0}.published-visual-block small{display:block;margin-top:8px;opacity:.7;font-size:11px}.published-visual-divider{height:1px;background:currentColor;opacity:.3}.published-visual-data{display:flex;flex-direction:column;gap:5px;margin-top:8px}.published-visual-data>strong{font-size:clamp(24px,3vw,34px);letter-spacing:-.04em}.published-visual-data>small{opacity:.75;font-size:11px}.published-visual-action{display:flex;flex-direction:column;align-items:flex-start;gap:5px;margin-top:10px;padding:11px 14px;border:1px solid ${scope === 'dashboard' ? '#8b9bff66' : 'rgba(214,182,110,.7)'};border-radius:10px;background:${scope === 'dashboard' ? 'linear-gradient(135deg,#6775e9,#6352bd)' : 'linear-gradient(135deg,#D6B66E,#B89449)'};color:${scope === 'dashboard' ? '#fff' : '#0B0B0D'};font:inherit;font-weight:750;cursor:pointer;max-width:100%;overflow-wrap:anywhere}.published-visual-action:hover{filter:brightness(1.08)}.published-visual-action:focus-visible{outline:2px solid currentColor;outline-offset:3px}.published-visual-action small{font-weight:500;opacity:.8}@media(max-width:680px){.published-visual-block.width-half,.published-visual-block.width-third{width:100%}}`}</style>
  </section>}</>;
}
