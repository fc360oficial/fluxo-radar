import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { DashboardPage } from '@/pages/app/DashboardPage'
import { useAuth } from '@/hooks/useAuth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="campaigns" element={<PlaceholderPage title="Campanhas" />} />
              <Route path="surveys" element={<PlaceholderPage title="Pesquisas" />} />
              <Route path="interviewers" element={<PlaceholderPage title="Entrevistadores" />} />
              <Route path="map" element={<PlaceholderPage title="Mapa" />} />
              <Route path="ai" element={<PlaceholderPage title="Inteligência Artificial" />} />
              <Route path="reports" element={<PlaceholderPage title="Relatórios" />} />
              <Route path="settings" element={<PlaceholderPage title="Configurações" />} />
            </Route>
          </Routes>
        </AuthInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">Esta página está sendo desenvolvida.</p>
    </div>
  )
}
