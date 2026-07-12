import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { KeyRound, LogIn, UserPlus } from 'lucide-react'
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
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl px-4 py-10 sm:px-6">
        <Card className="w-full overflow-hidden border-primary/20 shadow-xl shadow-primary/10">
          <CardHeader className="border-b border-primary/10 bg-secondary/50">
            <CardTitle className="text-3xl text-primary">Acesso ao sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5 sm:p-6">
            {!isSupabaseConfigured && (
              <Alert variant="destructive">
                <AlertTitle>Supabase não configurado ou inválido</AlertTitle>
                <AlertDescription>
                  Preencha o arquivo <code>.env</code> com <code>VITE_SUPABASE_URL</code> e{' '}
                  <code>VITE_SUPABASE_ANON_KEY</code>, depois reinicie o servidor.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
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

                <Button className="w-full gap-2" onClick={() => void handleSignIn()} disabled={submitting || !isSupabaseConfigured}>
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

                <Button className="w-full gap-2" onClick={() => void handleSignUp()} disabled={submitting || !isSupabaseConfigured}>
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
