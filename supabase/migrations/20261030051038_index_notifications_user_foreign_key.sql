-- The existing unread-only partial index cannot cover every row for FK cascades.
create index if not exists nexora_notifications_user_id_idx
  on public.nexora_notifications (user_id);
