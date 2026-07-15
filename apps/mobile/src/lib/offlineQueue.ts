// Saves survey submissions locally when offline, syncs when back online

export interface PendingSurvey {
  localId: string
  campaignId: string
  payload: Record<string, unknown>
  createdAt: string
}

const KEY = 'fluxo_pending_surveys'

export function getQueue(): PendingSurvey[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function enqueue(item: Omit<PendingSurvey, 'localId' | 'createdAt'>): PendingSurvey {
  const entry: PendingSurvey = {
    ...item,
    localId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const queue = getQueue()
  queue.push(entry)
  localStorage.setItem(KEY, JSON.stringify(queue))
  return entry
}

export function dequeue(localId: string) {
  const queue = getQueue().filter((i) => i.localId !== localId)
  localStorage.setItem(KEY, JSON.stringify(queue))
}

export function pendingCount(): number {
  return getQueue().length
}

// ── Cache de dados para uso offline ───────────────────────────────────────────
function jget<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}
function jset(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)) }

export const cache = {
  campaigns: { set: (v: unknown) => jset('fluxo_campaigns', v),         get: <T>() => jget<T>('fluxo_campaigns') },
  campaign:  { set: (id: string, v: unknown) => jset('fluxo_camp_' + id, v), get: <T>(id: string) => jget<T>('fluxo_camp_' + id) },
  questions: { set: (id: string, v: unknown) => jset('fluxo_qs_' + id, v),   get: <T>(id: string) => jget<T>('fluxo_qs_' + id) },
  companyId: { set: (v: string) => localStorage.setItem('fluxo_cid', v), get: () => localStorage.getItem('fluxo_cid') },
  profile:   { set: (v: unknown) => jset('fluxo_profile', v),            get: <T>() => jget<T>('fluxo_profile') },
}
