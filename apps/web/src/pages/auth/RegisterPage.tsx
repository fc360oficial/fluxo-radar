import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Building2, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  company_name: z.string().min(2, 'Informe o nome da empresa'),
  name:         z.string().min(2, 'Informe seu nome completo'),
  email:        z.string().email('Email inválido'),
  password:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirm:      z.string(),
}).refine((d) => d.password === d.confirm, {
  path: ['confirm'],
  message: 'As senhas não coincidem',
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)

    // 1. Cria o usuário no Supabase Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setServerError('Este email já está cadastrado. Tente fazer login.')
      } else {
        setServerError(signUpError.message)
      }
      return
    }

    // 2. Cria empresa + perfil em uma transação via RPC
    const { error: rpcError } = await supabase.rpc('register_company', {
      p_company_name: data.company_name,
      p_user_name:    data.name,
      p_email:        data.email,
    })

    if (rpcError) {
      setServerError('Erro ao criar sua conta. Tente novamente.')
      return
    }

    navigate('/app')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/logo.png" alt="Fluxo Radar" className="h-16 object-contain" />
          <div>
            <h1 className="text-xl font-black tracking-tight">Fluxo Radar</h1>
            <p className="text-sm text-muted-foreground">Crie sua conta gratuitamente</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criar conta</CardTitle>
            <CardDescription>Comece seu período de avaliação gratuito</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              {serverError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              {/* Empresa */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sua empresa</p>
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Nome da empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company_name"
                      className="pl-9"
                      placeholder="Ex: Supermercado Central"
                      {...register('company_name')}
                    />
                  </div>
                  {errors.company_name && (
                    <p className="text-xs text-destructive">{errors.company_name.message}</p>
                  )}
                </div>
              </div>

              {/* Usuário */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seus dados</p>

                <div className="space-y-1.5">
                  <Label htmlFor="name">Seu nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      className="pl-9"
                      placeholder="Ex: Tiago Freire"
                      autoComplete="name"
                      {...register('name')}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9"
                      placeholder="voce@empresa.com"
                      autoComplete="email"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="pl-9 pr-9"
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      className="pl-9 pr-9"
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      {...register('confirm')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="text-xs text-destructive">{errors.confirm.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar conta
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </CardContent>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground px-4">
          Ao criar sua conta você concorda com os termos de uso e política de privacidade do Fluxo Radar.
        </p>
      </div>
    </div>
  )
}
