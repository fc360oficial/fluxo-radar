import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Target, CheckCircle, PlayCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CampaignData {
  id: string
  name: string
  city: string
  neighborhood: string
  state: string
  goal: number
  total_surveys: number
  surveys_today: number
}

export function CampaignDetailMobilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('campaign_progress')
      .select('id,name,city,neighborhood,state,goal,total_surveys,surveys_today')
      .eq('id', id!)
      .single()
    setCampaign(data as CampaignData | null)
    setLoading(false)
  }

  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-amber-400 h-32 safe-top" />
        <div className="px-4 -mt-8 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((campaign.total_surveys / campaign.goal) * 100))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-amber-400 safe-top px-4 pt-4 pb-10">
        <button onClick={() => navigate('/campaigns')} className="flex items-center gap-1.5 text-white/80 mb-4">
          <ArrowLeft className="h-4 w-4" /> Campanhas
        </button>
        <h1 className="text-white font-black text-lg leading-tight">{campaign.name}</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin className="h-3.5 w-3.5 text-white/70" />
          <p className="text-white/80 text-sm">{campaign.neighborhood}, {campaign.city} – {campaign.state}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 -mt-5 grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: Target,      label: 'Meta',      value: campaign.goal,           color: 'text-gray-700' },
          { icon: CheckCircle, label: 'Realizadas', value: campaign.total_surveys, color: 'text-green-600' },
          { icon: Clock,       label: 'Hoje',       value: campaign.surveys_today, color: 'text-amber-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
            <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Progresso da campanha</span>
            <span className="text-sm font-black text-amber-500">{pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{campaign.total_surveys} de {campaign.goal} entrevistas realizadas</p>
        </div>
      </div>

      {/* CTA — fixo no rodapé */}
      <div className="px-4 pb-8 safe-bottom mt-auto">
        <button
          onClick={() => navigate(`/campaigns/${id}/survey`)}
          className="w-full bg-amber-400 active:bg-amber-500 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-amber-200 transition-all active:scale-[0.98]"
          style={{ height: '60px' }}
        >
          <PlayCircle className="h-6 w-6" />
          Iniciar entrevista
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          {campaign.goal - campaign.total_surveys} entrevistas restantes para a meta
        </p>
      </div>
    </div>
  )
}
