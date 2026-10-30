import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => {
  assert.ok(existsSync(path), `Fichier requis absent : ${path}`);
  return readFileSync(path, 'utf8');
};

const routesFile = read('src/lib/pageDataBindings.ts');
const app = read('src/App.tsx');
const design = read('src/components/VisualDesignStudio.tsx');
const billing = read('src/components/BillingPanel.tsx');
const academy = read('src/components/Academy.tsx');
const subscriptionOrder = read('supabase/functions/create-subscription-payment-order/index.ts');
const paymentVerification = read('supabase/functions/verify-kkiapay-payment/index.ts');
const subscriptionSnapshotMigration = read('supabase/migrations/20261030080350_subscription_payment_order_snapshot.sql');
const sourceMap = read('docs/architecture/page-source-map.md');

const expectedRoutes = [
  'dashboard', 'studio', 'design', 'projects', 'organizations', 'profile',
  'administration', 'academy', 'library', 'resources', 'discover', 'media',
  'roadmap', 'timeline', 'insights', 'billing',
];
const routeBlock = routesFile.match(/export const PAGE_ROUTE_IDS = \[([\s\S]*?)\] as const;/);
assert.ok(routeBlock, 'PAGE_ROUTE_IDS doit rester déclaré dans le registre central.');
const actualRoutes = [...routeBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert.deepEqual(actualRoutes, expectedRoutes, 'Les 16 routes authentifiées doivent être présentes, uniques et dans l’ordre du registre.');

const pageFiles = [
  'src/components/ReferenceDashboard.tsx',
  'src/components/StudioIA.tsx',
  'src/components/VisualDesignStudio.tsx',
  'src/components/OrganizationPanel.tsx',
  'src/components/AdminPanel.tsx',
  'src/components/Academy.tsx',
  'src/components/LearningLibrary.tsx',
  'src/components/ResourceLibrary.tsx',
  'src/components/Discover.tsx',
  'src/components/MediaLibrary.tsx',
  'src/components/Roadmap.tsx',
  'src/components/Timeline.tsx',
  'src/components/Insights.tsx',
  'src/components/BillingPanel.tsx',
  'src/components/PublicVitrine.tsx',
];
for (const path of pageFiles) read(path);

const routeRenderAssertions = {
  dashboard: "activeSection === 'dashboard' && <ReferenceDashboard",
  studio: "activeSection === 'studio' && <StudioIA",
  design: "activeSection === 'design' && (profile?.role === 'admin'",
  projects: "activeSection === 'projects' ? <>",
  organizations: "activeSection === 'organizations' && <OrganizationPanel",
  profile: "activeSection === 'profile' && <section",
  administration: "activeSection === 'administration' && <AdminPanel",
  academy: "activeSection === 'academy' && <Academy",
  library: "activeSection === 'library' && <LearningLibrary",
  resources: "activeSection === 'resources' && <ResourceLibrary",
  discover: "activeSection === 'discover' && <Discover",
  media: "activeSection === 'media' && <MediaLibrary",
  roadmap: "activeSection === 'roadmap' && <Roadmap",
  timeline: "activeSection === 'timeline' && <Timeline",
  insights: "activeSection === 'insights' && <Insights",
  billing: "activeSection === 'billing' && <BillingPanel",
};
for (const route of expectedRoutes) {
  assert.ok(app.includes(routeRenderAssertions[route]), `La route ${route} n’affiche plus son écran métier attendu.`);
  assert.ok(app.includes(`navigateWorkspace('${route}')`), `La navigation ne permet plus d’ouvrir la route ${route}.`);
}
for (const path of [
  'src/components/CollaborationPanel.tsx',
  'src/components/CreatorCatalog.tsx',
  'src/components/PublishedVisualLayout.tsx',
  'src/components/ModuleDataOverview.tsx',
]) read(path);
assert.ok(app.includes('<CollaborationPanel'), 'La collaboration doit rester accessible depuis les projets.'); 
assert.ok(app.includes('<PublishedVisualLayout'), 'Les mises en page publiées doivent rester raccordées aux écrans.');

const requiredAppBindings = [
  'ReferenceDashboard', 'StudioIA', 'VisualDesignStudio', 'OrganizationPanel',
  'AdminPanel', 'Academy', 'LearningLibrary', 'ResourceLibrary', 'Discover',
  'MediaLibrary', 'Roadmap', 'Timeline', 'Insights', 'BillingPanel', 'PublicVitrine',
];
for (const name of requiredAppBindings) {
  assert.ok(app.includes(name), `Le routeur principal ne référence plus le composant ${name}.`);
}
assert.ok(app.includes('<PublicVitrine'), 'Le 17e écran public doit rester accessible.');
assert.ok(sourceMap.includes('17. Vitrine + connexion'), 'La carte des sources doit documenter le 17e écran.');

const actionTargets = routesFile.match(/export const PAGE_ACTION_TARGETS = \[([\s\S]*?)\] as const;/);
assert.ok(actionTargets, 'Les destinations d’action doivent rester centralisées.');
assert.ok(!/value:\s*'design'/.test(actionTargets[1]), 'Le Studio Design administrateur ne doit pas devenir une destination d’action publiée.');

assert.ok(design.includes("row.scope !== 'dashboard'"), 'Le tableau de bord référentiel doit rester exclu du Studio Design.');
for (const token of ['selectedNativeElement', 'changeNativeElementStyle', 'nativeElements', "previewMode==='real'", 'scopeRef.current.replace', 'textAlign', 'marginTop', 'marginBottom', 'Masquer cet élément']) {
  assert.ok(design.includes(token), `Fonction d’édition native absente : ${token}`);
}

for (const [file, source, functions] of [
  ['Facturation', billing, ['create-subscription-payment-order', 'verify-kkiapay-payment']],
  ['Académie', academy, ['create-course-payment-order', 'verify-kkiapay-payment']],
]) {
  for (const name of functions) {
    assert.ok(source.includes(name), `${file} doit conserver l’appel serveur ${name}.`);
  }
}

const subscriptionVerification = paymentVerification.slice(
  paymentVerification.indexOf('async function verifySubscriptionOrder'),
  paymentVerification.indexOf('Deno.serve(async (req: Request)', paymentVerification.indexOf('async function verifySubscriptionOrder')),
);
for (const token of ['amount_minor: Number(plan.price_minor)', 'currency: plan.currency', 'billing_interval: plan.billing_interval']) {
  assert.ok(subscriptionOrder.includes(token), `La commande d’abonnement doit figer ${token}.`);
}
for (const token of ['amount_minor,currency,billing_interval', 'Number(order.amount_minor)', 'txCurrency !== order.currency', 'subscriptionEndDate(now, order.billing_interval)']) {
  assert.ok(subscriptionVerification.includes(token), `La vérification doit utiliser l’instantané ${token}.`);
}
for (const token of ['add column if not exists amount_minor', 'add column if not exists currency', 'add column if not exists billing_interval', 'alter column amount_minor set not null']) {
  assert.ok(subscriptionSnapshotMigration.includes(token), `Migration d’instantané incomplète : ${token}.`);
}

console.log('NEXORA checks passed: 16 routes authentifiées + vitrine, Studio Design natif, paiements serveur et instantané immuable des commandes d’abonnement.');
