import { supabase } from './supabase'

let watchId: number | null = null

export function startLocationTracking() {
  if (!navigator.geolocation) return

  // Envia imediatamente
  sendLocation()

  // Depois a cada 60 segundos
  watchId = window.setInterval(sendLocation, 60_000)
}

export function stopLocationTracking() {
  if (watchId !== null) { clearInterval(watchId); watchId = null }
}

function sendLocation() {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      await supabase.rpc('update_my_location', {
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
      })
    },
    () => {}, // ignora erro de GPS silenciosamente
    { enableHighAccuracy: true, timeout: 10_000 }
  )
}
