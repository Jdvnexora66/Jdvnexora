import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Clock3, Copy, Eye, EyeOff, LayoutDashboard, Palette, Plus, Save, ShieldCheck, Smartphone, Tablet, Trash2, Undo2, Monitor, Rocket, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';
import { isPageActionTarget, isPageDataBindingKey, loadPageDataBindings, PAGE_ACTION_TARGETS, PAGE_DATA_BINDINGS, pageActionTargetLabel, pageDataBindingLabel, type PageActionTarget, type PageDataBindingKey } from '../lib/pageDataBindings';

type StudioBlock = {
  id: string;
  type: 'heading' | 'text' | 'stat' | 'action' | 'card' | 'divider' | 'image' | 'video';
  title: string;
  content?: string;
  url?: string;
  objectFit?: 'cover' | 'contain';
  color?: string;
  background?: string;
  radius?: number;
  padding?: number;
  width?: 'full' | 'half' | 'third';
  hidden?: boolean;
  dataBinding?: PageDataBindingKey;
  actionTarget?: PageActionTarget;
};
type PageStyle = { density: 'comfortable' | 'compact'; textScale: 'small' | 'normal' | 'large'; radius: number; background: string; surface: string; text: string; accent: string };
type NativeTarget = 'panel' | 'card' | 'form' | 'heading' | 'button';
type NativeOverride = { background: string; color: string; radius: number; padding: number };
type StudioConfig = { schemaVersion: 1; theme: 'nexora-dark' | 'nexora-light' | 'ocean'; pageStyle?: PageStyle; nativeStyles?: Partial<Record<NativeTarget, NativeOverride>>; components: StudioBlock[] };
type PageScope = string;
type LayoutRow = { id: string; name: string; scope: PageScope; draft_config: StudioConfig; published_config: StudioConfig | null; version: number; is_default: boolean; updated_at: string; published_at: string | null };
type VersionRow = { id: string; layout_id: string; version: number; snapshot: StudioConfig; action: string; created_at: string };

const presets: Array<{ type: StudioBlock['type']; title: string; content?: string; url?: string; dataBinding?: PageDataBindingKey; actionTarget?: PageActionTarget }> = [
  { type: 'heading', title: 'Titre de section', content: 'Un espace pour vos idées' },
  { type: 'text', title: 'Bloc de texte', content: 'Présentez une information utile à vos utilisateurs.' },
  { type: 'stat', title: 'Carte statistique', content: 'Valeur calculée depuis une source autorisée.', dataBinding: 'projects.total' },
  { type: 'card', title: 'Carte de contenu', content: 'Une carte réutilisable pour organiser les contenus.' },
  { type: 'action', title: 'Action rapide', content: 'Ouvrir mes projets', actionTarget: 'projects' },
  { type: 'divider', title: 'Séparateur' },
  { type: 'image', title: 'Image', content: 'Description de l’image' },
  { type: 'video', title: 'Vidéo', content: 'Vidéo intégrée', url: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4' },
];
const starter: StudioConfig = { schemaVersion: 1, theme: 'nexora-dark', pageStyle: { density: 'comfortable', textScale: 'normal', radius: 14, background: '#0B0B0D', surface: '#202024', text: '#F5F2EA', accent: '#D6B66E' }, nativeStyles: {}, components: [
  { id: 'welcome-title', type: 'heading', title: 'Bienvenue dans votre espace', content: 'Configurez votre tableau de bord NEXORA', color: '#F5F2EA', width: 'full', padding: 16 },
  { id: 'welcome-text', type: 'text', title: 'Votre espace de travail', content: 'Ajoutez des blocs, personnalisez leur apparence et enregistrez votre brouillon.', color: '#C9C1B2', width: 'full', padding: 12 },
  { id: 'welcome-card', type: 'card', title: 'Vos projets', content: 'Nombre de projets enregistrés dans votre compte.', dataBinding: 'projects.total', background: '#202024', color: '#F5F2EA', radius: 16, padding: 20, width: 'half' },
] };
const themes: Record<StudioConfig['theme'], { background: string; surface: string; accent: string; text: string }> = {
  'nexora-dark': { background: '#0B0B0D', surface: '#202024', accent: '#D6B66E', text: '#F5F2EA' },
  'nexora-light': { background: '#F2F5FB', surface: '#FFFFFF', accent: '#2457A6', text: '#172039' },
  ocean: { background: '#071B2B', surface: '#103449', accent: '#3CC9B7', text: '#ECFEFF' },
};
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

const normalizeTextColor = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return ['#F5F2EA', '#C9C1B2', '#D6B66E'].includes(normalized) ? normalized : '#F5F2EA';
};
const normalizeBackgroundColor = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return ['#0B0B0D', '#202024'].includes(normalized) ? normalized : '#202024';
};

