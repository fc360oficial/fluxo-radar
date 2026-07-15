import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ChevronRight, LogOut, RefreshCw, WifiOff, Clock, X, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/stores/auth'
import { pendingCount, cache } from '@/lib/offlineQueue'
import { syncQueue } from '@/App'
import type { MobileProfile } from '@/stores/auth'

interface Campaign {
  id: string
  name: string
  city: string
  neighborhood: string
  state: string
  goal: number
  total_surveys: number
}

export function CampaignsPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [profile, setProfile] = useState<MobileProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(pendingCount())

  useEffect(() => {
    const onOnline  = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // getSession funciona offline (localStorage); getUser faz chamada de rede
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/login', { replace: true }); return }

      if (navigator.onLine) {
        const [{ data: prof }, { data: camps }] = await Promise.all([
          supabase.from('profiles').select('id,name,email,role,company_id,interviewer_pin').eq('id', session.user.id).single(),
          supabase.from('campaign_progress').select('id,name,city,neighborhood,state,goal,total_surveys').eq('status', 'active'),
        ])
        if (prof)  { setProfile(prof as MobileProfile); cache.profile.set(prof) }
        if (camps) { setCampaigns(camps as Campaign[]);  cache.campaigns.set(camps) }
      } else {
        const cachedProfile   = cache.profile.get<MobileProfile>()
        const cachedCampaigns = cache.campaigns.get<Campaign[]>()
        if (cachedProfile)   setProfile(cachedProfile)
        if (cachedCampaigns) setCampaigns(cachedCampaigns)
      }
    } finally {
      setLoading(false)
      setPending(pendingCount())
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = profile?.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'
  const [showMenu, setShowMenu] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const touchStartY = useRef(0)
  const PULL_THRESHOLD = 70

  // Auto-refresh e sync quando a aba volta ao foco
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncQueue().then(() => setPending(pendingCount()))
        load()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === 0) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) { setPullY(Math.min(diff, PULL_THRESHOLD + 20)); setPulling(diff > PULL_THRESHOLD) }
  }
  function onTouchEnd() {
    if (pulling) load()
    setPulling(false); setPullY(0); touchStartY.current = 0
  }

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicador pull-to-refresh */}
      {pullY > 10 && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: `${pullY}px`, overflow: 'hidden' }}
        >
          <RefreshCw className={`h-5 w-5 text-amber-500 ${pulling ? 'animate-spin' : ''}`} />
        </div>
      )}
      {/* Header */}
      <div className="bg-amber-400 safe-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowMenu(true)} className="flex items-center gap-3 active:opacity-70">
              <div className="h-9 w-9 rounded-full bg-white/30 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{initials}</span>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm leading-tight">{profile?.name ?? '...'}</p>
                <p className="text-white/70 text-xs">Toque para sair ↓</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
                  <WifiOff className="h-3 w-3 text-white" />
                  <span className="text-white text-[10px] font-medium">Offline</span>
                </div>
              )}
              <button onClick={load} className="p-1.5 text-white/80 active:text-white">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu de sair */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-3xl p-6 pb-10 safe-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-900">{profile?.name}</p>
              <button onClick={() => setShowMenu(false)} className="p-1 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 bg-red-50 text-red-600 font-semibold rounded-2xl px-4 py-4 active:bg-red-100"
            >
              <LogOut className="h-5 w-5" />
              Sair e trocar usuário
            </button>
          </div>
        </div>
      )}

      {/* Pending sync banner */}
      {pending > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 flex-1">
            <span className="font-semibold">{pending}</span> {pending === 1 ? 'pesquisa aguardando' : 'pesquisas aguardando'} sincronização
          </p>
          {isOnline && (
            <button
              onClick={async () => { await syncQueue(); setPending(pendingCount()); load() }}
              className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg active:bg-amber-200"
            >
              <Upload className="h-3 w-3" /> Enviar agora
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-5">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Campanhas ativas</h1>
        <p className="text-sm text-gray-500 mb-4">Selecione a campanha para iniciar a coleta</p>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">Nenhuma campanha ativa</p>
            <p className="text-sm text-gray-400 mt-1">Aguarde seu supervisor ativar uma campanha</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const pct = Math.min(100, Math.round(((c.total_surveys ?? 0) / c.goal) * 100))
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-tight truncate">{c.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{c.neighborhood}, {c.city} – {c.state}</p>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{c.total_surveys ?? 0}/{c.goal} pesquisas</span>
                          <span className="text-xs font-semibold text-amber-600">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 mt-1" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
