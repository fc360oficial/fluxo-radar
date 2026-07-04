import { useState } from 'react'
import { User, Building2, Users, Bell, Shield, Save, Loader2, CheckCircle, Eye, EyeOff, Plus, Copy, Trash2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useCompany, useUpdateCompany, useUpdateProfile, useTeamMembers, useChangePassword, useCreateMember, useDeleteMember } from '@/hooks/useSettings'
import type { CreateMemberResult } from '@/services/settings.service'
import { initials } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin:       'Administrador',
  supervisor:  'Supervisor',
  viewer:      'Visualizador',
  interviewer: 'Entrevistador',
}

const ROLE_COLORS: Record<string, string> = {
  admin:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  supervisor:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewer:      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  interviewer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const NOTIF_SETTINGS = [
  { id: 'campaign_complete', label: 'Meta de campanha atingida',  desc: 'Quando uma campanha atinge 100% da meta' },
  { id: 'campaign_warning',  label: 'Aviso de meta próxima',      desc: 'Quando faltam 50, 20 ou 10 pesquisas' },
  { id: 'rupture',           label: 'Ruptura identificada',       desc: 'Quando coletores registram item sem estoque' },
  { id: 'price_alert',       label: 'Alerta de preço',            desc: 'Variação acima de 20% do preço de referência' },
  { id: 'sync_error',        label: 'Erro de sincronização',      desc: 'Problemas no envio de dados do app mobile' },
  { id: 'promoter_checkin',  label: 'Check-in de promotor',       desc: 'Cada check-in registrado pela equipe' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
      <CheckCircle className="h-3.5 w-3.5" /> Salvo!
    </span>
  )
}

function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMember = useCreateMember()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [role, setRole]         = useState('interviewer')
  const [result, setResult]     = useState<CreateMemberResult | null>(null)
  const [copied, setCopied]     = useState(false)

  function reset() { setName(''); setEmail(''); setPhone(''); setRole('interviewer'); setResult(null) }

  async function handleCreate() {
    const data = await createMember.mutateAsync({ name, email: email || undefined, phone: phone || undefined, role })
    setResult(data)
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() { reset(); onClose() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? 'Membro criado!' : 'Adicionar membro'}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800 dark:text-green-300">{result.name} criado com sucesso</p>
            </div>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">PIN de acesso (app mobile)</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-widest text-primary">{result.pin}</span>
                  <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => handleCopy(result.pin)}>
                    <Copy className="h-3.5 w-3.5" /> {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </div>
              {result.email && !result.email.endsWith('@radar.flx') && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm font-medium">{result.email}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">Compartilhe o PIN com o entrevistador para ele acessar o app</p>
            <Button className="w-full" onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Se não informar, o acesso será apenas por PIN</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input placeholder="(81) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interviewer">Entrevistador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
              <KeyRound className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>O PIN gerado automaticamente é a senha de acesso ao app. Compartilhe apenas o PIN com o entrevistador.</span>
            </div>
            {createMember.isError && (
              <p className="text-sm text-destructive">Erro ao criar membro. Tente novamente.</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!name.trim() || createMember.isPending}>
                {createMember.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar membro
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SettingsPage() {
  const { profile } = useAuth()
  const { data: company, isLoading: loadingCompany } = useCompany()
  const { data: team = [], isLoading: loadingTeam } = useTeamMembers()
  const updateCompany   = useUpdateCompany()
  const updateProfile   = useUpdateProfile()
  const changePassword  = useChangePassword()
  const deleteMember    = useDeleteMember()
  const [showAddMember, setShowAddMember] = useState(false)

  // Profile form state
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // Company form state
  const [companyName, setCompanyName] = useState('')
  const [companyCnpj, setCompanyCnpj] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companySaved, setCompanySaved] = useState(false)

  // Password form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Notifications state
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    campaign_complete: true, campaign_warning: true, rupture: true,
    price_alert: false, sync_error: true, promoter_checkin: false,
  })

  // Populate form defaults from loaded data
  const profileNameVal = profileName || profile?.name || ''
  const profilePhoneVal = profilePhone || profile?.phone || ''
  const companyNameVal = companyName || company?.name || ''
  const companyCnpjVal = companyCnpj || company?.cnpj || ''
  const companyEmailVal = companyEmail || company?.email || ''
  const companyPhoneVal = companyPhone || company?.phone || ''

  async function handleSaveProfile() {
    await updateProfile.mutateAsync({ name: profileNameVal, phone: profilePhoneVal })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  async function handleSaveCompany() {
    await updateCompany.mutateAsync({ name: companyNameVal, cnpj: companyCnpjVal, email: companyEmailVal, phone: companyPhoneVal })
    setCompanySaved(true)
    setTimeout(() => setCompanySaved(false), 3000)
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (newPassword.length < 8) { setPasswordError('Mínimo 8 caracteres'); return }
    if (newPassword !== confirmPassword) { setPasswordError('As senhas não coincidem'); return }
    await changePassword.mutateAsync({ newPassword })
    setNewPassword(''); setConfirmPassword('')
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta, empresa e preferências</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile"       className="gap-2"><User className="h-3.5 w-3.5" />Perfil</TabsTrigger>
          <TabsTrigger value="company"       className="gap-2"><Building2 className="h-3.5 w-3.5" />Empresa</TabsTrigger>
          <TabsTrigger value="team"          className="gap-2"><Users className="h-3.5 w-3.5" />Equipe</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-3.5 w-3.5" />Notificações</TabsTrigger>
          <TabsTrigger value="security"      className="gap-2"><Shield className="h-3.5 w-3.5" />Segurança</TabsTrigger>
        </TabsList>

        {/* ─── Perfil ─── */}
        <TabsContent value="profile">
          <div className="bg-card border rounded-xl p-6 max-w-xl space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {initials(profile?.name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">{ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={profileNameVal} onChange={(e) => setProfileName(e.target.value)} placeholder="Seu nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={profilePhoneVal} onChange={(e) => setProfilePhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>E-mail</Label>
                <Input value={profile?.email ?? ''} type="email" disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado aqui.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button className="gap-2" onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar alterações
              </Button>
              <SavedBadge show={profileSaved} />
            </div>
          </div>
        </TabsContent>

        {/* ─── Empresa ─── */}
        <TabsContent value="company">
          <div className="bg-card border rounded-xl p-6 max-w-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Dados da empresa</h3>
              {company?.plan && (
                <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full capitalize">{company.plan}</span>
              )}
            </div>
            {loadingCompany ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nome da empresa</Label>
                  <Input value={companyNameVal} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da sua empresa" />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input value={companyCnpjVal} onChange={(e) => setCompanyCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={companyPhoneVal} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="(11) 3000-0000" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>E-mail de contato</Label>
                  <Input value={companyEmailVal} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contato@empresa.com" type="email" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button className="gap-2" onClick={handleSaveCompany} disabled={updateCompany.isPending || loadingCompany}>
                {updateCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
              <SavedBadge show={companySaved} />
            </div>
          </div>
        </TabsContent>

        {/* ─── Equipe ─── */}
        <TabsContent value="team">
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold">Membros da equipe</p>
                {!loadingTeam && <p className="text-xs text-muted-foreground">{team.filter(m => m.status === 'active').length} ativo{team.filter(m => m.status === 'active').length !== 1 ? 's' : ''}</p>}
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setShowAddMember(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar membro
              </Button>
            </div>
            <div className="divide-y">
              {loadingTeam ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                  </div>
                ))
              ) : team.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum membro encontrado</p>
              ) : (
                team.map((member) => (
                  <div key={member.id} className={`flex items-center gap-3 px-4 py-3 ${member.status === 'inactive' ? 'opacity-50' : ''}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{member.name}</p>
                        {member.status === 'inactive' && <span className="text-[10px] text-muted-foreground border rounded px-1">Inativo</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.email?.endsWith('@radar.flx') ? 'Sem email — acesso por PIN' : member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.interviewer_pin && (
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border" title="PIN do app mobile">
                          PIN: {member.interviewer_pin}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] ?? ''}`}>
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                      {member.id !== profile?.id && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Excluir membro"
                          disabled={deleteMember.isPending}
                          onClick={() => { if (confirm(`Excluir ${member.name}? Esta ação não pode ser desfeita.`)) deleteMember.mutate(member.id) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} />
        </TabsContent>

        {/* ─── Notificações ─── */}
        <TabsContent value="notifications">
          <div className="bg-card border rounded-xl p-6 max-w-xl space-y-5">
            <h3 className="font-semibold">Preferências de notificação</h3>
            <div className="space-y-4">
              {NOTIF_SETTINGS.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Toggle checked={notifs[n.id]} onChange={() => setNotifs(prev => ({ ...prev, [n.id]: !prev[n.id] }))} />
                </div>
              ))}
            </div>
            <Button className="gap-2"><Save className="h-4 w-4" />Salvar preferências</Button>
          </div>
        </TabsContent>

        {/* ─── Segurança ─── */}
        <TabsContent value="security">
          <div className="bg-card border rounded-xl p-6 max-w-xl space-y-5">
            <h3 className="font-semibold">Alterar senha</h3>
            {passwordError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {passwordError}
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nova senha</Label>
                <div className="relative">
                  <Input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="pr-9" />
                  <button type="button" tabIndex={-1} onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar nova senha</Label>
                <div className="relative">
                  <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className="pr-9" />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirmPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button className="gap-2" onClick={handleChangePassword} disabled={changePassword.isPending || !newPassword}>
                {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Atualizar senha
              </Button>
              <SavedBadge show={passwordSaved} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
