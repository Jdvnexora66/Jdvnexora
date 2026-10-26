-- Public starter catalogue for JDV NEXORA creator and founder discovery.
-- Profiles intentionally remain unverified until an editor checks their sources.
insert into public.entrepreneurs
(name, slug, summary, biography, country, industry, website_url, verification_status, visibility, created_by)
values
('Marques Brownlee (MKBHD)','marques-brownlee','Créateur de contenu technologique connu pour ses tests et analyses de produits grand public.','Créateur américain spécialisé dans les vidéos de technologie, les tests de produits et les interviews. Les dates et résultats détaillés doivent être reliés à des sources consultables.','États-Unis','Création de contenu · Technologie','https://mkbhd.com/','unverified','public',null),
('Jimmy Donaldson (MrBeast)','jimmy-donaldson-mrbeast','Créateur vidéo connu pour ses formats de divertissement à grande échelle et ses projets entrepreneuriaux.','Créateur américain dont le parcours permet d’étudier la production vidéo à grande échelle, l’expérimentation des formats et la construction de marques. Les chiffres doivent être vérifiés avant publication.','États-Unis','Création de contenu · Divertissement','https://www.youtube.com/@MrBeast','unverified','public',null),
('Ali Abdaal','ali-abdaal','Créateur et entrepreneur qui traite de productivité, d’apprentissage et de produits numériques.','Médecin de formation devenu créateur et entrepreneur, connu pour ses contenus sur la productivité et ses ressources numériques. Les détails biographiques doivent être confirmés par des sources primaires.','Royaume-Uni','Création de contenu · Produits numériques','https://aliabdaal.com/','unverified','public',null),
('Melanie Perkins','melanie-perkins','Co-fondatrice de Canva, plateforme de conception graphique en ligne.','Entrepreneure australienne associée à la création et au développement de Canva. Son parcours permet d’étudier la construction d’un produit logiciel et sa distribution.','Australie','SaaS · Logiciel · Design','https://www.canva.com/about/','unverified','public',null),
('Tobias Lütke','tobias-lutke','Fondateur de Shopify, plateforme de commerce en ligne.','Entrepreneur et développeur associé à la création de Shopify. Son parcours peut servir à étudier la construction d’un produit logiciel pour les commerçants.','Canada','SaaS · Commerce en ligne','https://www.shopify.com/about','unverified','public',null),
('Patrick Collison','patrick-collison','Co-fondateur de Stripe, entreprise d’infrastructure de paiement en ligne.','Entrepreneur et programmeur irlandais, co-fondateur de Stripe. Les enseignements sur l’infrastructure et la distribution doivent être reliés à des sources consultables.','Irlande / États-Unis','SaaS · Fintech','https://stripe.com/about','unverified','public',null),
('Brian Chesky','brian-chesky','Co-fondateur d’Airbnb, plateforme de réservation d’hébergements.','Entrepreneur et designer associé à la création d’Airbnb. Son histoire est pertinente pour étudier les places de marché, l’expérience utilisateur et la confiance.','États-Unis','Startup · Marketplace','https://news.airbnb.com/about-us/','unverified','public',null),
('Jason Fried','jason-fried','Co-fondateur de Basecamp et figure de l’entrepreneuriat logiciel.','Entrepreneur et auteur associé à Basecamp et à 37signals. À explorer pour les méthodes de gestion d’entreprise logicielle et de construction d’équipes.','États-Unis','SaaS · Entrepreneuriat','https://basecamp.com/about','unverified','public',null),
('Sara Blakely','sara-blakely','Fondatrice de Spanx, marque de vêtements et produits de maintien.','Entrepreneure américaine connue pour avoir lancé Spanx. Son parcours est pertinent pour étudier le développement d’un produit physique, le positionnement et la marque.','États-Unis','Création de produit · Marque','https://spanx.com/','unverified','public',null),
('Rebecca Enonchong','rebecca-enonchong','Entrepreneure camerounaise dans la technologie et défenseure de l’écosystème tech africain.','Fondatrice et dirigeante d’entreprise technologique, connue pour son implication dans les écosystèmes numériques africains. Les faits détaillés doivent être validés par des sources directes.','Cameroun','Technologie · Entrepreneuriat africain','https://www.appstech.com/','unverified','public',null),
('Iyinoluwa Aboyeji','iyinoluwa-aboyeji','Entrepreneur nigérian associé à la création de startups technologiques africaines.','Entrepreneur technologique associé à plusieurs initiatives de startups en Afrique. Chaque étape et résultat doit être relié à une source fiable avant validation.','Nigeria','Startup · Technologie africaine','https://www.future.africa/','unverified','public',null),
('Magatte Wade','magatte-wade','Entrepreneure sénégalaise et autrice, engagée dans l’entrepreneuriat et le développement économique africain.','Entrepreneure et conférencière sénégalaise dont les interventions portent notamment sur l’entreprise et le développement économique. Les points précis du parcours doivent être sourcés.','Sénégal','Entrepreneuriat · Produits · Afrique','https://magattewade.com/','unverified','public',null)
on conflict (slug) do nothing;

-- Record the official/public starting points used to research these profiles.
insert into public.content_sources (entrepreneur_id, title, source_url, source_type, publisher, credibility_note, created_by)
select e.id, e.name || ' — site de référence', e.website_url, 'website', e.name,
       'Point de départ public. Vérifier les faits et la date de consultation avant de marquer le profil comme vérifié.',
       null
from public.entrepreneurs e
where e.slug in (
  'marques-brownlee','jimmy-donaldson-mrbeast','ali-abdaal','melanie-perkins',
  'tobias-lutke','patrick-collison','brian-chesky','jason-fried','sara-blakely',
  'rebecca-enonchong','iyinoluwa-aboyeji','magatte-wade'
)
and e.website_url is not null
and not exists (
  select 1 from public.content_sources s
  where s.entrepreneur_id = e.id and s.source_url = e.website_url
);
