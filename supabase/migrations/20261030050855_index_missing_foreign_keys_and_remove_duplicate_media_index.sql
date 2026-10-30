-- Add indexes for the foreign-key columns identified by the Supabase advisor.
-- Tables are currently small; regular transactional index creation is appropriate.
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists content_analyses_reviewed_by_idx on public.content_analyses (reviewed_by);
create index if not exists content_items_source_id_idx on public.content_items (source_id);
create index if not exists content_sources_created_by_idx on public.content_sources (created_by);
create index if not exists content_sources_entrepreneur_id_idx on public.content_sources (entrepreneur_id);
create index if not exists content_translations_owner_id_idx on public.content_translations (owner_id);
create index if not exists entrepreneurs_created_by_idx on public.entrepreneurs (created_by);
create index if not exists followed_entrepreneurs_entrepreneur_id_idx on public.followed_entrepreneurs (entrepreneur_id);
create index if not exists media_library_items_entrepreneur_id_idx on public.media_library_items (entrepreneur_id);
create index if not exists media_oauth_states_owner_id_idx on public.media_oauth_states (owner_id);
create index if not exists nexora_course_payment_orders_course_id_idx on public.nexora_course_payment_orders (course_id);
create index if not exists nexora_courses_created_by_idx on public.nexora_courses (created_by);
create index if not exists nexora_learning_modules_path_id_idx on public.nexora_learning_modules (path_id);
create index if not exists nexora_learning_progress_module_id_idx on public.nexora_learning_progress (module_id);
create index if not exists nexora_resource_progress_resource_id_idx on public.nexora_resource_progress (resource_id);
create index if not exists social_accounts_entrepreneur_id_idx on public.social_accounts (entrepreneur_id);
create index if not exists studio_assets_owner_id_idx on public.studio_assets (owner_id);
create index if not exists studio_project_comments_user_id_idx on public.studio_project_comments (user_id);
create index if not exists studio_project_members_invited_by_idx on public.studio_project_members (invited_by);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index if not exists timeline_events_source_id_idx on public.timeline_events (source_id);
create index if not exists training_completions_course_id_idx on public.training_completions (course_id);
create index if not exists training_completions_verified_by_idx on public.training_completions (verified_by);
create index if not exists user_learning_items_content_item_id_idx on public.user_learning_items (content_item_id);
create index if not exists user_learning_items_entrepreneur_id_idx on public.user_learning_items (entrepreneur_id);
create index if not exists visual_studio_layouts_created_by_idx on public.visual_studio_layouts (created_by);
create index if not exists visual_studio_layouts_updated_by_idx on public.visual_studio_layouts (updated_by);
create index if not exists visual_studio_publications_published_by_idx on public.visual_studio_publications (published_by);
create index if not exists visual_studio_versions_actor_id_idx on public.visual_studio_versions (actor_id);

-- The unique constraint index remains authoritative; this standalone duplicate is redundant.
drop index if exists public.media_library_owner_platform_external_uidx;