const safeConfig = (value: unknown): StudioConfig => {
  if (!value || typeof value !== 'object') return starter;
  const input = value as Partial<StudioConfig>;
  if (input.schemaVersion !== 1 || !Array.isArray(input.components) || input.components.length > 80) return starter;
  const allowed = new Set(['heading','text','stat','action','card','divider','image','video']);
  const components = input.components.filter((x): x is StudioBlock => Boolean(x && typeof x === 'object' && typeof x.id === 'string' && typeof x.title === 'string' && allowed.has((x as StudioBlock).type))).map(x => ({
    id: x.id.slice(0, 80), type: x.type, title: x.title.slice(0, 120), content: typeof x.content === 'string' ? x.content.slice(0, 1000) : '',
    url: typeof x.url === 'string' && (x.type === 'image' ? isAllowedImageUrl(x.url) : x.type === 'video' ? isAllowedVideoUrl(x.url) : false) ? x.url.slice(0, 2000) : undefined, objectFit: (x.objectFit === 'contain' ? 'contain' : 'cover') as StudioBlock['objectFit'],
    color: normalizeTextColor(x.color),
    background: normalizeBackgroundColor(x.background),
    radius: Number.isFinite(x.radius) ? Math.max(0, Math.min(32, x.radius!)) : 12,
    padding: Number.isFinite(x.padding) ? Math.max(0, Math.min(48, x.padding!)) : 16,
    width: ['full','half','third'].includes(x.width ?? '') ? x.width : 'full', hidden: Boolean(x.hidden), dataBinding: isPageDataBindingKey(x.dataBinding) ? x.dataBinding : undefined, actionTarget: isPageActionTarget(x.actionTarget) ? x.actionTarget : undefined,
  }));
  const theme = input.theme === 'nexora-light' || input.theme === 'ocean' ? input.theme : 'nexora-dark';
  const rawStyle = input.pageStyle as Partial<PageStyle> | undefined;
  const palette = themes[theme];
  const safeColor = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
  const pageStyle: PageStyle = { density: rawStyle?.density === 'compact' ? 'compact' : 'comfortable', textScale: rawStyle?.textScale === 'small' || rawStyle?.textScale === 'large' ? rawStyle.textScale : 'normal', radius: Number.isFinite(rawStyle?.radius) ? Math.max(4, Math.min(28, Number(rawStyle?.radius))) : 14, background: safeColor(rawStyle?.background, palette.background), surface: safeColor(rawStyle?.surface, palette.surface), text: safeColor(rawStyle?.text, palette.text), accent: safeColor(rawStyle?.accent, palette.accent) };
  const rawNative = input.nativeStyles as Partial<Record<NativeTarget, Partial<NativeOverride>>> | undefined;
  const nativeStyles: Partial<Record<NativeTarget, NativeOverride>> = {};
  for (const target of ['panel','card','form','heading','button'] as NativeTarget[]) {
    const value = rawNative?.[target];
    if (value) nativeStyles[target] = { background: safeColor(value.background, palette.surface), color: safeColor(value.color, palette.text), radius: Number.isFinite(value.radius) ? Math.max(0, Math.min(32, Number(value.radius))) : 12, padding: Number.isFinite(value.padding) ? Math.max(0, Math.min(48, Number(value.padding))) : 12 };
  }
  return { schemaVersion: 1, theme, pageStyle, nativeStyles, components };
};

