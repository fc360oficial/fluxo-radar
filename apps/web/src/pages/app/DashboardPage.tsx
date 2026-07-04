import { BarChart3, Target, CheckCircle2, Clock, Users, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { profile } = useAuth()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">

      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {profile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aqui está um resumo do que está acontecendo hoje.
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Meta Total"
          value="400"
          subtitle="pesquisas definidas"
          icon={Target}
        />
        <StatCard
          title="Realizadas"
          value="378"
          subtitle="pesquisas válidas"
          icon={CheckCircle2}
          trend="+12 hoje"
        />
        <StatCard
          title="Faltam"
          value="22"
          subtitle="para concluir"
          icon={TrendingUp}
        />
        <StatCard
          title="Entrevistadores"
          value="5"
          subtitle="ativos agora"
          icon={Users}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Campanhas ativas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'Pesquisa Jardim Piedade', city: 'Osasco', done: 378, goal: 400 },
              { name: 'Pesquisa Centro Sul', city: 'São Paulo', done: 120, goal: 200 },
            ].map((campaign) => {
              const pct = Math.round((campaign.done / campaign.goal) * 100)
              return (
                <div key={campaign.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium leading-none">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{campaign.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{pct}%</p>
                      <p className="text-xs text-muted-foreground">{campaign.done}/{campaign.goal}</p>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Atividade recente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'João Silva', count: 12, time: '14:23', status: 'active' },
              { name: 'Maria Santos', count: 8, time: '13:45', status: 'active' },
              { name: 'Pedro Costa', count: 6, time: '12:30', status: 'idle' },
              { name: 'Carlos Lima', count: 9, time: '11:50', status: 'active' },
            ].map((interviewer) => (
              <div key={interviewer.name} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full shrink-0 ${interviewer.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{interviewer.name}</p>
                </div>
                <div className="flex items-center gap-2 text-right shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {interviewer.count} pesquisas
                  </Badge>
                  <span className="text-xs text-muted-foreground">{interviewer.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Stats rápidos */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pesquisas hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground mt-1">em 3 campanhas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48s</div>
            <p className="text-xs text-muted-foreground mt-1">por entrevista hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de validade</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">97,2%</div>
            <p className="text-xs text-muted-foreground mt-1">pesquisas válidas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
