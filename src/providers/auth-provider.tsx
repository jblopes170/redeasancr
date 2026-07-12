import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session } from '@supabase/supabase-js'

import { isSupabaseConfigured, type Profile, type UserRole, supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  updatePassword: (newPassword: string) => Promise<{ error?: string }>
  hasRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapAuthError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Erro inesperado ao autenticar. Tente novamente.'
  }

  const message = error.message.toLowerCase()

  if (message.includes('failed to fetch')) {
    return 'Não foi possível conectar ao Supabase. Verifique o arquivo .env, URL/chave e conexão de internet.'
  }

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.'
  }

  if (message.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'Este e-mail já possui cadastro. Use o login ou recupere sua senha.'
  }

  if (message.includes('password should be at least') || message.includes('weak password')) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }

  return error.message
}

async function ensureProfile(session: Session): Promise<Profile | null> {
  const user = session.user
  const fallbackName = (user.user_metadata?.name as string | undefined) ?? null

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (existing) {
    return existing
  }

  const { data: inserted, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        name: fallbackName,
        role: 'user',
        active: true,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single<Profile>()

  if (error) {
    throw error
  }

  return inserted
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSessionAndProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data } = await supabase.auth.getSession()
      const activeSession = data.session

      setSession(activeSession)

      if (!activeSession) {
        setProfile(null)
        setLoading(false)
        return
      }

      const nextProfile = await ensureProfile(activeSession)
      setProfile(nextProfile)
    } catch {
      setSession(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    void loadSessionAndProfile()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setLoading(false)
        return
      }

      void ensureProfile(nextSession)
        .then((nextProfile) => setProfile(nextProfile))
        .finally(() => setLoading(false))
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [loadSessionAndProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase não configurado ou inválido. Defina VITE_SUPABASE_URL (https://xxxx.supabase.co) e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie o servidor.',
      }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { error: mapAuthError(error) }
      }

      return {}
    } catch (error) {
      return { error: mapAuthError(error) }
    }
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase não configurado ou inválido. Defina VITE_SUPABASE_URL (https://xxxx.supabase.co) e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie o servidor.',
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) {
        return { error: mapAuthError(error) }
      }

      if (data.session) {
        const nextProfile = await ensureProfile(data.session)
        setSession(data.session)
        setProfile(nextProfile)
        return {}
      }

      return { needsEmailConfirmation: true }
    } catch (error) {
      return { error: mapAuthError(error) }
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase não configurado ou inválido. Defina VITE_SUPABASE_URL (https://xxxx.supabase.co) e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie o servidor.',
      }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { error: mapAuthError(error) }
      }

      return {}
    } catch (error) {
      return { error: mapAuthError(error) }
    }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase não configurado ou inválido. Defina VITE_SUPABASE_URL (https://xxxx.supabase.co) e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie o servidor.',
      }
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        return { error: mapAuthError(error) }
      }

      return {}
    } catch (error) {
      return { error: mapAuthError(error) }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setSession(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !session) {
      setProfile(null)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single<Profile>()

    setProfile(data ?? null)
  }, [session])

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!profile) {
        return false
      }

      return roles.includes(profile.role)
    },
    [profile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      resetPassword,
      updatePassword,
      hasRole,
    }),
    [hasRole, loading, profile, refreshProfile, resetPassword, session, signIn, signOut, signUp, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
