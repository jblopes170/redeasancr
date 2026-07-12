import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { session, resetPassword, updatePassword, signOut, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const handleSendReset = async () => {
    if (!email.trim()) {
      toast.error('Informe o e-mail para recuperação.')
      return
    }

    setSending(true)
    try {
      const { error } = await resetPassword(email.trim())
      if (error) {
        toast.error(`Falha ao enviar recuperação: ${error}`)
        return
      }

      toast.success('E-mail de recuperação enviado. Verifique sua caixa de entrada.')
    } finally {
      setSending(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('A nova senha deve ter ao menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da senha não confere.')
      return
    }

    setUpdating(true)
    try {
      const { error } = await updatePassword(newPassword)
      if (error) {
        toast.error(`Falha ao atualizar senha: ${error}`)
        return
      }

      toast.success('Senha atualizada com sucesso. Faça login novamente.')
      await signOut()
      void navigate({ to: '/login' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <Card className="border-primary/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Recuperar acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupabaseConfigured ? (
              <Alert variant="destructive">
                <AlertTitle>Supabase não configurado ou inválido</AlertTitle>
                <AlertDescription>
                  Configure o arquivo <code>.env</code> com URL e chave anon válidas antes de usar recuperação de senha.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Passo 1</AlertTitle>
                <AlertDescription>
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button className="w-full gap-2" onClick={() => void handleSendReset()} disabled={!isSupabaseConfigured || sending}>
              <Mail className="h-4 w-4" />
              {sending ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            <p className="text-xs text-muted-foreground">
              Depois de clicar no link recebido no e-mail, volte para esta tela para definir a nova senha.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Definir nova senha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Alert>
                <AlertTitle>Carregando sessão...</AlertTitle>
                <AlertDescription>Aguarde para validar o link de recuperação.</AlertDescription>
              </Alert>
            ) : !session ? (
              <Alert variant="destructive">
                <AlertTitle>Passo 2</AlertTitle>
                <AlertDescription>
                  Abra esta página pelo link de recuperação enviado no e-mail para habilitar a troca de senha.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Link validado</AlertTitle>
                <AlertDescription>Agora você já pode definir sua nova senha.</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={() => void handleUpdatePassword()}
              disabled={!session || updating}
            >
              <ShieldCheck className="h-4 w-4" />
              {updating ? 'Atualizando...' : 'Atualizar senha'}
            </Button>

            <Button variant="ghost" className="w-full" asChild>
              <Link to="/login">Voltar para login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
