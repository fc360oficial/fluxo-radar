import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, KeyRound, Mail } from 'lucide-react'
import { signIn } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

type Tab = 'email' | 'pin'

export function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pin')

  // Email login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // PIN login state
  const [pin, setPin] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/campaigns', { replace: true })
    } catch {
      setError('Email ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 6) { setError('PIN deve ter 6 dígitos.'); return }
    setError('')
    setLoading(true)
    try {
      // Look up email by PIN
      const { data: emailData, error: pinError } = await supabase.rpc('find_by_pin', { p_pin: pin })
      if (pinError || !emailData) throw new Error('PIN inválido')

      // Sign in with PIN as both email and password
      await signIn(emailData as string, pin)
      navigate('/campaigns', { replace: true })
    } catch {
      setError('PIN inválido ou usuário inativo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Top brand area */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-8">
        <img src="/logo.png" alt="Fluxo Certo 360" className="w-56 object-contain" />
        <p className="text-sm text-gray-400 font-medium mt-3">Coleta de campo</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mx-6" />

      {/* Tabs */}
      <div className="flex mx-6 mt-6 bg-gray-100 rounded-2xl p-1 gap-1">
        <button
          onClick={() => { setTab('pin'); setError('') }}
          className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-colors ${
            tab === 'pin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
          }`}
        >
          <KeyRound className="h-4 w-4" /> Entrar com PIN
        </button>
        <button
          onClick={() => { setTab('email'); setError('') }}
          className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-colors ${
            tab === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
          }`}
        >
          <Mail className="h-4 w-4" /> Email e senha
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-6 pb-10 safe-bottom">

        {tab === 'pin' ? (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Seu PIN de 6 dígitos
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="_ _ _ _ _ _"
                className="w-full rounded-2xl border-2 border-gray-100 px-4 text-center text-2xl font-mono tracking-[0.5em] bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                style={{ height: '64px' }}
              />
              <p className="text-xs text-gray-400 text-center mt-2">
                PIN fornecido pelo seu supervisor
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="w-full bg-amber-400 active:bg-amber-500 text-white font-black text-base rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-200"
                style={{ height: '56px' }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar com PIN'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full rounded-2xl border-2 border-gray-100 px-4 text-sm bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                style={{ height: '52px' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-2xl border-2 border-gray-100 px-4 pr-12 text-sm bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                  style={{ height: '52px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 active:bg-amber-500 text-white font-black text-base rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-200"
                style={{ height: '56px' }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Problemas para entrar? Fale com seu supervisor.
        </p>
      </div>
    </div>
  )
}