export default function VisualDesignStudio({ userId, role }: { userId: string; role: string }) {
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [name, setName] = useState('Studio IA');
  const [scope, setScope] = useState<PageScope>('studio');
  const [config, setConfig] = useState<StudioConfig>(starter);
  const [savedConfig, setSavedConfig] = useState<StudioConfig>(starter);
  const [preview, setPreview] = useState<'desktop'|'tablet'|'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState<'real'|'draft'>('real');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<StudioConfig[]>([]);
  const [, setFuture] = useState<StudioConfig[]>([]);
  const [bindingValues, setBindingValues] = useState<Record<string, number | null>>({});
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNativeTarget, setSelectedNativeTarget] = useState<NativeTarget | null>(null);
  const selectionModeRef = useRef(false);
  const isAdmin = role === 'admin';
  const selectedBlock = config.components.find(block => block.id === selectedBlockId) ?? null;
  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(savedConfig), [config, savedConfig]);
  const theme = themes[config.theme];
  const applyDraftPreview = useCallback(() => {
    if (previewMode !== 'real') return;
    const previewDocument = previewFrameRef.current?.contentDocument;
    if (!previewDocument?.body) return;
    const safeScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '');
    const styleConfig = config.pageStyle ?? { density: 'comfortable', textScale: 'normal', radius: 14, background: theme.background, surface: theme.surface, text: theme.text, accent: theme.accent };
    let style = previewDocument.getElementById('nexora-studio-draft-preview') as HTMLStyleElement | null;
    if (!style) { style = previewDocument.createElement('style'); style.id = 'nexora-studio-draft-preview'; previewDocument.body.appendChild(style); }
    style.textContent = '.workspace-main[data-active-section="' + safeScope + '"]{--nexora-page-bg:' + styleConfig.background + ' !important;--nexora-page-surface:' + styleConfig.surface + ' !important;--nexora-page-text:' + styleConfig.text + ' !important;--nexora-page-accent:' + styleConfig.accent + ' !important;--nexora-page-radius:' + styleConfig.radius + 'px !important;--nexora-page-font:' + (styleConfig.textScale === 'small' ? '0.92' : styleConfig.textScale === 'large' ? '1.08' : '1') + ' !important;--nexora-page-density:' + (styleConfig.density === 'compact' ? '8' : '14') + 'px !important;background:' + styleConfig.background + ' !important;color:' + styleConfig.text + ' !important}' +
      '.workspace-main[data-active-section="' + safeScope + '"] .project-panel{background:var(--nexora-page-surface)!important;color:var(--nexora-page-text)!important;border-color:color-mix(in srgb,var(--nexora-page-accent) 24%,transparent)!important;border-radius:var(--nexora-page-radius)!important;font-size:var(--nexora-page-font)}' +
      '.workspace-main[data-active-section="' + safeScope + '"] .project-item,.workspace-main[data-active-section="' + safeScope + '"] .timeline-event-card,.workspace-main[data-active-section="' + safeScope + '"] .insight-item{background:var(--nexora-page-bg)!important;border-color:color-mix(in srgb,var(--nexora-page-accent) 20%,transparent)!important;border-radius:var(--nexora-page-radius)!important;padding:var(--nexora-page-density)}' +
      '.workspace-main[data-active-section="' + safeScope + '"] .eyebrow{color:var(--nexora-page-accent)!important}' +
      'body[data-nexora-design-selection="true"] .project-panel,body[data-nexora-design-selection="true"] .project-item,body[data-nexora-design-selection="true"] .project-form,body[data-nexora-design-selection="true"] .section-heading,body[data-nexora-design-selection="true"] .primary-button{cursor:crosshair!important}body[data-nexora-design-selection="true"] .project-panel:hover,body[data-nexora-design-selection="true"] .project-item:hover,body[data-nexora-design-selection="true"] .project-form:hover,body[data-nexora-design-selection="true"] .section-heading:hover,body[data-nexora-design-selection="true"] .primary-button:hover{outline:2px dashed var(--nexora-page-accent)!important;outline-offset:2px}';
    const selectors: Record<NativeTarget, string> = { panel: '.project-panel', card: '.project-item', form: '.project-form', heading: '.section-heading', button: '.primary-button' };
    const nativeRules = Object.entries(config.nativeStyles ?? {}).map(([target, override]) => { const style = override as NativeOverride; return '.workspace-main[data-active-section="' + safeScope + '"] ' + selectors[target as NativeTarget] + '{background:' + style.background + '!important;color:' + style.color + '!important;border-radius:' + style.radius + 'px!important;padding:' + style.padding + 'px!important}'; }).join('');
    style.textContent += nativeRules;
    if (!previewDocument.body.dataset.nexoraNativePickerBound) {
      previewDocument.body.addEventListener('click', event => {
        if (!selectionModeRef.current) return;
        const clicked = event.target as HTMLElement | null;
        if (!clicked) return;
        const candidates: Array<[NativeTarget, string]> = [['button','.primary-button'],['form','.project-form'],['card','.project-item'],['heading','.section-heading'],['panel','.project-panel']];
        for (const [target, selector] of candidates) {
          if (clicked.closest(selector)) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); setSelectedBlockId(''); setSelectedNativeTarget(target); return; }
        }
      }, true);
      previewDocument.body.dataset.nexoraNativePickerBound = 'true';
    }
    previewDocument.body.dataset.nexoraDesignSelection = selectionModeRef.current ? 'true' : 'false';
  }, [config, previewMode, scope, theme]);
  useEffect(() => { if (previewMode === 'real') applyDraftPreview(); }, [applyDraftPreview, previewMode]);
  useEffect(() => {
    selectionModeRef.current = selectionMode;
    const body = previewFrameRef.current?.contentDocument?.body;
    if (body) body.dataset.nexoraDesignSelection = selectionMode ? 'true' : 'false';
  }, [selectionMode, previewMode, scope]);
  const bindingKey = useMemo(() => [...new Set(config.components.map(block => block.dataBinding).filter((value): value is PageDataBindingKey => Boolean(value)))].sort().join('|'), [config.components]);

  const loadLayouts = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setBusy(true); setError('');
    const { data, error: loadError } = await supabase.from('visual_studio_layouts').select('id,name,scope,draft_config,published_config,version,is_default,updated_at,published_at').order('updated_at', { ascending: false });
    if (loadError) setError('Chargement des dispositions impossible : ' + loadError.message);
    else {
      const rows = ((data ?? []) as LayoutRow[]).filter(row => row.scope !== 'dashboard');
      setLayouts(rows);
      if (rows.length && !selectedId) {
        const row = rows[0]; setSelectedId(row.id); setName(row.name); setScope((row.scope || 'dashboard') as PageScope);
        const safe = safeConfig(row.draft_config); setConfig(safe); setSavedConfig(safe);
      }
    }
    setBusy(false);
  }, [isAdmin, selectedId]);

  const loadVersions = useCallback(async (layoutId: string) => {
    if (!supabase || !layoutId || !isAdmin) return;
    const { data, error: versionsError } = await supabase.from('visual_studio_versions').select('id,layout_id,version,snapshot,action,created_at').eq('layout_id', layoutId).order('created_at', { ascending: false }).limit(30);
    if (versionsError) setError('Historique indisponible : ' + versionsError.message);
    else setVersions((data ?? []) as VersionRow[]);
  }, [isAdmin]);

  useEffect(() => { void loadLayouts(); }, [loadLayouts]);
  useEffect(() => { if (selectedId) void loadVersions(selectedId); }, [selectedId, loadVersions]);
  useEffect(() => {
    let active = true;
    const keys = bindingKey ? bindingKey.split('|') : [];
    if (!keys.length) { setBindingValues({}); return () => { active = false; }; }
    void loadPageDataBindings(keys).then(values => { if (active) setBindingValues(values); });
    return () => { active = false; };
  }, [bindingKey]);

  function selectLayout(row: LayoutRow) {
    if (dirty && !window.confirm('Abandonner les modifications non enregistrées ?')) return;
    const next = safeConfig(row.draft_config);
    setSelectedId(row.id); setName(row.name); setScope((row.scope || 'dashboard') as PageScope); setConfig(next); setSavedConfig(next); setSelectedBlockId(''); setHistory([]); setFuture([]);
  }
  function changeConfig(next: StudioConfig) { setHistory(items => [...items.slice(-29), config]); setFuture([]); setConfig(safeConfig(next)); }
  function changeBlock(patch: Partial<StudioBlock>) {
    if (!selectedBlock) return;
    changeConfig({ ...config, components: config.components.map(block => block.id === selectedBlock.id ? { ...block, ...patch } : block) });
  }
  function changeNativeStyle(patch: Partial<NativeOverride>) {
    if (!selectedNativeTarget) return;
    const current = config.nativeStyles?.[selectedNativeTarget] ?? { background: theme.surface, color: theme.text, radius: 12, padding: 12 };
    changeConfig({ ...config, nativeStyles: { ...config.nativeStyles, [selectedNativeTarget]: { ...current, ...patch } } });
  }
  function resetNativeStyle() {
    if (!selectedNativeTarget) return;
    const nativeStyles = { ...config.nativeStyles };
    delete nativeStyles[selectedNativeTarget];
    changeConfig({ ...config, nativeStyles });
  }
  function addBlock(type: StudioBlock['type']) {
    if (config.components.length >= 80) { setError('Limite de 80 composants atteinte.'); return; }
    const preset = presets.find(item => item.type === type)!;
    const id = `block-${Date.now().toString(36)}`;
    changeConfig({ ...config, components: [...config.components, { id, type, title: preset.title, content: preset.content ?? '', url: preset.url, dataBinding: preset.dataBinding, actionTarget: preset.actionTarget, color: theme.text, background: theme.surface, radius: 12, padding: 16, width: 'full' }] });
    setSelectedBlockId(id);
  }
  function moveBlock(from: string, to: string) {
    if (from === to) return;
    const list = [...config.components]; const fromIndex = list.findIndex(item => item.id === from); const toIndex = list.findIndex(item => item.id === to);
    if (fromIndex < 0 || toIndex < 0) return;
    const [item] = list.splice(fromIndex, 1); list.splice(toIndex, 0, item); changeConfig({ ...config, components: list });
  }
  async function createLayout() {
    if (!supabase || !isAdmin) return;
    setBusy(true); setError(''); setNotice('');
    const targetScope = scope === 'custom' ? `custom:${crypto.randomUUID()}` : scope;
    const payload = { name: name.trim() || 'Nouvelle disposition', scope: targetScope, draft_config: config, created_by: userId, updated_by: userId };
    const { data, error: insertError } = await supabase.from('visual_studio_layouts').insert(payload).select('id,name,scope,draft_config,published_config,version,is_default,updated_at,published_at').single();
    if (insertError) { setError('Création impossible : ' + insertError.message); setBusy(false); return; }
    const row = data as LayoutRow; setLayouts(items => [row, ...items]); setSelectedId(row.id); setName(row.name); setScope((row.scope || 'dashboard') as PageScope); setSavedConfig(safeConfig(row.draft_config)); setConfig(safeConfig(row.draft_config)); setSelectedBlockId(''); setNotice('Disposition créée. Enregistrez le brouillon pour conserver vos prochaines modifications.'); setBusy(false);
  }
  async function saveDraft() {
    if (!supabase || !isAdmin || !selectedId) { setError('Créez ou sélectionnez une disposition avant de sauvegarder.'); return; }
    const nextVersion = (layouts.find(row => row.id === selectedId)?.version ?? 0) + 1;
    setBusy(true); setError(''); setNotice('');
    const { data, error: saveError } = await supabase.from('visual_studio_layouts').update({ name: name.trim() || 'Disposition sans nom', draft_config: config, version: nextVersion, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', selectedId).select('id,name,scope,draft_config,published_config,version,is_default,updated_at,published_at').single();
    if (saveError) { setError('Sauvegarde refusée : ' + saveError.message); setBusy(false); return; }
    const row = data as LayoutRow;
    const { error: historyError } = await supabase.from('visual_studio_versions').insert({ layout_id: selectedId, version: nextVersion, snapshot: config, action: 'draft_saved', actor_id: userId });
    if (historyError) { setError('Brouillon sauvegardé, mais l’historique n’a pas pu être écrit : ' + historyError.message); }
    setLayouts(items => items.map(item => item.id === row.id ? row : item)); setSavedConfig(safeConfig(row.draft_config)); setNotice(historyError ? '' : 'Brouillon enregistré dans Supabase.'); await loadVersions(selectedId); setBusy(false);
  }
  async function publish() {
    if (!supabase || !isAdmin || !selectedId) return;
    if (dirty && !window.confirm('Le brouillon contient des modifications non enregistrées. Publier quand même cette version ?')) return;
    if (dirty) { setError('Enregistrez d’abord le brouillon, puis publiez-le.'); return; }
    const current = layouts.find(row => row.id === selectedId); if (!current) return;
    const nextVersion = current.version + 1;
    setBusy(true); setError(''); setNotice('');
    const { data, error: publishError } = await supabase.from('visual_studio_layouts').update({ published_config: config, version: nextVersion, updated_by: userId, updated_at: new Date().toISOString(), published_at: new Date().toISOString() }).eq('id', selectedId).select('id,name,scope,draft_config,published_config,version,is_default,updated_at,published_at').single();
    if (publishError) { setError('Publication impossible : ' + publishError.message); setBusy(false); return; }
    const { error: publicError } = await supabase.from('visual_studio_publications').upsert({ layout_id: selectedId, name: current.name, scope: current.scope || scope, config, is_default: current.is_default, published_by: userId, published_at: new Date().toISOString() });
    const { error: historyError } = await supabase.from('visual_studio_versions').insert({ layout_id: selectedId, version: nextVersion, snapshot: config, action: 'published', actor_id: userId });
    if (publicError) setError('La version est enregistrée dans l’historique administrateur, mais sa publication publique a échoué : ' + publicError.message);
    else if (historyError) setError('Version publiée, mais son journal est incomplet : ' + historyError.message);
    setLayouts(items => items.map(item => item.id === selectedId ? data as LayoutRow : item)); setNotice(publicError || historyError ? '' : 'Version publiée et disponible dans le tableau de bord.'); await loadVersions(selectedId); setBusy(false);
  }
  async function restore(version: VersionRow) {
    if (!supabase || !isAdmin || !selectedId || !window.confirm(`Restaurer la version ${version.version} dans le brouillon ?`)) return;
    const restored = safeConfig(version.snapshot); const nextVersion = (layouts.find(row => row.id === selectedId)?.version ?? 0) + 1;
    setBusy(true); setError(''); setNotice('');
    const { data, error: restoreError } = await supabase.from('visual_studio_layouts').update({ draft_config: restored, version: nextVersion, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', selectedId).select('id,name,scope,draft_config,published_config,version,is_default,updated_at,published_at').single();
    if (restoreError) { setError('Restauration impossible : ' + restoreError.message); setBusy(false); return; }
    const { error: historyError } = await supabase.from('visual_studio_versions').insert({ layout_id: selectedId, version: nextVersion, snapshot: restored, action: 'restored', actor_id: userId });
    setConfig(restored); setSavedConfig(restored); setLayouts(items => items.map(item => item.id === selectedId ? data as LayoutRow : item)); await loadVersions(selectedId); setNotice(historyError ? 'Version restaurée, mais l’historique n’a pas été écrit.' : 'Version restaurée dans le brouillon. La publication reste manuelle.'); setBusy(false);
  }
  async function setDefault() {
    if (!supabase || !isAdmin || !selectedId) return;
    setBusy(true); setError(''); setNotice('');
    const target = layouts.find(row => row.id === selectedId);
    if (!target?.published_config) { setError('Publiez d’abord cette disposition avant de la définir par défaut.'); setBusy(false); return; }
    const { error: clearPublishedError } = await supabase.from('visual_studio_publications').update({ is_default: false }).eq('scope', target.scope || scope).neq('layout_id', selectedId);
    if (clearPublishedError) { setError('Impossible de retirer la disposition par défaut précédente : ' + clearPublishedError.message); setBusy(false); return; }
    const { error: publicDefaultError } = await supabase.from('visual_studio_publications').update({ is_default: true }).eq('layout_id', selectedId);
    if (publicDefaultError) { setError('Impossible d’activer la disposition par défaut : ' + publicDefaultError.message); setBusy(false); return; }
    const { error: clearError } = await supabase.from('visual_studio_layouts').update({ is_default: false, updated_by: userId }).eq('scope', target.scope || scope).neq('id', selectedId);
    if (clearError) { setError('Disposition publique définie, mais synchronisation administrateur incomplète : ' + clearError.message); setBusy(false); return; }
    const { error: updateError } = await supabase.from('visual_studio_layouts').update({ is_default: true, updated_by: userId }).eq('id', selectedId);
    if (updateError) setError('Disposition publique définie, mais synchronisation administrateur incomplète : ' + updateError.message);
    else setLayouts(items => items.map(item => ({ ...item, is_default: item.id === selectedId })));
    setBusy(false);
  }
  function duplicate() {
    setSelectedId(''); setName(`${name} — copie`); setNotice('Copie prête : choisissez sa page cible puis cliquez sur « Créer » pour la sauvegarder.'); setError('');
  }

  if (!isAdmin) return <></>;
  const displayed = config.components.filter(block => !block.hidden);
  return <section className="project-panel visual-studio" id="visual-design-studio" aria-labelledby="visual-studio-title">
    <div className="section-heading"><div><p className="eyebrow">OUTIL ADMINISTRATEUR</p><h2 id="visual-studio-title"><Palette size={21}/> Studio de conception visuelle</h2><p className="muted">Composez une disposition autorisée, ajustez les styles et publiez explicitement après validation.</p></div><span className="visual-studio-badge"><ShieldCheck size={14}/> Administrateur</span></div>
    <ModuleDataOverview sources={["visual_studio_layouts", "visual_studio_versions", "visual_studio_publications"]} metrics={[{ label: "Dispositions disponibles", value: layouts.length }, { label: "Versions chargées", value: versions.length }, { label: "Bloc sélectionné", value: selectedBlock ? "Oui" : "Non" }]} loading={busy} error={Boolean(error)} caption="Les dispositions restent en brouillon jusqu'à une publication explicite." />

    <div className="visual-studio-toolbar">
      <label>Disposition<select value={selectedId} onChange={event => { const row = layouts.find(item => item.id === event.target.value); if (row) selectLayout(row); else setSelectedId(''); }}><option value="">Choisir une disposition…</option>{layouts.map(row => <option key={row.id} value={row.id}>{row.name}{row.is_default ? ' · Par défaut' : ''}</option>)}</select></label>
      <label>Page à personnaliser<select value={scope} disabled={busy} onChange={event => {
        const nextScope = event.target.value as PageScope;
        if (nextScope === scope) return;
        if (dirty && !window.confirm('Abandonner les modifications non enregistrées pour changer de page ?')) return;
        const existing = layouts.find(row => row.scope === nextScope);
        setScope(nextScope); setSelectionMode(false); setSelectedNativeTarget(null);
        setSelectedId(existing?.id ?? '');
        const nextName = existing?.name ?? (nextScope === 'custom' ? 'Ma nouvelle page' : ({studio:'Studio IA',projects:'Projets',organizations:'Espace entreprise',profile:'Profil et préférences',academy:'Académie',resources:'Bibliothèque de ressources',discover:'Découverte',media:'Médiathèque',timeline:'Planning',insights:'Analyses',library:'Bibliothèque de formation',roadmap:'Feuille de route',billing:'Abonnement et facturation',administration:'Administration'} as Record<string,string>)[nextScope] ?? 'Nouvelle page');
        setName(nextName);
        const nextConfig = existing ? safeConfig(existing.draft_config) : starter;
        setConfig(nextConfig); setSavedConfig(nextConfig); setSelectedBlockId(''); setHistory([]); setFuture([]); setError('');
        setNotice(existing ? 'Disposition chargée pour cette page.' : 'Page sélectionnée. Cliquez sur « Créer » pour commencer une disposition indépendante.');
      }}><option value="studio">Studio IA</option><option value="projects">Projets</option><option value="organizations">Espace entreprise</option><option value="academy">Académie</option><option value="resources">Bibliothèque de ressources</option><option value="discover">Découverte</option><option value="media">Médiathèque</option><option value="timeline">Planning</option><option value="insights">Analyses</option><option value="library">Bibliothèque de formation</option><option value="roadmap">Feuille de route</option><option value="billing">Abonnement et facturation</option><option value="administration">Administration</option><option value="profile">Profil et préférences</option><option value="custom">Nouvelle page personnalisée</option>{layouts.filter(row => row.scope.startsWith('custom:')).map(row => <option key={row.id} value={row.scope}>{row.name}</option>)}</select></label><label>Nom de la page<input value={name} maxLength={100} onChange={event => setName(event.target.value)} /></label>
      <button type="button" className="logout-button" onClick={() => void createLayout()} disabled={busy}><Plus size={15}/> Créer</button>
      <button type="button" className="logout-button" onClick={duplicate} disabled={busy || !selectedId}><Copy size={15}/> Dupliquer</button>
      <span className={dirty ? 'visual-studio-dirty' : 'visual-studio-clean'}>{dirty ? 'Modifications non enregistrées' : 'Brouillon synchronisé'}</span>
    </div>
    <div className="visual-studio-workbench">
      <aside className="visual-studio-library"><h3><LayoutDashboard size={16}/> Composants</h3><p>Blocs prédéfinis uniquement. Aucun script libre n’est exécuté.</p>{presets.map(item => <button key={item.type} type="button" className="visual-studio-preset" onClick={() => addBlock(item.type)}><Plus size={14}/><span>{item.title}</span></button>)}<div className="visual-studio-theme"><h3><Palette size={16}/> Thème de la page</h3><select aria-label="Thème global" value={config.theme} disabled={busy} onChange={event=>{const nextTheme=event.target.value as StudioConfig['theme'];const palette=themes[nextTheme];changeConfig({...config,theme:nextTheme,pageStyle:{density:config.pageStyle?.density??'comfortable',textScale:config.pageStyle?.textScale??'normal',radius:config.pageStyle?.radius??14,background:palette.background,surface:palette.surface,text:palette.text,accent:palette.accent}});}}><option value="nexora-dark">NEXORA — noir, or, ivoire et graphite</option><option value="nexora-light">Clair — bleu et blanc</option><option value="ocean">Océan — bleu profond et turquoise</option></select><div className="visual-studio-swatches">{Object.entries(themes[config.theme]).map(([key,value]) => <span key={key} title={key} style={{ background:value }} />)}</div><label>Densité de la page<select value={config.pageStyle?.density ?? 'comfortable'} disabled={busy} onChange={event=>changeConfig({...config,pageStyle:{...config.pageStyle!,density:event.target.value as PageStyle['density']}})}><option value="comfortable">Confortable</option><option value="compact">Compacte</option></select></label><label>Taille du texte<select value={config.pageStyle?.textScale ?? 'normal'} disabled={busy} onChange={event=>changeConfig({...config,pageStyle:{...config.pageStyle!,textScale:event.target.value as PageStyle['textScale']}})}><option value="small">Petite</option><option value="normal">Normale</option><option value="large">Grande</option></select></label><label>Arrondi des cartes <input type="range" min="4" max="28" value={config.pageStyle?.radius ?? 14} disabled={busy} onChange={event=>changeConfig({...config,pageStyle:{...config.pageStyle!,radius:Number(event.target.value)}})}/></label><label>Fond de page <input type="color" value={config.pageStyle?.background??themes[config.theme].background} disabled={busy} onChange={event=>changeConfig({...config,pageStyle:{...config.pageStyle!,background:event.target.value}})}/></label><label>Surface des cartes <input type="color" value={config.pageStyle?.surface??themes[config.theme].surface} disabled={busy} onChange={event=>changeConfig({...config,pageStyle:{...config.pageStyle!,surface:event.target.value}})}/></label><label>Couleur du texte <input type="color" value={config.pageStyle?.text??themes[config.theme].text} disabled={busy} onChange={event=>changeConfig({...config,pageStyle:{...config.pageStyle!,text:event.target.value}})}/></label><label>Couleur d’accentuation <input type="color" value={config.pageStyle?.accent??themes[config.theme].accent} disabled={busy} onChange={event=>changeConfig({...config,pageStyle:{...config.pageStyle!,accent:event.target.value}})}/></label><button type="button" className="logout-button" onClick={() => changeConfig(starter)}><RotateCcw size={14}/> Réinitialiser</button></div></aside>
      <div className="visual-studio-canvas-wrap"><div className="visual-studio-canvas-tools"><div><button type="button" className={preview==='desktop'?'active':''} onClick={() => setPreview('desktop')} aria-label="Aperçu ordinateur"><Monitor size={15}/></button><button type="button" className={preview==='tablet'?'active':''} onClick={() => setPreview('tablet')} aria-label="Aperçu tablette"><Tablet size={15}/></button><button type="button" className={preview==='mobile'?'active':''} onClick={() => setPreview('mobile')} aria-label="Aperçu téléphone"><Smartphone size={15}/></button></div><div className="visual-studio-preview-modes"><button type="button" className={previewMode==='real'?'active':''} onClick={() => setPreviewMode('real')}>Page réelle</button><button type="button" className={previewMode==='draft'?'active':''} onClick={() => {setSelectionMode(false);setSelectedNativeTarget(null);setPreviewMode('draft');}}>Brouillon éditable</button>{previewMode==='real'&&scope!=='custom'&&!scope.startsWith('custom:')&&<button type="button" className={selectionMode?'active':''} onClick={()=>{setSelectionMode(current=>!current);setSelectedNativeTarget(null);}}>{selectionMode?'Quitter la sélection':'Sélectionner un composant'}</button>}</div><span><Eye size={14}/> {previewMode==='real'?'Aperçu de la page existante':'Aperçu du brouillon'}</span></div>
        {previewMode==='real' ? <div className={`visual-studio-real-preview frame-${preview}`}><iframe title={`Page réelle : ${scope}`} src={`${window.location.pathname}?studioPreview=${encodeURIComponent(scope.startsWith('custom:')||scope==='custom'?'dashboard':scope)}&embeddedPreview=1`} loading="lazy" referrerPolicy="same-origin" ref={previewFrameRef} onLoad={applyDraftPreview} className="visual-studio-real-iframe" /></div> : <div className={`visual-studio-canvas frame-${preview}`} style={{ background:theme.background,color:theme.text }}>
          {displayed.map(block => <article key={block.id} draggable onDragStart={event => event.dataTransfer.setData('text/plain',block.id)} onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault();moveBlock(event.dataTransfer.getData('text/plain'),block.id);}} onClick={() => setSelectedBlockId(block.id)} className={`visual-studio-block width-${block.width ?? 'full'} ${selectedBlockId===block.id?'selected':''}`} style={{ background:block.background ?? theme.surface,color:block.color ?? theme.text,borderRadius:block.radius ?? 12,padding:block.padding ?? 16 }}>
            {block.type==='heading'?<h3>{block.title}</h3>:block.type==='divider'?<div className="visual-studio-divider"/>:block.type==='image'?<><strong>{block.title}</strong>{block.url&&<img src={block.url} alt={block.content||block.title} style={{width:'100%',maxHeight:320,objectFit:block.objectFit??'cover',borderRadius:8,marginTop:8}}/>}<p>{block.content}</p></>:block.type==='video'?<><strong>{block.title}</strong>{block.url&&<iframe src={block.url} title={block.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; picture-in-picture" style={{width:'100%',aspectRatio:'16/9',border:0,borderRadius:8,marginTop:8}}/>}<p>{block.content}</p></>:<><strong>{block.title}</strong><p>{block.content}</p>{(block.type==='stat'||block.type==='card'||block.type==='text')&&block.dataBinding&&<div className="visual-studio-bound-value"><strong>{bindingValues[block.dataBinding] == null ? 'N/D' : bindingValues[block.dataBinding]!.toLocaleString('fr-FR')}</strong><small>{pageDataBindingLabel(block.dataBinding)} · valeur issue de la source</small></div>}{block.type==='stat'&&!block.dataBinding&&<small>Source non reliée : choisissez une source dans les propriétés.</small>}{block.type==='action'&&<span className="visual-studio-fake-button">Aperçu du bouton · {pageActionTargetLabel(block.actionTarget ?? 'projects')}</span>}</>}
          </article>)}
          {!displayed.length&&<p className="visual-studio-empty">Ajoutez un composant depuis la bibliothèque.</p>}
        </div>}
      </div>
      <aside className="visual-studio-properties"><h3>Propriétés</h3>{selectionMode&&<p className="visual-studio-help">Mode sélection actif : cliquez directement sur une carte, un formulaire, un titre, un bouton ou une surface de la page affichée.</p>}{selectedNativeTarget&&<div className="visual-studio-native-inspector"><p className="visual-studio-help">Type de composant natif sélectionné : <strong>{{panel:'Surface de page',card:'Carte métier',form:'Formulaire',heading:'En-tête de section',button:'Bouton principal'}[selectedNativeTarget]}</strong></p><small>Les réglages s’appliquent à tous les éléments de cette famille sur la page sélectionnée.</small><label>Fond <input type="color" value={config.nativeStyles?.[selectedNativeTarget]?.background??(selectedNativeTarget==='panel'?(config.pageStyle?.surface??theme.surface):(config.pageStyle?.background??theme.background))} onChange={event=>changeNativeStyle({background:event.target.value})}/></label><label>Texte <input type="color" value={config.nativeStyles?.[selectedNativeTarget]?.color??(config.pageStyle?.text??theme.text)} onChange={event=>changeNativeStyle({color:event.target.value})}/></label><label>Arrondi <input type="range" min="0" max="32" value={config.nativeStyles?.[selectedNativeTarget]?.radius??12} onChange={event=>changeNativeStyle({radius:Number(event.target.value)})}/></label><label>Espacement intérieur <input type="range" min="0" max="48" value={config.nativeStyles?.[selectedNativeTarget]?.padding??12} onChange={event=>changeNativeStyle({padding:Number(event.target.value)})}/></label><button type="button" className="logout-button" onClick={resetNativeStyle}><RotateCcw size={14}/> Réinitialiser ce composant</button></div>}{selectedBlock?<><p className="visual-studio-help">Élément sélectionné : {selectedBlock.type}</p><label>Libellé<input value={selectedBlock.title} maxLength={120} onChange={event=>changeBlock({title:event.target.value})}/></label>{selectedBlock.type!=='divider'&&<label>{selectedBlock.type==='image'?'Texte alternatif / description':selectedBlock.type==='video'?'Description':'Contenu'}<textarea value={selectedBlock.content??''} maxLength={1000} rows={3} onChange={event=>changeBlock({content:event.target.value})}/></label>}{(selectedBlock.type==='stat'||selectedBlock.type==='card'||selectedBlock.type==='text')&&<label>Source de données<select value={selectedBlock.dataBinding??'none'} onChange={event=>changeBlock({dataBinding:event.target.value==='none'?undefined:event.target.value as PageDataBindingKey})}><option value="none">Aucune · contenu statique</option>{Object.entries(PAGE_DATA_BINDINGS).map(([binding,meta])=><option key={binding} value={binding}>{meta.label} · {meta.source}</option>)}</select><small>La valeur est résolue depuis une requête de lecture filtrée par les règles Supabase.</small></label>}{selectedBlock.type==='action'&&<label>Destination de l'action<select value={selectedBlock.actionTarget??'projects'} onChange={event=>changeBlock({actionTarget:event.target.value as PageActionTarget})}>{PAGE_ACTION_TARGETS.map(target=><option key={target.value} value={target.value}>{target.label}</option>)}</select><small>La version publiée ouvre un module existant de l'application. Aucun code libre n'est exécuté.</small></label>}<label>Largeur<select value={selectedBlock.width??'full'} onChange={event=>changeBlock({width:event.target.value as StudioBlock['width']})}><option value="full">Pleine largeur</option><option value="half">Moitié</option><option value="third">Un tiers</option></select></label><label>Couleur du texte<select value={normalizeTextColor(selectedBlock.color)} onChange={event=>changeBlock({color:event.target.value})}><option value="#F5F2EA">Ivoire</option><option value="#C9C1B2">Ivoire atténué</option><option value="#D6B66E">Or</option></select></label><label>Arrière-plan<select value={normalizeBackgroundColor(selectedBlock.background)} onChange={event=>changeBlock({background:event.target.value})}><option value="#202024">Graphite</option><option value="#0B0B0D">Noir</option></select></label><label>Arrondi <input type="range" min="0" max="32" value={selectedBlock.radius??12} onChange={event=>changeBlock({radius:Number(event.target.value)})}/></label><label>Espacement intérieur <input type="range" min="0" max="48" value={selectedBlock.padding??16} onChange={event=>changeBlock({padding:Number(event.target.value)})}/></label><div className="visual-studio-property-actions"><button type="button" className="logout-button" onClick={()=>changeBlock({hidden:!selectedBlock.hidden})}>{selectedBlock.hidden?<Eye size={14}/>:<EyeOff size={14}/>} {selectedBlock.hidden?'Afficher':'Masquer'}</button><button type="button" className="logout-button" onClick={()=>{const copy={...selectedBlock,id:`block-${Date.now().toString(36)}`,title:`${selectedBlock.title} (copie)`};changeConfig({...config,components:[...config.components,copy]});setSelectedBlockId(copy.id);}}><Copy size={14}/> Dupliquer</button><button type="button" className="logout-button" onClick={()=>{changeConfig({...config,components:config.components.filter(item=>item.id!==selectedBlock.id)});setSelectedBlockId('');}}><Trash2 size={14}/> Supprimer</button><button type="button" className="logout-button" onClick={()=>moveBlock(selectedBlock.id,config.components[Math.max(0,config.components.findIndex(item=>item.id===selectedBlock.id)-1)]?.id)}><ArrowUp size={14}/> Monter</button><button type="button" className="logout-button" onClick={()=>moveBlock(selectedBlock.id,config.components[Math.min(config.components.length-1,config.components.findIndex(item=>item.id===selectedBlock.id)+1)]?.id)}><ArrowDown size={14}/> Descendre</button></div></>:<p className="visual-studio-help">Sélectionnez un bloc dans l’aperçu pour modifier ses propriétés.</p>}
      </aside>
    </div>
    <div className="visual-studio-footer"><div className="visual-studio-history"><h3><Clock3 size={16}/> Historique des versions</h3>{versions.length?versions.map(version=><div className="visual-studio-version" key={version.id}><span>v{version.version} · {version.action}</span><time>{new Date(version.created_at).toLocaleString('fr-FR')}</time><button type="button" className="logout-button" onClick={()=>void restore(version)} disabled={busy}><Undo2 size={14}/> Restaurer en brouillon</button></div>):<p>Aucune version enregistrée pour le moment.</p>}</div><div className="visual-studio-publish"><p>{layouts.find(row=>row.id===selectedId)?.published_at?'Une version publiée existe.':'Aucune version publiée pour cette disposition.'}</p><button type="button" className="logout-button" onClick={()=>void setDefault()} disabled={busy||!selectedId}><Check size={14}/> Définir par défaut</button><button type="button" className="logout-button" onClick={()=>void saveDraft()} disabled={busy||!selectedId||!dirty}><Save size={14}/> {busy?'Enregistrement…':'Enregistrer le brouillon'}</button><button type="button" className="primary-button" onClick={()=>void publish()} disabled={busy||!selectedId||dirty}><Rocket size={15}/> Publier la version enregistrée</button></div></div>
    {error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback success" role="status">{notice}</p>}
    <style>{`
      .visual-studio{margin-top:28px}.visual-studio-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(214,182,110,.30);background:rgba(214,182,110,.08);color:#D6B66E;border-radius:999px;padding:7px 10px;font-size:11px;white-space:nowrap}
      .visual-studio-toolbar{display:flex;align-items:end;gap:10px;flex-wrap:wrap;padding:18px 0;border-bottom:1px solid rgba(214,182,110,.18)}.visual-studio-toolbar label,.visual-studio-properties label{display:grid;gap:7px;color:#C9C1B2;font-size:11px;flex:1;min-width:130px}.visual-studio-toolbar input,.visual-studio-toolbar select,.visual-studio-properties input:not([type=color]):not([type=range]),.visual-studio-properties select,.visual-studio-properties textarea{width:100%;border:1px solid rgba(214,182,110,.25);background:#0B0B0D;border-radius:8px;padding:10px;color:#F5F2EA;font:inherit}
      .visual-studio-dirty,.visual-studio-clean{font-size:10px;padding:8px 10px;border-radius:8px}.visual-studio-dirty{color:#D6B66E;background:rgba(214,182,110,.10)}.visual-studio-clean{color:#82e4ca;background:#15342f}
      .visual-studio-workbench{display:grid;grid-template-columns:180px minmax(0,1fr) 220px;gap:14px;padding-top:16px}.visual-studio-library,.visual-studio-properties{border:1px solid rgba(214,182,110,.18);border-radius:12px;padding:12px;min-width:0}.visual-studio-library h3,.visual-studio-properties h3,.visual-studio-history h3{font-size:12px;display:flex;align-items:center;gap:7px;margin:0 0 10px}.visual-studio-library p,.visual-studio-help,.visual-studio-history>p{font-size:10px;color:#C9C1B2;line-height:1.6}.visual-studio-preset{display:flex;align-items:center;gap:6px;width:100%;text-align:left;border:1px solid rgba(214,182,110,.25);background:#202024;color:#F5F2EA;border-radius:8px;padding:9px 7px;font-size:10px;margin:6px 0;cursor:pointer}.visual-studio-preset:hover{border-color:#D6B66E}.visual-studio-theme{border-top:1px solid rgba(214,182,110,.18);margin-top:14px;padding-top:14px}.visual-studio-theme select{width:100%;background:#0B0B0D;color:#F5F2EA;border:1px solid rgba(214,182,110,.25);border-radius:8px;padding:8px}.visual-studio-swatches{display:flex;gap:5px;margin:10px 0}.visual-studio-swatches span{width:22px;height:22px;border-radius:6px;border:1px solid #F5F2EA22}.visual-studio-canvas-wrap{min-width:0;border:1px solid rgba(214,182,110,.18);border-radius:12px;overflow:hidden}.visual-studio-canvas-tools{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;border-bottom:1px solid rgba(214,182,110,.18);font-size:10px;color:#C9C1B2}.visual-studio-canvas-tools>div{display:flex;gap:4px}.visual-studio-canvas-tools button{display:inline-flex;align-items:center;justify-content:center;padding:7px;border:1px solid rgba(214,182,110,.25);background:#202024;color:#C9C1B2;border-radius:7px}.visual-studio-canvas-tools button.active{border-color:#D6B66E;color:#D6B66E}.visual-studio-canvas{display:flex;align-content:start;align-items:start;gap:12px;flex-wrap:wrap;padding:16px;min-height:380px;transition:width .15s}.visual-studio-canvas.frame-tablet{max-width:620px;margin:auto}.visual-studio-canvas.frame-mobile{max-width:360px;margin:auto;display:flex;flex-direction:column}.visual-studio-block{border:1px solid transparent;min-width:0;cursor:grab;box-shadow:0 8px 24px rgba(0,0,0,.08)}.visual-studio-block.selected{border-color:#D6B66E;outline:2px solid #D6B66E33}.visual-studio-block.width-full{width:100%}.visual-studio-block.width-half{width:calc(50% - 6px)}.visual-studio-block.width-third{width:calc(33.333% - 8px)}.visual-studio-block h3{margin:0;font-size:clamp(15px,2vw,22px)}.visual-studio-block p{font-size:12px;line-height:1.65;margin:8px 0 0;overflow-wrap:anywhere}.visual-studio-block small{display:block;font-size:10px;opacity:.7;margin-top:8px}.visual-studio-fake-button{display:inline-block;font-size:10px;border-radius:7px;padding:7px 9px;background:#F5F2EA18;margin-top:10px}.visual-studio-divider{height:1px;background:currentColor;opacity:.25}.visual-studio-empty{font-size:12px;opacity:.65}.visual-studio-properties{display:flex;flex-direction:column;gap:10px}.visual-studio-properties input[type=color]{width:100%;height:35px;border:1px solid rgba(214,182,110,.25);background:#0B0B0D;border-radius:8px;padding:3px}.visual-studio-properties input[type=range]{width:100%;accent-color:#D6B66E}.visual-studio-property-actions{display:flex;gap:6px;flex-wrap:wrap}.visual-studio-property-actions button{font-size:10px;padding:7px}.visual-studio-footer{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(220px,1fr);gap:18px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(214,182,110,.18)}.visual-studio-version{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid rgba(214,182,110,.12);font-size:10px}.visual-studio-version time{color:#C9C1B2}.visual-studio-publish{display:flex;flex-direction:column;align-items:stretch;gap:8px}.visual-studio-publish p{font-size:11px;color:#C9C1B2}.visual-studio-publish .primary-button{width:auto;font-size:11px;padding:11px}.visual-studio button:disabled{opacity:.5;cursor:not-allowed}
      @media(max-width:1050px){.visual-studio-workbench{grid-template-columns:160px minmax(0,1fr)}.visual-studio-properties{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}.visual-studio-properties h3,.visual-studio-properties .visual-studio-help,.visual-studio-property-actions{grid-column:1/-1}}
      @media(max-width:680px){.visual-studio-workbench{grid-template-columns:1fr}.visual-studio-properties{grid-template-columns:repeat(2,minmax(0,1fr))}.visual-studio-footer{grid-template-columns:1fr}.visual-studio-toolbar label{min-width:100%}.visual-studio-canvas{padding:10px}.visual-studio-block.width-third,.visual-studio-block.width-half{width:100%}.visual-studio-version{align-items:flex-start}.visual-studio-badge{display:none}}
    `}</style>
  </section>;
}
