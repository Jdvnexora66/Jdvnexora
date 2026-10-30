import { FormEvent, useEffect, useState } from 'react';
import { Building2, UserPlus, RefreshCw, Copy, ShieldCheck } from 'lucide-react';
import { getClientRedirectUrl, supabase } from '../lib/supabase';
import ModuleDataOverview from './ModuleDataOverview';

type Organization = { id: string; name: string; slug: string; status: string; created_at: string };
type InvitationResult = { invitation?: { id?: string; email: string; role: string; expires_at: string }; token?: string; invitation_url?: string | null; delivery?: string; message?: string };

export default function OrganizationPanel({ userId, activeOrganizationId, onActiveOrganizationChange }: { userId: string; activeOrganizationId: string; onActiveOrganizationChange: (organizationId: string) => void }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationName, setOrganizationName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadOrganizations() {
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const { data, error: queryError } = await supabase.from('organizations')
        .select('id, name, slug, status, created_at').order('created_at', { ascending: false });
      if (queryError) { setError('Impossible de charger les organisations. Vérifiez que les migrations B2B sont appliquées.'); return; }
      const rows = (data ?? []) as Organization[];
      setOrganizations(rows);
      if (!activeOrganizationId && rows[0]) onActiveOrganizationChange(rows[0].id);
      else if (activeOrganizationId && !rows.some(row => row.id === activeOrganizationId)) onActiveOrganizationChange(rows[0]?.id ?? '');
    } catch {
      setError('Erreur réseau pendant le chargement des organisations. Vérifiez la connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrganizations(); }, [userId]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token || !supabase) return;
    let cancelled = false;
    (async () => {
      setBusy(true); setError(''); setMessage('Validation de votre invitation…');
      const { data, error: acceptError } = await supabase.functions.invoke('accept-organization-invitation', { body: { token } });
      if (cancelled) return;
      setBusy(false);
      if (acceptError || !data?.success) {
        setError(data?.error || acceptError?.message || 'Impossible d’accepter cette invitation. Connectez-vous avec l’adresse e-mail invitée et vérifiée.');
        setMessage('');
        return;
      }
      window.history.replaceState({}, '', window.location.pathname);
      setMessage('Invitation acceptée. Vous avez rejoint l’organisation.');
      setError('');
      await loadOrganizations();
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !organizationName.trim()) return;
    setBusy(true); setError(''); setMessage(''); setInvitationUrl('');
    const base = organizationName.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'organisation';
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
    const { data, error: createError } = await supabase.from('organizations')
      .insert({ name: organizationName.trim(), slug: base + '-' + suffix, created_by: userId })
      .select('id, name, slug, status, created_at').single();
    setBusy(false);
    if (createError) { setError(createError.code === '42501' ? 'Création refusée par les règles de sécurité.' : 'Création impossible. Vérifiez que la migration B2B est appliquée et que le nom est valide.'); return; }
    const created = data as Organization;
    setOrganizations(current => [created, ...current]);
    onActiveOrganizationChange(created.id);
    setOrganizationName('');
    setMessage('Organisation créée. Votre compte en est propriétaire.');
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !activeOrganizationId) return;
    setBusy(true); setError(''); setMessage(''); setInvitationUrl('');
    const { data, error: inviteError } = await supabase.functions.invoke('invite-organization-member', {
      body: { organization_id: activeOrganizationId, email: inviteEmail.trim(), role: inviteRole },
    });
    setBusy(false);
    if (inviteError || !data?.token) { setError(data?.error || inviteError?.message || 'Impossible de créer l’invitation.'); return; }
    const result = data as InvitationResult;
    const url = result.invitation_url || getClientRedirectUrl('/?token=' + encodeURIComponent(result.token!));
    setInvitationUrl(url);
    setInviteEmail('');
    setMessage('Invitation créée. Copiez le lien et transmettez-le uniquement à la personne invitée. Le compte destinataire devra avoir un e-mail vérifié correspondant.');
  }

  async function copyInvitation() {
    if (!invitationUrl) return;
    try { await navigator.clipboard.writeText(invitationUrl); setMessage('Lien d’invitation copié.'); }
    catch { setError('Copie automatique indisponible. Sélectionnez puis copiez le lien affiché.'); }
  }

  return <section id="organizations" className="project-panel" aria-labelledby="organizations-title">
    <div className="section-heading">
      <div><p className="eyebrow">ESPACE ENTREPRISE</p><h2 id="organizations-title"><Building2 size={20} /> Organisations & équipe</h2><p className="muted">Créez un espace B2B et invitez vos collaborateurs avec des rôles contrôlés.</p></div>
      <button className="icon-button" type="button" onClick={() => void loadOrganizations()} disabled={loading || busy} aria-label="Actualiser les organisations"><RefreshCw size={16} /></button>
    </div>
    <ModuleDataOverview sources={["organizations", "organization_members", "organization_invitations", "Edge Functions: invite/accept"]} metrics={[{ label: "Organisations accessibles", value: organizations.length }, { label: "Espace actif", value: activeOrganizationId ? "Sélectionné" : "Aucun" }, { label: "Invitation préparée", value: invitationUrl ? "Oui" : "Non" }]} loading={loading} error={Boolean(error)} caption="Les opérations d'invitation continuent d'être validées par les fonctions serveur." />

    <form className="project-form organization-form" onSubmit={createOrganization}>
      <label htmlFor="organization-name">Nom de l’organisation</label>
      <input id="organization-name" value={organizationName} onChange={e => setOrganizationName(e.target.value)} maxLength={160} minLength={2} placeholder="Ex. JDV Global Center" required />
      <button className="primary-button" type="submit" disabled={busy || organizationName.trim().length < 2}>{busy ? 'Traitement…' : 'Créer une organisation'} <Building2 size={16} /></button>
    </form>
    <div className="project-form organization-form organization-select-form">
      <label htmlFor="organization-select">Organisation active</label>
      <select id="organization-select" value={activeOrganizationId} onChange={e => onActiveOrganizationChange(e.target.value)} disabled={loading || organizations.length === 0}>
        {organizations.length === 0 ? <option value="">Aucune organisation disponible</option> : organizations.map(org => <option key={org.id} value={org.id}>{org.name} · {org.status}</option>)}
      </select>
    </div>
    <form className="project-form organization-form organization-invite-form" onSubmit={inviteMember}>
      <label htmlFor="invite-email">E-mail du collaborateur</label>
      <input id="invite-email" type="email" autoComplete="off" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="collaborateur@exemple.com" required />
      <label htmlFor="invite-role">Rôle à attribuer</label>
      <select id="invite-role" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
        <option value="admin">Administrateur (réservé au propriétaire)</option><option value="manager">Gestionnaire</option><option value="member">Membre</option><option value="viewer">Lecteur</option>
      </select>
      <button className="primary-button" type="submit" disabled={busy || !activeOrganizationId || !inviteEmail.trim()}><UserPlus size={16} /> {busy ? 'Traitement…' : 'Créer une invitation'}</button>
    </form>
    {invitationUrl && <div className="feedback success organization-invitation-result"><p><strong>Lien d’invitation (valable 7 jours)</strong></p><input aria-label="Lien d’invitation" readOnly value={invitationUrl} onFocus={e => e.currentTarget.select()} /><button className="logout-button" type="button" onClick={() => void copyInvitation()}><Copy size={15} /> Copier le lien</button></div>}
    {error && <p className="feedback error" role="alert">{error}</p>}
    {message && <p className="feedback success" role="status"><ShieldCheck size={15} /> {message}</p>}
    <p className="muted organization-security-note">Le service d’envoi d’e-mails n’est pas encore configuré. Les droits sont validés côté serveur ; les liens ne doivent être transmis qu’au destinataire.</p>
  </section>;
}
