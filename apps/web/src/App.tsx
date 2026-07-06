import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { DashboardPage } from '@/pages/app/DashboardPage'
import { CampaignsPage } from '@/pages/app/campaigns/CampaignsPage'
import { CampaignDetailPage } from '@/pages/app/campaigns/CampaignDetailPage'
import { CampaignAnalysisPage } from '@/pages/app/campaigns/CampaignAnalysisPage'
import { CampaignReportPage } from '@/pages/app/campaigns/CampaignReportPage'
import { PriceResearchPage } from '@/pages/app/PriceResearchPage'
import { TradeMarketingPage } from '@/pages/app/TradeMarketingPage'
import { PromotersPage } from '@/pages/app/PromotersPage'
import { MysteryShopperPage } from '@/pages/app/MysteryShopperPage'
import { ExpansionPage } from '@/pages/app/ExpansionPage'
import { CompetitionPage } from '@/pages/app/CompetitionPage'
import { MapPage } from '@/pages/app/MapPage'
import { ReportsPage } from '@/pages/app/ReportsPage'
import { AIRadarPage } from '@/pages/app/AIRadarPage'
import { AlertsPage } from '@/pages/app/AlertsPage'
import { SettingsPage } from '@/pages/app/SettingsPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { useAuth } from '@/hooks/useAuth'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
})

function AuthInit({ children }: { children: React.ReactNode }) {
  useAuth()
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInit>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/campaigns/:id/report" element={<CampaignReportPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index                  element={<DashboardPage />} />
              <Route path="campaigns"       element={<CampaignsPage />} />
              <Route path="campaigns/:id"          element={<CampaignDetailPage />} />
              <Route path="campaigns/:id/analysis" element={<CampaignAnalysisPage />} />
              <Route path="price-research"  element={<PriceResearchPage />} />
              <Route path="trade-marketing" element={<TradeMarketingPage />} />
              <Route path="promoters"       element={<PromotersPage />} />
              <Route path="mystery-shopper" element={<MysteryShopperPage />} />
              <Route path="expansion"       element={<ExpansionPage />} />
              <Route path="competition"     element={<CompetitionPage />} />
              <Route path="map"             element={<MapPage />} />
              <Route path="reports"         element={<ReportsPage />} />
              <Route path="ai"              element={<AIRadarPage />} />
              <Route path="alerts"          element={<AlertsPage />} />
              <Route path="settings"        element={<SettingsPage />} />
            </Route>
          </Routes>
        </AuthInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
