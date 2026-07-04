import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getQueue, dequeue } from '@/lib/offlineQueue'
import { startLocationTracking, stopLocationTracking } from '@/lib/location'
import { LoginPage } from '@/pages/LoginPage'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { CampaignDetailMobilePage } from '@/pages/CampaignDetailMobilePage'
import { SurveyPage } from '@/pages/SurveyPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
      setChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
      if (session) startLocationTracking()
      else stopLocationTracking()
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!checked) return <div className="min-h-screen flex items-center justify-center bg-amber-400" />
  if (!authed)  return <Navigate to="/login" replace />
  return <>{children}</>
}

async function syncQueue() {
  const queue = getQueue()
  if (!queue.length || !navigator.onLine) return
  for (const item of queue) {
    try {
      const { error } = await supabase.rpc('submit_survey', { p_payload: item.payload })
      if (!error) dequeue(item.localId)
    } catch { /* keep in queue */ }
  }
}

// Sync queued surveys on mount and when back online
function useSyncOnReconnect() {
  useEffect(() => {
    syncQueue()
    window.addEventListener('online', syncQueue)
    return () => window.removeEventListener('online', syncQueue)
  }, [])
}

export { syncQueue }

export function App() {
  useSyncOnReconnect()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Navigate to="/campaigns" replace /></RequireAuth>} />
        <Route path="/campaigns" element={<RequireAuth><CampaignsPage /></RequireAuth>} />
        <Route path="/campaigns/:id" element={<RequireAuth><CampaignDetailMobilePage /></RequireAuth>} />
        <Route path="/campaigns/:id/survey" element={<RequireAuth><SurveyPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
