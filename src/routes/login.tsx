import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, KeyRound, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isSupabaseConfigured } from '@/lib/supabase'
import { heroReiningPath } from '@/lib/brand-assets'
import { useAuth } from '@/providers/auth-provider'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp, session, profile, loading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading || !session || !profile) return

    if (profile.role === 'admin' || profile.role === 'judge') {
      void navigate({ to: '/admin' })
      return
    }

    void navigate({ to: '/minha-area' })
  }, [loading, navigate, profile, session])

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      toast.error('Informe e-mail e senha.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await signIn(email.trim(), password)
      if (error) {
        toast.error(`Falha no login: ${error}`)
        return
      }

      toast.success('Login realizado com sucesso.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Informe nome, e-mail e senha.')
      return
    }

    if (password.length < 6) {
      toast.error('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('A confirmação da senha não confere.')
      return
    }

    setSubmitting(true)
    try {
      const { error, needsEmailConfirmation } = await signUp(name.trim(), email.trim(), password)
      if (error) {
        toast.error(`Falha no cadastro: ${error}`)
        return
      }

      if (needsEmailConfirmation) {
        toast.success('Cadastro criado. Confirme seu e-mail para entrar.')
        return
      }

      toast.success('Cadastro criado com sucesso.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4efe8]">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-[1180px] overflow-hidden px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)] lg:py-14">
        <section className="relative hidden min-h-[680px] overflow-hidden bg-primary text-white lg:block">
          <img src={heroReiningPath} alt="Competidor em prova de rédeas" className="absolute inset-0 h-full w-full object-cover object-[67%_center]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/25" />
          <div className="absolute inset-x-0 bottom-0 p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e1ad51]">Área segura NTMR</p>
            <h1 className="mt-4 max-w-lg font-serif text-4xl font-semibold leading-tight">Seu campeonato, organizado do cadastro ao resultado.</h1>
            <div className="mt-7 grid gap-3 text-sm text-white/75">
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e1ad51]" />Faça e acompanhe suas inscrições</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e1ad51]" />Consulte pagamentos e resultados</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e1ad51]" />Acesse a operação conforme seu perfil</p>
            </div>
          </div>
        </section>

        <Card className="flex min-h-[620px] w-full flex-col justify-center rounded-none border-border/80 shadow-2xl shadow-primary/10 lg:min-h-[680px]">
          <CardHeader className="px-6 pb-2 sm:px-10">
            <div className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-secondary/15 text-secondary"><ShieldCheck className="h-5 w-5" /></div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-secondary">Bem-vindo</p>
            <CardTitle className="mt-2 text-3xl text-foreground sm:text-4xl">Acesso ao sistema</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Entre para acessar inscrições, pagamentos e o seu painel.</p>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-8 pt-5 sm:px-10">
            {!isSupabaseConfigured && (
              <Alert variant="destructive">
                <AlertTitle>Supabase não configurado ou inválido</AlertTitle>
                <AlertDescription>
                  Preencha o arquivo <code>.env</code> com <code>VITE_SUPABASE_URL</code> e{' '}
                  <code>VITE_SUPABASE_ANON_KEY</code>, depois reinicie o servidor.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="signin" className="space-y-5">
              <TabsList className="grid h-11 w-full grid-cols-2 bg-muted">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSignIn()
                      }
                    }}
                  />
                </div>

                <Button className="h-11 w-full gap-2" onClick={() => void handleSignIn()} disabled={submitting || !isSupabaseConfigured}>
                  <LogIn className="h-4 w-4" />
                  {submitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo de 6 caracteres"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSignUp()
                      }
                    }}
                  />
                </div>

                <Button className="h-11 w-full gap-2" onClick={() => void handleSignUp()} disabled={submitting || !isSupabaseConfigured}>
                  <UserPlus className="h-4 w-4" />
                  {submitting ? 'Criando conta...' : 'Criar conta'}
                </Button>
              </TabsContent>
            </Tabs>

            <Button variant="ghost" className="w-full gap-2" asChild>
              <Link to="/reset-password">
                <KeyRound className="h-4 w-4" />
                Recuperar ou trocar senha
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
