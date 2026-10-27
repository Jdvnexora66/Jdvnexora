-- Seed a small set of established RSS sources for the NEXORA resource catalog.
-- Imported entries remain unpublished for editorial review.
insert into public.nexora_resource_sources
  (name, source_type, feed_url, website_url, language, topic, is_active)
select v.name, v.source_type, v.feed_url, v.website_url, v.language, v.topic, true
from (values
  ('Y Combinator Blog', 'rss', 'https://www.ycombinator.com/blog/rss/', 'https://www.ycombinator.com/blog/', 'en', 'startups and entrepreneurship'),
  ('Hacker News', 'rss', 'https://news.ycombinator.com/rss', 'https://news.ycombinator.com/', 'en', 'technology and startup community')
) as v(name, source_type, feed_url, website_url, language, topic)
where not exists (
  select 1
  from public.nexora_resource_sources s
  where s.name = v.name and s.feed_url = v.feed_url
);
