import { MailPlus, Search, ShieldCheck, Trash2, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { RoleBadge } from '@/components/role-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deleteAccessInvite, getAccessInvites, getProfiles, saveAccessInvite, saveProfileAccess } from '@/services/api'
import type { AccessInviteRecord, ProfileRecord, UserRole } from '@/types/domain'

interface AccessManagerProps {
  canEdit: boolean
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function AccessManager({ canEdit }: AccessManagerProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('user')

  const profilesQuery = useQuery({
    queryKey: ['profiles', search],
    queryFn: () => getProfiles(search),
  })

  const invitesQuery = useQuery({
    queryKey: ['access-invites', search],
    queryFn: () => getAccessInvites(search),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role, active }: { id: string; role: UserRole; active: boolean }) =>
      saveProfileAccess(id, role, active),
    onSuccess: () => {
      toast.success('Acesso atualizado com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar acesso')
    },
  })

  const inviteMutation = useMutation({
    mutationFn: saveAccessInvite,
    onSuccess: () => {
      toast.success('E-mail autorizado com sucesso.')
      setInviteName('')
      setInviteEmail('')
      setInviteRole('user')
      void queryClient.invalidateQueries({ queryKey: ['access-invites'] })
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao autorizar e-mail')
    },
  })

  const deleteInviteMutation = useMutation({
    mutationFn: deleteAccessInvite,
    onSuccess: () => {
      toast.success('Autorização de e-mail excluída.')
      void queryClient.invalidateQueries({ queryKey: ['access-invites'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao excluir autorização.'),
  })

  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data])
  const invites = useMemo(() => invitesQuery.data ?? [], [invitesQuery.data])
  const registeredEmails = useMemo(
    () => new Set(profiles.map((profile) => profile.email.trim().toLowerCase())),
    [profiles],
  )

  const updateProfile = (profile: ProfileRecord, patch: Partial<Pick<ProfileRecord, 'role' | 'active'>>) => {
    if (!canEdit) return

    updateMutation.mutate({
      id: profile.id,
      role: patch.role ?? profile.role,
      active: patch.active ?? profile.active,
    })
  }

  const updateInvite = (
    invite: AccessInviteRecord,
    patch: Partial<Pick<AccessInviteRecord, 'role' | 'active'>>,
  ) => {
    if (!canEdit) return

    inviteMutation.mutate({
      email: invite.email,
      name: invite.name ?? undefined,
      role: patch.role ?? invite.role,
      active: patch.active ?? invite.active,
    })
  }

  const addInvite = () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast.error('Informe um e-mail válido.')
      return
    }

    inviteMutation.mutate({
      email: normalizedEmail,
      name: inviteName.trim() || undefined,
      role: inviteRole,
      active: true,
    })
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-primary/20 bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <MailPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Adicionar acesso por e-mail</h2>
            <p className="text-sm text-muted-foreground">
              Se a conta já existir, o perfil será atualizado agora. Caso contrário, o acesso será aplicado no primeiro cadastro.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.35fr_220px_auto] md:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="access-name">Nome</Label>
            <Input
              id="access-name"
              placeholder="Nome da pessoa"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="access-email">E-mail *</Label>
            <Input
              id="access-email"
              type="email"
              placeholder="email@dominio.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addInvite()
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Perfil inicial</Label>
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="judge">Juiz</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2" onClick={addInvite} disabled={!canEdit || inviteMutation.isPending}>
            <ShieldCheck className="h-4 w-4" />
            {inviteMutation.isPending ? 'Salvando...' : 'Autorizar e-mail'}
          </Button>
        </div>
      </section>

      {invitesQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Configuração do banco pendente</AlertTitle>
          <AlertDescription>
            Execute no Supabase a migration 202607110001_access_invites.sql para habilitar autorizações por e-mail.
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-md">
        <Label>Buscar por e-mail</Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="email@dominio.com"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MailPlus className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">E-mails autorizados</h2>
          </div>
          <Badge variant="outline">{invites.length}</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil autorizado</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Nenhum e-mail autorizado.
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>{invite.name || '--'}</TableCell>
                  <TableCell><RoleBadge role={invite.role} /></TableCell>
                  <TableCell>
                    <Badge variant={registeredEmails.has(invite.email) ? 'secondary' : 'outline'}>
                      {registeredEmails.has(invite.email) ? 'Cadastrada' : 'Aguardando cadastro'}
                    </Badge>
                  </TableCell>
                  <TableCell>{invite.active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>{formatDate(invite.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Select
                        value={invite.role}
                        onValueChange={(value) => updateInvite(invite, { role: value as UserRole })}
                        disabled={!canEdit || inviteMutation.isPending}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="judge">Juiz</SelectItem>
                          <SelectItem value="user">Usuário</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant={invite.active ? 'outline' : 'default'}
                        onClick={() => updateInvite(invite, { active: !invite.active })}
                        disabled={!canEdit || inviteMutation.isPending}
                      >
                        {invite.active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        aria-label="Excluir autorização"
                        onClick={() => deleteInviteMutation.mutate(invite.id)}
                        disabled={!canEdit || deleteInviteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Usuários cadastrados</h2>
          </div>
          <Badge variant="outline">{profiles.length}</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.email}</TableCell>
                  <TableCell>{profile.name || '--'}</TableCell>
                  <TableCell><RoleBadge role={profile.role} /></TableCell>
                  <TableCell>{profile.active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>{formatDate(profile.created_at)}</TableCell>
                  <TableCell>{formatDate(profile.updated_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Select
                        value={profile.role}
                        onValueChange={(value) => updateProfile(profile, { role: value as UserRole })}
                        disabled={!canEdit || updateMutation.isPending}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="judge">Juiz</SelectItem>
                          <SelectItem value="user">Usuário</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant={profile.active ? 'outline' : 'default'}
                        onClick={() => updateProfile(profile, { active: !profile.active })}
                        disabled={!canEdit || updateMutation.isPending}
                      >
                        {profile.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
