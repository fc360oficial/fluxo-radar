import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { relativeTime } from '@/lib/utils'

// Fix leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_COLOR: Record<string, string> = {
  online:  '#22c55e',
  paused:  '#f59e0b',
  offline: '#94a3b8',
}

export const MODULE_COLOR: Record<string, string> = {
  survey:    '#6366f1',
  promoters: '#3b82f6',
  trade:     '#10b981',
  mystery:   '#ec4899',
}

function makeIcon(color: string, shape: 'circle' | 'square' = 'circle') {
  const borderRadius = shape === 'square' ? '3px' : '50%'
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:${borderRadius};background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
  })
}

export interface Member {
  user_id: string
  name: string
  last_action: string
  last_location: string
  last_active_at: string
  field_status: string
  module?: string
  lat: number | null
  lng: number | null
}

function AutoFit({ members }: { members: Member[] }) {
  const map = useMap()
  useEffect(() => {
    const pts = members.filter(m => m.lat && m.lng).map(m => [m.lat!, m.lng!] as [number, number])
    if (pts.length === 1) { map.setView(pts[0], 15) }
    else if (pts.length > 1) { map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] }) }
  }, [members, map])
  return null
}

interface Props {
  members: Member[]
  height?: string
}

export function TeamMap({ members, height = '100%' }: Props) {
  const withCoords = members.filter(m => m.lat && m.lng)

  // Centro padrão: Recife/PE
  const defaultCenter: [number, number] = [-8.05, -34.9]

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      style={{ height, width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AutoFit members={members} />
      {withCoords.map((m) => {
        const moduleColor = m.module ? MODULE_COLOR[m.module] : null
        const color = moduleColor ?? STATUS_COLOR[m.field_status] ?? STATUS_COLOR.offline
        const shape = m.module && m.module !== 'survey' ? 'square' : 'circle'
        return (
          <Marker
            key={m.user_id}
            position={[m.lat!, m.lng!]}
            icon={makeIcon(color, shape)}
          >
            <Popup>
              <div className="text-xs space-y-0.5 min-w-[140px]">
                <p className="font-bold text-sm">{m.name}</p>
                <p className="text-gray-500">{m.last_action}</p>
                {m.last_location && <p className="text-gray-400">{m.last_location}</p>}
                <p className="text-gray-400">{relativeTime(m.last_active_at)}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
      {withCoords.length === 0 && (
        <div />
      )}
    </MapContainer>
  )
}
