-- Secure server-side organization invitation lifecycle.
-- Apply only after the B2B foundation migration has been reviewed and applied.
create or replace function public.create_organization_invitation(
 p_organization_id uuid,p_inviter_id uuid,p_email text,p_role text,p_token_hash text
) returns table(invitation_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare v_inviter_role text; v_email text:=lower(btrim(p_email)); v_id uuid; v_expiry timestamptz:=now()+interval '7 days';
begin
 if p_inviter_id is null or p_organization_id is null then raise exception 'Invalid invitation request' using errcode='22023'; end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email)>320 then raise exception 'Invalid email address' using errcode='22023'; end if;
 if p_role not in ('admin','manager','member','viewer') then raise exception 'Invalid invitation role' using errcode='22023'; end if;
 if p_token_hash is null or char_length(p_token_hash)<>64 or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token hash' using errcode='22023'; end if;
 select m.role into v_inviter_role from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.organization_id=p_organization_id and m.user_id=p_inviter_id and m.status='active' and o.status='active' for share of m,o;
 if v_inviter_role is null then raise exception 'Not authorized to invite to this organization' using errcode='42501'; end if;
 if v_inviter_role='owner' then null;
 elsif v_inviter_role='admin' and p_role in ('manager','member','viewer') then null;
 elsif v_inviter_role='manager' and p_role in ('member','viewer') then null;
 else raise exception 'Role cannot invite the requested role' using errcode='42501'; end if;
 if exists(select 1 from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=p_organization_id and m.status='active' and lower(u.email)=v_email) then
  raise exception 'This email already belongs to an active member' using errcode='23505';
 end if;
 update public.organization_invitations set status='revoked' where organization_id=p_organization_id and lower(email)=v_email and status='pending';
 insert into public.organization_invitations(organization_id,email,role,token_hash,invited_by,status,expires_at)
 values(p_organization_id,v_email,p_role,p_token_hash,p_inviter_id,'pending',v_expiry) returning id into v_id;
 return query select v_id,v_expiry;
end; $$;

create or replace function public.accept_organization_invitation(p_user_id uuid,p_token_hash text)
returns table(organization_id uuid,member_role text)
language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare v_invitation public.organization_invitations%rowtype; v_user_email text; v_email_confirmed_at timestamptz;
begin
 if p_user_id is null or p_token_hash is null or char_length(p_token_hash)<>64 or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token' using errcode='22023'; end if;
 select lower(u.email),u.email_confirmed_at into v_user_email,v_email_confirmed_at from auth.users u where u.id=p_user_id;
 if v_user_email is null or v_email_confirmed_at is null then raise exception 'A verified account is required to accept an invitation' using errcode='42501'; end if;
 select i.* into v_invitation from public.organization_invitations i where i.token_hash=p_token_hash for update;
 if not found or v_invitation.status<>'pending' or v_invitation.expires_at<=now() then raise exception 'Invitation is invalid, expired, or already used' using errcode='22023'; end if;
 if lower(v_invitation.email)<>v_user_email then raise exception 'The signed-in email does not match this invitation' using errcode='42501'; end if;
 if not exists(select 1 from public.organizations o where o.id=v_invitation.organization_id and o.status='active') then raise exception 'Organization is not active' using errcode='42501'; end if;
 if exists(select 1 from public.organization_members m where m.organization_id=v_invitation.organization_id and m.user_id=p_user_id) then raise exception 'User is already a member of this organization' using errcode='23505'; end if;
 insert into public.organization_members(organization_id,user_id,role,status) values(v_invitation.organization_id,p_user_id,v_invitation.role,'active');
 update public.organization_invitations set status='accepted',accepted_at=now() where id=v_invitation.id;
 return query select v_invitation.organization_id,v_invitation.role;
end; $$;

revoke all on function public.create_organization_invitation(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.accept_organization_invitation(uuid,text) from public,anon,authenticated;
grant execute on function public.create_organization_invitation(uuid,uuid,text,text,text) to service_role;
grant execute on function public.accept_organization_invitation(uuid,text) to service_role;
comment on function public.create_organization_invitation(uuid,uuid,text,text,text) is 'Server-only invitation creation with organization-role hierarchy enforcement.';
comment on function public.accept_organization_invitation(uuid,text) is 'Server-only, atomic, single-use invitation acceptance for verified matching email.';
